/**
 * helpers.js – CÁC HÀM DÙNG CHUNG CHO KIỂM THỬ TỰ ĐỘNG GIAO DIỆN
 * ------------------------------------------------------------------
 * File này "dạy" Selenium cách thao tác với trang web Pet Clinic giống một người dùng:
 * mở trang, bấm nút, gõ chữ, chọn trong danh sách thả xuống, đọc thông báo, chụp màn hình.
 * Các test case trong cases.js chỉ việc gọi các hàm ở đây, nên kịch bản test ngắn và dễ đọc.
 *
 * Thuật ngữ:
 *  - driver   : "tay lái" điều khiển trình duyệt (Selenium WebDriver).
 *  - headless : trình duyệt chạy ẩn, không hiện cửa sổ – chạy nhanh, dùng được trên máy chủ.
 *  - XPath/CSS: cách "chỉ đường" tới một phần tử trên trang (nút, ô nhập…).
 */
const { Builder, By, until } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const path = require("path");
const fs = require("fs");

// Địa chỉ ứng dụng cần kiểm thử. Đổi bằng biến môi trường BASE_URL nếu chạy ở máy/cổng khác.
const BASE = process.env.BASE_URL || "http://localhost:5000";
// Thư mục lưu ảnh chụp màn hình làm bằng chứng kiểm thử (đổi bằng biến SHOT_DIR).
const SHOT_DIR = process.env.SHOT_DIR || path.join(__dirname, "..", "07_KetQua", "automation", "screenshots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Biến giữ trình duyệt đang mở – dùng chung cho mọi test case trong một lần chạy.
let driver;

/**
 * Mở trình duyệt.
 * Chọn loại trình duyệt bằng biến môi trường BROWSER = chrome | edge | firefox (mặc định: edge).
 * Cửa sổ 1440×900, ngôn ngữ tiếng Việt, chạy ẩn (headless).
 * Selenium Manager tự tải driver (chromedriver/msedgedriver/geckodriver) phù hợp phiên bản trình duyệt.
 */
async function start() {
  const browser = (process.env.BROWSER || "edge").toLowerCase();
  const args = ["--headless=new", "--window-size=1440,900", "--lang=vi-VN"];
  const builder = new Builder();
  if (browser === "chrome") {
    builder.forBrowser("chrome").setChromeOptions(new chrome.Options().addArguments(...args));
  } else if (browser === "firefox") {
    builder.forBrowser("firefox").setFirefoxOptions(new firefox.Options().addArguments("-headless", "--width=1440", "--height=900"));
  } else {
    builder.forBrowser("MicrosoftEdge").setEdgeOptions(new edge.Options().addArguments(...args));
  }
  driver = await builder.build();
  return driver;
}

/** Đóng trình duyệt khi chạy xong toàn bộ test. */
async function stop() {
  if (driver) await driver.quit();
}

/** Tạm dừng một khoảng thời gian (mili giây) – chờ giao diện cập nhật. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mở một trang của ứng dụng, ví dụ open("/customers").
 * Chờ trang tải xong (document.readyState = "complete") rồi chờ thêm 0,9 giây để dữ liệu hiện ra.
 */
async function open(p) {
  await driver.get(BASE + p);
  await driver.wait(async () => (await driver.executeScript("return document.readyState")) === "complete", 10000);
  await sleep(900);
}

/** Viết tắt: tạo bộ định vị XPath. */
const xp = (s) => By.xpath(s);
/** Bọc chuỗi trong dấu nháy phù hợp để đưa vào XPath (tránh lỗi khi chữ có dấu ' ). */
const lit = (t) => (t.includes("'") ? `"${t}"` : `'${t}'`);

/**
 * Bấm nút theo chữ hiển thị trên nút, ví dụ clickButton("Lưu ca trực").
 * scope: giới hạn vùng tìm kiếm, ví dụ "//div[@role='dialog']" = chỉ tìm trong hộp thoại đang mở
 * (cần khi ngoài trang và trong hộp thoại có 2 nút cùng tên).
 * Cuộn nút vào giữa màn hình trước khi bấm để không bị phần tử khác che.
 */
async function clickButton(text, scope = "") {
  const el = await driver.wait(until.elementLocated(xp(`${scope}//button[normalize-space()=${lit(text)}]`)), 8000);
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", el);
  await el.click();
  await sleep(400);
}

/** Bấm vào bất kỳ phần tử nào có đúng nội dung chữ (dùng cho mục menu bên trái). */
async function clickText(text) {
  const el = await driver.wait(until.elementLocated(xp(`//*[normalize-space()=${lit(text)}]`)), 8000);
  await el.click();
  await sleep(400);
}

/**
 * Gán giá trị cho ô nhập theo cách React nhận biết được.
 * Dùng cho ô ngày (date), giờ (time), số (number) – loại ô mà gõ phím qua Selenium hay bị sai định dạng.
 * Cách làm: đặt value bằng setter gốc của trình duyệt rồi phát sự kiện input/change để form React cập nhật.
 */
async function setValue(el, value) {
  await driver.executeScript(
    `const el = arguments[0];
     const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
     Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, arguments[1]);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     el.dispatchEvent(new Event('change', { bubbles: true }));`,
    el,
    String(value),
  );
}

/**
 * Xóa nội dung cũ rồi gõ chữ vào ô nhập tìm bằng CSS selector.
 * Ví dụ: type("[data-testid='input-customer-name']", "Nguyễn Văn A").
 * value = "" nghĩa là để trống ô (dùng cho test "bỏ trống trường bắt buộc").
 */
async function type(css, value) {
  const el = await driver.wait(until.elementLocated(By.css(css)), 8000);
  await el.clear();
  if (value !== "") await el.sendKeys(value);
  return el;
}

/**
 * Gõ giống người thật: nhấp vào ô một lần rồi gõ từng ký tự, mỗi ký tự cách nhau 150 ms.
 * Phím được gửi tới phần tử đang có focus (không tự nhấp lại), nên nếu ô bị mất focus giữa chừng
 * thì các ký tự sau sẽ "rơi mất" – đúng như người dùng gặp phải. Dùng để phát hiện lỗi mất focus.
 */
async function typeSlow(css, value) {
  const el = await driver.wait(until.elementLocated(By.css(css)), 8000);
  await el.clear();
  await el.click();
  for (const ch of value) {
    await driver.actions().sendKeys(ch).perform();
    await sleep(150);
  }
}

/**
 * Điền vào ô nhập nằm ngay sau nhãn (label) có chữ cho trước, ví dụ fillByLabel("Chuyên khoa", "Da liễu").
 * Mặc định chỉ tìm trong hộp thoại đang mở.
 */
async function fillByLabel(label, value, scope = "//div[@role='dialog']") {
  const el = await driver.wait(
    until.elementLocated(xp(`${scope}//label[normalize-space()=${lit(label)}]/following::*[self::input or self::textarea][1]`)),
    8000,
  );
  await setValue(el, value);
  return el;
}

/** Chọn giá trị trong danh sách thả xuống nằm sau nhãn, ví dụ selectByLabel("Khách hàng", "Nguyễn Huy"). */
async function selectByLabel(label, optionText, scope = "//div[@role='dialog']") {
  const trigger = await driver.wait(
    until.elementLocated(xp(`${scope}//label[normalize-space()=${lit(label)}]/following::button[@role='combobox'][1]`)),
    8000,
  );
  await selectOption(trigger, optionText);
}

/**
 * Chọn một lựa chọn trong danh sách thả xuống (component Select của thư viện Radix UI).
 * 1. Bấm vào ô chọn (trigger) để mở danh sách.
 * 2. Tìm dòng lựa chọn (role="option") có chứa chữ cần chọn.
 * 3. Danh sách có thể dài (30 khách hàng, 50 thú cưng) nên phải cuộn tới lựa chọn rồi mới bấm;
 *    thử tối đa 4 lần nếu bị phần tử khác che.
 */
async function selectOption(trigger, optionText) {
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", trigger);
  await trigger.click();
  const opt = await driver.wait(until.elementLocated(xp(`//*[@role='option'][contains(normalize-space(), ${lit(optionText)})]`)), 8000);
  for (let i = 0; i < 4; i++) {
    await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", opt);
    await sleep(250);
    try {
      await opt.click();
      break;
    } catch (e) {
      if (i === 3) throw e;
    }
  }
  await sleep(400);
}

/** Lấy toàn bộ chữ đang hiển thị trên trang – dùng để kiểm tra thông báo, kết quả tìm kiếm. */
async function bodyText() {
  return driver.executeScript("return document.body.innerText");
}

/**
 * Chờ một đoạn chữ xuất hiện trên trang (ví dụ thông báo "Thêm khách hàng thành công").
 * Trả về true nếu xuất hiện trong thời gian chờ, false nếu không – test case dựa vào đó để kết luận Pass/Fail.
 */
async function waitText(text, timeout = 6000) {
  try {
    await driver.wait(async () => (await bodyText()).includes(text), timeout);
    return true;
  } catch {
    return false;
  }
}

/** Kiểm tra có hộp thoại (dialog) nào đang mở không. */
async function dialogOpen() {
  return (await driver.findElements(xp("//div[@role='dialog']"))).length > 0;
}

/** Đóng mọi hộp thoại còn mở bằng phím Esc – chạy sau mỗi test để test sau bắt đầu sạch sẽ. */
async function closeDialogs() {
  for (let i = 0; i < 3 && (await dialogOpen()); i++) {
    await driver.actions().sendKeys("").perform(); //  = phím Esc trong WebDriver
    await sleep(300);
  }
}

/** Chụp màn hình trình duyệt, lưu thành <tên>.png trong thư mục SHOT_DIR. */
async function shot(name) {
  const data = await driver.takeScreenshot();
  fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), data, "base64");
}

/**
 * Gọi trực tiếp API của ứng dụng (không qua giao diện).
 * Dùng để: chuẩn bị dữ liệu nhanh cho test (tạo thú cưng, lịch hẹn) và
 * kiểm tra lại dữ liệu sau thao tác giao diện (ví dụ tồn kho có thật sự giảm không).
 * Trả về { status: mã HTTP, data: dữ liệu JSON }.
 */
async function api(method, p, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

module.exports = {
  start, stop, open, sleep, xp, By, until, clickButton, clickText, setValue, type, typeSlow, fillByLabel,
  selectByLabel, selectOption, bodyText, waitText, dialogOpen, closeDialogs, shot, api,
  get driver() { return driver; },
};
