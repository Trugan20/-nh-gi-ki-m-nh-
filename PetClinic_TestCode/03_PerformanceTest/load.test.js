// KIỂM THỬ TẢI (Load Testing) – 200 người dùng đồng thời, mỗi kịch bản 30 giây.
// Tiêu chí (đặc tả mục 1.3.2): thời gian phản hồi ≤ 3 giây (p99) và tỷ lệ lỗi = 0%.
const assert = require("node:assert/strict");
const { run, summarize, save, printRow } = require("./common");

// Số người dùng đồng thời (mặc định 200 – đúng yêu cầu đặc tả) và thời gian mỗi kịch bản (giây).
const USERS = Number(process.env.LOAD_USERS || 200);
const DURATION = Number(process.env.LOAD_DURATION || 30);
// Ngưỡng thời gian phản hồi cho phép (SLA): 3 giây.
const SLA_MS = 3000;
// Danh sách kết quả các kịch bản – lưu ra load.json khi chạy xong.
const results = [];

// Mỗi kịch bản mô phỏng một kiểu sử dụng thực tế:
//  - TC001–TC004: nhiều người cùng mở một màn hình (Tổng quan, Khách hàng, Lịch hẹn, Kho thuốc)
//  - TC005: người dùng đi qua nhiều màn hình khác nhau (gọi luân phiên 6 API)
//  - TC006: nhiều lễ tân cùng tạo hồ sơ khách hàng (tải GHI vào CSDL – mỗi yêu cầu sinh dữ liệu khác nhau)
const scenarios = [
  { id: "LOAD-TC001", name: "Trang Tổng quan – GET /api/dashboard/stats", path: "/api/dashboard/stats" },
  { id: "LOAD-TC002", name: "Danh sách khách hàng – GET /api/customers", path: "/api/customers" },
  { id: "LOAD-TC003", name: "Danh sách lịch hẹn – GET /api/appointments", path: "/api/appointments" },
  { id: "LOAD-TC004", name: "Kho thuốc – GET /api/inventory", path: "/api/inventory" },
  {
    id: "LOAD-TC005", name: "Kịch bản hỗn hợp (đọc nhiều màn hình)",
    requests: [
      { method: "GET", path: "/api/customers?search=Nguy%E1%BB%85n" },
      { method: "GET", path: "/api/pets" },
      { method: "GET", path: "/api/doctors" },
      { method: "GET", path: "/api/medical-records" },
      { method: "GET", path: "/api/invoices" },
      { method: "GET", path: "/api/camera-streams" },
    ],
  },
  {
    id: "LOAD-TC006", name: "Tải ghi – POST /api/customers (lễ tân tạo hồ sơ)",
    requests: [{
      method: "POST", path: "/api/customers", headers: { "content-type": "application/json" },
      // setupRequest chạy trước MỖI yêu cầu: sinh tên/email/SĐT ngẫu nhiên để không trùng
      setupRequest: (req) => {
        const n = Math.floor(Math.random() * 1e9);
        req.body = JSON.stringify({ name: `Khách tải ${n}`, email: `load${n}@test.vn`, phone: `08${String(n).padStart(8, "0").slice(0, 8)}`, address: "Hà Nội" });
        return req;
      },
    }],
  },
];

describe(`Kiểm thử tải – ${USERS} người dùng đồng thời, ${DURATION}s/kịch bản`, function () {
  this.timeout((DURATION + 30) * 1000);
  after(() => save("load.json", results));

  for (const sc of scenarios) {
    it(`${sc.id}: ${sc.name}`, async () => {
      // Chạy autocannon cho kịch bản, rút gọn kết quả, in ra màn hình
      const res = await run({ connections: USERS, duration: DURATION, path: sc.path, requests: sc.requests });
      const s = { id: sc.id, ...summarize(sc.name, res) };
      results.push(s);
      printRow(s);
      // Tiêu chí PASS: không có yêu cầu lỗi VÀ p99 ≤ 3 giây
      assert.equal(s.errorRatePct, 0, `Có ${s.errors + s.timeouts + s.non2xx} yêu cầu lỗi`);
      assert.ok(s.latencyP99Ms <= SLA_MS, `p99 = ${s.latencyP99Ms} ms vượt ${SLA_MS} ms`);
    });
  }
});
