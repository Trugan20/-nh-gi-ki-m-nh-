// KIá»‚M THá»¬ HIá»†U NÄ‚NG TÃŒM KIáº¾M â€“ náº¡p 10.000 khÃ¡ch hÃ ng rá»“i Ä‘o thá»i gian tÃ¬m kiáº¿m.
// TiÃªu chÃ­ (Ä‘áº·c táº£ má»¥c 1.3): tÃ¬m kiáº¿m khÃ¡ch hÃ ng trÃªn ~10.000 báº£n ghi tráº£ vá» â‰¤ 2 giÃ¢y.
// YÃªu cáº§u: DATABASE_URL trá» tá»›i CSDL kiá»ƒm thá»­ (dá»¯ liá»‡u bá»• sung bá»‹ xÃ³a khi káº¿t thÃºc).
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { BASE, run, summarize, save, printRow } = require("./common");

const DB_URL = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/petclinic_test";
const N = 10000;
const out = {};

describe(`Hiá»‡u nÄƒng tÃ¬m kiáº¿m trÃªn ${N.toLocaleString("vi-VN")} khÃ¡ch hÃ ng`, function () {
  this.timeout(180000);
  let conn;

  // Chuáº©n bá»‹: káº¿t ná»‘i tháº³ng CSDL, chÃ¨n 10.000 khÃ¡ch hÃ ng (10 lÃ´ Ã— 1.000 dÃ²ng) cÃ³ tÃªn/SÄT/email Ä‘a dáº¡ng
  before(async () => {
    conn = await mysql.createConnection(DB_URL);
    await conn.query("DELETE FROM customers WHERE email LIKE 'perf%@test.vn'");
    const ho = ["Nguyá»…n", "Tráº§n", "LÃª", "Pháº¡m", "HoÃ ng", "VÅ©", "Äáº·ng", "BÃ¹i", "Äá»—", "Há»“"];
    const ten = ["An", "BÃ¬nh", "Chi", "DÅ©ng", "Giang", "Háº¡nh", "Khoa", "Linh", "Minh", "Nga", "PhÃºc", "QuÃ¢n", "SÆ¡n", "Tháº£o", "Vy"];
    for (let b = 0; b < N; b += 1000) {
      const rows = [];
      for (let i = b; i < b + 1000; i++) {
        rows.push([`perf-${i}`, `${ho[i % 10]} ${ten[i % 15]} ${i}`, `perf${i}@test.vn`, `07${String(i).padStart(8, "0")}`, "HÃ  Ná»™i", 1]);
      }
      await conn.query("INSERT INTO customers (id, name, email, phone, address, is_active) VALUES ?", [rows]);
    }
    const [[{ c }]] = await conn.query("SELECT COUNT(*) c FROM customers");
    out.totalCustomers = c;
  });

  // Dá»n dáº¹p: xÃ³a toÃ n bá»™ khÃ¡ch hÃ ng Ä‘Ã£ chÃ¨n (email dáº¡ng perf...@test.vn), lÆ°u káº¿t quáº£
  after(async () => {
    await conn.query("DELETE FROM customers WHERE email LIKE 'perf%@test.vn'");
    await conn.end();
    save("search10k.json", out);
  });

  it("PERF-TC001: Má»™t ngÆ°á»i dÃ¹ng â€“ tÃ¬m theo tÃªn, SÄT, email (50 lÆ°á»£t)", async () => {
    // 5 tá»« khÃ³a luÃ¢n phiÃªn: theo tÃªn, SÄT, email, tÃªn + sá»‘, vÃ  tá»« khÃ³a khÃ´ng tá»“n táº¡i
    const terms = ["Nguyá»…n An", "0700009999", "perf5000@", "Tháº£o 7", "khongtontai"];
    const times = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      const r = await fetch(`${BASE}/api/customers?search=${encodeURIComponent(terms[i % terms.length])}`);
      await r.json();
      times.push(performance.now() - t0);
    }
    // Sáº¯p xáº¿p thá»i gian Ä‘á»ƒ láº¥y p95 (95% lÆ°á»£t tÃ¬m nhanh hÆ¡n má»©c nÃ y)
    times.sort((a, b) => a - b);
    out.single = { samples: times.length, avgMs: Math.round(times.reduce((a, b) => a + b) / times.length), p95Ms: Math.round(times[Math.floor(times.length * 0.95)]), maxMs: Math.round(times.at(-1)) };
    console.log(`    ${out.totalCustomers} khÃ¡ch hÃ ng â€“ trung bÃ¬nh ${out.single.avgMs} ms, p95 ${out.single.p95Ms} ms, max ${out.single.maxMs} ms`);
    assert.ok(out.single.p95Ms <= 2000, `p95 = ${out.single.p95Ms} ms vÆ°á»£t 2000 ms`);
  });

  it("PERF-TC002: 50 ngÆ°á»i dÃ¹ng tÃ¬m kiáº¿m Ä‘á»“ng thá»i trong 20 giÃ¢y", async () => {
    const s = summarize("TÃ¬m kiáº¿m Ä‘á»“ng thá»i trÃªn 10.000 KH", await run({ connections: 50, duration: 20, path: `/api/customers?search=${encodeURIComponent("Minh")}` }));
    out.concurrent = s;
    printRow(s);
    assert.equal(s.errorRatePct, 0);
    assert.ok(s.latencyP99Ms <= 2000, `p99 = ${s.latencyP99Ms} ms vÆ°á»£t 2000 ms`);
  });
});

