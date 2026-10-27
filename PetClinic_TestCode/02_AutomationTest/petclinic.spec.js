/**
 * petclinic.spec.js – FILE CHẠY BỘ KIỂM THỬ TỰ ĐỘNG GIAO DIỆN (Mocha)
 * -------------------------------------------------------------------
 * Cách chạy:  npx mocha petclinic.spec.js --reporter spec
 *             (ứng dụng phải đang chạy ở http://localhost:5000)
 *
 * Mocha là "người điều phối": gom các test case thành nhóm (describe), chạy từng case (it),
 * đếm số Pass/Fail và in kết quả ra màn hình.
 * File này không chứa kịch bản cụ thể – kịch bản nằm trong cases.js.
 *
 * Trình tự:
 *   1. before : mở trình duyệt, đọc dữ liệu mẫu (khách hàng, thú cưng, bác sĩ…)
 *   2. Với mỗi nhóm tác nhân, với mỗi test case: chạy run(), ghi Pass/Fail + kết quả thực tế
 *   3. after  : đóng trình duyệt, ghi toàn bộ kết quả ra results.json (dùng để làm báo cáo, file Excel)
 */
const fs = require("fs");
const path = require("path");
const h = require("./helpers");
const { cases, loadContext } = require("./cases");

// Kết quả từng test case: { "UC1.1-TC001": { status: "Pass", actual: "...", ms: 3600 }, ... }
const results = {};

describe("Pet Clinic – Kiểm thử tự động (Mocha + Selenium WebDriver / Microsoft Edge)", function () {
  // Mỗi test case được phép chạy tối đa 90 giây (thao tác giao diện chậm hơn gọi API).
  this.timeout(90000);

  before(async () => {
    await h.start(); // mở trình duyệt
    await loadContext(); // đọc dữ liệu mẫu để các test case dùng
  });

  after(async () => {
    await h.stop(); // đóng trình duyệt
    fs.writeFileSync(path.join(__dirname, "..", "07_KetQua", "automation", "results.json"), JSON.stringify(results, null, 2));
  });

  // Tạo một nhóm describe cho mỗi tác nhân, giữ nguyên thứ tự trong cases.js.
  const groups = [...new Set(cases.map((c) => c.group))];
  for (const group of groups) {
    describe(group, () => {
      for (const c of cases.filter((x) => x.group === group)) {
        it(`${c.id}: ${c.title}`, async () => {
          const t0 = Date.now();
          try {
            // run() trả về "kết quả thực tế" nếu đạt → ghi Pass
            const actual = await c.run();
            results[c.id] = { status: "Pass", actual, ms: Date.now() - t0 };
          } catch (e) {
            // run() ném lỗi nếu không đạt → ghi Fail kèm mô tả, rồi ném tiếp để Mocha đếm là failing
            results[c.id] = { status: "Fail", actual: e.actual || `Lỗi khi thực thi: ${e.message.split("\n")[0]}`, ms: Date.now() - t0 };
            throw e;
          } finally {
            // Dù Pass hay Fail: chụp ảnh (nếu test case yêu cầu) và đóng hộp thoại còn mở
            if (c.shot) await h.shot(c.shot).catch(() => {});
            await h.closeDialogs().catch(() => {});
          }
        });
      }
    });
  }
});
