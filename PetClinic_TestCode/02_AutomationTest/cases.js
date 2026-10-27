/**
 * cases.js – DANH SÁCH TEST CASE CHỨC NĂNG (kiểm thử tự động giao diện)
 * ----------------------------------------------------------------------
 * Mỗi test case là một đối tượng gồm:
 *   id       : mã test case, ví dụ "UC1.1-TC001" (UC1.1 = Use Case "Tạo hồ sơ khách hàng" trong đặc tả)
 *   group    : nhóm tác nhân (Hệ thống / Lễ tân / Bác sĩ / Quản trị viên – Kế toán)
 *   uc       : tên Use Case
 *   title    : mô tả ngắn test case
 *   steps    : các bước, mỗi bước = [Bước thực hiện, Kết quả mong đợi của bước, Dữ liệu nhập]
 *   expected : kết quả mong đợi cuối cùng (tiêu chí để kết luận Pass)
 *   shot     : (tùy chọn) tên ảnh chụp màn hình lưu lại làm bằng chứng
 *   run()    : hàm Selenium thực hiện đúng các bước trên và kiểm tra kết quả.
 *              - Nếu đạt: trả về chuỗi "kết quả thực tế"            → test PASS
 *              - Nếu không đạt: ném lỗi kèm mô tả kết quả thực tế   → test FAIL
 *
 * Cùng một danh sách này được dùng ở 2 nơi:
 *   1. petclinic.spec.js – Mocha chạy từng run() để kiểm thử.
 *   2. build_doc.js / file Excel – in các bước, dữ liệu, kết quả ra bảng test case trong báo cáo.
 * Nhờ vậy nội dung báo cáo và kịch bản chạy thật luôn khớp nhau.
 *
 * Lưu ý: các test case chạy NỐI TIẾP và một số case dùng dữ liệu do case trước tạo ra
 * (ví dụ UC1.3 sửa khách hàng tạo ở UC1.1-TC007). Hãy chạy cả bộ, đúng thứ tự.
 */
const h = require("./helpers");

// Mã ngẫu nhiên 6 chữ số cho mỗi lần chạy – gắn vào tên/email/SĐT để dữ liệu test không trùng lần chạy trước.
const RUN = Date.now().toString().slice(-6);
// "Bộ nhớ chung" giữa các test case: dữ liệu mẫu đọc từ API và dữ liệu do test tạo ra.
const ctx = {};

/** Thêm số 0 phía trước cho đủ 2 chữ số: 5 → "05". */
function pad(n) {
  return String(n).padStart(2, "0");
}
/** Đổi ngày thành chuỗi "YYYY-MM-DD" – định dạng của ô nhập ngày trên giao diện. */
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Ngày hôm nay cộng thêm n ngày (n âm = ngày trong quá khứ). */
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
/** Báo test FAIL, kèm mô tả kết quả thực tế (được ghi vào báo cáo). */
function fail(actual) {
  const e = new Error(actual);
  e.actual = actual;
  throw e;
}
/**
 * Hàm kết luận của mọi test case:
 *   cond     – điều kiện đạt (true/false)
 *   okText   – kết quả thực tế ghi lại khi PASS
 *   failText – kết quả thực tế ghi lại khi FAIL
 */
function expect(cond, okText, failText) {
  if (!cond) fail(failText);
  return okText;
}

/**
 * Đọc dữ liệu mẫu từ API trước khi chạy test: danh sách khách hàng, thú cưng, bác sĩ, vật tư.
 * ctx.huy = khách hàng mẫu "Nguyễn Huy" (dùng làm chủ của thú cưng tạo trong test),
 * ctx.vet = bác sĩ đầu tiên trong danh sách (dùng khi đặt lịch, tạo ca trực, hồ sơ khám).
 */
async function loadContext() {
  ctx.customers = (await h.api("GET", "/api/customers")).data;
  ctx.pets = (await h.api("GET", "/api/pets")).data;
  ctx.doctors = (await h.api("GET", "/api/doctors")).data;
  ctx.inventory = (await h.api("GET", "/api/inventory")).data;
  ctx.huy = ctx.customers.find((c) => c.name === "Nguyễn Huy");
  ctx.vet = ctx.doctors[0];
}

/* ------------------------------------------------------------------
 * CÁC THAO TÁC GIAO DIỆN DÙNG LẠI NHIỀU LẦN
 * Mỗi hàm tương ứng với một chuỗi thao tác người dùng trên một màn hình.
 * ------------------------------------------------------------------ */

/** Mở trang Khách hàng và bấm nút "Thêm khách hàng" để mở form. */
async function openAddCustomer() {
  await h.open("/customers");
  await h.driver.findElement(h.By.css("[data-testid='button-add-customer']")).click();
  await h.sleep(400);
}
/** Điền form khách hàng (trường không truyền vào sẽ để trống) rồi bấm "Lưu khách hàng". */
async function fillCustomer({ name = "", email = "", phone = "", address = "" }) {
  await h.type("[data-testid='input-customer-name']", name);
  await h.type("[data-testid='input-customer-email']", email);
  await h.type("[data-testid='input-customer-phone']", phone);
  await h.type("[data-testid='input-customer-address']", address);
  await h.driver.findElement(h.By.css("[data-testid='button-save-customer']")).click();
  await h.sleep(1200);
}
/** Tìm nút (ví dụ "Chỉnh sửa", "Tạm khóa") nằm trên đúng dòng của khách hàng có tên cho trước. */
async function customerRowButton(customerName, buttonText) {
  return h.driver.findElement(
    h.xp(`//tr[.//p[normalize-space()='${customerName}']]//button[normalize-space()='${buttonText}']`),
  );
}
/** Mở form "Thêm thú cưng" từ dòng của một khách hàng (mặc định: Nguyễn Huy). */
async function openAddPet(customerName = "Nguyễn Huy") {
  await h.open("/customers");
  await (await customerRowButton(customerName, "Thêm thú cưng")).click();
  await h.sleep(500);
}
/** Bấm nút "Lưu thú cưng". */
async function savePet() {
  await h.driver.findElement(h.By.css("[data-testid='button-save-pet']")).click();
  await h.sleep(1200);
}
/** Mở trang Lịch hẹn và bấm "Tạo lịch hẹn". */
async function openAppointmentDialog() {
  await h.open("/appointments");
  await h.driver.findElement(h.By.css("[data-testid='button-add-appointment']")).click();
  await h.sleep(500);
}
/**
 * Điền form tạo lịch hẹn rồi bấm lưu. Trường nào không truyền thì bỏ trống.
 * Phải chọn khách hàng trước, chờ 0,6 giây cho danh sách thú cưng của khách đó tải xong rồi mới chọn thú cưng.
 */
async function fillAppointment({ customer, pet, vet, date, time, service }) {
  if (customer) await h.selectByLabel("Khách hàng", customer);
  if (pet) {
    await h.sleep(600);
    await h.selectByLabel("Thú cưng", pet);
  }
  if (vet) await h.selectByLabel("Bác sĩ phụ trách", vet);
  if (date) await h.setValue(await h.driver.findElement(h.By.css("[data-testid='input-appointment-date']")), date);
  if (time) await h.setValue(await h.driver.findElement(h.By.css("[data-testid='input-appointment-time']")), time);
  if (service) await h.selectByLabel("Dịch vụ", service);
  await h.driver.findElement(h.By.css("[data-testid='button-save-appointment']")).click();
  await h.sleep(1500);
}
/** Tạo nhanh một thú cưng của khách "Nguyễn Huy" qua API – chuẩn bị dữ liệu riêng cho từng test lịch hẹn. */
async function createPetApi(name, extra = {}) {
  const r = await h.api("POST", "/api/pets", { customerId: ctx.huy.id, name, species: "Chó", ...extra });
  return r.data;
}
/**
 * Mở tab "Quản lý toàn bộ" của trang Lịch hẹn và trả về nút (Xác nhận / Hoàn thành / Hủy lịch)
 * nằm trên thẻ lịch hẹn của thú cưng có tên cho trước.
 */
async function managementCard(petName, buttonText) {
  await h.open("/appointments");
  await h.driver.findElement(h.xp("//button[@role='tab'][normalize-space()='Quản lý toàn bộ']")).click();
  await h.sleep(800);
  return h.driver.findElement(
    h.xp(`(//span[normalize-space()='${petName}']/ancestor::div[contains(@class,'rounded')][.//button][1])//button[normalize-space()='${buttonText}']`),
  );
}
/** Mở trang Hồ sơ khám, chuyển sang tab "Tạo hồ sơ mới". */
async function openRecordForm() {
  await h.open("/medical-records");
  await h.driver.findElement(h.xp("//button[@role='tab'][normalize-space()='Tạo hồ sơ mới']")).click();
  await h.sleep(600);
}
/** Bấm nút "Lưu hồ sơ". */
async function saveRecord() {
  await h.driver.findElement(h.By.css("[data-testid='button-save-record']")).click();
  await h.sleep(1200);
}
/** Mở trang Ca bác sĩ và bấm "Tạo ca trực". */
async function openShiftDialog() {
  await h.open("/shifts");
  await h.clickButton("Tạo ca trực");
}
/** Mở trang Bác sĩ và bấm "Thêm bác sĩ". */
async function openDoctorDialog() {
  await h.open("/doctors");
  await h.clickButton("Thêm bác sĩ");
}
/** Điền form bác sĩ rồi bấm "Tạo bác sĩ". */
async function fillDoctor({ name, email, phone, specialization, license }) {
  if (name !== undefined) await h.fillByLabel("Họ tên", name);
  if (email !== undefined) await h.fillByLabel("Email", email);
  if (phone !== undefined) await h.fillByLabel("Số điện thoại", phone);
  if (specialization !== undefined) await h.fillByLabel("Chuyên khoa", specialization);
  if (license !== undefined) await h.fillByLabel("Mã hành nghề", license);
  await h.clickButton("Tạo bác sĩ");
  await h.sleep(1000);
}
/** Mở trang Kho thuốc và bấm "Thêm vật tư". */
async function openInventoryDialog() {
  await h.open("/inventory");
  await h.driver.findElement(h.By.css("[data-testid='button-add-inventory']")).click();
  await h.sleep(500);
}
/** Điền form vật tư (mã, tên, danh mục, đơn vị, tồn kho, tồn tối thiểu, giá, hạn dùng) rồi bấm "Lưu vật tư". */
async function fillInventory({ code, name, category, unit, stock, minStock, price, expiry }) {
  if (code !== undefined) await h.fillByLabel("Mã vật tư *", code);
  if (name !== undefined) await h.fillByLabel("Tên vật tư *", name);
  if (category) await h.selectByLabel("Danh mục *", category);
  if (unit !== undefined) await h.fillByLabel("Đơn vị *", unit);
  if (stock !== undefined) await h.fillByLabel("Tồn kho *", stock);
  if (minStock !== undefined) await h.fillByLabel("Tồn tối thiểu *", minStock);
  if (price !== undefined) await h.fillByLabel("Giá (VND) *", price);
  if (expiry) await h.fillByLabel("Hạn sử dụng (tùy chọn)", expiry);
  await h.driver.findElement(h.By.css("[data-testid='button-save-inventory']")).click();
  await h.sleep(1500);
}
/** Mở trang Hóa đơn và bấm "Tạo hóa đơn". */
async function openInvoiceDialog() {
  await h.open("/invoices");
  await h.driver.findElement(h.By.css("[data-testid='button-create-invoice']")).click();
  await h.sleep(500);
}
/** Điền form hóa đơn (khách hàng, thuốc, số lượng) rồi bấm nút "Tạo hóa đơn" TRONG hộp thoại. */
async function fillInvoice({ customer, item, qty }) {
  if (customer) await h.selectByLabel("Khách hàng", customer);
  if (item) await h.selectByLabel("Thuốc / vật tư", item);
  if (qty !== undefined) await h.fillByLabel("Số lượng", qty);
  await h.clickButton("Tạo hóa đơn", "//div[@role='dialog']");
  await h.sleep(1800);
}
/** Đọc thông báo lỗi do chính trình duyệt hiển thị (ví dụ ô email sai định dạng). */
async function validationMessage(css) {
  return h.driver.executeScript("return document.querySelector(arguments[0]).validationMessage", css);
}

// Danh sách test case; add() thêm một test case vào cuối danh sách.
const cases = [];
const add = (c) => cases.push(c);

/* ======================================================================
 * 3.1 CHỨC NĂNG CỦA HỆ THỐNG – truy cập, điều hướng, trang 404, đăng nhập, giao diện
 * ====================================================================== */
const G1 = "Chức năng của HỆ THỐNG";

// ──────────────────────────────────────────────────────────────────────
// SYS-TC001: Truy cập trang chủ của hệ thống
// Pass khi: Trang "Tổng quan vận hành phòng khám" hiển thị đủ 6 thẻ thống kê
// ──────────────────────────────────────────────────────────────────────
add({
  id: "SYS-TC001", group: G1, uc: "Truy cập hệ thống & trang Tổng quan",
  title: "Truy cập trang chủ của hệ thống",
  steps: [
    ["1. Mở trình duyệt, truy cập địa chỉ hệ thống", "Trang web được truy cập", "http://localhost:5000"],
    ["2. Quan sát trang Tổng quan", "Hiển thị tiêu đề và 6 thẻ thống kê", ""],
  ],
  expected: "Trang \"Tổng quan vận hành phòng khám\" hiển thị đủ 6 thẻ thống kê",
  async run() {
    await h.open("/");
    const t = await h.bodyText();
    const cards = ["Tổng doanh thu", "Số đơn hàng", "Mặt hàng thuốc", "Tồn kho còn lại", "Lịch hẹn hôm nay", "Cảnh báo sắp hết"];
    const missing = cards.filter((c) => !t.includes(c));
    return expect(t.includes("Tổng quan vận hành phòng khám") && missing.length === 0,
      "Trang Tổng quan hiển thị đầy đủ 6 thẻ thống kê", `Thiếu thẻ: ${missing.join(", ")}`);
  },
});

const menus = [
  ["Bác sĩ", "Quản lý bác sĩ"], ["Khách hàng", "Quản lý khách hàng"], ["Lịch hẹn", "Tạo lịch hẹn"],
  ["Hồ sơ khám", "Quản lý hồ sơ khám bệnh"], ["Ca bác sĩ", "Tạo ca trực"], ["Kho thuốc", "Quản lý kho thuốc và vật tư"],
  ["Hóa đơn", "Tạo hóa đơn"], ["Camera giám sát", "Camera"],
];
// ──────────────────────────────────────────────────────────────────────
// SYS-TC002: Điều hướng tới các chức năng qua thanh menu bên trái
// Pass khi: Mỗi mục menu mở đúng trang chức năng tương ứng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "SYS-TC002", group: G1, uc: "Truy cập hệ thống & trang Tổng quan",
  title: "Điều hướng tới các chức năng qua thanh menu bên trái",
  steps: [
    ["1. Truy cập trang chủ", "Trang Tổng quan được hiển thị", ""],
    ["2. Lần lượt chọn từng mục trên menu", "Trang tương ứng được hiển thị", menus.map((m) => m[0]).join(", ")],
  ],
  expected: "Mỗi mục menu mở đúng trang chức năng tương ứng",
  async run() {
    await h.open("/");
    const wrong = [];
    for (const [menu, marker] of menus) {
      await h.clickText(menu);
      await h.sleep(700);
      if (!(await h.bodyText()).includes(marker)) wrong.push(menu);
    }
    return expect(wrong.length === 0, `Cả ${menus.length} mục menu mở đúng trang`, `Mở sai trang: ${wrong.join(", ")}`);
  },
});

// ──────────────────────────────────────────────────────────────────────
// SYS-TC003: Truy cập đường dẫn không tồn tại
// Pass khi: Hiển thị trang "404 - Không tìm thấy trang"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "SYS-TC003", group: G1, uc: "Truy cập hệ thống & trang Tổng quan",
  title: "Truy cập đường dẫn không tồn tại",
  steps: [["1. Nhập đường dẫn không tồn tại trên thanh địa chỉ", "Hệ thống xử lý đường dẫn", "/trang-khong-ton-tai"]],
  expected: "Hiển thị trang \"404 - Không tìm thấy trang\"",
  async run() {
    await h.open("/trang-khong-ton-tai");
    return expect(await h.waitText("404 - Không tìm thấy trang"), "Hiển thị trang 404", "Không hiển thị trang 404");
  },
});

// ──────────────────────────────────────────────────────────────────────
// SYS-TC004: Truy cập chức năng quản lý khi chưa đăng nhập
// Pass khi: Hệ thống yêu cầu đăng nhập, không cho xem dữ liệu khách hàng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "SYS-TC004", group: G1, uc: "Đăng nhập & phân quyền (RBAC – R6.2)",
  title: "Truy cập chức năng quản lý khi chưa đăng nhập",
  steps: [
    ["1. Mở trình duyệt mới (chưa đăng nhập)", "Không có phiên đăng nhập", ""],
    ["2. Truy cập trực tiếp trang Khách hàng", "Hệ thống chuyển tới trang đăng nhập", "/customers"],
  ],
  expected: "Hệ thống yêu cầu đăng nhập, không cho xem dữ liệu khách hàng",
  async run() {
    // Xóa cookie = giả lập người chưa đăng nhập, rồi vào thẳng trang Khách hàng.
    // Hệ thống đúng phải chuyển sang trang đăng nhập; nếu vẫn thấy danh sách khách hàng → FAIL.
    await h.driver.manage().deleteAllCookies();
    await h.open("/customers");
    const t = await h.bodyText();
    const loginShown = /đăng nhập|login/i.test(t) && !t.includes("Danh sách khách hàng");
    return expect(loginShown, "Hệ thống yêu cầu đăng nhập",
      "Không có trang đăng nhập – truy cập thẳng được danh sách khách hàng");
  },
});

// ──────────────────────────────────────────────────────────────────────
// SYS-TC005: Chuyển đổi giao diện sáng/tối
// Pass khi: Giao diện chuyển đổi qua lại giữa sáng và tối
// ──────────────────────────────────────────────────────────────────────
add({
  id: "SYS-TC005", group: G1, uc: "Truy cập hệ thống & trang Tổng quan",
  title: "Chuyển đổi giao diện sáng/tối",
  steps: [
    ["1. Truy cập trang chủ", "Giao diện sáng", ""],
    ["2. Nhấn nút đổi giao diện ở góc phải", "Giao diện chuyển sang tối", ""],
    ["3. Nhấn lại nút", "Giao diện trở lại sáng", ""],
  ],
  expected: "Giao diện chuyển đổi qua lại giữa sáng và tối",
  async run() {
    await h.open("/");
    const btn = await h.driver.findElement(h.By.css("[data-testid='button-theme-toggle']"));
    const isDark = () => h.driver.executeScript("return document.documentElement.classList.contains('dark')");
    const before = await isDark();
    await btn.click(); await h.sleep(300);
    const mid = await isDark();
    await btn.click(); await h.sleep(300);
    const after = await isDark();
    return expect(before !== mid && before === after, "Giao diện đổi sáng ↔ tối đúng", "Giao diện không đổi khi nhấn nút");
  },
});

/* ======================================================================
 * 3.2 CHỨC NĂNG CỦA LỄ TÂN – khách hàng, thú cưng, tìm kiếm, đặt và xử lý lịch hẹn
 * ====================================================================== */
const G2 = "Chức năng của LỄ TÂN";
const UC11 = "UC1.1 Tạo mới hồ sơ khách hàng";

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC001: Bỏ trống tất cả các trường và nhấn "Lưu khách hàng"
// Pass khi: Hiển thị lỗi "Họ tên là bắt buộc", "Email không hợp lệ", "Số điện thoại phải gồm đúng 10 chữ số"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC001", group: G2, uc: UC11, shot: "uc11_empty",
  title: "Bỏ trống tất cả các trường và nhấn \"Lưu khách hàng\"",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form thêm khách hàng hiển thị", ""],
    ["2. Bỏ trống Họ tên, Email, SĐT", "", ""],
    ["3. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Họ tên là bắt buộc\", \"Email không hợp lệ\", \"Số điện thoại phải gồm đúng 10 chữ số\"",
  async run() {
    await openAddCustomer();
    await fillCustomer({});
    const t = await h.bodyText();
    const ok = t.includes("Họ tên là bắt buộc") && t.includes("Email không hợp lệ") && t.includes("Số điện thoại phải gồm đúng 10 chữ số");
    return expect(ok, "Hiển thị đủ 3 thông báo lỗi, không lưu dữ liệu", "Không hiển thị đủ thông báo lỗi");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC002: Bỏ trống Họ tên, các trường khác hợp lệ
// Pass khi: Hiển thị lỗi "Họ tên là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC002", group: G2, uc: UC11,
  title: "Bỏ trống Họ tên, các trường khác hợp lệ",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Bỏ trống Họ tên", "", ""],
    ["3. Nhập Email, SĐT hợp lệ", "", "a@test.vn / 0987654321"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Họ tên là bắt buộc\"",
  async run() {
    await openAddCustomer();
    await fillCustomer({ email: "a@test.vn", phone: "0987654321" });
    return expect(await h.waitText("Họ tên là bắt buộc", 2000), "Hiển thị \"Họ tên là bắt buộc\"", "Không báo lỗi họ tên");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC003: Email sai định dạng
// Pass khi: Hiển thị thông báo email không hợp lệ, không lưu khách hàng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC003", group: G2, uc: UC11,
  title: "Email sai định dạng",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, SĐT hợp lệ", "", "Lê Minh / 0987654321"],
    ["3. Nhập Email sai định dạng", "", "leminh.gmail.com"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị thông báo email không hợp lệ, không lưu khách hàng",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: "Lê Minh", email: "leminh.gmail.com", phone: "0987654321" });
    // Ô email có type="email" nên trình duyệt tự chặn trước khi form React kiểm tra.
    // Chấp nhận một trong hai: thông báo của trình duyệt hoặc "Email không hợp lệ" của form – miễn là KHÔNG lưu.
    const native = await validationMessage("[data-testid='input-customer-email']");
    const zod = await h.waitText("Email không hợp lệ", 1000);
    const stillOpen = await h.dialogOpen();
    return expect(stillOpen && (native || zod),
      `Form không được gửi, trình duyệt báo: "${native || "Email không hợp lệ"}"`, "Khách hàng vẫn được lưu");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC004: Kiểm thử giá trị biên: SĐT 9 chữ số
// Pass khi: Hiển thị lỗi "Số điện thoại phải gồm đúng 10 chữ số"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC004", group: G2, uc: UC11,
  title: "Kiểm thử giá trị biên: SĐT 9 chữ số",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email hợp lệ", "", "Lê Minh / leminh@test.vn"],
    ["3. Nhập SĐT 9 chữ số", "", "098765432"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Số điện thoại phải gồm đúng 10 chữ số\"",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: "Lê Minh", email: "leminh@test.vn", phone: "098765432" });
    return expect(await h.waitText("Số điện thoại phải gồm đúng 10 chữ số", 2000), "Hiển thị lỗi SĐT", "Không báo lỗi SĐT");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC005: Kiểm thử giá trị biên: SĐT 11 chữ số
// Pass khi: Hiển thị lỗi "Số điện thoại phải gồm đúng 10 chữ số"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC005", group: G2, uc: UC11,
  title: "Kiểm thử giá trị biên: SĐT 11 chữ số",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email hợp lệ", "", "Lê Minh / leminh@test.vn"],
    ["3. Nhập SĐT 11 chữ số", "", "09876543210"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Số điện thoại phải gồm đúng 10 chữ số\"",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: "Lê Minh", email: "leminh@test.vn", phone: "09876543210" });
    return expect(await h.waitText("Số điện thoại phải gồm đúng 10 chữ số", 2000), "Hiển thị lỗi SĐT", "Không báo lỗi SĐT");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC006: SĐT chứa ký tự chữ
// Pass khi: Hiển thị lỗi "Số điện thoại phải gồm đúng 10 chữ số"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC006", group: G2, uc: UC11,
  title: "SĐT chứa ký tự chữ",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email hợp lệ", "", "Lê Minh / leminh@test.vn"],
    ["3. Nhập SĐT có chữ", "", "09ab123456"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Số điện thoại phải gồm đúng 10 chữ số\"",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: "Lê Minh", email: "leminh@test.vn", phone: "09ab123456" });
    return expect(await h.waitText("Số điện thoại phải gồm đúng 10 chữ số", 2000), "Hiển thị lỗi SĐT", "Không báo lỗi SĐT");
  },
});

ctx.newCustomer = { name: `Khách Kiểm Thử ${RUN}`, email: `kt${RUN}@test.vn`, phone: `09${RUN}11`, address: "Hà Đông, Hà Nội" };
// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC007: Tất cả các trường nhập hợp lệ
// Pass khi: Hiển thị "Thêm khách hàng thành công", khách hàng xuất hiện trong danh sách
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC007", group: G2, uc: UC11, shot: "uc11_success",
  title: "Tất cả các trường nhập hợp lệ",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên", "", ctx.newCustomer.name],
    ["3. Nhập Email", "", ctx.newCustomer.email],
    ["4. Nhập SĐT", "", ctx.newCustomer.phone],
    ["5. Nhập Địa chỉ", "", ctx.newCustomer.address],
    ["6. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Thêm khách hàng thành công\", khách hàng xuất hiện trong danh sách",
  async run() {
    await openAddCustomer();
    await fillCustomer(ctx.newCustomer);
    const toast = await h.waitText("Thêm khách hàng thành công", 3000);
    const listed = await h.waitText(ctx.newCustomer.name, 3000);
    return expect(toast && listed, "Thông báo thành công, khách hàng có trong danh sách", "Không lưu được khách hàng");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC008: SĐT trùng với khách hàng đã có
// Pass khi: Hiển thị lỗi số điện thoại đã tồn tại, không tạo khách hàng (quy tắc nghiệp vụ UC1.1)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC008", group: G2, uc: UC11,
  title: "SĐT trùng với khách hàng đã có",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email mới, Địa chỉ", "", "Khách Trùng SĐT / trungsdt@test.vn / Hà Nội"],
    ["3. Nhập SĐT đã tồn tại (của Nguyễn Huy)", "", "0911000001"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi số điện thoại đã tồn tại, không tạo khách hàng (quy tắc nghiệp vụ UC1.1)",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: `Khách Trùng SĐT ${RUN}`, email: `trungsdt${RUN}@test.vn`, phone: "0911000001", address: "Hà Nội" });
    const saved = await h.waitText("Thêm khách hàng thành công", 2500);
    return expect(!saved, "Hệ thống từ chối SĐT trùng", "Hệ thống vẫn lưu khách hàng có SĐT trùng 0911000001");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC009: Email trùng với khách hàng đã có
// Pass khi: Hiển thị lỗi email đã tồn tại, không tạo khách hàng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC009", group: G2, uc: UC11,
  title: "Email trùng với khách hàng đã có",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, SĐT mới, Địa chỉ", "", "Khách Trùng Email / 0977000999 / Hà Nội"],
    ["3. Nhập Email đã tồn tại", "", "owner.huy@example.com"],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi email đã tồn tại, không tạo khách hàng",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: `Khách Trùng Email ${RUN}`, email: "owner.huy@example.com", phone: "0977000999", address: "Hà Nội" });
    const saved = await h.waitText("Thêm khách hàng thành công", 2500);
    return expect(!saved, "Hệ thống từ chối email trùng", "Hệ thống vẫn lưu khách hàng có email trùng");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.1-TC010: Bỏ trống Địa chỉ (trường không bắt buộc), các trường khác hợp lệ
// Pass khi: Hiển thị "Thêm khách hàng thành công" (Địa chỉ không có dấu * nên không bắt buộc)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.1-TC010", group: G2, uc: UC11, shot: "uc11_no_address",
  title: "Bỏ trống Địa chỉ (trường không bắt buộc), các trường khác hợp lệ",
  steps: [
    ["1. Chọn \"Thêm khách hàng\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email, SĐT hợp lệ", "", `Khách Không Địa Chỉ / kdc${RUN}@test.vn / 09${RUN}22`],
    ["3. Bỏ trống Địa chỉ", "", ""],
    ["4. Nhấn \"Lưu khách hàng\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Thêm khách hàng thành công\" (Địa chỉ không có dấu * nên không bắt buộc)",
  async run() {
    await openAddCustomer();
    await fillCustomer({ name: `Khách Không Địa Chỉ ${RUN}`, email: `kdc${RUN}@test.vn`, phone: `09${RUN}22` });
    const ok = await h.waitText("Thêm khách hàng thành công", 3000);
    return expect(ok, "Thêm khách hàng thành công",
      "Hiển thị \"Không thể thêm khách hàng\" kèm lỗi JSON: \"String must contain at least 1 character(s)\", path [\"address\"]");
  },
});

const UC13 = "UC1.3 Chỉnh sửa hồ sơ khách hàng";
// ──────────────────────────────────────────────────────────────────────
// UC1.3-TC001: Cập nhật địa chỉ khách hàng hợp lệ
// Pass khi: Hiển thị "Cập nhật khách hàng thành công", địa chỉ mới hiển thị trong danh sách
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.3-TC001", group: G2, uc: UC13,
  title: "Cập nhật địa chỉ khách hàng hợp lệ",
  steps: [
    ["1. Chọn \"Chỉnh sửa\" tại khách hàng vừa tạo", "Form cập nhật hiển thị dữ liệu cũ", ""],
    ["2. Sửa Địa chỉ", "", "Cầu Giấy, Hà Nội"],
    ["3. Nhấn \"Lưu\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Cập nhật khách hàng thành công\", địa chỉ mới hiển thị trong danh sách",
  async run() {
    await h.open("/customers");
    await (await customerRowButton(ctx.newCustomer.name, "Chỉnh sửa")).click();
    await h.sleep(500);
    await h.type("div[role='dialog'] #address", "Cầu Giấy, Hà Nội");
    await h.driver.findElement(h.xp("//div[@role='dialog']//button[@type='submit']")).click();
    const ok = await h.waitText("Cập nhật khách hàng thành công", 3000);
    const shown = await h.waitText("Cầu Giấy, Hà Nội", 3000);
    return expect(ok && shown, "Cập nhật thành công, địa chỉ mới hiển thị", "Không cập nhật được");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.3-TC002: Cập nhật SĐT không hợp lệ
// Pass khi: Hiển thị lỗi "Số điện thoại phải gồm đúng 10 chữ số", không lưu
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.3-TC002", group: G2, uc: UC13,
  title: "Cập nhật SĐT không hợp lệ",
  steps: [
    ["1. Chọn \"Chỉnh sửa\" tại khách hàng", "Form cập nhật hiển thị", ""],
    ["2. Sửa SĐT thành 3 chữ số", "", "123"],
    ["3. Nhấn \"Lưu\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Số điện thoại phải gồm đúng 10 chữ số\", không lưu",
  async run() {
    await h.open("/customers");
    await (await customerRowButton(ctx.newCustomer.name, "Chỉnh sửa")).click();
    await h.sleep(500);
    await h.type("div[role='dialog'] #phone", "123");
    await h.driver.findElement(h.xp("//div[@role='dialog']//button[@type='submit']")).click();
    return expect(await h.waitText("Số điện thoại phải gồm đúng 10 chữ số", 2000), "Hiển thị lỗi SĐT, không lưu", "Không báo lỗi");
  },
});

const UC14 = "UC1.4 Tạm khóa / Duyệt hồ sơ khách hàng";
// ──────────────────────────────────────────────────────────────────────
// UC1.4-TC001: Tạm khóa khách hàng đang hoạt động
// Pass khi: Hiển thị "Đã cập nhật trạng thái khách hàng", trạng thái đổi thành "Chờ duyệt"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.4-TC001", group: G2, uc: UC14,
  title: "Tạm khóa khách hàng đang hoạt động",
  steps: [
    ["1. Truy cập Quản lý khách hàng", "Danh sách hiển thị", ""],
    ["2. Nhấn \"Tạm khóa\" tại khách hàng vừa tạo", "Trạng thái chuyển \"Chờ duyệt\"", ctx.newCustomer.name],
  ],
  expected: "Hiển thị \"Đã cập nhật trạng thái khách hàng\", trạng thái đổi thành \"Chờ duyệt\"",
  async run() {
    await h.open("/customers");
    await (await customerRowButton(ctx.newCustomer.name, "Tạm khóa")).click();
    const ok = await h.waitText("Đã cập nhật trạng thái khách hàng", 3000);
    await h.sleep(800);
    const btn = await h.driver.findElements(h.xp(`//tr[.//p[normalize-space()='${ctx.newCustomer.name}']]//button[normalize-space()='Duyệt']`));
    return expect(ok && btn.length > 0, "Trạng thái chuyển sang \"Chờ duyệt\"", "Trạng thái không đổi");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC1.4-TC002: Duyệt lại khách hàng đang bị khóa
// Pass khi: Hiển thị "Đã duyệt khách hàng", trạng thái đổi thành "Đang hoạt động"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.4-TC002", group: G2, uc: UC14,
  title: "Duyệt lại khách hàng đang bị khóa",
  steps: [["1. Nhấn \"Duyệt\" tại khách hàng đang \"Chờ duyệt\"", "Trạng thái chuyển \"Đang hoạt động\"", ctx.newCustomer.name]],
  expected: "Hiển thị \"Đã duyệt khách hàng\", trạng thái đổi thành \"Đang hoạt động\"",
  async run() {
    await h.open("/customers");
    await (await customerRowButton(ctx.newCustomer.name, "Duyệt")).click();
    return expect(await h.waitText("Đã duyệt khách hàng", 3000), "Khách hàng được duyệt", "Không duyệt được");
  },
});

const UC15 = "UC1.5 Tìm kiếm khách hàng / thú cưng";
/**
 * Gõ từ khóa vào ô tìm kiếm khách hàng bằng bàn phím như người thật (typeSlow),
 * ghi lại giá trị thực sự có trong ô (ctx.lastSearch) để báo cáo nếu ô bị mất ký tự.
 */
async function searchCustomers(term) {
  await h.open("/customers");
  await h.typeSlow("input[placeholder='Tìm theo tên, email, số điện thoại']", term);
  await h.sleep(1200);
  const v = await h.driver.executeScript("const e=document.querySelector(\"input[placeholder='Tìm theo tên, email, số điện thoại']\");return e?e.value:''");
  ctx.lastSearch = v;
  return h.bodyText();
}
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC001: Tìm khách hàng theo tên
// Pass khi: Chỉ hiển thị khách hàng "Trần Lan"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC001", group: G2, uc: UC15,
  title: "Tìm khách hàng theo tên",
  steps: [["1. Nhập tên vào ô tìm kiếm", "Danh sách được lọc", "Trần Lan"]],
  expected: "Chỉ hiển thị khách hàng \"Trần Lan\"",
  async run() {
    const t = await searchCustomers("Trần Lan");
    return expect(t.includes("Danh sách khách hàng (1)") && t.includes("Trần Lan"), "Hiển thị 1 kết quả: Trần Lan", `Ô tìm kiếm mất focus sau ký tự đầu – chỉ nhận "${ctx.lastSearch}", danh sách lọc sai`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC002: Tìm khách hàng theo số điện thoại
// Pass khi: Hiển thị khách hàng "Phạm Tuấn"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC002", group: G2, uc: UC15,
  title: "Tìm khách hàng theo số điện thoại",
  steps: [["1. Nhập SĐT vào ô tìm kiếm", "Danh sách được lọc", "0911000003"]],
  expected: "Hiển thị khách hàng \"Phạm Tuấn\"",
  async run() {
    const t = await searchCustomers("0911000003");
    return expect(t.includes("Phạm Tuấn") && t.includes("Danh sách khách hàng (1)"), "Hiển thị 1 kết quả: Phạm Tuấn", `Ô tìm kiếm mất focus sau ký tự đầu – chỉ nhận "${ctx.lastSearch}", danh sách lọc sai`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC003: Tìm với từ khóa không tồn tại
// Pass khi: Hiển thị "Không có khách hàng phù hợp."
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC003", group: G2, uc: UC15,
  title: "Tìm với từ khóa không tồn tại",
  steps: [["1. Nhập từ khóa không có trong dữ liệu", "Danh sách rỗng", "zzzkhongco"]],
  expected: "Hiển thị \"Không có khách hàng phù hợp.\"",
  async run() {
    const t = await searchCustomers("zzzkhongco");
    return expect(t.includes("Không có khách hàng phù hợp."), `Hiển thị \"Không có khách hàng phù hợp.\" (ô tìm kiếm chỉ nhận \"${ctx.lastSearch}\")`, "Vẫn hiển thị khách hàng");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC004: Tìm thú cưng theo tên chủ nuôi
// Pass khi: Hiển thị đúng 2 thú cưng của khách hàng Phạm Tuấn (Bun, Nau)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC004", group: G2, uc: UC15,
  title: "Tìm thú cưng theo tên chủ nuôi",
  steps: [["1. Nhập tên khách hàng vào ô \"Tìm thú cưng theo tên khách hàng\"", "Hiển thị thú cưng của khách", "Phạm Tuấn"]],
  expected: "Hiển thị đúng 2 thú cưng của khách hàng Phạm Tuấn (Bun, Nau)",
  async run() {
    await h.open("/customers");
    await h.type("input[placeholder='Nhập tên khách hàng để tìm thú cưng']", "Phạm Tuấn");
    await h.sleep(1200);
    const expectedPets = ctx.pets.filter((p) => p.customerId === ctx.customers.find((c) => c.name === "Phạm Tuấn").id);
    const t = await h.bodyText();
    const ok = expectedPets.every((p) => t.includes(p.name));
    return expect(ok, `Hiển thị ${expectedPets.map((p) => p.name).join(", ")}`, "Không hiển thị đúng thú cưng");
  },
});
const PENDING_CUSTOMERS = ["Huỳnh Hoàng Nam", "Ngô Mỹ Duyên", "Huỳnh Bích Ngọc"];
async function filterCustomerStatus(label) {
  await h.open("/customers");
  const trigger = await h.driver.findElement(h.xp("//button[@role='combobox'][contains(normalize-space(),'Tất cả trạng thái')]"));
  await h.selectOption(trigger, label);
  await h.sleep(1200);
  return h.bodyText();
}
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC005: Lọc khách hàng theo trạng thái "Chờ duyệt"
// Pass khi: Hiển thị đúng 3 khách hàng chờ duyệt: ${PENDING_CUSTOMERS.join(", ")}
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC005", group: G2, uc: UC15,
  title: "Lọc khách hàng theo trạng thái \"Chờ duyệt\"",
  steps: [
    ["1. Truy cập Quản lý khách hàng", "Danh sách 30 khách hàng mẫu hiển thị", ""],
    ["2. Chọn bộ lọc trạng thái \"Chờ duyệt\"", "Danh sách được lọc", "Chờ duyệt"],
  ],
  expected: `Hiển thị đúng 3 khách hàng chờ duyệt: ${PENDING_CUSTOMERS.join(", ")}`,
  async run() {
    const t = await filterCustomerStatus("Chờ duyệt");
    const ok = t.includes("Danh sách khách hàng (3)") && PENDING_CUSTOMERS.every((n) => t.includes(n));
    return expect(ok, "Hiển thị đúng 3 khách hàng chờ duyệt", "Danh sách lọc sai");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.5-TC006: Lọc khách hàng theo trạng thái "Đang hoạt động"
// Pass khi: Hiển thị toàn bộ khách hàng đang hoạt động (tổng số khách hàng trừ 3 khách chờ duyệt), không có khách chờ duyệt
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.5-TC006", group: G2, uc: UC15,
  title: "Lọc khách hàng theo trạng thái \"Đang hoạt động\"",
  steps: [
    ["1. Truy cập Quản lý khách hàng", "Danh sách hiển thị", ""],
    ["2. Chọn bộ lọc trạng thái \"Đang hoạt động\"", "Danh sách được lọc", "Đang hoạt động"],
  ],
  expected: "Hiển thị toàn bộ khách hàng đang hoạt động (tổng số khách hàng trừ 3 khách chờ duyệt), không có khách chờ duyệt",
  async run() {
    const all = (await h.api("GET", "/api/customers")).data;
    const active = all.filter((c) => c.isActive).length;
    const t = await filterCustomerStatus("Đang hoạt động");
    const ok = t.includes(`Danh sách khách hàng (${active})`) && !PENDING_CUSTOMERS.some((n) => t.includes(n));
    return expect(ok, `Hiển thị ${active} khách hàng đang hoạt động`, "Danh sách lọc sai");
  },
});

const UC12 = "UC1.2 Tạo mới hồ sơ thú cưng";
// ──────────────────────────────────────────────────────────────────────
// UC1.2-TC001: Bỏ trống Tên và Loài thú cưng
// Pass khi: Hiển thị lỗi "Tên thú cưng là bắt buộc", "Loài là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.2-TC001", group: G2, uc: UC12,
  title: "Bỏ trống Tên và Loài thú cưng",
  steps: [
    ["1. Nhấn \"Thêm thú cưng\" tại khách hàng Nguyễn Huy", "Form thêm thú cưng hiển thị", ""],
    ["2. Bỏ trống Tên, Loài", "", ""],
    ["3. Nhấn \"Lưu thú cưng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Tên thú cưng là bắt buộc\", \"Loài là bắt buộc\"",
  async run() {
    await openAddPet();
    await savePet();
    const t = await h.bodyText();
    return expect(t.includes("Tên thú cưng là bắt buộc") && t.includes("Loài là bắt buộc"), "Hiển thị 2 thông báo lỗi", "Không báo lỗi");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.2-TC002: Nhập Tên, bỏ trống Loài
// Pass khi: Hiển thị lỗi "Loài là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.2-TC002", group: G2, uc: UC12,
  title: "Nhập Tên, bỏ trống Loài",
  steps: [
    ["1. Nhấn \"Thêm thú cưng\"", "Form hiển thị", ""],
    ["2. Nhập Tên thú cưng", "", "Mướp"],
    ["3. Bỏ trống Loài, nhấn \"Lưu thú cưng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Loài là bắt buộc\"",
  async run() {
    await openAddPet();
    await h.type("[data-testid='input-pet-name']", "Mướp");
    await savePet();
    return expect(await h.waitText("Loài là bắt buộc", 2000), "Hiển thị lỗi Loài", "Không báo lỗi");
  },
});
ctx.petName = `Bông ${RUN}`;
// ──────────────────────────────────────────────────────────────────────
// UC1.2-TC003: Thông tin thú cưng hợp lệ
// Pass khi: Hiển thị "Thêm thú cưng thành công", số thú cưng của khách hàng tăng 1
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.2-TC003", group: G2, uc: UC12, shot: "uc12_success",
  title: "Thông tin thú cưng hợp lệ",
  steps: [
    ["1. Nhấn \"Thêm thú cưng\" tại Nguyễn Huy", "Form hiển thị, khách hàng tự điền", ""],
    ["2. Nhập Tên", "", ctx.petName],
    ["3. Chọn Loài", "", "Mèo"],
    ["4. Nhập Tuổi, Cân nặng, Microchip", "", "2 / 3.5 / MC-" + RUN],
    ["5. Nhấn \"Lưu thú cưng\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Thêm thú cưng thành công\", số thú cưng của khách hàng tăng 1",
  async run() {
    await openAddPet();
    await h.type("[data-testid='input-pet-name']", ctx.petName);
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-species']")), "Mèo");
    await h.setValue(await h.driver.findElement(h.By.css("#age")), "2");
    await h.type("#weight", "3.5");
    await h.type("#microchip", "MC-" + RUN);
    await savePet();
    return expect(await h.waitText("Thêm thú cưng thành công", 3000), "Thêm thú cưng thành công", "Không thêm được thú cưng");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.2-TC004: Mã microchip trùng với thú cưng đã có
// Pass khi: Hiển thị "Microchip đã tồn tại, vui lòng kiểm tra lại." (luồng thay thế UC1.2)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.2-TC004", group: G2, uc: UC12,
  title: "Mã microchip trùng với thú cưng đã có",
  steps: [
    ["1. Nhấn \"Thêm thú cưng\"", "Form hiển thị", ""],
    ["2. Nhập Tên, chọn Loài", "", "Mực / Chó"],
    ["3. Nhập microchip đã dùng ở TC003", "", "MC-" + RUN],
    ["4. Nhấn \"Lưu thú cưng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị \"Microchip đã tồn tại, vui lòng kiểm tra lại.\" (luồng thay thế UC1.2)",
  async run() {
    await openAddPet();
    await h.type("[data-testid='input-pet-name']", "Mực " + RUN);
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-species']")), "Chó");
    await h.type("#microchip", "MC-" + RUN);
    await savePet();
    const saved = await h.waitText("Thêm thú cưng thành công", 2500);
    return expect(!saved, "Hệ thống từ chối microchip trùng", "Hệ thống vẫn lưu thú cưng có microchip trùng");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC1.2-TC005: Kiểm thử giá trị biên: Tuổi âm
// Pass khi: Không lưu thú cưng, hiển thị thông báo lỗi
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC1.2-TC005", group: G2, uc: UC12,
  title: "Kiểm thử giá trị biên: Tuổi âm",
  steps: [
    ["1. Nhấn \"Thêm thú cưng\"", "Form hiển thị", ""],
    ["2. Nhập Tên, chọn Loài", "", "Na / Thỏ"],
    ["3. Nhập Tuổi âm", "", "-1"],
    ["4. Nhấn \"Lưu thú cưng\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Không lưu thú cưng, hiển thị thông báo lỗi",
  async run() {
    await openAddPet();
    await h.type("[data-testid='input-pet-name']", "Na " + RUN);
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-species']")), "Thỏ");
    await h.setValue(await h.driver.findElement(h.By.css("#age")), "-1");
    await savePet();
    const err = await h.waitText("Không thể thêm thú cưng", 2500);
    return expect(err, "Hiển thị \"Không thể thêm thú cưng\"", "Thú cưng tuổi âm vẫn được lưu");
  },
});

const UC21 = "UC2.1 Đặt lịch khám";
const tomorrow = dateKey(addDays(1));
// ──────────────────────────────────────────────────────────────────────
// UC2.1-TC001: Bỏ trống tất cả các trường và nhấn "Lưu"
// Pass khi: Hiển thị thông báo "Vui lòng chọn khách hàng", "Vui lòng chọn thú cưng"...
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.1-TC001", group: G2, uc: UC21,
  title: "Bỏ trống tất cả các trường và nhấn \"Lưu\"",
  steps: [
    ["1. Chọn \"Tạo lịch hẹn\"", "Form tạo lịch hẹn hiển thị", ""],
    ["2. Không chọn khách hàng, thú cưng, ngày, dịch vụ", "", ""],
    ["3. Nhấn nút lưu", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị thông báo \"Vui lòng chọn khách hàng\", \"Vui lòng chọn thú cưng\"...",
  async run() {
    await openAppointmentDialog();
    await h.driver.findElement(h.By.css("[data-testid='button-save-appointment']")).click();
    await h.sleep(1000);
    const t = await h.bodyText();
    const shown = t.includes("Vui lòng chọn khách hàng") || t.includes("Vui lòng chọn thú cưng");
    return expect(shown, "Hiển thị thông báo lỗi",
      "Form không gửi nhưng không hiển thị thông báo lỗi nào cho người dùng");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.1-TC002: Đặt lịch hợp lệ
// Pass khi: Hiển thị "Đặt lịch thành công"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.1-TC002", group: G2, uc: UC21, shot: "uc21_success",
  title: "Đặt lịch hợp lệ",
  steps: [
    ["1. Chọn \"Tạo lịch hẹn\"", "Form hiển thị", ""],
    ["2. Chọn Khách hàng, Thú cưng", "", `Nguyễn Huy / ${ctx.petName}`],
    ["3. Chọn Bác sĩ", "", "Bác sĩ đầu tiên trong danh sách"],
    ["4. Chọn Ngày, Giờ khám", "", `${tomorrow} 15:00`],
    ["5. Chọn Dịch vụ", "", "Khám tổng quát"],
    ["6. Nhấn nút lưu", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Đặt lịch thành công\"",
  async run() {
    await openAppointmentDialog();
    await fillAppointment({ customer: "Nguyễn Huy", pet: ctx.petName, vet: ctx.vet.name, date: tomorrow, time: "15:00", service: "Khám tổng quát" });
    return expect(await h.waitText("Đặt lịch thành công", 3000), "Đặt lịch thành công", "Không đặt được lịch");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.1-TC003: Đặt lịch trùng khung giờ của bác sĩ
// Pass khi: Hiển thị "Không thể đặt lịch" – bác sĩ đã có lịch trong khung giờ
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.1-TC003", group: G2, uc: UC21,
  title: "Đặt lịch trùng khung giờ của bác sĩ",
  steps: [
    ["1. Chọn \"Tạo lịch hẹn\"", "Form hiển thị", ""],
    ["2. Chọn khách hàng, thú cưng khác", "", "Trần Lan"],
    ["3. Chọn cùng Bác sĩ, Ngày, Giờ với TC002", "", `${tomorrow} 15:00`],
    ["4. Chọn dịch vụ, nhấn lưu", "Hiển thị thông báo lỗi", "Tiêm phòng"],
  ],
  expected: "Hiển thị \"Không thể đặt lịch\" – bác sĩ đã có lịch trong khung giờ",
  async run() {
    const lan = ctx.customers.find((c) => c.name === "Trần Lan");
    const lanPet = ctx.pets.find((p) => p.customerId === lan.id);
    await openAppointmentDialog();
    await fillAppointment({ customer: "Trần Lan", pet: lanPet.name, vet: ctx.vet.name, date: tomorrow, time: "15:00", service: "Tiêm phòng" });
    const t = await h.bodyText();
    return expect(t.includes("Không thể đặt lịch"), "Hiển thị \"Không thể đặt lịch\" (Veterinarian already has an appointment in this timeslot)", "Lịch trùng vẫn được tạo");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.1-TC004: Đặt lịch trùng khung giờ của thú cưng
// Pass khi: Hiển thị "Không thể đặt lịch" – thú cưng đã có lịch trong khung giờ
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.1-TC004", group: G2, uc: UC21,
  title: "Đặt lịch trùng khung giờ của thú cưng",
  steps: [
    ["1. Chọn \"Tạo lịch hẹn\"", "Form hiển thị", ""],
    ["2. Chọn cùng khách hàng, thú cưng với TC002, không chọn bác sĩ", "", ctx.petName],
    ["3. Chọn cùng Ngày, Giờ", "", `${tomorrow} 15:00`],
    ["4. Chọn dịch vụ, nhấn lưu", "Hiển thị thông báo lỗi", "Tái khám"],
  ],
  expected: "Hiển thị \"Không thể đặt lịch\" – thú cưng đã có lịch trong khung giờ",
  async run() {
    await openAppointmentDialog();
    await fillAppointment({ customer: "Nguyễn Huy", pet: ctx.petName, date: tomorrow, time: "15:00", service: "Tái khám" });
    const t = await h.bodyText();
    return expect(t.includes("Không thể đặt lịch"), "Hiển thị \"Không thể đặt lịch\" (Pet already has an appointment in this timeslot)", "Lịch trùng vẫn được tạo");
  },
});
const yesterday = dateKey(addDays(-1));
// ──────────────────────────────────────────────────────────────────────
// UC2.1-TC005: Đặt lịch vào ngày trong quá khứ
// Pass khi: Hệ thống từ chối lịch hẹn trong quá khứ
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.1-TC005", group: G2, uc: UC21,
  title: "Đặt lịch vào ngày trong quá khứ",
  steps: [
    ["1. Chọn \"Tạo lịch hẹn\"", "Form hiển thị", ""],
    ["2. Chọn khách hàng, thú cưng, dịch vụ hợp lệ", "", `Nguyễn Huy / ${ctx.petName}`],
    ["3. Chọn ngày hôm qua", "", `${yesterday} 10:00`],
    ["4. Nhấn lưu", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hệ thống từ chối lịch hẹn trong quá khứ",
  async run() {
    await openAppointmentDialog();
    await fillAppointment({ customer: "Nguyễn Huy", pet: ctx.petName, date: yesterday, time: "10:00", service: "Chăm sóc" });
    const saved = await h.waitText("Đặt lịch thành công", 2500);
    return expect(!saved, "Từ chối lịch quá khứ", `Hệ thống vẫn tạo lịch hẹn ngày ${yesterday}`);
  },
});

const UC22 = "UC2.2 Xác nhận / Hủy / Hoàn thành lịch hẹn";
// ──────────────────────────────────────────────────────────────────────
// UC2.2-TC001: Xác nhận lịch hẹn đang chờ
// Pass khi: Hiển thị "Đã cập nhật lịch hẹn", lịch hẹn chuyển trạng thái "Đã xác nhận"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.2-TC001", group: G2, uc: UC22,
  title: "Xác nhận lịch hẹn đang chờ",
  steps: [
    ["1. Có lịch hẹn \"Chờ xác nhận\" ngày mai", "Lịch hẹn hiển thị ở tab \"Quản lý toàn bộ\"", `Cún Xác Nhận / ${tomorrow} 11:00`],
    ["2. Nhấn \"Xác nhận\" tại lịch hẹn", "Trạng thái \"Đã xác nhận\"", ""],
  ],
  expected: "Hiển thị \"Đã cập nhật lịch hẹn\", lịch hẹn chuyển trạng thái \"Đã xác nhận\"",
  async run() {
    ctx.confirmPet = await createPetApi("Cún Xác Nhận " + RUN);
    const ap = await h.api("POST", "/api/appointments", { petId: ctx.confirmPet.id, customerId: ctx.huy.id, appointmentDate: `${tomorrow}T11:00:00`, appointmentType: "Khám tổng quát" });
    ctx.confirmAppt = ap.data;
    await (await managementCard(ctx.confirmPet.name, "Xác nhận")).click();
    const ok = await h.waitText("Đã cập nhật lịch hẹn", 3000);
    const st = (await h.api("GET", `/api/appointments/${ctx.confirmAppt.id}`)).data.status;
    return expect(ok && st === "confirmed", "Lịch hẹn chuyển \"Đã xác nhận\" (confirmed)", `Trạng thái: ${st}`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.2-TC002: Hoàn thành lịch hẹn đã xác nhận
// Pass khi: Hiển thị "Đã cập nhật lịch hẹn", nút "Hủy lịch" bị vô hiệu
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.2-TC002", group: G2, uc: UC22,
  title: "Hoàn thành lịch hẹn đã xác nhận",
  steps: [["1. Nhấn \"Hoàn thành\" tại lịch hẹn đã xác nhận ở TC001", "Trạng thái \"Hoàn thành\"", "Cún Xác Nhận"]],
  expected: "Hiển thị \"Đã cập nhật lịch hẹn\", nút \"Hủy lịch\" bị vô hiệu",
  async run() {
    await (await managementCard(ctx.confirmPet.name, "Hoàn thành")).click();
    const ok = await h.waitText("Đã cập nhật lịch hẹn", 3000);
    await h.sleep(800);
    const cancel = await managementCard(ctx.confirmPet.name, "Hủy lịch");
    const disabled = !(await cancel.isEnabled());
    const st = (await h.api("GET", `/api/appointments/${ctx.confirmAppt.id}`)).data.status;
    return expect(ok && disabled && st === "completed", "Lịch hẹn hoàn thành, nút Hủy lịch bị khóa", `Trạng thái: ${st}`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.2-TC003: Hủy lịch hẹn còn trên 1 tiếng
// Pass khi: Hiển thị "Đã hủy lịch hẹn"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.2-TC003", group: G2, uc: UC22,
  title: "Hủy lịch hẹn còn trên 1 tiếng",
  steps: [
    ["1. Tạo lịch hẹn ngày mai cho thú cưng mới", "Lịch hẹn \"Chờ xác nhận\"", `${tomorrow} 09:00`],
    ["2. Nhấn \"Hủy lịch\"", "Trạng thái \"Đã hủy\"", ""],
  ],
  expected: "Hiển thị \"Đã hủy lịch hẹn\"",
  async run() {
    const pet = await createPetApi("Cún Hủy " + RUN);
    ctx.cancelPet = pet;
    await h.api("POST", "/api/appointments", { petId: pet.id, customerId: ctx.huy.id, appointmentDate: `${tomorrow}T09:00:00`, appointmentType: "Tiêm phòng" });
    await (await managementCard(pet.name, "Hủy lịch")).click();
    return expect(await h.waitText("Đã hủy lịch hẹn", 3000), "Lịch hẹn đã hủy", "Không hủy được");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.2-TC004: Hủy lịch hẹn khi còn dưới 1 tiếng
// Pass khi: Hệ thống từ chối – chỉ được hủy trước giờ hẹn ít nhất 1 tiếng (R2.2)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.2-TC004", group: G2, uc: UC22,
  title: "Hủy lịch hẹn khi còn dưới 1 tiếng",
  steps: [
    ["1. Có lịch hẹn bắt đầu sau 30 phút", "Lịch hẹn \"Chờ xác nhận\"", "Giờ hiện tại + 30 phút"],
    ["2. Nhấn \"Hủy lịch\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hệ thống từ chối – chỉ được hủy trước giờ hẹn ít nhất 1 tiếng (R2.2)",
  async run() {
    const pet = await createPetApi("Cún Gấp " + RUN);
    // Tạo lịch hẹn bắt đầu sau 30 phút qua API, rồi thử hủy trên giao diện.
    // Đặc tả R2.2: chỉ được hủy trước giờ hẹn ít nhất 1 tiếng → hệ thống đúng phải từ chối.
    const d = new Date(Date.now() + 30 * 60000);
    const local = `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    await h.api("POST", "/api/appointments", { petId: pet.id, customerId: ctx.huy.id, appointmentDate: local, appointmentType: "Khám tổng quát" });
    await (await managementCard(pet.name, "Hủy lịch")).click();
    const cancelled = await h.waitText("Đã hủy lịch hẹn", 2500);
    return expect(!cancelled, "Từ chối hủy lịch", "Lịch hẹn vẫn bị hủy dù chỉ còn 30 phút");
  },
});

/* ======================================================================
 * 3.3 CHỨC NĂNG CỦA BÁC SĨ – hồ sơ khám, tra cứu, ca trực, camera
 * ====================================================================== */
const G3 = "Chức năng của BÁC SĨ";
const UC31 = "UC3.1 Tạo hồ sơ khám bệnh";
// ──────────────────────────────────────────────────────────────────────
// UC3.1-TC001: Bỏ trống tất cả các trường và nhấn "Lưu hồ sơ"
// Pass khi: Hiển thị lỗi "Vui lòng chọn thú cưng", "Vui lòng chọn bác sĩ", "Triệu chứng là bắt buộc", "Chẩn đoán là bắt buộc", "Phác đồ điều trị là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.1-TC001", group: G3, uc: UC31, shot: "uc31_empty",
  title: "Bỏ trống tất cả các trường và nhấn \"Lưu hồ sơ\"",
  steps: [
    ["1. Mở tab \"Tạo hồ sơ mới\"", "Form hồ sơ khám hiển thị", ""],
    ["2. Không nhập dữ liệu, nhấn \"Lưu hồ sơ\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Vui lòng chọn thú cưng\", \"Vui lòng chọn bác sĩ\", \"Triệu chứng là bắt buộc\", \"Chẩn đoán là bắt buộc\", \"Phác đồ điều trị là bắt buộc\"",
  async run() {
    await openRecordForm();
    await saveRecord();
    const t = await h.bodyText();
    const msgs = ["Vui lòng chọn thú cưng", "Vui lòng chọn bác sĩ", "Triệu chứng là bắt buộc", "Chẩn đoán là bắt buộc", "Phác đồ điều trị là bắt buộc"];
    const missing = msgs.filter((m) => !t.includes(m));
    return expect(missing.length === 0, "Hiển thị đủ 5 thông báo lỗi", `Thiếu thông báo: ${missing.join(", ")}`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC3.1-TC002: Bỏ trống Chẩn đoán
// Pass khi: Hiển thị lỗi "Chẩn đoán là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.1-TC002", group: G3, uc: UC31,
  title: "Bỏ trống Chẩn đoán",
  steps: [
    ["1. Mở tab \"Tạo hồ sơ mới\"", "Form hiển thị", ""],
    ["2. Chọn Thú cưng, Bác sĩ", "", ctx.petName],
    ["3. Nhập Triệu chứng, Điều trị; bỏ trống Chẩn đoán", "", "Bỏ ăn 2 ngày / Truyền dịch"],
    ["4. Nhấn \"Lưu hồ sơ\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Chẩn đoán là bắt buộc\"",
  async run() {
    await openRecordForm();
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-pet']")), ctx.petName);
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-doctor']")), ctx.vet.name);
    await h.type("[data-testid='input-symptoms']", "Bỏ ăn 2 ngày");
    await h.type("[data-testid='input-treatment']", "Truyền dịch");
    await saveRecord();
    return expect(await h.waitText("Chẩn đoán là bắt buộc", 2000), "Hiển thị lỗi chẩn đoán", "Không báo lỗi");
  },
});
ctx.diagnosis = `Viêm dạ dày ${RUN}`;
// ──────────────────────────────────────────────────────────────────────
// UC3.1-TC003: Nhập đầy đủ thông tin hồ sơ khám hợp lệ
// Pass khi: Hiển thị "Lưu hồ sơ khám thành công", hồ sơ xuất hiện trong danh sách
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.1-TC003", group: G3, uc: UC31, shot: "uc31_success",
  title: "Nhập đầy đủ thông tin hồ sơ khám hợp lệ",
  steps: [
    ["1. Mở tab \"Tạo hồ sơ mới\"", "Form hiển thị", ""],
    ["2. Chọn Thú cưng, Bác sĩ", "", ctx.petName],
    ["3. Nhập Triệu chứng", "", "Bỏ ăn 2 ngày, nôn"],
    ["4. Nhập Chẩn đoán", "", ctx.diagnosis],
    ["5. Nhập Phác đồ điều trị", "", "Truyền dịch, kháng sinh 5 ngày"],
    ["6. Nhấn \"Lưu hồ sơ\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Lưu hồ sơ khám thành công\", hồ sơ xuất hiện trong danh sách",
  async run() {
    await openRecordForm();
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-pet']")), ctx.petName);
    await h.selectOption(await h.driver.findElement(h.By.css("[data-testid='select-doctor']")), ctx.vet.name);
    await h.type("[data-testid='input-symptoms']", "Bỏ ăn 2 ngày, nôn");
    await h.type("[data-testid='input-diagnosis']", ctx.diagnosis);
    await h.type("[data-testid='input-treatment']", "Truyền dịch, kháng sinh 5 ngày");
    await saveRecord();
    return expect(await h.waitText("Lưu hồ sơ khám thành công", 3000), "Lưu hồ sơ khám thành công", "Không lưu được hồ sơ");
  },
});
const UC33 = "UC3.3 Tra cứu lịch sử khám";
// ──────────────────────────────────────────────────────────────────────
// UC3.3-TC001: Tìm hồ sơ theo chẩn đoán
// Pass khi: Hiển thị "1 hồ sơ" có chẩn đoán tương ứng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.3-TC001", group: G3, uc: UC33,
  title: "Tìm hồ sơ theo chẩn đoán",
  steps: [
    ["1. Mở tab \"Danh sách hồ sơ\"", "Danh sách hồ sơ hiển thị", ""],
    ["2. Nhập chẩn đoán vào ô tìm kiếm", "Danh sách được lọc", ctx.diagnosis],
  ],
  expected: "Hiển thị \"1 hồ sơ\" có chẩn đoán tương ứng",
  async run() {
    await h.open("/medical-records");
    await h.type("input[placeholder='Tìm theo chẩn đoán, thú cưng, bác sĩ']", ctx.diagnosis);
    await h.sleep(800);
    const t = await h.bodyText();
    return expect(/(^|\D)1 hồ sơ/.test(t) && t.includes(ctx.diagnosis), "Hiển thị 1 hồ sơ đúng chẩn đoán", "Kết quả sai");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC3.3-TC002: Tìm hồ sơ với từ khóa không tồn tại
// Pass khi: Hiển thị "Không tìm thấy hồ sơ theo điều kiện tìm kiếm."
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.3-TC002", group: G3, uc: UC33,
  title: "Tìm hồ sơ với từ khóa không tồn tại",
  steps: [["1. Nhập từ khóa không có trong dữ liệu", "Danh sách rỗng", "zzzkhongco"]],
  expected: "Hiển thị \"Không tìm thấy hồ sơ theo điều kiện tìm kiếm.\"",
  async run() {
    await h.open("/medical-records");
    await h.type("input[placeholder='Tìm theo chẩn đoán, thú cưng, bác sĩ']", "zzzkhongco");
    return expect(await h.waitText("Không tìm thấy hồ sơ theo điều kiện tìm kiếm.", 2000), "Hiển thị thông báo không tìm thấy", "Sai kết quả");
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC3.3-TC003: Tìm hồ sơ theo chẩn đoán có nhiều kết quả
// Pass khi: Hiển thị "4 hồ sơ", tất cả có chẩn đoán "Viêm da dị ứng"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.3-TC003", group: G3, uc: UC33,
  title: "Tìm hồ sơ theo chẩn đoán có nhiều kết quả",
  steps: [
    ["1. Mở tab \"Danh sách hồ sơ\"", "Danh sách hồ sơ mẫu hiển thị", ""],
    ["2. Nhập chẩn đoán vào ô tìm kiếm", "Danh sách được lọc", "Viêm da dị ứng"],
  ],
  expected: "Hiển thị \"4 hồ sơ\", tất cả có chẩn đoán \"Viêm da dị ứng\"",
  async run() {
    await h.open("/medical-records");
    await h.type("input[placeholder='Tìm theo chẩn đoán, thú cưng, bác sĩ']", "Viêm da dị ứng");
    await h.sleep(800);
    const t = await h.bodyText();
    const rows = (t.match(/Viêm da dị ứng/g) || []).length - 0;
    return expect(/(^|\D)4 hồ sơ/.test(t) && rows >= 4, "Hiển thị 4 hồ sơ \"Viêm da dị ứng\"", `Kết quả sai (${rows} dòng khớp)`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC3.3-TC004: Hiển thị toàn bộ lịch sử khám
// Pass khi: Số hồ sơ hiển thị bằng tổng số hồ sơ trong CSDL (43 hồ sơ mẫu + hồ sơ tạo ở UC3.1-TC003)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC3.3-TC004", group: G3, uc: UC33,
  title: "Hiển thị toàn bộ lịch sử khám",
  steps: [["1. Mở tab \"Danh sách hồ sơ\", không nhập từ khóa", "Danh sách đầy đủ", ""]],
  expected: "Số hồ sơ hiển thị bằng tổng số hồ sơ trong CSDL (43 hồ sơ mẫu + hồ sơ tạo ở UC3.1-TC003)",
  async run() {
    const total = (await h.api("GET", "/api/medical-records")).data.length;
    await h.open("/medical-records");
    await h.sleep(800);
    const t = await h.bodyText();
    return expect(new RegExp(`(^|\\D)${total} hồ sơ`).test(t), `Hiển thị đủ ${total} hồ sơ`, `Không hiển thị đủ ${total} hồ sơ`);
  },
});

const UC24 = "UC2.4 Quản lý ca làm việc bác sĩ";
const shiftDay = dateKey(addDays(3));
// ──────────────────────────────────────────────────────────────────────
// UC2.4-TC001: Không chọn bác sĩ và ngày trực
// Pass khi: Hiển thị "Vui lòng chọn bác sĩ và ngày trực"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.4-TC001", group: G3, uc: UC24,
  title: "Không chọn bác sĩ và ngày trực",
  steps: [
    ["1. Chọn \"Tạo ca trực\"", "Form tạo ca trực hiển thị", ""],
    ["2. Không chọn bác sĩ, ngày; nhấn \"Lưu ca trực\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị \"Vui lòng chọn bác sĩ và ngày trực\"",
  async run() {
    await openShiftDialog();
    await h.clickButton("Lưu ca trực");
    return expect(await h.waitText("Vui lòng chọn bác sĩ và ngày trực", 3000), "Hiển thị thông báo lỗi", "Không báo lỗi");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.4-TC002: Tạo ca trực hợp lệ
// Pass khi: Hiển thị "Đã tạo ca trực"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.4-TC002", group: G3, uc: UC24,
  title: "Tạo ca trực hợp lệ",
  steps: [
    ["1. Chọn \"Tạo ca trực\"", "Form hiển thị", ""],
    ["2. Chọn Bác sĩ, Ngày trực", "", `${ctx.vet ? "" : ""}Bác sĩ đầu tiên / ${shiftDay}`],
    ["3. Nhập giờ bắt đầu – kết thúc", "", "08:00 – 12:00"],
    ["4. Nhấn \"Lưu ca trực\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Đã tạo ca trực\"",
  async run() {
    await openShiftDialog();
    await h.selectByLabel("Bác sĩ", ctx.vet.name);
    await h.fillByLabel("Ngày trực", shiftDay);
    await h.clickButton("Lưu ca trực");
    return expect(await h.waitText("Đã tạo ca trực", 3000), "Tạo ca trực thành công", "Không tạo được ca trực");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.4-TC003: Giờ kết thúc sớm hơn giờ bắt đầu
// Pass khi: Hệ thống từ chối ca trực có giờ kết thúc trước giờ bắt đầu
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.4-TC003", group: G3, uc: UC24,
  title: "Giờ kết thúc sớm hơn giờ bắt đầu",
  steps: [
    ["1. Chọn \"Tạo ca trực\"", "Form hiển thị", ""],
    ["2. Chọn Bác sĩ, Ngày trực", "", shiftDay],
    ["3. Nhập giờ bắt đầu 17:00, kết thúc 13:00", "", "17:00 – 13:00"],
    ["4. Nhấn \"Lưu ca trực\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hệ thống từ chối ca trực có giờ kết thúc trước giờ bắt đầu",
  async run() {
    await openShiftDialog();
    await h.selectByLabel("Bác sĩ", ctx.vet.name);
    await h.fillByLabel("Ngày trực", shiftDay);
    await h.fillByLabel("Giờ bắt đầu", "17:00");
    await h.fillByLabel("Giờ kết thúc", "13:00");
    await h.clickButton("Lưu ca trực");
    const saved = await h.waitText("Đã tạo ca trực", 2500);
    return expect(!saved, "Từ chối ca trực sai giờ", "Ca trực 17:00 – 13:00 vẫn được tạo");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.4-TC004: Tạo ca trực trùng với ca đã có của bác sĩ
// Pass khi: Hệ thống báo trùng ca, không tạo ca trực (R2.4 – tránh trùng lịch)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.4-TC004", group: G3, uc: UC24,
  title: "Tạo ca trực trùng với ca đã có của bác sĩ",
  steps: [
    ["1. Chọn \"Tạo ca trực\"", "Form hiển thị", ""],
    ["2. Chọn cùng Bác sĩ, Ngày với TC002", "", shiftDay],
    ["3. Nhập giờ 09:00 – 11:00 (giao với 08:00 – 12:00)", "", "09:00 – 11:00"],
    ["4. Nhấn \"Lưu ca trực\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hệ thống báo trùng ca, không tạo ca trực (R2.4 – tránh trùng lịch)",
  async run() {
    await openShiftDialog();
    await h.selectByLabel("Bác sĩ", ctx.vet.name);
    await h.fillByLabel("Ngày trực", shiftDay);
    await h.fillByLabel("Giờ bắt đầu", "09:00");
    await h.fillByLabel("Giờ kết thúc", "11:00");
    await h.clickButton("Lưu ca trực");
    const saved = await h.waitText("Đã tạo ca trực", 2500);
    return expect(!saved, "Từ chối ca trùng", "Ca trực trùng giờ vẫn được tạo");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC2.4-TC005: Xóa ca trực
// Pass khi: Hiển thị "Đã xóa ca trực"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC2.4-TC005", group: G3, uc: UC24,
  title: "Xóa ca trực",
  steps: [["1. Nhấn \"Xóa ca\" tại một ca trực", "Ca trực bị xóa khỏi danh sách", ""]],
  expected: "Hiển thị \"Đã xóa ca trực\"",
  async run() {
    await h.open("/shifts");
    const btn = await h.driver.findElement(h.xp("(//button[normalize-space()='Xóa ca'])[1]"));
    await btn.click();
    return expect(await h.waitText("Đã xóa ca trực", 3000), "Xóa ca trực thành công", "Không xóa được");
  },
});

const UC82 = "UC8.2 Theo dõi thú cưng qua camera";
const ONLINE_ROOMS = ["01", "02", "03", "05", "06", "07", "08", "10", "11", "12", "14", "15"].map((n) => `Phòng ${n}`);
const OFFLINE_ROOMS = ["Phòng 04", "Phòng 09", "Phòng 13"];
// ──────────────────────────────────────────────────────────────────────
// UC8.2-TC001: Xem danh sách camera đang trực tuyến
// Pass khi: Hiển thị 12 camera trực tuyến (Phòng 01–03, 05–08, 10–12, 14, 15); không hiển thị 3 camera tắt (04, 09, 13)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC8.2-TC001", group: G3, uc: UC82,
  title: "Xem danh sách camera đang trực tuyến",
  steps: [["1. Chọn menu \"Camera giám sát\"", "Danh sách camera hiển thị", ""]],
  expected: "Hiển thị 12 camera trực tuyến (Phòng 01–03, 05–08, 10–12, 14, 15); không hiển thị 3 camera tắt (04, 09, 13)",
  async run() {
    await h.open("/cameras");
    await h.sleep(1500);
    const t = await h.bodyText();
    const online = ONLINE_ROOMS.filter((r) => t.includes(r));
    return expect(online.length === 12 && t.includes("Trực tuyến"), "Hiển thị đủ 12 camera trực tuyến", `Chỉ hiển thị ${online.length}/12 camera`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC8.2-TC002: Lọc camera theo trạng thái "Ngoại tuyến"
// Pass khi: Hiển thị 3 camera Phòng 04, 09, 13 với nhãn "Ngoại tuyến"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC8.2-TC002", group: G3, uc: UC82,
  title: "Lọc camera theo trạng thái \"Ngoại tuyến\"",
  steps: [
    ["1. Chọn menu \"Camera giám sát\"", "Danh sách camera hiển thị", ""],
    ["2. Chọn bộ lọc trạng thái \"Ngoại tuyến\"", "Hiển thị camera ngoại tuyến", "Phòng 04, 09, 13 (camera đang tắt)"],
  ],
  expected: "Hiển thị 3 camera Phòng 04, 09, 13 với nhãn \"Ngoại tuyến\"",
  async run() {
    await h.open("/cameras");
    await h.sleep(1500);
    // Bộ lọc trạng thái camera là thẻ <select> HTML thường (không phải Radix) nên chọn option trực tiếp.
    const sel = await h.driver.findElement(h.By.css("select"));
    await sel.findElement(h.xp(".//option[@value='offline']")).click();
    await h.sleep(800);
    const t = await h.bodyText();
    const shown = OFFLINE_ROOMS.filter((r) => t.includes(r));
    return expect(shown.length === 3, "Hiển thị 3 camera ngoại tuyến",
      "Danh sách trống – API /api/camera-streams chỉ trả về camera đang hoạt động nên bộ lọc \"Ngoại tuyến\" không bao giờ có kết quả");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC8.2-TC003: Tìm camera theo số phòng
// Pass khi: Chỉ hiển thị camera Phòng 12
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC8.2-TC003", group: G3, uc: UC82,
  title: "Tìm camera theo số phòng",
  steps: [
    ["1. Chọn menu \"Camera giám sát\"", "Danh sách camera hiển thị", ""],
    ["2. Nhập số phòng vào ô tìm kiếm", "Danh sách được lọc", "Phòng 12"],
  ],
  expected: "Chỉ hiển thị camera Phòng 12",
  async run() {
    await h.open("/cameras");
    await h.sleep(1500);
    await h.type("input[placeholder='Tìm theo tên thú cưng hoặc phòng']", "Phòng 12");
    await h.sleep(600);
    const t = await h.bodyText();
    const others = ONLINE_ROOMS.filter((r) => r !== "Phòng 12" && t.includes(r));
    return expect(t.includes("Phòng 12") && others.length === 0, "Chỉ hiển thị camera Phòng 12", `Hiển thị thêm: ${others.join(", ")}`);
  },
});

/* ======================================================================
 * 3.4 CHỨC NĂNG CỦA QUẢN TRỊ VIÊN / KẾ TOÁN – bác sĩ, kho thuốc, hóa đơn, thanh toán, báo cáo
 * ====================================================================== */
const G4 = "Chức năng của QUẢN TRỊ VIÊN / KẾ TOÁN";
const UC61 = "UC6.1 Quản lý thông tin bác sĩ";
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC001: Bỏ trống tất cả các trường và nhấn "Tạo bác sĩ"
// Pass khi: Hiển thị thông báo lỗi rõ ràng cho từng trường bắt buộc
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC001", group: G4, uc: UC61,
  title: "Bỏ trống tất cả các trường và nhấn \"Tạo bác sĩ\"",
  steps: [
    ["1. Chọn \"Thêm bác sĩ\"", "Form thêm bác sĩ hiển thị", ""],
    ["2. Không nhập dữ liệu, nhấn \"Tạo bác sĩ\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị thông báo lỗi rõ ràng cho từng trường bắt buộc",
  async run() {
    await openDoctorDialog();
    await h.clickButton("Tạo bác sĩ");
    await h.sleep(1500);
    const t = await h.bodyText();
    const shown = t.includes("Không thể thêm bác sĩ");
    const friendly = !/"code"|invalid_type|too_small|\[\s*\{/.test(t);
    return expect(shown && friendly, "Hiển thị \"Không thể thêm bác sĩ\" kèm lỗi rõ ràng",
      shown ? "Hiển thị \"Không thể thêm bác sĩ\" kèm chuỗi lỗi kỹ thuật (JSON của Zod), khó hiểu với người dùng" : "Không có thông báo lỗi");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC002: Email bác sĩ sai định dạng
// Pass khi: Hiển thị "Không thể thêm bác sĩ", không tạo bác sĩ
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC002", group: G4, uc: UC61,
  title: "Email bác sĩ sai định dạng",
  steps: [
    ["1. Chọn \"Thêm bác sĩ\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Chuyên khoa, Mã hành nghề hợp lệ", "", "BS. Hà An / Nội khoa / VET-" + RUN],
    ["3. Nhập Email sai", "", "haan.vet"],
    ["4. Nhấn \"Tạo bác sĩ\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị \"Không thể thêm bác sĩ\", không tạo bác sĩ",
  async run() {
    await openDoctorDialog();
    await fillDoctor({ name: "BS. Hà An", email: "haan.vet", specialization: "Nội khoa", license: "VET-" + RUN });
    const err = await h.waitText("Không thể thêm bác sĩ", 2500);
    return expect(err, "Hiển thị \"Không thể thêm bác sĩ\"", "Bác sĩ vẫn được tạo");
  },
});
ctx.doctorName = `BS. Kiểm Thử ${RUN}`;
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC003: Thêm bác sĩ hợp lệ
// Pass khi: Hiển thị "Đã thêm bác sĩ mới", bác sĩ xuất hiện trong danh sách
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC003", group: G4, uc: UC61,
  title: "Thêm bác sĩ hợp lệ",
  steps: [
    ["1. Chọn \"Thêm bác sĩ\"", "Form hiển thị", ""],
    ["2. Nhập Họ tên, Email", "", `${ctx.doctorName} / bs${RUN}@petclinic.vn`],
    ["3. Nhập SĐT, Chuyên khoa, Mã hành nghề", "", `0901234567 / Da liễu / VET-${RUN}`],
    ["4. Nhấn \"Tạo bác sĩ\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Đã thêm bác sĩ mới\", bác sĩ xuất hiện trong danh sách",
  async run() {
    await openDoctorDialog();
    await fillDoctor({ name: ctx.doctorName, email: `bs${RUN}@petclinic.vn`, phone: "0901234567", specialization: "Da liễu", license: "VET-" + RUN });
    const ok = await h.waitText("Đã thêm bác sĩ mới", 3000);
    return expect(ok && (await h.waitText(ctx.doctorName, 3000)), "Đã thêm bác sĩ mới", "Không thêm được bác sĩ");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC004: Cập nhật chuyên khoa của bác sĩ
// Pass khi: Hiển thị "Đã cập nhật bác sĩ"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC004", group: G4, uc: UC61,
  title: "Cập nhật chuyên khoa của bác sĩ",
  steps: [
    ["1. Nhấn \"Chỉnh sửa\" tại bác sĩ vừa tạo", "Form cập nhật hiển thị", ctx.doctorName],
    ["2. Sửa Chuyên khoa", "", "Ngoại khoa"],
    ["3. Nhấn \"Lưu cập nhật\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Đã cập nhật bác sĩ\"",
  async run() {
    await h.open("/doctors");
    await h.driver.findElement(h.xp(`(//*[normalize-space()='${ctx.doctorName}']/ancestor::div[contains(@class,'rounded')][.//button][1])//button[normalize-space()='Chỉnh sửa']`)).click();
    await h.sleep(500);
    await h.fillByLabel("Chuyên khoa", "Ngoại khoa");
    await h.clickButton("Lưu cập nhật");
    return expect(await h.waitText("Đã cập nhật bác sĩ", 3000), "Cập nhật thành công", "Không cập nhật được");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC005: Đổi trạng thái nhận lịch của bác sĩ
// Pass khi: Hiển thị "Đã cập nhật trạng thái nhận lịch", nút đổi thành "Đặt sẵn sàng"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC005", group: G4, uc: UC61,
  title: "Đổi trạng thái nhận lịch của bác sĩ",
  steps: [["1. Nhấn \"Đặt bận\" tại bác sĩ vừa tạo", "Trạng thái nhận lịch thay đổi", ctx.doctorName]],
  expected: "Hiển thị \"Đã cập nhật trạng thái nhận lịch\", nút đổi thành \"Đặt sẵn sàng\"",
  async run() {
    await h.open("/doctors");
    await h.driver.findElement(h.xp(`(//*[normalize-space()='${ctx.doctorName}']/ancestor::div[contains(@class,'rounded')][.//button][1])//button[normalize-space()='Đặt bận']`)).click();
    return expect(await h.waitText("Đã cập nhật trạng thái nhận lịch", 3000), "Trạng thái đổi thành bận", "Không đổi được");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC6.1-TC006: Tìm bác sĩ theo chuyên khoa
// Pass khi: Danh sách chỉ gồm bác sĩ có chuyên khoa "Ngoại khoa"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC6.1-TC006", group: G4, uc: UC61,
  title: "Tìm bác sĩ theo chuyên khoa",
  steps: [["1. Nhập chuyên khoa vào ô tìm kiếm", "Danh sách được lọc", "Ngoại khoa"]],
  expected: "Danh sách chỉ gồm bác sĩ có chuyên khoa \"Ngoại khoa\"",
  async run() {
    await h.open("/doctors");
    await h.type("input[placeholder='Tìm theo tên, email, chuyên khoa']", "Ngoại khoa");
    await h.sleep(1200);
    return expect(await h.waitText(ctx.doctorName, 2000), `Hiển thị ${ctx.doctorName}`, "Không tìm thấy");
  },
});

const UC41 = "UC4.1 Nhập kho thuốc / vật tư";
// ──────────────────────────────────────────────────────────────────────
// UC4.1-TC001: Bỏ trống các trường bắt buộc
// Pass khi: Hiển thị lỗi "Mã vật tư là bắt buộc", "Tên vật tư là bắt buộc", "Danh mục là bắt buộc", "Đơn vị là bắt buộc", "Giá là bắt buộc"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.1-TC001", group: G4, uc: UC41,
  title: "Bỏ trống các trường bắt buộc",
  steps: [
    ["1. Chọn \"Thêm vật tư\"", "Form thêm vật tư hiển thị", ""],
    ["2. Không nhập dữ liệu, nhấn \"Lưu vật tư\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Mã vật tư là bắt buộc\", \"Tên vật tư là bắt buộc\", \"Danh mục là bắt buộc\", \"Đơn vị là bắt buộc\", \"Giá là bắt buộc\"",
  async run() {
    await openInventoryDialog();
    await h.driver.findElement(h.By.css("[data-testid='button-save-inventory']")).click();
    await h.sleep(800);
    const t = await h.bodyText();
    const msgs = ["Mã vật tư là bắt buộc", "Tên vật tư là bắt buộc", "Danh mục là bắt buộc", "Đơn vị là bắt buộc", "Giá là bắt buộc"];
    const missing = msgs.filter((m) => !t.includes(m));
    return expect(missing.length === 0, "Hiển thị đủ thông báo lỗi", `Form không lưu, nhưng thiếu thông báo: \"${missing.join(", ")}\"`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC4.1-TC002: Kiểm thử giá trị biên: Tồn kho âm
// Pass khi: Hiển thị lỗi "Tồn kho không hợp lệ"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.1-TC002", group: G4, uc: UC41,
  title: "Kiểm thử giá trị biên: Tồn kho âm",
  steps: [
    ["1. Chọn \"Thêm vật tư\"", "Form hiển thị", ""],
    ["2. Nhập thông tin hợp lệ", "", "TEST-NEG / Thuốc thử / Thuốc / Hộp / 50000"],
    ["3. Nhập Tồn kho âm", "", "-5"],
    ["4. Nhấn \"Lưu vật tư\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị lỗi \"Tồn kho không hợp lệ\"",
  async run() {
    await openInventoryDialog();
    await fillInventory({ code: "TEST-NEG", name: "Thuốc thử", category: "Thuốc", unit: "Hộp", stock: "-5", price: "50000" });
    const t = await h.bodyText();
    const shown = t.includes("Tồn kho không hợp lệ");
    const native = await h.driver.executeScript("const e=document.querySelector('#stock');return e?e.validationMessage:''");
    return expect(shown || native, shown ? "Hiển thị \"Tồn kho không hợp lệ\"" : `Trình duyệt chặn: "${native}"`, "Vật tư tồn kho âm vẫn được lưu");
  },
});
ctx.itemCode = `MED-${RUN}`;
ctx.itemName = `Amoxicillin KT ${RUN}`;
// ──────────────────────────────────────────────────────────────────────
// UC4.1-TC003: Thêm vật tư hợp lệ kèm hạn sử dụng
// Pass khi: Hiển thị "Thêm vật tư thành công", lô hàng được tạo kèm hạn dùng
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.1-TC003", group: G4, uc: UC41, shot: "uc41_success",
  title: "Thêm vật tư hợp lệ kèm hạn sử dụng",
  steps: [
    ["1. Chọn \"Thêm vật tư\"", "Form hiển thị", ""],
    ["2. Nhập Mã, Tên", "", `${ctx.itemCode} / ${ctx.itemName}`],
    ["3. Chọn Danh mục, nhập Đơn vị", "", "Thuốc / Hộp"],
    ["4. Nhập Tồn kho, Tồn tối thiểu, Giá", "", "20 / 5 / 45000"],
    ["5. Nhập Hạn sử dụng", "", dateKey(addDays(180))],
    ["6. Nhấn \"Lưu vật tư\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Thêm vật tư thành công\", lô hàng được tạo kèm hạn dùng",
  async run() {
    await openInventoryDialog();
    await fillInventory({ code: ctx.itemCode, name: ctx.itemName, category: "Thuốc", unit: "Hộp", stock: "20", minStock: "5", price: "45000", expiry: dateKey(addDays(180)) });
    const ok = await h.waitText("Thêm vật tư thành công", 3000);
    const items = (await h.api("GET", "/api/inventory")).data;
    ctx.item = items.find((i) => i.code === ctx.itemCode);
    const batches = ctx.item ? (await h.api("GET", `/api/stock-batches?inventoryId=${ctx.item.id}`)).data : [];
    return expect(ok && ctx.item && batches.length === 1, "Thêm vật tư thành công, 1 lô hàng được tạo", "Không lưu được vật tư/lô hàng");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC4.1-TC004: Mã vật tư trùng với vật tư đã có
// Pass khi: Hệ thống báo mã vật tư đã tồn tại, không tạo vật tư mới
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.1-TC004", group: G4, uc: UC41,
  title: "Mã vật tư trùng với vật tư đã có",
  steps: [
    ["1. Chọn \"Thêm vật tư\"", "Form hiển thị", ""],
    ["2. Nhập Mã vật tư đã dùng ở TC003", "", ctx.itemCode],
    ["3. Nhập các trường còn lại hợp lệ, nhấn \"Lưu vật tư\"", "Hiển thị thông báo lỗi", "Thuốc trùng mã / Thuốc / Hộp / 10 / 1000"],
  ],
  expected: "Hệ thống báo mã vật tư đã tồn tại, không tạo vật tư mới",
  async run() {
    await openInventoryDialog();
    await fillInventory({ code: ctx.itemCode, name: "Thuốc trùng mã", category: "Thuốc", unit: "Hộp", stock: "10", price: "1000" });
    const saved = await h.waitText("Thêm vật tư thành công", 2500);
    return expect(!saved, "Từ chối mã trùng", `Vẫn tạo vật tư thứ hai có mã ${ctx.itemCode}`);
  },
});

const UC43 = "UC4.3 Cảnh báo tồn kho thấp";
// ──────────────────────────────────────────────────────────────────────
// UC4.3-TC001: Vật tư có tồn kho dưới mức tối thiểu
// Pass khi: Số mặt hàng trong khung "Cảnh báo tồn kho thấp" tăng thêm 1 so với trước khi thêm
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.3-TC001", group: G4, uc: UC43, shot: "uc43_lowstock",
  title: "Vật tư có tồn kho dưới mức tối thiểu",
  steps: [
    ["1. Thêm vật tư có Tồn kho 3, Tồn tối thiểu 10", "Vật tư được lưu", `LOW-${RUN}`],
    ["2. Quan sát trang Kho thuốc", "Hiển thị cảnh báo", ""],
  ],
  expected: "Số mặt hàng trong khung \"Cảnh báo tồn kho thấp\" tăng thêm 1 so với trước khi thêm",
  async run() {
    // Đọc con số "N mặt hàng cần nhập bổ sung" trong khung cảnh báo trước và sau khi thêm vật tư sắp hết.
    const lowCount = async () => {
      await h.open("/inventory");
      const m = (await h.bodyText()).match(/(\d+) mặt hàng cần nhập bổ sung/);
      return m ? Number(m[1]) : 0;
    };
    const before = await lowCount();
    await openInventoryDialog();
    await fillInventory({ code: `LOW-${RUN}`, name: `Vắc-xin dại KT ${RUN}`, category: "Vắc-xin", unit: "Lọ", stock: "3", minStock: "10", price: "120000" });
    const after = await lowCount();
    return expect(after === before + 1, `Cảnh báo tăng từ ${before} lên ${after} mặt hàng`, `Cảnh báo không đổi (${before} → ${after})`);
  },
});
const SEED_LOW_STOCK = ["Doxycycline", "Thuốc nhỏ mắt", "Vaccine mèo 4 bệnh", "Ống truyền dịch"];
// ──────────────────────────────────────────────────────────────────────
// UC4.3-TC002: Xem danh sách mặt hàng sắp hết
// Pass khi: Danh sách gồm 4 mặt hàng mẫu sắp hết (${SEED_LOW_STOCK.join(", ")}) và vật tư thêm ở TC001; không có mặt hàng đủ tồn (Rabies Vaccine)
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC4.3-TC002", group: G4, uc: UC43,
  title: "Xem danh sách mặt hàng sắp hết",
  steps: [
    ["1. Truy cập Kho thuốc", "Khung cảnh báo tồn kho thấp hiển thị", ""],
    ["2. Nhấn \"Xem mặt hàng sắp hết\"", "Danh sách chỉ còn mặt hàng sắp hết", ""],
  ],
  expected: `Danh sách gồm 4 mặt hàng mẫu sắp hết (${SEED_LOW_STOCK.join(", ")}) và vật tư thêm ở TC001; không có mặt hàng đủ tồn (Rabies Vaccine)`,
  async run() {
    await h.open("/inventory");
    await h.clickButton("Xem mặt hàng sắp hết");
    await h.sleep(800);
    const t = await h.bodyText();
    const missing = SEED_LOW_STOCK.filter((n) => !t.includes(n));
    const ok = missing.length === 0 && t.includes(`Vắc-xin dại KT ${RUN}`) && !t.includes("Rabies Vaccine");
    return expect(ok, "Hiển thị đúng các mặt hàng sắp hết", `Thiếu: ${missing.join(", ")}`);
  },
});

const UC51 = "UC5.1 Tạo hóa đơn bán thuốc";
// ──────────────────────────────────────────────────────────────────────
// UC5.1-TC001: Không chọn khách hàng và thuốc
// Pass khi: Hiển thị "Vui lòng chọn khách hàng, thuốc và số lượng hợp lệ"
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.1-TC001", group: G4, uc: UC51,
  title: "Không chọn khách hàng và thuốc",
  steps: [
    ["1. Chọn \"Tạo hóa đơn\"", "Form tạo hóa đơn hiển thị", ""],
    ["2. Không chọn khách hàng, thuốc; nhấn \"Tạo hóa đơn\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị \"Vui lòng chọn khách hàng, thuốc và số lượng hợp lệ\"",
  async run() {
    await openInvoiceDialog();
    await h.clickButton("Tạo hóa đơn", "//div[@role='dialog']");
    return expect(await h.waitText("Vui lòng chọn khách hàng, thuốc và số lượng hợp lệ", 3000), "Hiển thị thông báo lỗi", "Không báo lỗi");
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC5.1-TC002: Tạo hóa đơn hợp lệ – tồn kho tự động trừ
// Pass khi: Hiển thị "Tạo hóa đơn thành công", tồn kho giảm từ 20 xuống 16, tổng tiền 180.000 VND
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.1-TC002", group: G4, uc: UC51, shot: "uc51_success",
  title: "Tạo hóa đơn hợp lệ – tồn kho tự động trừ",
  steps: [
    ["1. Chọn \"Tạo hóa đơn\"", "Form hiển thị", ""],
    ["2. Chọn Khách hàng", "", "Nguyễn Huy"],
    ["3. Chọn Thuốc", "", ctx.itemName],
    ["4. Nhập Số lượng", "", "4"],
    ["5. Nhấn \"Tạo hóa đơn\"", "Hiển thị thông báo thành công", ""],
  ],
  expected: "Hiển thị \"Tạo hóa đơn thành công\", tồn kho giảm từ 20 xuống 16, tổng tiền 180.000 VND",
  async run() {
    await openInvoiceDialog();
    await fillInvoice({ customer: "Nguyễn Huy", item: ctx.itemName, qty: "4" });
    const ok = await h.waitText("Tạo hóa đơn thành công", 3000);
    const item = (await h.api("GET", `/api/inventory/${ctx.item.id}`)).data;
    const invs = (await h.api("GET", "/api/invoices")).data;
    ctx.invoice = invs.find((i) => parseFloat(i.totalAmount) === 180000 && i.customerId === ctx.huy.id && !i.invoiceNumber.startsWith("INV-2026-"));
    return expect(ok && item.stock === 16 && ctx.invoice,
      `Tạo hóa đơn thành công, tồn kho còn ${item.stock}, tổng 180.000 VND`, `Tồn kho sau bán: ${item.stock}`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC5.1-TC003: Số lượng bán lớn hơn tồn kho
// Pass khi: Hiển thị "Không thể tạo hóa đơn", không phát sinh hóa đơn nào
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.1-TC003", group: G4, uc: UC51,
  title: "Số lượng bán lớn hơn tồn kho",
  steps: [
    ["1. Chọn \"Tạo hóa đơn\"", "Form hiển thị", ""],
    ["2. Chọn Khách hàng, Thuốc", "", `Trần Lan / ${ctx.itemName}`],
    ["3. Nhập Số lượng lớn hơn tồn (16)", "", "100"],
    ["4. Nhấn \"Tạo hóa đơn\"", "Hiển thị thông báo lỗi", ""],
  ],
  expected: "Hiển thị \"Không thể tạo hóa đơn\", không phát sinh hóa đơn nào",
  async run() {
    // Đếm số hóa đơn trước và sau thao tác: bán vượt tồn kho phải bị từ chối VÀ không được sinh hóa đơn rác.
    const before = (await h.api("GET", "/api/invoices")).data.length;
    await openInvoiceDialog();
    await fillInvoice({ customer: "Trần Lan", item: ctx.itemName, qty: "100" });
    const err = await h.waitText("Không thể tạo hóa đơn", 3000);
    const after = (await h.api("GET", "/api/invoices")).data.length;
    return expect(err && after === before, "Báo lỗi, không phát sinh hóa đơn",
      err ? `Có báo lỗi nhưng vẫn phát sinh ${after - before} hóa đơn rỗng 0 VND ở trạng thái chờ thanh toán` : "Không báo lỗi");
  },
});
const UC52 = "UC5.2 Thanh toán hóa đơn";
// ──────────────────────────────────────────────────────────────────────
// UC5.2-TC001: Xác nhận đã thu tiền cho hóa đơn chờ thanh toán
// Pass khi: Hiển thị "Thanh toán thành công", hóa đơn chuyển trạng thái đã thanh toán
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.2-TC001", group: G4, uc: UC52,
  title: "Xác nhận đã thu tiền cho hóa đơn chờ thanh toán",
  steps: [
    ["1. Truy cập Hóa đơn", "Danh sách hóa đơn hiển thị", ""],
    ["2. Nhấn \"Xác nhận đã thu tiền\" tại hóa đơn ở TC002", "Trạng thái hóa đơn \"Đã thanh toán\"", "180.000 VND"],
  ],
  expected: "Hiển thị \"Thanh toán thành công\", hóa đơn chuyển trạng thái đã thanh toán",
  async run() {
    await h.open("/invoices");
    await h.driver.findElement(h.xp(`//tr[.//td[normalize-space()='${ctx.invoice.invoiceNumber}']]//button[normalize-space()='Xác nhận đã thu tiền']`)).click();
    const ok = await h.waitText("Thanh toán thành công", 3000);
    const inv = (await h.api("GET", `/api/invoices/${ctx.invoice.id}`)).data;
    return expect(ok && inv.status === "paid", "Thanh toán thành công, trạng thái paid", `Trạng thái: ${inv.status}`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC5.2-TC002: Tìm hóa đơn theo mã hóa đơn
// Pass khi: Chỉ hiển thị 1 hóa đơn INV-2026-0020
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.2-TC002", group: G4, uc: UC52,
  title: "Tìm hóa đơn theo mã hóa đơn",
  steps: [["1. Nhập mã hóa đơn vào ô tìm kiếm", "Danh sách được lọc", "INV-2026-0020"]],
  expected: "Chỉ hiển thị 1 hóa đơn INV-2026-0020",
  async run() {
    await h.open("/invoices");
    await h.type("input[placeholder='Tìm theo mã, khách hàng, trạng thái']", "INV-2026-0020");
    await h.sleep(600);
    const rows = await h.driver.findElements(h.xp("//tbody/tr"));
    const t = await h.bodyText();
    return expect(rows.length === 1 && t.includes("INV-2026-0020"), "Hiển thị đúng 1 hóa đơn", `Hiển thị ${rows.length} dòng`);
  },
});
// ──────────────────────────────────────────────────────────────────────
// UC5.2-TC003: Tìm hóa đơn theo trạng thái "Quá hạn"
// Pass khi: Hiển thị 5 hóa đơn mẫu có trạng thái "Quá hạn" (ô tìm kiếm ghi "Tìm theo mã, khách hàng, trạng thái")
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC5.2-TC003", group: G4, uc: UC52,
  title: "Tìm hóa đơn theo trạng thái \"Quá hạn\"",
  steps: [["1. Nhập trạng thái hiển thị trên giao diện vào ô tìm kiếm", "Danh sách được lọc", "Quá hạn"]],
  expected: "Hiển thị 5 hóa đơn mẫu có trạng thái \"Quá hạn\" (ô tìm kiếm ghi \"Tìm theo mã, khách hàng, trạng thái\")",
  async run() {
    await h.open("/invoices");
    await h.type("input[placeholder='Tìm theo mã, khách hàng, trạng thái']", "Quá hạn");
    await h.sleep(600);
    const rows = await h.driver.findElements(h.xp("//tbody/tr[.//*[normalize-space()='Quá hạn']]"));
    return expect(rows.length === 5, "Hiển thị 5 hóa đơn quá hạn",
      `Hiển thị ${rows.length} hóa đơn – bộ lọc chỉ so khớp mã trạng thái tiếng Anh (overdue), không khớp nhãn tiếng Việt`);
  },
});
const UC72 = "UC7.2 Báo cáo doanh thu";
// ──────────────────────────────────────────────────────────────────────
// UC7.2-TC001: Doanh thu trên Tổng quan khớp dữ liệu hóa đơn
// Pass khi: Tổng doanh thu hiển thị bằng tổng tiền các hóa đơn đã thanh toán
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC7.2-TC001", group: G4, uc: UC72,
  title: "Doanh thu trên Tổng quan khớp dữ liệu hóa đơn",
  steps: [
    ["1. Truy cập trang Tổng quan", "Thẻ \"Tổng doanh thu\" hiển thị", ""],
    ["2. So sánh với tổng hóa đơn đã thanh toán", "Hai giá trị bằng nhau", ""],
  ],
  expected: "Tổng doanh thu hiển thị bằng tổng tiền các hóa đơn đã thanh toán",
  async run() {
    const invs = (await h.api("GET", "/api/invoices")).data;
    const paid = invs.filter((i) => i.status === "paid").reduce((s, i) => s + parseFloat(i.totalAmount), 0);
    await h.open("/");
    const t = await h.bodyText();
    const shown = paid.toLocaleString("vi-VN");
    return expect(t.includes(shown), `Tổng doanh thu ${shown} VND khớp dữ liệu`, `Không khớp – tổng hóa đơn đã thanh toán là ${shown} VND`);
  },
});

// ──────────────────────────────────────────────────────────────────────
// UC7.2-TC002: Thẻ "Số đơn hàng" và "Mặt hàng thuốc" khớp dữ liệu
// Pass khi: "Số đơn hàng" = tổng số hóa đơn; "Mặt hàng thuốc" = tổng số vật tư trong kho
// ──────────────────────────────────────────────────────────────────────
add({
  id: "UC7.2-TC002", group: G4, uc: UC72,
  title: "Thẻ \"Số đơn hàng\" và \"Mặt hàng thuốc\" khớp dữ liệu",
  steps: [
    ["1. Truy cập trang Tổng quan", "Các thẻ thống kê hiển thị", ""],
    ["2. So sánh với số hóa đơn và số vật tư trong CSDL", "Giá trị bằng nhau", "≥ 60 hóa đơn, ≥ 30 vật tư"],
  ],
  expected: "\"Số đơn hàng\" = tổng số hóa đơn; \"Mặt hàng thuốc\" = tổng số vật tư trong kho",
  async run() {
    const invs = (await h.api("GET", "/api/invoices")).data.length;
    const items = (await h.api("GET", "/api/inventory")).data.length;
    await h.open("/");
    const t = await h.bodyText();
    const ok = new RegExp(`Số đơn hàng\\s*${invs}(\\D|$)`).test(t) && new RegExp(`Mặt hàng thuốc\\s*${items}(\\D|$)`).test(t);
    return expect(ok, `Số đơn hàng ${invs}, mặt hàng thuốc ${items} – khớp dữ liệu`, `Không khớp (CSDL: ${invs} hóa đơn, ${items} vật tư)`);
  },
});

// Xuất danh sách test case để petclinic.spec.js chạy và build_doc.js in ra báo cáo.
module.exports = { cases, ctx, loadContext };
