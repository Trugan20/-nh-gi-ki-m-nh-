// KIỂM THỬ ĐỘ TIN CẬY VÀ PHỤC HỒI (Reliability & Recovery Testing)
// Bộ test tự khởi chạy một tiến trình ứng dụng riêng (bản build production) và chủ động gây sự cố:
// mất CSDL, tắt đột ngột ứng dụng, yêu cầu lỗi, chạy tải liên tục.
//
// Biến môi trường:
//   APP_DIR        thư mục dự án pet-pttkpm (đã chạy npm run build)
//   DATABASE_URL   CSDL kiểm thử
//   DB_STOP_CMD    lệnh dừng MySQL   (vd: "docker stop petclinic-db"  hoặc  "net stop MySQL80")
//   DB_START_CMD   lệnh khởi động MySQL (vd: "docker start petclinic-db" hoặc  "net start MySQL80")
//   SOAK_S         thời gian chạy tải liên tục, giây (mặc định 180)
const assert = require("node:assert/strict");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { run, summarize, save, printRow, OUT_DIR: RESULT_DIR } = require("./common");

const APP_DIR = process.env.APP_DIR || path.join(__dirname, "..", "..", "..", "pet-pttkpm", "pet-pttkpm");
const PORT = Number(process.env.REL_PORT || 5055);
const BASE = `http://localhost:${PORT}`;
const DB_URL = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/petclinic";
const SOAK_S = Number(process.env.SOAK_S || 180);
const out = {};
let app;
let appExit = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Khởi chạy ứng dụng Pet Clinic thành một tiến trình con (node dist/index.js) ở cổng REL_PORT (5055).
 * Test tự quản lý tiến trình này nên có thể chủ động "giết" và khởi động lại nó.
 * appExit = mã thoát nếu tiến trình đã dừng, null nếu còn chạy.
 */

function startApp() {
  appExit = null;
  app = spawn(process.execPath, ["dist/index.js"], {
    cwd: APP_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", DATABASE_URL: DB_URL, ENABLE_AUTO_REMINDER: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // luôn đọc stdout/stderr của tiến trình con, nếu không bộ đệm đầy sẽ làm ứng dụng bị treo
  const log = (d) => fs.appendFileSync(path.join(RESULT_DIR, "reliability_app.log"), d);
  app.stdout.on("data", log);
  app.stderr.on("data", log);
  app.on("exit", (code) => (appExit = code));
}

/** Gọi GET tới ứng dụng con, trả về mã HTTP (0 nếu không kết nối được hoặc quá thời gian chờ). */
async function get(p, timeoutMs = 5000) {
  try {
    const res = await fetch(BASE + p, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status;
  } catch {
    return 0; // không kết nối được
  }
}

/** Lặp kiểm tra điều kiện fn() cho tới khi đúng; trả về số mili giây đã chờ, hoặc null nếu hết maxMs. */
async function waitFor(fn, maxMs, stepMs = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await fn()) return Date.now() - t0;
    await sleep(stepMs);
  }
  return null;
}

/** Đọc bộ nhớ (RAM, MB) tiến trình ứng dụng đang dùng – Windows dùng tasklist, Linux/macOS dùng ps. */
function rssMB(pid) {
  try {
    if (process.platform === "win32") {
      const line = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`).toString();
      return Math.round(Number(line.split('","')[4].replace(/[^\d]/g, "")) / 1024);
    }
    return Math.round(Number(execSync(`ps -o rss= -p ${pid}`).toString().trim()) / 1024);
  } catch {
    return null;
  }
}

describe("Kiểm thử độ tin cậy và phục hồi", function () {
  this.timeout((SOAK_S + 180) * 1000);

  before(async () => {
    fs.mkdirSync(RESULT_DIR, { recursive: true });
    startApp();
    const ms = await waitFor(async () => (await get("/api/dashboard/stats")) === 200, 30000);
    assert.ok(ms !== null, "Ứng dụng không khởi động được");
    out.coldStartMs = ms;
  });

  after(() => {
    if (app && appExit === null) app.kill();
    save("reliability.json", out);
  });

  it("REL-TC001: Yêu cầu sai định dạng (JSON hỏng) được trả lỗi 4xx, ứng dụng không dừng", async () => {
    const res = await fetch(`${BASE}/api/customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{ten: khong-hop-le" });
    out.malformedStatus = res.status;
    await sleep(500);
    assert.equal(appExit, null, "Tiến trình ứng dụng đã dừng");
    assert.ok(res.status >= 400 && res.status < 500, `HTTP ${res.status}`);
    assert.equal(await get("/api/dashboard/stats"), 200);
  });

  it("REL-TC002: Mất kết nối CSDL – API báo lỗi có kiểm soát, ứng dụng không bị sập", async function () {
    if (!process.env.DB_STOP_CMD) this.skip();
    // Sự cố giả lập: dừng MySQL khi ứng dụng đang chạy → API phải trả lỗi 5xx, tiến trình KHÔNG được thoát
    execSync(process.env.DB_STOP_CMD, { stdio: "ignore" });
    await sleep(3000);
    const status = await get("/api/customers", 15000);
    await sleep(1000);
    out.dbDown = { apiStatus: status, appAlive: appExit === null };
    console.log(`      khi CSDL dừng: HTTP ${status}, tiến trình ứng dụng ${appExit === null ? "vẫn chạy" : `đã thoát (mã ${appExit})`}`);
    assert.equal(appExit, null, `Ứng dụng bị sập (exit code ${appExit}) khi mất CSDL`);
    assert.ok(status >= 500 && status < 600, `HTTP ${status}`);
  });

  it("REL-TC003: Tự phục hồi khi CSDL hoạt động trở lại (không cần khởi động lại ứng dụng) trong ≤ 30 giây", async function () {
    if (!process.env.DB_START_CMD) this.skip();
    // Bật lại MySQL, KHÔNG khởi động lại ứng dụng; đo thời gian tới khi API trả 200 trở lại
    execSync(process.env.DB_START_CMD, { stdio: "ignore" });
    const t0 = Date.now();
    await waitFor(async () => (await get("/api/dashboard/stats").catch(() => 0)) !== 0 || appExit !== null, 5000);
    const ms = await waitFor(async () => appExit === null && (await get("/api/customers")) === 200, 60000, 500);
    out.dbRecoveryMs = ms === null ? null : Date.now() - t0;
    console.log(`      ${appExit !== null ? "ứng dụng đã thoát, không thể tự phục hồi" : `phục hồi sau ${out.dbRecoveryMs} ms`}`);
    if (appExit !== null) startApp(); // khởi động lại để các test sau chạy được
    await waitFor(async () => (await get("/api/dashboard/stats")) === 200, 60000);
    assert.ok(ms !== null && out.dbRecoveryMs <= 30000, "Ứng dụng không tự phục hồi");
  });

  it("REL-TC004: Dữ liệu đã ghi không mất khi ứng dụng bị tắt đột ngột (kill)", async () => {
    const email = `rel${Date.now()}@test.vn`;
    const res = await fetch(`${BASE}/api/customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Khách tin cậy", email, phone: "0390000000", address: "Hà Nội" }) });
    const created = await res.json();
    // Tắt đột ngột tiến trình (giống mất điện / crash), khởi động lại, rồi đọc lại hồ sơ vừa tạo
    app.kill("SIGKILL");
    await waitFor(async () => appExit !== null, 10000);
    const t0 = Date.now();
    startApp();
    const ready = await waitFor(async () => (await get("/api/dashboard/stats")) === 200, 30000);
    out.restartMs = ready === null ? null : Date.now() - t0;
    const r = await fetch(`${BASE}/api/customers/${created.id}`);
    const after = await r.json();
    console.log(`      khởi động lại sau ${out.restartMs} ms, hồ sơ ${r.status === 200 ? "còn nguyên" : "bị mất"}`);
    assert.equal(after.email, email);
  });

  it("REL-TC005: Thời gian khởi động lại ứng dụng ≤ 10 giây", () => {
    assert.ok(out.restartMs !== null && out.restartMs <= 10000, `${out.restartMs} ms`);
  });

  it(`REL-TC006: Chạy tải liên tục ${SOAK_S} giây (50 kết nối) – không lỗi, bộ nhớ ổn định`, async () => {
    // Chạy tải đều 50 kết nối trong SOAK_S giây; cứ 10 giây ghi lại RAM để phát hiện rò rỉ bộ nhớ
    const samples = [];
    const timer = setInterval(() => samples.push({ t: samples.length * 10, rssMB: rssMB(app.pid) }), 10000);
    samples.push({ t: 0, rssMB: rssMB(app.pid) });
    const res = await run({
      url: BASE, connections: 50, duration: SOAK_S,
      requests: [
        { method: "GET", path: "/api/dashboard/stats" }, { method: "GET", path: "/api/customers" },
        { method: "GET", path: "/api/appointments" }, { method: "GET", path: "/api/inventory" },
      ],
    });
    clearInterval(timer);
    const s = summarize(`Soak ${SOAK_S}s`, res);
    const mem = samples.map((x) => x.rssMB).filter((x) => x);
    out.soak = { ...s, memory: samples, rssStartMB: mem[0], rssMaxMB: Math.max(...mem), rssEndMB: mem.at(-1) };
    printRow(s);
    console.log(`      RAM tiến trình: đầu ${mem[0]} MB, cao nhất ${Math.max(...mem)} MB, cuối ${mem.at(-1)} MB`);
    assert.equal(s.errorRatePct, 0);
    assert.ok(s.latencyP99Ms <= 3000);
    assert.ok(mem.at(-1) <= mem[0] * 1.5 + 50, "Bộ nhớ tăng liên tục – nghi rò rỉ bộ nhớ");
    assert.equal(appExit, null);
  });
});
