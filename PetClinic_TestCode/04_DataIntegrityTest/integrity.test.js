// KIá»‚M THá»¬ TOÃ€N Váº¸N Dá»® LIá»†U (Data Integrity Testing)
// Kiá»ƒm tra dá»¯ liá»‡u luÃ´n Ä‘Ãºng vÃ  nháº¥t quÃ¡n: khi nhiá»u ngÆ°á»i thao tÃ¡c Ä‘á»“ng thá»i, giá»¯a cÃ¡c báº£ng liÃªn quan,
// vá»›i dá»¯ liá»‡u Ä‘áº·c biá»‡t vÃ  dá»¯ liá»‡u Ä‘á»™c háº¡i. Gá»i API cá»§a á»©ng dá»¥ng vÃ  Ä‘á»‘i chiáº¿u trá»±c tiáº¿p trong CSDL.
// YÃªu cáº§u: á»©ng dá»¥ng Ä‘ang cháº¡y (BASE_URL) vÃ  DATABASE_URL trá» tá»›i CSDL kiá»ƒm thá»­.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

const BASE = process.env.BASE_URL || "http://localhost:5000";
const DB_URL = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/petclinic_test";
const RUN = Date.now().toString().slice(-6);

// Gá»i API cá»§a á»©ng dá»¥ng, tráº£ vá» { status, data }.
async function api(method, p, body) {
  const res = await fetch(BASE + p, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

describe("Kiá»ƒm thá»­ toÃ n váº¹n dá»¯ liá»‡u", function () {
  this.timeout(60000);
  let db, customer, pet, vet;

  // Chuáº©n bá»‹: káº¿t ná»‘i CSDL Ä‘á»ƒ Ä‘á»‘i chiáº¿u; táº¡o 1 khÃ¡ch hÃ ng + 1 thÃº cÆ°ng riÃªng cho láº§n cháº¡y; láº¥y 1 bÃ¡c sÄ©
  before(async () => {
    db = await mysql.createConnection(DB_URL);
    customer = (await api("POST", "/api/customers", { name: `DI KhÃ¡ch ${RUN}`, email: `di${RUN}@test.vn`, phone: `06${RUN}00`, address: "HÃ  Ná»™i" })).data;
    pet = (await api("POST", "/api/pets", { customerId: customer.id, name: `DI Pet ${RUN}`, species: "ChÃ³" })).data;
    vet = (await api("GET", "/api/doctors")).data[0];
  });
  after(async () => db.end());

  describe("Thao tÃ¡c Ä‘á»“ng thá»i (race condition)", () => {
    it("DI-TC001: 20 giao dá»‹ch bÃ¡n Ä‘á»“ng thá»i, tá»“n kho 10 â€“ khÃ´ng bÃ¡n vÆ°á»£t tá»“n, tá»“n kho khÃ´ng Ã¢m", async () => {
      // Ã tÆ°á»Ÿng: váº­t tÆ° chá»‰ cÃ³ 10 há»™p, 20 ngÆ°á»i cÃ¹ng báº¥m "bÃ¡n 1 há»™p" Äá»’NG THá»œI (Promise.all).
      // Há»‡ thá»‘ng Ä‘Ãºng: 10 giao dá»‹ch thÃ nh cÃ´ng, 10 bá»‹ tá»« chá»‘i, tá»“n kho vá» 0.
      // Náº¿u há»‡ thá»‘ng Ä‘á»c tá»“n kho rá»“i má»›i trá»« mÃ  khÃ´ng khÃ³a â†’ nhiá»u giao dá»‹ch Ä‘á»c cÃ¹ng giÃ¡ trá»‹ cÅ© â†’ bÃ¡n vÆ°á»£t (race condition).
      const item = (await api("POST", "/api/inventory", { code: `DI-${RUN}`, name: `DI Thuá»‘c ${RUN}`, category: "Medicine", unit: "há»™p", stock: 10, minStock: 1, price: "10000" })).data;
      const invoices = await Promise.all(Array.from({ length: 20 }, (_, i) =>
        api("POST", "/api/invoices", { customerId: customer.id, invoiceNumber: `DI-INV-${RUN}-${i}`, totalAmount: "0" }).then((r) => r.data)));
      const sales = await Promise.all(invoices.map((inv) =>
        api("POST", "/api/invoice-items", { invoiceId: inv.id, inventoryId: item.id, description: item.name, quantity: 1, unitPrice: "10000", totalPrice: "10000" })));
      const ok = sales.filter((s) => s.status === 201).length;
      const [[row]] = await db.query("SELECT stock FROM inventory WHERE id = ?", [item.id]);
      // Äá»‘i chiáº¿u trong CSDL: tá»•ng sá»‘ Ä‘Ã£ bÃ¡n + tá»“n kho cÃ²n láº¡i pháº£i báº±ng 10
      const [[sold]] = await db.query("SELECT COALESCE(SUM(ii.quantity),0) q FROM invoice_items ii WHERE ii.inventory_id = ?", [item.id]);
      console.log(`      bÃ¡n thÃ nh cÃ´ng ${ok}/20, tá»“n kho cÃ²n ${row.stock}, tá»•ng Ä‘Ã£ bÃ¡n ${sold.q}`);
      assert.ok(row.stock >= 0, `Tá»“n kho Ã¢m: ${row.stock}`);
      assert.equal(Number(sold.q), 10 - row.stock, `Sá»‘ Ä‘Ã£ bÃ¡n (${sold.q}) + tá»“n (${row.stock}) â‰  10 â€“ bÃ¡n vÆ°á»£t tá»“n kho`);
      assert.equal(ok, 10, `${ok} giao dá»‹ch thÃ nh cÃ´ng trong khi chá»‰ cÃ³ 10 há»™p`);
    });

    it("DI-TC002: 10 yÃªu cáº§u Ä‘áº·t cÃ¹ng bÃ¡c sÄ©, cÃ¹ng khung giá» Ä‘á»“ng thá»i â€“ chá»‰ 1 lá»‹ch Ä‘Æ°á»£c táº¡o", async () => {
      // 10 thÃº cÆ°ng khÃ¡c nhau cÃ¹ng Ä‘áº·t 1 bÃ¡c sÄ©, 1 khung giá», gá»­i Äá»’NG THá»œI.
      // Há»‡ thá»‘ng Ä‘Ãºng: chá»‰ 1 lá»‹ch Ä‘Æ°á»£c táº¡o, 9 yÃªu cáº§u cÃ²n láº¡i bá»‹ bÃ¡o trÃ¹ng lá»‹ch.
      const pets = await Promise.all(Array.from({ length: 10 }, (_, i) =>
        api("POST", "/api/pets", { customerId: customer.id, name: `DI Äá»“ng thá»i ${RUN}-${i}`, species: "MÃ¨o" }).then((r) => r.data)));
      // khung giá» riÃªng cho má»—i lÆ°á»£t cháº¡y (20â€“49 ngÃ y tá»›i, 19:xx) Ä‘á»ƒ khÃ´ng Ä‘á»¥ng dá»¯ liá»‡u cÅ©
      const slot = new Date(Date.now() + (20 + (Number(RUN) % 30)) * 86400000);
      slot.setHours(19, Number(RUN) % 60, 0, 0);
      const res = await Promise.all(pets.map((p) =>
        api("POST", "/api/appointments", { petId: p.id, customerId: customer.id, veterinarianId: vet.id, appointmentDate: slot.toISOString(), appointmentType: "KhÃ¡m tá»•ng quÃ¡t" })));
      const ok = res.filter((r) => r.status === 201).length;
      const [[c]] = await db.query("SELECT COUNT(*) n FROM appointments WHERE veterinarian_id = ? AND pet_id IN (?) AND status <> 'cancelled'", [vet.id, pets.map((p) => p.id)]);
      console.log(`      ${ok}/10 yÃªu cáº§u thÃ nh cÃ´ng, CSDL cÃ³ ${c.n} lá»‹ch trÃ¹ng khung giá»`);
      assert.equal(Number(c.n), 1, `CÃ³ ${c.n} lá»‹ch háº¹n cÃ¹ng bÃ¡c sÄ©, cÃ¹ng khung giá»`);
    });
  });

  describe("Nháº¥t quÃ¡n giá»¯a cÃ¡c báº£ng", () => {
    it("DI-TC003: Tá»•ng tiá»n má»i hÃ³a Ä‘Æ¡n báº±ng tá»•ng cÃ¡c dÃ²ng hÃ³a Ä‘Æ¡n", async () => {
      // Vá»›i Má»ŒI hÃ³a Ä‘Æ¡n: cá»™t total_amount pháº£i báº±ng tá»•ng total_price cÃ¡c dÃ²ng hÃ³a Ä‘Æ¡n
      const [rows] = await db.query(`
        SELECT i.invoice_number, i.total_amount, COALESCE(SUM(ii.total_price),0) s
        FROM invoices i LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
        GROUP BY i.id HAVING ABS(i.total_amount - s) > 0.001`);
      assert.equal(rows.length, 0, `${rows.length} hÃ³a Ä‘Æ¡n lá»‡ch tá»•ng tiá»n: ${rows.slice(0, 3).map((r) => r.invoice_number).join(", ")}`);
    });

    it("DI-TC004: KhÃ´ng cÃ³ váº­t tÆ° nÃ o tá»“n kho Ã¢m", async () => {
      const [rows] = await db.query("SELECT code, stock FROM inventory WHERE stock < 0");
      assert.equal(rows.length, 0, `Tá»“n kho Ã¢m: ${rows.map((r) => `${r.code}=${r.stock}`).join(", ")}`);
    });

    it("DI-TC005: RÃ ng buá»™c khÃ³a ngoáº¡i â€“ khÃ´ng táº¡o Ä‘Æ°á»£c thÃº cÆ°ng cho khÃ¡ch hÃ ng khÃ´ng tá»“n táº¡i", async () => {
      const r = await api("POST", "/api/pets", { customerId: "khong-ton-tai", name: "Ma", species: "ChÃ³" });
      const [[c]] = await db.query("SELECT COUNT(*) n FROM pets p LEFT JOIN customers c ON c.id = p.customer_id WHERE c.id IS NULL");
      assert.equal(r.status, 400, `API tráº£ ${r.status}`);
      assert.equal(Number(c.n), 0, `${c.n} thÃº cÆ°ng má»“ cÃ´i trong CSDL`);
    });

    it("DI-TC006: HÃ³a Ä‘Æ¡n chá»‰ chuyá»ƒn \"ÄÃ£ thanh toÃ¡n\" khi thu Ä‘á»§ tiá»n", async () => {
      const inv = (await api("POST", "/api/invoices", { customerId: customer.id, invoiceNumber: `DI-PAY-${RUN}`, totalAmount: "0" })).data;
      await api("POST", "/api/invoice-items", { invoiceId: inv.id, description: "PhÃ­ khÃ¡m", quantity: 1, unitPrice: "300000", totalPrice: "300000" });
      await api("POST", "/api/payments", { invoiceId: inv.id, amount: "100000", paymentMethod: "cash" });
      const partial = (await api("GET", `/api/invoices/${inv.id}`)).data.status;
      await api("POST", "/api/payments", { invoiceId: inv.id, amount: "200000", paymentMethod: "card" });
      const full = (await api("GET", `/api/invoices/${inv.id}`)).data.status;
      console.log(`      sau 100.000Ä‘: ${partial}; sau thÃªm 200.000Ä‘ (Ä‘á»§ 300.000Ä‘): ${full}`);
      assert.equal(partial, "pending", "Thu 1 pháº§n Ä‘Ã£ chuyá»ƒn tráº¡ng thÃ¡i");
      assert.equal(full, "paid", `ÄÃ£ thu Ä‘á»§ 300.000Ä‘ qua 2 láº§n nhÆ°ng hÃ³a Ä‘Æ¡n váº«n "${full}"`);
    });

    it("DI-TC007: Tá»« chá»‘i thanh toÃ¡n vÆ°á»£t sá»‘ tiá»n hÃ³a Ä‘Æ¡n", async () => {
      const inv = (await api("POST", "/api/invoices", { customerId: customer.id, invoiceNumber: `DI-OVER-${RUN}`, totalAmount: "0" })).data;
      await api("POST", "/api/invoice-items", { invoiceId: inv.id, description: "PhÃ­ khÃ¡m", quantity: 1, unitPrice: "200000", totalPrice: "200000" });
      const r = await api("POST", "/api/payments", { invoiceId: inv.id, amount: "5000000", paymentMethod: "cash" });
      assert.equal(r.status, 400, `Thanh toÃ¡n 5.000.000Ä‘ cho hÃ³a Ä‘Æ¡n 200.000Ä‘ Ä‘Æ°á»£c cháº¥p nháº­n (HTTP ${r.status})`);
    });
  });

  describe("Dá»¯ liá»‡u Ä‘áº·c biá»‡t vÃ  dá»¯ liá»‡u Ä‘á»™c háº¡i", () => {
    it("DI-TC008: Tiáº¿ng Viá»‡t cÃ³ dáº¥u, emoji, kÃ½ tá»± HTML Ä‘Æ°á»£c lÆ°u vÃ  Ä‘á»c láº¡i nguyÃªn váº¹n", async () => {
      // Chuá»—i chá»©a tiáº¿ng Viá»‡t cÃ³ dáº¥u, emoji, kÃ½ tá»± HTML vÃ  dáº¥u nhÃ¡y â€“ lÆ°u vÃ o rá»“i Ä‘á»c ra pháº£i y há»‡t
      const name = `Nguyá»…n Thá»‹ Ãnh Ãáº¡t ðŸ¶ðŸ± <b>&'"\\ ${RUN}`;
      const created = (await api("POST", "/api/customers", { name, email: `utf${RUN}@test.vn`, phone: `05${RUN}00`, address: "Sá»‘ 1 â€“ NgÃµ 2/3 \"Äáº·c biá»‡t\"" })).data;
      const read = (await api("GET", `/api/customers/${created.id}`)).data;
      assert.equal(read.name, name);
    });

    it("DI-TC009: Chuá»—i SQL Injection trong Ã´ tÃ¬m kiáº¿m khÃ´ng lÃ m lá»—i hay thay Ä‘á»•i dá»¯ liá»‡u", async () => {
      const [[before]] = await db.query("SELECT COUNT(*) n FROM customers");
      // CÃ¡c chuá»—i táº¥n cÃ´ng SQL Injection phá»• biáº¿n; náº¿u truy váº¥n khÃ´ng an toÃ n sáº½ tráº£ vá» má»i báº£n ghi hoáº·c xÃ³a báº£ng
      const payloads = ["' OR '1'='1", "'; DROP TABLE customers; --", "\" OR 1=1 --", "%' UNION SELECT * FROM users --"];
      for (const p of payloads) {
        const r = await api("GET", `/api/customers?search=${encodeURIComponent(p)}`);
        assert.equal(r.status, 200, `HTTP ${r.status} vá»›i "${p}"`);
        assert.equal(r.data.length, 0, `"${p}" tráº£ vá» ${r.data.length} báº£n ghi`);
      }
      const [[after]] = await db.query("SELECT COUNT(*) n FROM customers");
      assert.equal(after.n, before.n);
    });

    it("DI-TC010: Há» tÃªn ráº¥t dÃ i (5.000 kÃ½ tá»±) bá»‹ tá»« chá»‘i hoáº·c lÆ°u nguyÃªn váº¹n, khÃ´ng lá»—i mÃ¡y chá»§", async () => {
      const name = "A".repeat(5000);
      const r = await api("POST", "/api/customers", { name, email: `long${RUN}@test.vn`, phone: `04${RUN}00`, address: "HÃ  Ná»™i" });
      assert.ok(r.status < 500, `Lá»—i mÃ¡y chá»§ HTTP ${r.status}`);
      if (r.status === 201) assert.equal((await api("GET", `/api/customers/${r.data.id}`)).data.name.length, 5000);
    });

    it("DI-TC011: Cáº­p nháº­t má»™t trÆ°á»ng khÃ´ng lÃ m máº¥t cÃ¡c trÆ°á»ng khÃ¡c cá»§a há»“ sÆ¡", async () => {
      await api("PATCH", `/api/customers/${customer.id}`, { address: "Cáº§u Giáº¥y, HÃ  Ná»™i" });
      const r = (await api("GET", `/api/customers/${customer.id}`)).data;
      assert.equal(r.address, "Cáº§u Giáº¥y, HÃ  Ná»™i");
      assert.equal(r.name, customer.name);
      assert.equal(r.email, customer.email);
      assert.equal(r.phone, customer.phone);
    });
  });
});

