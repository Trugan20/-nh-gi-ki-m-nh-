// KIỂM THỬ CHỊU TẢI (Stress Testing) – tăng dần số kết nối đồng thời để tìm ngưỡng quá tải,
// sau đó kiểm tra hệ thống tự hồi phục khi tải giảm.
// Ngưỡng quá tải: mức đầu tiên có p99 > 3 giây hoặc tỷ lệ lỗi > 1%.
const assert = require("node:assert/strict");
const { BASE, run, summarize, save, printRow } = require("./common");

// Các mức tải sẽ thử lần lượt (số kết nối đồng thời) và thời gian mỗi mức.
const LEVELS = (process.env.STRESS_LEVELS || "50,100,200,400,800,1200,1600").split(",").map(Number);
const STEP_S = Number(process.env.STRESS_STEP || 15);
// Kịch bản hỗn hợp: gọi luân phiên 5 API chính của hệ thống.
const MIXED = [
  { method: "GET", path: "/api/dashboard/stats" },
  { method: "GET", path: "/api/customers" },
  { method: "GET", path: "/api/appointments" },
  { method: "GET", path: "/api/inventory" },
  { method: "GET", path: "/api/invoices" },
];
const steps = [];

describe(`Kiểm thử chịu tải – tăng dần ${LEVELS.join(" → ")} kết nối, ${STEP_S}s/mức`, function () {
  this.timeout((LEVELS.length * (STEP_S + 20) + 120) * 1000);
  after(() => save("stress.json", { levels: steps, breakingPoint: steps.find((s) => s.overloaded)?.connections ?? null }));

  it("STRESS-TC001: Tăng dần tải và xác định ngưỡng quá tải", async () => {
    // Lần lượt tăng tải; mức nào có p99 > 3 giây hoặc lỗi > 1% thì đánh dấu "quá tải"
    for (const c of LEVELS) {
      const s = summarize(`Mức ${c} kết nối`, await run({ connections: c, duration: STEP_S, requests: MIXED }));
      s.overloaded = s.latencyP99Ms > 3000 || s.errorRatePct > 1;
      steps.push(s);
      printRow(s);
    }
    const bp = steps.find((s) => s.overloaded);
    console.log(bp ? `  → Ngưỡng quá tải: ${bp.connections} kết nối` : "  → Chưa chạm ngưỡng quá tải trong dải đã thử");
    // PASS nếu ở mọi mức ≤ 200 kết nối (mức đặc tả yêu cầu) hệ thống đều chưa quá tải
    assert.ok(steps.filter((s) => s.connections <= 200).every((s) => !s.overloaded), "Hệ thống quá tải ở mức ≤ 200 kết nối (yêu cầu đặc tả)");
  });

  it("STRESS-TC002: Máy chủ không bị sập khi quá tải", async () => {
    // Sau đợt tải nặng nhất, máy chủ vẫn phải trả lời bình thường (không bị sập)
    const r = await fetch(`${BASE}/api/dashboard/stats`);
    assert.equal(r.status, 200);
  });

  it("STRESS-TC003: Hồi phục sau quá tải – trở lại 50 kết nối", async () => {
    // Nghỉ 5 giây cho máy chủ "thở", rồi chạy lại tải nhẹ: phải nhanh và không lỗi như ban đầu
    await new Promise((r) => setTimeout(r, 5000));
    const s = summarize("Sau quá tải – 50 kết nối", await run({ connections: 50, duration: 10, requests: MIXED }));
    steps.push({ ...s, recovery: true });
    printRow(s);
    assert.equal(s.errorRatePct, 0, "Vẫn còn lỗi sau khi giảm tải");
    assert.ok(s.latencyP99Ms <= 3000, `p99 = ${s.latencyP99Ms} ms`);
  });
});
