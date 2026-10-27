const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  HeadingLevel, PageBreak, BorderStyle, ShadingType, VerticalAlign, TableOfContents, Footer, PageNumber,
  LevelFormat, VerticalMergeType, TabStopType, TableLayoutType,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const IMG = path.join(ROOT, "images");
const PROJECT = path.join(ROOT, "..", "pet-pttkpm", "pet-pttkpm");
const { cases } = require(path.join(ROOT, "automation", "cases.js"));
const results = JSON.parse(fs.readFileSync(path.join(ROOT, "automation", "results.json"), "utf8"));
const unitText = fs.readFileSync(path.join(ROOT, "unit_run.txt"), "utf8").replace(/\x1b\[[0-9;]*m/g, "");

const FONT = "Times New Roman";
const SIZE = 26; // 13pt
const CONTENT_W = 9071; // A4 (11906) - lề trái 3cm (1701) - lề phải 2cm (1134)

/* ----------------------------- helpers ----------------------------- */
let figNo = 0;
let tabNo = 0;
const figures = [];
const tables = [];

function runs(text, opts = {}) {
  // hỗ trợ **đậm** trong chuỗi
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) =>
    p.startsWith("**") ? new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, size: opts.size || SIZE, italics: opts.italics })
      : new TextRun({ text: p, font: FONT, size: opts.size || SIZE, bold: opts.bold, italics: opts.italics, color: opts.color }),
  );
}
const P = (text, opts = {}) =>
  new Paragraph({
    children: runs(text, opts),
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 360 },
    indent: opts.indent === false ? undefined : { firstLine: opts.firstLine ?? 567 },
    keepNext: opts.keepNext,
  });
const plain = (text, opts = {}) => P(text, { ...opts, indent: false, firstLine: 0 });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })], pageBreakBefore: true });
const H1np = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] });
const H4 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t, font: FONT })] });
const B = (text, level = 0) =>
  new Paragraph({ numbering: { reference: "bullets", level }, children: runs(text), spacing: { before: 40, after: 40, line: 340 }, alignment: AlignmentType.JUSTIFIED });
const N = (text, ref = "steps") =>
  new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(text), spacing: { before: 40, after: 40, line: 340 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const empty = () => new Paragraph({ children: [] });

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function figure(file, caption, maxW = 600) {
  const full = path.join(IMG, file);
  const { w, h } = pngSize(full);
  const width = Math.min(maxW, w);
  const height = Math.round((h / w) * width);
  figNo += 1;
  const label = `Hình ${figNo}: ${caption}`;
  figures.push(label);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width, height }, altText: { title: caption, description: caption, name: file } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: label, italics: true, font: FONT, size: 24 })] }),
  ];
}
function tableCaption(caption) {
  tabNo += 1;
  const label = `Bảng ${tabNo}: ${caption}`;
  tables.push(label);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 200 }, children: [new TextRun({ text: label, italics: true, font: FONT, size: 24 })] });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, width, opts = {}) {
  const paras = String(text ?? "").split("\n").map(
    (line) => new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 20, after: 20 },
      children: runs(line, { size: opts.size || 22, bold: opts.bold, color: opts.color }),
    }),
  );
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    verticalAlign: opts.vAlign ?? VerticalAlign.CENTER,
    rowSpan: opts.rowSpan, columnSpan: opts.columnSpan,
    children: paras,
  });
}
function simpleTable(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({ layout: TableLayoutType.FIXED,
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], { align: opts.center?.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT })) })),
    ],
  });
}
function code(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  return new Table({ layout: TableLayoutType.FIXED,
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" } },
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill: "F5F5F5", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: lines.map((l) => new Paragraph({ spacing: { before: 0, after: 0, line: 250 }, children: [new TextRun({ text: l || " ", font: "Consolas", size: 17 })] })),
    })] })],
  });
}
function codeFromFile(rel, startMarker, endMarker) {
  const s = fs.readFileSync(rel, "utf8").replace(/\r/g, "");
  let a = startMarker ? s.indexOf(startMarker) : 0;
  let b = endMarker ? s.indexOf(endMarker, a + 1) : s.length;
  if (a < 0) a = 0;
  if (b < 0) b = s.length;
  return code(s.slice(a, b).trimEnd());
}

/* --------------------------- test case table --------------------------- */
const TC_W = [1000, 1450, 1500, 1350, 1100, 1771, 900]; // = 9071
function testCaseTable(list) {
  const head1 = new TableRow({
    tableHeader: true,
    children: [
      cell("Test Case ID", TC_W[0], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER, rowSpan: 2 }),
      cell("Test Case Description", TC_W[1], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER, rowSpan: 2 }),
      new TableCell({
        borders, columnSpan: 2, width: { size: TC_W[2] + TC_W[3], type: WidthType.DXA }, shading: { fill: "D9E2F3", type: ShadingType.CLEAR, color: "auto" },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: runs("Test Procedures", { bold: true, size: 22 }) })],
      }),
      cell("Test Case Input Value", TC_W[4], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER, rowSpan: 2 }),
      cell("Test Case Expected Result", TC_W[5], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER, rowSpan: 2 }),
      cell("Status", TC_W[6], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER, rowSpan: 2 }),
    ],
  });
  const head2 = new TableRow({
    tableHeader: true,
    children: [
      cell("Step to Perform", TC_W[2], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER }),
      cell("Step Expected Result", TC_W[3], { bold: true, fill: "D9E2F3", align: AlignmentType.CENTER }),
    ],
  });
  const rows = [head1, head2];
  for (const c of list) {
    const res = results[c.id] || { status: "N/A" };
    const n = c.steps.length;
    c.steps.forEach((s, i) => {
      const children = [];
      if (i === 0) {
        children.push(cell(c.id, TC_W[0], { rowSpan: n, bold: true, align: AlignmentType.CENTER }));
        children.push(cell(c.title, TC_W[1], { rowSpan: n }));
      }
      children.push(cell(s[0], TC_W[2]));
      children.push(cell(s[1], TC_W[3]));
      children.push(cell(s[2], TC_W[4]));
      if (i === 0) {
        children.push(cell(c.expected, TC_W[5], { rowSpan: n }));
        const fail = res.status === "Fail";
        children.push(cell(res.status, TC_W[6], { rowSpan: n, bold: true, align: AlignmentType.CENTER, color: fail ? "C00000" : "00703C", fill: fail ? "FDE9E7" : "E2F0D9" }));
      }
      rows.push(new TableRow({ cantSplit: true, children }));
    });
  }
  return new Table({ layout: TableLayoutType.FIXED, width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: TC_W, rows });
}

/* ------------------------------ dữ liệu ------------------------------ */
const totalAuto = cases.length;
const passAuto = cases.filter((c) => results[c.id]?.status === "Pass").length;
const failAuto = totalAuto - passAuto;

const unitRows = [];
for (const line of unitText.split("\n")) {
  const ok = line.match(/✔ (UT-[A-Z]+-\d+): (.*)$/);
  const bad = line.match(/^\s+\d+\) (UT-[A-Z]+-\d+): (.*?):?$/);
  if (ok) unitRows.push([ok[1], ok[2].trim(), "Pass"]);
  else if (bad && !unitRows.some((r) => r[0] === bad[1])) unitRows.push([bad[1], bad[2].trim(), "Fail"]);
}
const unitPass = unitRows.filter((r) => r[2] === "Pass").length;
const unitFail = unitRows.length - unitPass;

const severity = {
  "SYS-TC004": ["Cao", "Chưa có đăng nhập và phân quyền RBAC; mọi người truy cập URL đều thao tác được dữ liệu", "client/src/App.tsx, server/routes.ts (không có middleware xác thực)"],
  "UC1.1-TC010": ["Cao", "Bỏ trống ô Địa chỉ (không bắt buộc) thì không thêm được khách hàng; thông báo lỗi là chuỗi JSON", "AddCustomerDialog.tsx gửi address = \"\"; shared/schema.ts: nullableString = z.string().min(1)"],
  "UC1.5-TC001": ["Cao", "Ô tìm kiếm khách hàng mất focus sau ký tự đầu, không gõ tiếp được", "CustomerList.tsx:70 – return sớm khi isLoading làm ô tìm kiếm bị gỡ khỏi DOM"],
  "UC1.5-TC002": ["Cao", "Như UC1.5-TC001 khi tìm theo số điện thoại", "CustomerList.tsx:70"],
  "UC1.1-TC008": ["Trung bình", "Không kiểm tra trùng số điện thoại", "server/storage.ts – createCustomer()"],
  "UC1.1-TC009": ["Trung bình", "Không kiểm tra trùng email", "server/storage.ts – createCustomer()"],
  "UC1.2-TC004": ["Trung bình", "Không kiểm tra trùng mã microchip", "server/storage.ts – createPet()"],
  "UC2.1-TC005": ["Trung bình", "Cho phép đặt lịch hẹn trong quá khứ", "server/storage.ts – createAppointment()"],
  "UC2.2-TC004": ["Trung bình", "Cho phép hủy lịch khi còn dưới 1 tiếng (trái R2.2)", "server/storage.ts – deleteAppointment()"],
  "UC2.4-TC003": ["Trung bình", "Ca trực có giờ kết thúc trước giờ bắt đầu vẫn được lưu", "shared/schema.ts – insertDoctorShiftSchema"],
  "UC2.4-TC004": ["Trung bình", "Ca trực trùng giờ của cùng bác sĩ vẫn được lưu", "server/storage.ts – createDoctorShift()"],
  "UC4.1-TC004": ["Trung bình", "Mã vật tư trùng vẫn được lưu", "server/storage.ts – createInventoryItem()"],
  "UC5.1-TC003": ["Trung bình", "Bán vượt tồn kho: báo lỗi nhưng vẫn để lại hóa đơn rỗng 0 VND", "InvoicesPage.tsx – tạo hóa đơn trước, thêm dòng sau, không cùng transaction"],
  "UC2.1-TC001": ["Thấp", "Form đặt lịch không hiển thị thông báo lỗi khi bỏ trống", "AddAppointmentDialog.tsx – không render formState.errors"],
  "UC8.2-TC002": ["Thấp", "Bộ lọc \"Ngoại tuyến\" luôn rỗng", "server/storage.ts – getCameraStreams() chỉ lấy isActive = true"],
  "UC6.1-TC001": ["Thấp", "Thông báo lỗi hiển thị chuỗi JSON kỹ thuật của Zod", "DoctorsPage.tsx, server/routes.ts trả nguyên error.message"],
  "UC4.1-TC001": ["Thấp", "Bỏ trống Giá không có thông báo lỗi", "InventoryTable.tsx – thiếu hiển thị errors.price"],
  "UC5.2-TC003": ["Thấp", "Tìm hóa đơn theo trạng thái hiển thị (\"Quá hạn\", \"Đã hủy\"…) không ra kết quả", "InvoicesPage.tsx – bộ lọc so khớp inv.status (overdue, paid…) thay vì nhãn tiếng Việt"],
};
const defects = cases.filter((c) => results[c.id]?.status === "Fail").map((c) => [c.id, ...(severity[c.id] || ["Trung bình", c.title, ""]), results[c.id].actual]);
/* ---------------------- kiểm thử phi chức năng ---------------------- */
const NF = path.join(ROOT, "nonfunctional");
const nfJson = (f) => JSON.parse(fs.readFileSync(path.join(NF, "results", f), "utf8"));
const nfLoad = nfJson("load.json");
const nfSearch = nfJson("search10k.json");
const nfStress = nfJson("stress.json");
const nfRel = nfJson("reliability.json");
const nfInt = nfJson("integrity.json");
const nfLogs = ["results_load.txt", "results_search.txt", "results_stress.txt", "results_integrity.txt", "results_reliability.txt"]
  .map((f) => fs.readFileSync(path.join(NF, f), "utf8").replace(/\x1b\[[0-9;]*m/g, ""))
  .join("\n");
const nfStatus = (id) => (nfLogs.includes(`✔ ${id}:`) ? "Pass" : new RegExp(`\\d+\\) ${id}:`).test(nfLogs) ? "Fail" : "N/A");
const intMsg = (id) => {
  const t = nfInt.tests.find((x) => x.title.startsWith(id));
  return t && t.err && t.err.message ? t.err.message.split("\n")[0] : "Đạt";
};
const ms = (v) => `${Number(v).toLocaleString("vi-VN")} ms`;
const stressLv = nfStress.levels.filter((l) => !l.recovery);
const stressRec = nfStress.levels.find((l) => l.recovery);
const okUpTo = stressLv.filter((l) => !l.overloaded).map((l) => l.connections).pop();
const NF_CASES = [
  ...nfLoad.map((l) => ({
    sec: "load", id: l.id, title: l.name, how: `autocannon: ${l.connections} kết nối đồng thời trong ${l.durationS} giây`,
    criteria: "p99 ≤ 3.000 ms; tỷ lệ lỗi 0%",
    actual: `${l.requests.toLocaleString("vi-VN")} yêu cầu, ${l.rps} req/s; p50 ${ms(l.latencyP50Ms)}, p99 ${ms(l.latencyP99Ms)}; lỗi ${l.errorRatePct}%`,
  })),
  {
    sec: "load", id: "PERF-TC001", title: `Tìm kiếm khách hàng trên ${nfSearch.totalCustomers.toLocaleString("vi-VN")} bản ghi – 1 người dùng`,
    how: "Nạp 10.000 khách hàng; 50 lượt tìm theo tên, SĐT, email", criteria: "p95 ≤ 2.000 ms (đặc tả mục 1.3)",
    actual: `TB ${ms(nfSearch.single.avgMs)}, p95 ${ms(nfSearch.single.p95Ms)}, max ${ms(nfSearch.single.maxMs)}`,
  },
  {
    sec: "load", id: "PERF-TC002", title: "Tìm kiếm trên 10.000 bản ghi – 50 người dùng đồng thời", how: "autocannon: 50 kết nối trong 20 giây",
    criteria: "p99 ≤ 2.000 ms; lỗi 0%",
    actual: `${nfSearch.concurrent.rps} req/s; p50 ${ms(nfSearch.concurrent.latencyP50Ms)}, p99 ${ms(nfSearch.concurrent.latencyP99Ms)}; lỗi ${nfSearch.concurrent.errorRatePct}%`,
  },
  {
    sec: "stress", id: "STRESS-TC001", title: "Tăng dần tải để tìm ngưỡng quá tải",
    how: `Kịch bản hỗn hợp, ${stressLv.map((l) => l.connections).join(" → ")} kết nối, 15 giây/mức`,
    criteria: "Không quá tải ở mức ≤ 200 kết nối (yêu cầu đặc tả)",
    actual: `Đạt yêu cầu tới ${okUpTo} kết nối; quá tải từ ${nfStress.breakingPoint} kết nối (p99 ${ms(stressLv.find((l) => l.overloaded).latencyP99Ms)}); lỗi cao nhất ${Math.max(...stressLv.map((l) => l.errorRatePct))}%`,
  },
  { sec: "stress", id: "STRESS-TC002", title: "Máy chủ không bị sập khi quá tải", how: "Gọi API ngay sau mức tải cao nhất", criteria: "HTTP 200", actual: "HTTP 200, tiến trình vẫn chạy" },
  { sec: "stress", id: "STRESS-TC003", title: "Hồi phục sau quá tải", how: "Giảm về 50 kết nối trong 10 giây", criteria: "p99 ≤ 3.000 ms; lỗi 0%", actual: `p99 ${ms(stressRec.latencyP99Ms)}; lỗi ${stressRec.errorRatePct}%` },
  ...[
    ["DI-TC001", "20 giao dịch bán đồng thời trên vật tư tồn kho 10", "Gửi đồng thời 20 yêu cầu POST /api/invoice-items, mỗi yêu cầu 1 hộp", "Đúng 10 giao dịch thành công; tồn kho = 0; không bán vượt"],
    ["DI-TC002", "10 yêu cầu đặt cùng bác sĩ, cùng khung giờ đồng thời", "Gửi đồng thời 10 yêu cầu POST /api/appointments", "Chỉ 1 lịch hẹn được tạo"],
    ["DI-TC003", "Tổng tiền hóa đơn khớp các dòng hóa đơn", "Truy vấn SQL đối chiếu toàn bộ hóa đơn", "0 hóa đơn lệch"],
    ["DI-TC004", "Không có tồn kho âm", "Truy vấn SQL bảng inventory", "0 bản ghi stock < 0"],
    ["DI-TC005", "Ràng buộc khóa ngoại thú cưng – khách hàng", "Tạo thú cưng với customerId không tồn tại", "HTTP 400; 0 thú cưng mồ côi"],
    ["DI-TC006", "Hóa đơn chuyển \"Đã thanh toán\" khi thu đủ qua nhiều lần", "Hóa đơn 300.000đ, thu 100.000đ rồi 200.000đ", "Sau lần 1: pending; sau lần 2: paid"],
    ["DI-TC007", "Từ chối thanh toán vượt số tiền hóa đơn", "Thu 5.000.000đ cho hóa đơn 200.000đ", "HTTP 400"],
    ["DI-TC008", "Tiếng Việt, emoji, ký tự HTML được lưu nguyên vẹn", "Tạo khách hàng tên có dấu, emoji 🐶, ký tự <b>&'\" rồi đọc lại", "Dữ liệu đọc lại giống hệt"],
    ["DI-TC009", "Chuỗi SQL Injection trong ô tìm kiếm", "4 chuỗi tấn công (' OR '1'='1, DROP TABLE…)", "HTTP 200, 0 kết quả, số bản ghi không đổi"],
    ["DI-TC010", "Họ tên 5.000 ký tự", "POST /api/customers với tên 5.000 ký tự", "Từ chối hoặc lưu nguyên vẹn, không lỗi 5xx"],
    ["DI-TC011", "Cập nhật một trường không làm mất trường khác", "PATCH địa chỉ, đọc lại hồ sơ", "Các trường khác giữ nguyên"],
  ].map(([id, title, how, criteria]) => ({ sec: "integrity", id, title, how, criteria, actual: intMsg(id) })),
  { sec: "rel", id: "REL-TC001", title: "Yêu cầu sai định dạng JSON", how: "POST /api/customers với body hỏng", criteria: "HTTP 4xx, ứng dụng vẫn chạy", actual: `HTTP ${nfRel.malformedStatus}, ứng dụng vẫn chạy` },
  { sec: "rel", id: "REL-TC002", title: "Mất kết nối CSDL khi đang chạy", how: "Dừng MySQL, gọi API", criteria: "HTTP 5xx có kiểm soát, ứng dụng không sập", actual: `HTTP ${nfRel.dbDown.apiStatus}; ứng dụng ${nfRel.dbDown.appAlive ? "vẫn chạy" : "bị sập"}` },
  { sec: "rel", id: "REL-TC003", title: "Tự phục hồi khi CSDL hoạt động lại", how: "Khởi động lại MySQL, không khởi động lại ứng dụng", criteria: "API trở lại bình thường ≤ 30 giây", actual: `Phục hồi sau ${ms(nfRel.dbRecoveryMs)}` },
  { sec: "rel", id: "REL-TC004", title: "Dữ liệu bền vững khi ứng dụng bị tắt đột ngột", how: "Tạo hồ sơ, kill tiến trình, khởi động lại, đọc hồ sơ", criteria: "Hồ sơ còn nguyên", actual: "Hồ sơ còn nguyên" },
  { sec: "rel", id: "REL-TC005", title: "Thời gian khởi động lại ứng dụng", how: "Đo từ lúc khởi chạy tới khi API trả 200", criteria: "≤ 10 giây", actual: ms(nfRel.restartMs) },
  {
    sec: "rel", id: "REL-TC006", title: `Chạy tải liên tục ${Math.round(nfRel.soak.durationS)} giây`, how: "autocannon: 50 kết nối, 4 API đọc",
    criteria: "Lỗi 0%; p99 ≤ 3.000 ms; RAM không tăng liên tục",
    actual: `${nfRel.soak.requests.toLocaleString("vi-VN")} yêu cầu; p99 ${ms(nfRel.soak.latencyP99Ms)}; lỗi ${nfRel.soak.errorRatePct}%; RAM ${nfRel.soak.rssStartMB} → ${nfRel.soak.rssMaxMB} → ${nfRel.soak.rssEndMB} MB`,
  },
].map((c) => ({ ...c, status: nfStatus(c.id) }));
const nfPass = NF_CASES.filter((c) => c.status === "Pass").length;
const NF_W = [1050, 1750, 1950, 1550, 1971, 800];
function nfTable(sec) {
  return simpleTable(["Test Case ID", "Mô tả", "Cách thực hiện", "Tiêu chí đạt", "Kết quả đo được", "Status"],
    NF_CASES.filter((c) => c.sec === sec).map((c) => [c.id, c.title, c.how, c.criteria, c.actual, c.status]), NF_W, { center: [0, 5] });
}
const nfSeverity = {
  "DI-TC001": ["Cao", "Bán đồng thời: tồn kho bị ghi đè (lost update), bán vượt số lượng thực có", "server/storage.ts – createInvoiceItem(): đọc tồn kho không khóa (thiếu SELECT … FOR UPDATE hoặc UPDATE có điều kiện)"],
  "DI-TC002": ["Cao", "Đặt lịch đồng thời: nhiều lịch trùng bác sĩ, trùng giờ cùng được tạo", "server/storage.ts – createAppointment(): kiểm tra rồi mới chèn, không khóa và không có ràng buộc UNIQUE"],
  "DI-TC006": ["Trung bình", "Thu tiền nhiều lần đủ tổng nhưng hóa đơn vẫn \"Chờ thanh toán\"", "server/routes.ts – POST /api/payments so sánh từng lần thu thay vì tổng đã thu"],
  "DI-TC007": ["Trung bình", "Chấp nhận thanh toán vượt số tiền hóa đơn", "server/routes.ts – POST /api/payments không kiểm tra số tiền"],
};
const sevOrder = { Cao: 0, "Trung bình": 1, Thấp: 2 };
for (const c of NF_CASES.filter((x) => x.status === "Fail")) defects.push([c.id, ...(nfSeverity[c.id] || ["Trung bình", c.title, ""]), c.actual]);

defects.sort((a, b) => sevOrder[a[1]] - sevOrder[b[1]]);

/* ------------------------------ nội dung ------------------------------ */
const body = [];
const push = (...x) => body.push(...x.flat());

// ===== Trang bìa =====
const center = (t, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before ?? 0, after: o.after ?? 60 }, children: [new TextRun({ text: t, font: FONT, size: o.size || 28, bold: o.bold })] });
const STUDENTS = [
  ["1", "Hà Tiến Quang", "22010136", "K16 - CNTT3"],
  ["2", "Dương Thiện Hùng", "23010601", "K17-CNTTVJ"],
  ["3", "Vũ Tiến Hưng", "22010008", "K16 - CNTT3"],
];
const coverLine = (children, o = {}) => new Paragraph({ alignment: o.align ?? AlignmentType.CENTER, indent: o.indent, spacing: { before: o.before ?? 0, after: o.after ?? 0, line: 360 }, children });
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 28, bold: o.bold });
const COVER_W = [1327, 2973, 2185, 2586];
const cover = [
  coverLine([t("ĐẠI HỌC PHENIKAA", { bold: true })]),
  coverLine([t("TRƯỜNG CÔNG NGHỆ THÔNG TIN PHENIKAA", { bold: true })]),
  coverLine([t("------------------o0o--------------------", { bold: true })], { after: 240 }),
  coverLine([new ImageRun({ type: "png", data: fs.readFileSync(path.join(IMG, "logo_phenikaa.png")), transformation: { width: 200, height: 203 }, altText: { title: "Logo", description: "Logo Trường Công nghệ thông tin Phenikaa", name: "logo" } })], { after: 360 }),
  coverLine([t("BÁO CÁO BÀI TẬP LỚN", { bold: true, size: 36 })], { after: 60 }),
  coverLine([t("MÔN: ĐÁNH GIÁ VÀ KIỂM ĐỊNH CHẤT LƯỢNG PHẦN MỀM", { bold: true })], { after: 60 }),
  coverLine([t("ĐỀ TÀI: ", { bold: true }), t("Đánh giá phần mềm quản lý phòng khám thú cưng", { bold: true })], { after: 360 }),
  coverLine([t("Lớp :"), t("Đánh giá và kiểm định chất lượng phần mềm*-1-3-25(COUR02.LT1)", { bold: true })], { align: AlignmentType.LEFT, indent: { left: 1000 }, after: 120 }),
  coverLine([t("Giảng viên hướng dẫn :     TS. Trịnh Thanh Bình")], { align: AlignmentType.LEFT, indent: { left: 1050 }, after: 480 }),
  coverLine([t("Nhóm sinh viên thực hiện :")], { after: 120 }),
  new Table({ layout: TableLayoutType.FIXED,
    width: { size: 9071, type: WidthType.DXA }, columnWidths: COVER_W,
    rows: [["STT", "Họ và tên", "MSSV", "Lớp"], ...STUDENTS].map((r) => new TableRow({
      height: { value: 640, rule: "atLeast" },
      children: r.map((v, i) => new TableCell({ borders, width: { size: COVER_W[i], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [t(v)] })] })),
    })),
  }),
  coverLine([t("Hà Nội, tháng 6 năm 2026", { bold: true })], { before: 600 }),
];

// ===== Mục lục =====
push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "MỤC LỤC", bold: true, font: FONT, size: 32 })] }),
  new TableOfContents("MỤC LỤC", { hyperlink: true, headingStyleRange: "1-3" }),
);

// ===== Phân công =====
push(
  H1("BẢNG PHÂN CÔNG NHIỆM VỤ"),
  simpleTable(["STT", "Họ tên", "MSSV", "Nhiệm vụ", "Đánh giá"], [
    ["1", "Hà Tiến Quang", "22010136", "- Phân tích hệ thống, xác định yêu cầu chức năng & phi chức năng\n- Lập kế hoạch kiểm thử (Test Plan), xác định phạm vi kiểm thử\n- Kiểm thử thủ công (Manual Testing)\n- Tổng hợp báo cáo, làm slide", "33.3%"],
    ["2", "Dương Thiện Hùng", "23010601", "- Vẽ sơ đồ Use Case, đặc tả Use Case\n- Thiết kế test case cho các tác nhân: Hệ thống, Lễ tân, Bác sĩ, Quản trị viên/Kế toán\n- Viết Unit Test (Mocha + tsx) cho schema và lớp storage", "33.3%"],
    ["3", "Vũ Tiến Hưng", "22010008", "- Cấu hình môi trường kiểm thử tự động Mocha & Selenium WebDriver\n- Viết script và thực thi Automation Test\n- Thu thập kết quả, vẽ biểu đồ so sánh, viết kết luận", "33.3%"],
  ], [600, 1800, 1200, 4571, 900], { center: [0, 2, 4] }),
);

// ===== Danh mục hình / bảng: điền sau khi dựng xong nội dung =====
const LIST_FIG_INDEX = body.length;

// ===== Lời mở đầu =====
const intro = [
  H1("LỜI MỞ ĐẦU"),
  P("Trong thời đại chuyển đổi số, phần mềm ngày càng giữ vai trò trung tâm trong vận hành của các cơ sở dịch vụ, trong đó có phòng khám thú y. Cùng với đó, kiểm thử và đánh giá chất lượng phần mềm là giai đoạn không thể thiếu trong vòng đời phát triển, giúp sản phẩm vận hành ổn định, chính xác và an toàn. Với mục tiêu áp dụng kiến thức môn học vào thực tiễn, nhóm lựa chọn đề tài **“Đánh giá chất lượng phần mềm quản lý phòng khám thú cưng (Pet Clinic)”**."),
  P("Pet Clinic Pro là ứng dụng web (React + Express + MySQL) hỗ trợ phòng khám quản lý khách hàng và thú cưng, lịch hẹn, ca làm việc của bác sĩ, hồ sơ khám bệnh, kho thuốc, hóa đơn và camera giám sát. Phần mềm phục vụ các nhóm người dùng chính:"),
  B("**Lễ tân:** tiếp nhận khách hàng, tạo hồ sơ khách hàng và thú cưng, đặt và xử lý lịch hẹn."),
  B("**Bác sĩ thú y:** lập hồ sơ khám, tra cứu lịch sử điều trị, theo dõi ca trực và camera."),
  B("**Quản trị viên / Kế toán:** quản lý bác sĩ, kho thuốc, hóa đơn, thanh toán và báo cáo doanh thu."),
  B("**Khách hàng:** đặt lịch, nhận nhắc lịch và theo dõi thú cưng qua camera."),
  P(`Đề tài không chỉ dừng ở việc tìm hiểu phần mềm mà tập trung kiểm thử toàn diện: xây dựng kế hoạch kiểm thử, thiết kế ${totalAuto} test case chức năng, ${unitRows.length} unit test và ${NF_CASES.length} test case phi chức năng (tải, chịu tải, toàn vẹn dữ liệu, độ tin cậy và phục hồi), tự động hóa toàn bộ bằng Mocha, Selenium WebDriver và autocannon. Qua đó nhóm rèn luyện kỹ năng phân tích, thiết kế và thực thi kiểm thử, đồng thời chỉ ra các lỗi cụ thể để nhóm phát triển khắc phục.`),
];

// ===== Chương 1 =====
const ch1 = [
  H1("1. Chương 1: Phần mềm quản lý phòng khám thú cưng"),
  H2("1.1. Xác định yêu cầu"),
  H3("1.1.1. Đặt vấn đề"),
  P("Số hộ gia đình nuôi thú cưng ở các thành phố tăng nhanh, nhưng nhiều phòng khám thú y vẫn quản lý bằng sổ sách hoặc Excel. Cách làm này bộc lộ nhiều bất cập:"),
  B("**Trùng lặp lịch hẹn, tiếp nhận chậm:** lễ tân khó biết bác sĩ nào còn trống, thú cưng nào đã có lịch."),
  B("**Hồ sơ rời rạc:** hồ sơ khám, đơn thuốc và lịch sử điều trị nằm ở nhiều nơi, khó truy xuất khi tái khám."),
  B("**Quản lý kho kém hiệu quả:** dễ thất thoát, khó kiểm soát hạn dùng và lô thuốc."),
  B("**Hóa đơn, báo cáo thủ công:** làm chậm việc quyết toán và đánh giá doanh thu."),
  B("**Giám sát thú cưng chưa tích hợp:** khách hàng phải xin đường dẫn camera thủ công, tiềm ẩn rủi ro bảo mật."),
  P("Vì vậy cần một hệ thống số hóa giúp quản lý khách hàng và thú cưng, đặt lịch hẹn, lưu hồ sơ khám, quản lý kho thuốc, đồng thời phát sinh hóa đơn và báo cáo tự động. Đề tài “Đánh giá chất lượng phần mềm quản lý phòng khám thú cưng” được lựa chọn để kiểm chứng phần mềm Pet Clinic Pro đáp ứng các yêu cầu trên đến đâu."),
  H3("1.1.2. Yêu cầu chung"),
  P("Để giải quyết các vấn đề nêu trên, hệ thống cần đáp ứng các yêu cầu chung sau:"),
  B("**Quản lý toàn diện:** từ tiếp nhận khách hàng đến khám, kê đơn và thanh toán."),
  B("**Đặt lịch và nhắc lịch tự động:** kiểm tra lịch trống của bác sĩ, gửi nhắc lịch qua Email/SMS."),
  B("**Tập trung hồ sơ khám:** lưu triệu chứng, chẩn đoán, phác đồ điều trị theo từng thú cưng."),
  B("**Kiểm soát kho:** nhập kho theo lô, tự trừ tồn khi bán, cảnh báo tồn thấp và sắp hết hạn."),
  B("**Bảo mật và phân quyền:** phân quyền theo vai trò (RBAC) cho Admin, Bác sĩ, Lễ tân, Khách hàng."),
  B("**Dễ sử dụng:** giao diện trực quan, thông báo và kiểm tra dữ liệu rõ ràng."),
  P("Phạm vi đề tài:"),
  B("**Đối tượng sử dụng:** phòng khám thú y và cửa hàng thú cưng quy mô vừa và nhỏ."),
  B("**Kiến trúc:** ứng dụng web nhiều lớp – giao diện React (Vite, TanStack Query), API Express/TypeScript, CSDL MySQL qua Drizzle ORM."),
  B("**Ngoài phạm vi:** liên thông dữ liệu y tế quốc gia, chatbot, khám từ xa (telemedicine)."),
  H3("1.1.3. Yêu cầu cụ thể"),
  B("**Quản lý khách hàng & thú cưng (R1):** tạo, sửa, khóa/duyệt hồ sơ; số điện thoại 10 chữ số và không trùng; microchip không trùng; tìm kiếm theo tên, email, số điện thoại."),
  B("**Quản lý lịch khám (R2):** đặt lịch theo lịch trống của bác sĩ; chỉ được hủy/đổi trước giờ hẹn ít nhất 1 tiếng; nhắc lịch tự động; quản lý ca làm việc tránh trùng."),
  B("**Hồ sơ khám (R3):** tạo hồ sơ khám với triệu chứng, chẩn đoán, điều trị; tra cứu lịch sử."),
  B("**Kho thuốc (R4):** nhập kho theo lô kèm hạn dùng; trừ tồn khi bán; cảnh báo tồn thấp và sắp hết hạn."),
  B("**Thanh toán (R5):** tạo hóa đơn, thanh toán nhiều hình thức (tiền mặt, thẻ, chuyển khoản, ví điện tử), báo cáo doanh thu."),
  B("**Nhân sự & phân quyền (R6), báo cáo (R7), camera (R8):** quản lý bác sĩ, phân quyền RBAC, thống kê, xem camera theo phòng."),
  H2("1.2. Các yêu cầu chức năng"),
  H3("1.2.1. Tác nhân hệ thống"),
  B("**Lễ tân (Receptionist):** tiếp nhận khách hàng, quản lý hồ sơ khách hàng và thú cưng, đặt và xử lý lịch hẹn."),
  B("**Bác sĩ thú y (Veterinarian):** tạo hồ sơ khám, kê đơn, tra cứu lịch sử khám, xem ca trực và camera."),
  B("**Quản trị viên (Admin):** quản lý bác sĩ, ca trực, kho thuốc, phân quyền người dùng."),
  B("**Kế toán:** lập hóa đơn, xác nhận thanh toán, xem báo cáo doanh thu."),
  B("**Khách hàng (Customer):** đặt lịch, nhận nhắc lịch, xem camera thú cưng lưu trú."),
  H3("1.2.2. Các chức năng hệ thống"),
  simpleTable(["Nhóm chức năng", "Chức năng", "Màn hình"], [
    ["R1 – Khách hàng & thú cưng", "UC1.1 Tạo hồ sơ khách hàng; UC1.2 Tạo hồ sơ thú cưng; UC1.3 Chỉnh sửa; UC1.4 Tạm khóa/Duyệt; UC1.5 Tìm kiếm", "Khách hàng"],
    ["R2 – Lịch khám", "UC2.1 Đặt lịch; UC2.2 Xác nhận/Hủy/Hoàn thành; R2.3 Nhắc lịch tự động; UC2.4 Ca làm việc bác sĩ", "Lịch hẹn, Ca bác sĩ"],
    ["R3 – Hồ sơ khám", "UC3.1 Tạo hồ sơ khám; UC3.3 Tra cứu lịch sử khám", "Hồ sơ khám"],
    ["R4 – Kho thuốc", "UC4.1 Nhập kho theo lô; UC4.2 Trừ tồn khi bán; UC4.3 Cảnh báo tồn thấp/hết hạn", "Kho thuốc"],
    ["R5 – Thanh toán", "UC5.1 Tạo hóa đơn; UC5.2 Thanh toán", "Hóa đơn"],
    ["R6 – Nhân sự", "UC6.1 Quản lý bác sĩ; UC6.2 Phân quyền RBAC", "Bác sĩ"],
    ["R7 – Báo cáo", "UC7.1 Số ca khám; UC7.2 Doanh thu; UC7.3 Thuốc/dịch vụ", "Tổng quan"],
    ["R8 – Camera", "UC8.1 Quản lý kết nối camera; UC8.2 Theo dõi trực tuyến", "Camera giám sát"],
  ], [2300, 4971, 1800]),
  tableCaption("Bảng tổng hợp các nhóm chức năng của hệ thống"),
  H3("1.2.3. Sơ đồ Use-Case tổng quát"),
  ...figure("usecase_overview.png", "Sơ đồ Use-Case tổng quát của hệ thống Pet Clinic"),
  H3("1.2.4. Đặc tả Use-Case"),
];
const specs = [
  ["UC1.1 Tạo mới hồ sơ khách hàng", "Cho phép lễ tân tạo hồ sơ khách hàng mới với thông tin cơ bản.", "Lễ tân, Khách hàng (tự đăng ký)",
    ["Tác nhân chọn \"Thêm khách hàng\"", "Hệ thống hiển thị form: họ tên, email, số điện thoại, địa chỉ", "Tác nhân nhập thông tin và chọn \"Lưu khách hàng\"", "Hệ thống kiểm tra hợp lệ, lưu và thông báo \"Thêm khách hàng thành công\""],
    ["Bỏ trống trường bắt buộc, email sai định dạng hoặc SĐT không đủ 10 số: hệ thống báo lỗi và yêu cầu nhập lại", "SĐT/email đã tồn tại: hệ thống báo lỗi trùng"],
    "Người dùng có quyền Lễ tân", "Hồ sơ khách hàng được lưu với mã định danh duy nhất"],
  ["UC1.2 Tạo mới hồ sơ thú cưng", "Tạo hồ sơ thú cưng và liên kết với khách hàng đã có.", "Lễ tân, Quản trị viên",
    ["Tác nhân chọn \"Thêm thú cưng\" tại dòng khách hàng", "Hệ thống hiển thị form: tên, loài, giống, giới tính, tuổi, cân nặng, microchip", "Tác nhân nhập và chọn \"Lưu thú cưng\"", "Hệ thống lưu và thông báo \"Thêm thú cưng thành công\""],
    ["Bỏ trống tên hoặc loài: hệ thống báo lỗi", "Microchip đã tồn tại: hệ thống báo \"Microchip đã tồn tại, vui lòng kiểm tra lại.\""],
    "Khách hàng đã tồn tại", "Thú cưng được lưu, liên kết đúng khách hàng"],
  ["UC1.5 Tìm kiếm khách hàng / thú cưng", "Tìm khách hàng theo tên, email, số điện thoại; tìm thú cưng theo tên chủ.", "Lễ tân",
    ["Tác nhân nhập từ khóa vào ô tìm kiếm", "Hệ thống lọc và hiển thị danh sách phù hợp"],
    ["Không có kết quả: hiển thị \"Không có khách hàng phù hợp.\""], "Người dùng đã vào trang Khách hàng", "Danh sách được lọc theo từ khóa"],
  ["UC2.1 Đặt lịch khám", "Tạo lịch hẹn khám/chăm sóc cho thú cưng.", "Lễ tân, Khách hàng",
    ["Tác nhân chọn \"Tạo lịch hẹn\"", "Chọn khách hàng, thú cưng, bác sĩ (không bắt buộc), ngày, giờ, dịch vụ", "Chọn lưu", "Hệ thống kiểm tra trùng lịch và thông báo \"Đặt lịch thành công\""],
    ["Bác sĩ hoặc thú cưng đã có lịch cùng khung giờ: báo \"Không thể đặt lịch\"", "Thiếu thông tin: báo lỗi từng trường"],
    "Khách hàng và thú cưng đã tồn tại", "Lịch hẹn được lưu ở trạng thái \"Chờ xác nhận\""],
  ["UC2.2 Xác nhận / Hủy / Hoàn thành lịch hẹn", "Cập nhật trạng thái lịch hẹn.", "Lễ tân, Bác sĩ",
    ["Tác nhân mở tab \"Quản lý toàn bộ\"", "Chọn \"Xác nhận\", \"Hoàn thành\" hoặc \"Hủy lịch\"", "Hệ thống cập nhật trạng thái và thông báo"],
    ["Hủy khi còn dưới 1 tiếng trước giờ hẹn: hệ thống từ chối (R2.2)"], "Lịch hẹn đã tồn tại", "Trạng thái lịch hẹn được cập nhật"],
  ["UC2.4 Quản lý ca làm việc bác sĩ", "Tạo, xóa ca trực của bác sĩ, tránh trùng lịch.", "Quản trị viên",
    ["Chọn \"Tạo ca trực\"", "Chọn bác sĩ, ngày trực, giờ bắt đầu, giờ kết thúc", "Chọn \"Lưu ca trực\"", "Hệ thống thông báo \"Đã tạo ca trực\""],
    ["Không chọn bác sĩ/ngày: báo \"Vui lòng chọn bác sĩ và ngày trực\"", "Giờ không hợp lệ hoặc trùng ca: hệ thống từ chối"], "Bác sĩ đã tồn tại", "Ca trực được lưu"],
  ["UC3.1 Tạo hồ sơ khám", "Ghi nhận buổi khám: triệu chứng, chẩn đoán, điều trị.", "Bác sĩ",
    ["Mở tab \"Tạo hồ sơ mới\"", "Chọn thú cưng, bác sĩ; nhập triệu chứng, chẩn đoán, phác đồ điều trị", "Chọn \"Lưu hồ sơ\"", "Hệ thống thông báo \"Lưu hồ sơ khám thành công\""],
    ["Thiếu trường bắt buộc: hiển thị lỗi tương ứng"], "Thú cưng đã tồn tại", "Hồ sơ khám được lưu và hiển thị trong danh sách"],
  ["UC4.1 / UC4.3 Nhập kho và cảnh báo tồn kho", "Thêm thuốc/vật tư kèm lô và hạn dùng; cảnh báo tồn thấp.", "Quản trị viên",
    ["Chọn \"Thêm vật tư\"", "Nhập mã, tên, danh mục, đơn vị, tồn kho, tồn tối thiểu, giá, hạn dùng", "Chọn \"Lưu vật tư\"", "Hệ thống lưu vật tư và lô hàng; nếu tồn ≤ tối thiểu hiển thị \"Cảnh báo tồn kho thấp\""],
    ["Thiếu thông tin hoặc tồn kho âm: báo lỗi", "Mã vật tư trùng: hệ thống từ chối"], "Người dùng có quyền quản lý kho", "Vật tư được lưu vào kho"],
  ["UC5.1 / UC5.2 Tạo hóa đơn và thanh toán", "Lập hóa đơn bán thuốc, tự trừ tồn kho, xác nhận thu tiền.", "Kế toán, Lễ tân",
    ["Chọn \"Tạo hóa đơn\"", "Chọn khách hàng, thuốc, số lượng", "Chọn \"Tạo hóa đơn\": hệ thống tạo hóa đơn và trừ tồn", "Chọn \"Xác nhận đã thu tiền\": hóa đơn chuyển \"Đã thanh toán\""],
    ["Chưa chọn khách hàng/thuốc: báo lỗi", "Số lượng vượt tồn kho: báo \"Không thể tạo hóa đơn\", không phát sinh hóa đơn"], "Khách hàng và thuốc đã tồn tại", "Hóa đơn được lưu, tồn kho giảm tương ứng"],
  ["UC6.1 Quản lý thông tin bác sĩ", "Thêm, cập nhật bác sĩ và trạng thái nhận lịch.", "Quản trị viên",
    ["Chọn \"Thêm bác sĩ\"", "Nhập họ tên, email, SĐT, chuyên khoa, mã hành nghề, kinh nghiệm, phí khám", "Chọn \"Tạo bác sĩ\"", "Hệ thống thông báo \"Đã thêm bác sĩ mới\""],
    ["Thiếu thông tin hoặc email sai: báo \"Không thể thêm bác sĩ\""], "Người dùng có quyền Quản trị", "Bác sĩ được lưu, xuất hiện trong danh sách"],
  ["UC8.2 Theo dõi thú cưng qua camera", "Xem trực tiếp camera của phòng lưu trú.", "Khách hàng, Bác sĩ, Lễ tân",
    ["Chọn \"Camera giám sát\"", "Hệ thống hiển thị danh sách camera theo phòng và trạng thái", "Chọn camera để xem trực tiếp"],
    ["Camera ngoại tuyến: hiển thị \"Camera đang ngoại tuyến\""], "Thú cưng đang lưu trú có camera", "Người dùng xem được luồng video"],
];
for (const [name, desc, actors, main, alt, pre, post] of specs) {
  ch1.push(
    new Paragraph({ spacing: { before: 160, after: 60 }, keepNext: true, children: runs(`**${name}**`) }),
    B(`**Mô tả ngắn gọn:** ${desc}`),
    B(`**Tác nhân thực hiện:** ${actors}`),
    B("**Luồng sự kiện:**"),
    B("Luồng chính:", 1), ...main.map((m) => B(m, 2)),
    B("Luồng phát sinh:", 1), ...alt.map((m) => B(m, 2)),
    B(`**Tiền điều kiện:** ${pre}`),
    B(`**Hậu điều kiện:** ${post}`),
  );
}
ch1.push(
  H2("1.3. Các yêu cầu phi chức năng"),
  H3("1.3.1. Giao diện người dùng"),
  B("**Thân thiện, dễ sử dụng:** menu điều hướng cố định bên trái, mỗi chức năng một trang riêng."),
  B("**Responsive:** giao diện desktop cho lễ tân, giao diện co giãn cho thiết bị di động."),
  B("**Đồng nhất:** dùng chung bộ thành phần giao diện (shadcn/ui), hỗ trợ chế độ sáng/tối."),
  B("**Thông báo rõ ràng:** kiểm tra dữ liệu tại form và thông báo (toast) sau mỗi thao tác."),
  H3("1.3.2. Hiệu suất và bảo mật"),
  B("**Thời gian phản hồi:** các thao tác thông thường ≤ 3 giây khi có 200 người dùng đồng thời."),
  B("**Tìm kiếm:** tìm khách hàng/thú cưng trên khoảng 10.000 bản ghi trả về ≤ 2 giây."),
  B("**Bảo mật:** mật khẩu băm bcrypt/argon2, giao tiếp HTTPS (TLS 1.2+), xác thực JWT/OAuth2, phân quyền RBAC."),
  B("**Độ tin cậy:** uptime ≥ 99%, sao lưu CSDL hằng ngày."),
);

// ===== Chương 2 =====
const ch2 = [
  H1("2. Chương 2: Kế hoạch kiểm thử"),
  H2("2.1. Giới thiệu"),
  H3("2.1.1. Mục đích"),
  P("Tài liệu kế hoạch kiểm thử này đưa ra các mục đích sau:"),
  B("Xác định thông tin cơ bản về dự án và các thành phần chức năng được kiểm thử và không được kiểm thử."),
  B("Liệt kê những yêu cầu cho việc kiểm thử (Test Requirements)."),
  B("Những chiến lược kiểm thử nên được sử dụng."),
  B("Ước lượng những yêu cầu về tài nguyên cho việc kiểm thử."),
  B("Những tài liệu được lập sau khi hoàn thành việc kiểm thử."),
  H3("2.1.2. Tổng quan"),
  P("Báo cáo cung cấp cái nhìn tổng quan về phạm vi dự án, các yêu cầu, chức năng và công việc cần kiểm thử. Dự án phát triển hệ thống quản lý phòng khám thú cưng gồm các nhóm chức năng: quản lý khách hàng và thú cưng, lịch hẹn, ca bác sĩ, hồ sơ khám, kho thuốc, hóa đơn – thanh toán, báo cáo và camera. Mỗi nhóm chức năng được kiểm thử để đảm bảo hệ thống hoạt động đúng yêu cầu."),
  H3("2.1.3. Phạm vi"),
  P("Tài liệu áp dụng cho việc kiểm thử phiên bản Pet Clinic Pro (MySQL Edition) chạy cục bộ tại http://localhost:5000. Các dịch vụ và chức năng cần kiểm tra bao gồm:"),
  B("Quản lý khách hàng và thú cưng"), B("Đặt lịch và xử lý lịch hẹn, ca làm việc bác sĩ"), B("Hồ sơ khám bệnh"),
  B("Kho thuốc, hóa đơn và thanh toán"), B("Quản lý bác sĩ, báo cáo doanh thu, camera giám sát"),
  H3("2.1.4. Các định nghĩa và các từ viết tắt được dùng"),
  H4("2.1.4.1. Các định nghĩa"),
  simpleTable(["Thuật ngữ", "Định nghĩa"], [
    ["Pet Clinic", "Hệ thống quản lý phòng khám thú cưng được kiểm thử"],
    ["Khách hàng (Customer)", "Chủ sở hữu thú cưng"],
    ["Lịch hẹn (Appointment)", "Thời gian đặt khám/chăm sóc cho một thú cưng"],
    ["Hồ sơ khám (Medical Record)", "Thông tin một buổi khám: triệu chứng, chẩn đoán, điều trị"],
    ["Lô hàng (Stock Batch)", "Lô nhập thuốc kèm số lượng và hạn dùng"],
    ["Ca trực (Doctor Shift)", "Khoảng thời gian làm việc của bác sĩ trong một ngày"],
  ], [2800, 6271]),
  tableCaption("Bảng liệt kê các định nghĩa được sử dụng"),
  H4("2.1.4.2. Các từ viết tắt"),
  simpleTable(["Từ viết tắt", "Mô tả"], [
    ["TC", "Test Case (Trường hợp kiểm thử)"], ["UT", "Unit Test (Kiểm thử đơn vị)"], ["UC", "Use Case (Ca sử dụng)"],
    ["GUI", "Graphical User Interface (Giao diện người dùng)"], ["API", "Application Programming Interface"],
    ["RBAC", "Role-Based Access Control (Phân quyền theo vai trò)"], ["CSDL", "Cơ sở dữ liệu"], ["KH", "Khách hàng"], ["SĐT", "Số điện thoại"],
  ], [2800, 6271]),
  tableCaption("Bảng liệt kê các từ viết tắt được sử dụng"),
  H3("2.1.5. Những người sử dụng tài liệu này"),
  B("**Test Manager:** quản lý toàn bộ quy trình kiểm thử, đảm bảo kế hoạch được thực hiện đúng tiến độ."),
  B("**Test Designer:** thiết kế các test case, xác định chiến lược và phương pháp kiểm thử."),
  B("**Tester:** thực hiện kiểm thử theo test case, báo cáo lỗi và theo dõi quá trình sửa lỗi."),
  B("**Nhóm phát triển:** tiếp nhận danh sách lỗi để khắc phục."),
  H2("2.2. Những yêu cầu về tài nguyên"),
  H3("2.2.1. Phần cứng"),
  P("Để đảm bảo quá trình kiểm thử hệ thống diễn ra hiệu quả, máy kiểm thử cần đáp ứng cấu hình tối thiểu sau (máy chạy đồng thời máy chủ ứng dụng, CSDL và trình duyệt):"),
  simpleTable(["Thành phần", "Cấu hình tối thiểu", "Cấu hình khuyến nghị"], [
    ["CPU", "Intel Core i3 / AMD Ryzen 3, 2.0 GHz, 2 nhân", "Intel Core i5 / AMD Ryzen 5, 4 nhân trở lên"],
    ["RAM", "8 GB", "16 GB"],
    ["Ổ cứng trống", "10 GB", "20 GB (SSD)"],
    ["Kiến trúc", "64 bit", "64 bit"],
    ["Màn hình", "1366 × 768", "1920 × 1080"],
    ["Mạng", "Kết nối Internet để tải thư viện và driver trình duyệt", "Băng thông ≥ 10 Mbps"],
  ], [1800, 3635, 3636]),
  tableCaption("Bảng yêu cầu về tài nguyên phần cứng"),
  H3("2.2.2. Phần mềm"),
  P("Các phần mềm cần thiết để hỗ trợ quá trình kiểm thử bao gồm:"),
  simpleTable(["Tên phần mềm", "Phiên bản", "Loại"], [
    ["Microsoft Windows / macOS / Ubuntu", "Windows 10 trở lên, macOS 12 trở lên, Ubuntu 20.04 trở lên", "Hệ điều hành"],
    ["Google Chrome", "Phiên bản ổn định mới nhất (≥ 120)", "Trình duyệt"],
    ["Microsoft Edge", "Phiên bản ổn định mới nhất (≥ 120)", "Trình duyệt"],
    ["Mozilla Firefox", "Phiên bản ổn định mới nhất (≥ 115)", "Trình duyệt"],
    ["Node.js", "20 LTS trở lên", "Môi trường chạy ứng dụng và test"],
    ["MySQL Community Server", "8.0 trở lên", "Hệ quản trị CSDL"],
    ["Pet Clinic Pro", "1.0.0 (MySQL Edition)", "Phần mềm được kiểm thử"],
  ], [3000, 3571, 2500]),
  tableCaption("Bảng yêu cầu về tài nguyên phần mềm"),
  H3("2.2.3. Công cụ kiểm thử"),
  P("Các công cụ được sử dụng để quản lý, thực hiện và theo dõi quá trình kiểm thử:"),
  simpleTable(["Hoạt động", "Công cụ", "Nhà cung cấp", "Phiên bản"], [
    ["Kiểm thử đơn vị (Unit Test)", "Mocha + tsx + node:assert", "OpenJS Foundation", "Mocha 10.x"],
    ["Kiểm thử tự động giao diện", "Mocha + Selenium WebDriver (chromedriver, msedgedriver, geckodriver)", "OpenJS / SeleniumHQ", "selenium-webdriver 4.x"],
    ["Quản lý Test Case", "Microsoft Word / Excel", "Microsoft", "2019 trở lên"],
    ["Defect Tracking", "Microsoft Excel", "Microsoft", "2019 trở lên"],
    ["Kiểm thử hiệu năng: tải, chịu tải, chạy liên tục", "autocannon (bộ sinh tải HTTP)", "Matteo Collina / OSS", "8.x"],
    ["Kiểm thử toàn vẹn dữ liệu, độ tin cậy", "Mocha + mysql2 (đối chiếu trực tiếp CSDL)", "OpenJS / sidorares", "mysql2 3.x"],
    ["Biểu đồ kết quả", "Python Matplotlib", "Matplotlib", "3.x"],
  ], [2600, 2900, 1900, 1671]),
  tableCaption("Bảng liệt kê các công cụ kiểm thử"),
  H3("2.2.4. Môi trường kiểm thử"),
  B("Máy tính cá nhân đáp ứng cấu hình ở mục 2.2.1, cài một trong các hệ điều hành ở mục 2.2.2."),
  B("Trình duyệt kiểm thử: Google Chrome, Microsoft Edge, Mozilla Firefox bản mới nhất. Kiểm thử tự động chạy ở chế độ headless, cửa sổ 1440 × 900; chọn trình duyệt bằng biến môi trường BROWSER."),
  B("Ứng dụng chạy tại http://localhost:5000, tắt nhắc lịch tự động để không gửi Email/SMS thật."),
  B("CSDL MySQL riêng cho kiểm thử (không dùng CSDL thật), khởi tạo bằng npm run db:setup và nạp lại dữ liệu mẫu trước mỗi lượt chạy."),
  B("Dữ liệu mẫu được sinh bởi server/seed.ts (npm run db:seed), có quy luật cố định để kết quả kiểm thử lặp lại được:"),
  simpleTable(["Bảng dữ liệu", "Số bản ghi", "Đặc điểm phục vụ kiểm thử"], [
    ["Bác sĩ", "12", "3 bác sĩ đang ở trạng thái bận (không nhận lịch)"],
    ["Khách hàng", "30", "27 đang hoạt động, 3 chờ duyệt (Huỳnh Hoàng Nam, Ngô Mỹ Duyên, Huỳnh Bích Ngọc)"],
    ["Thú cưng", "50", "Chó, mèo, thỏ, chim, sóc; mỗi con có mã microchip riêng"],
    ["Thuốc / vật tư", "30", "4 mặt hàng dưới tồn tối thiểu: Doxycycline, Thuốc nhỏ mắt, Vaccine mèo 4 bệnh, Ống truyền dịch"],
    ["Lô hàng", "30", "Một số lô hết hạn trong 30 ngày tới"],
    ["Lịch hẹn", "60", "Từ 10 ngày trước đến 14 ngày tới, đủ trạng thái; để trống khung 09:00, 11:00, 15:00 cho test case"],
    ["Hồ sơ khám", "43", "10 loại chẩn đoán; \"Viêm da dị ứng\" có 4 hồ sơ"],
    ["Camera", "15", "12 trực tuyến; Phòng 04, 09, 13 ngoại tuyến"],
    ["Ca trực", "31", "Ca sáng 08:00–12:00, ca chiều 13:30–17:30 trong 7 ngày tới"],
    ["Hóa đơn", "60", "45 đã thanh toán, 5 chờ thanh toán, 5 quá hạn, 5 đã hủy"],
  ], [2000, 1300, 5771], { center: [1] }),
  tableCaption("Bảng dữ liệu mẫu dùng cho kiểm thử"),
  H2("2.3. Phạm vi kiểm thử"),
  H3("2.3.1. Những chức năng được kiểm thử"),
  B("**Hệ thống:** truy cập, điều hướng menu, trang 404, giao diện sáng/tối, đăng nhập và phân quyền."),
  B("**Khách hàng & thú cưng:** kiểm tra dữ liệu nhập (bắt buộc, định dạng email, giá trị biên SĐT), trùng SĐT/email/microchip, chỉnh sửa, khóa/duyệt, tìm kiếm."),
  B("**Lịch hẹn:** đặt lịch hợp lệ, trùng giờ bác sĩ/thú cưng, ngày quá khứ, xác nhận/hoàn thành/hủy, quy tắc hủy trước 1 tiếng."),
  B("**Ca bác sĩ, hồ sơ khám, camera:** tạo/xóa ca trực, giờ không hợp lệ, trùng ca; tạo và tra cứu hồ sơ; lọc camera."),
  B("**Quản trị / Kế toán:** quản lý bác sĩ; nhập kho, tồn kho âm, trùng mã, cảnh báo tồn thấp; tạo hóa đơn, trừ tồn, bán vượt tồn, thanh toán; doanh thu trên trang Tổng quan."),
  B("**Phi chức năng:** hiệu năng (tải 200 người dùng, tìm kiếm trên 10.000 bản ghi), chịu tải (tìm ngưỡng quá tải), toàn vẹn dữ liệu (thao tác đồng thời, nhất quán giữa các bảng, dữ liệu đặc biệt), độ tin cậy và phục hồi (mất CSDL, tắt đột ngột, chạy liên tục)."),
  B("**Mức đơn vị:** các schema kiểm tra dữ liệu (shared/schema.ts) và lớp nghiệp vụ DatabaseStorage (server/storage.ts)."),
  H3("2.3.2. Những chức năng không được kiểm thử"),
  B("Gửi nhắc lịch thực qua Email/SMS (cần cấu hình SMTP, Twilio)."),
  B("Phát luồng video camera thực (luồng HLS bên ngoài)."),
  B("Trang cửa hàng (Shop, Cart, Product Detail) – chưa được gắn vào điều hướng của ứng dụng."),
  B("Kiểm thử hiệu năng tải lớn và kiểm thử xâm nhập chuyên sâu – đề xuất cho giai đoạn sau."),
  H2("2.4. Chiến lược kiểm thử"),
  H3("2.4.1. Các hình thức kiểm thử và các bước kiểm thử"),
  H4("2.4.1.1. Kiểm thử hộp đen"),
  P("**Định nghĩa:** kiểm thử hộp đen không quan tâm đến mã nguồn, chỉ tập trung vào đầu vào và đầu ra để kiểm tra phần mềm có hoạt động đúng đặc tả hay không. Phương pháp này phù hợp với các chức năng như tạo khách hàng, đặt lịch, tạo hóa đơn dưới góc độ người dùng. Nhóm áp dụng kỹ thuật phân vùng tương đương và phân tích giá trị biên (SĐT 9/10/11 chữ số, tuổi âm, tồn kho âm, số lượng vượt tồn)."),
  P("Các bước kiểm thử:"),
  B("**Bước 1 – Lập kế hoạch:** xây dựng tài liệu yêu cầu, chọn công cụ, tìm hiểu chức năng cần kiểm tra."),
  B("**Bước 2 – Thiết kế test case:** xác định dữ liệu đầu vào, các bước và kết quả mong đợi."),
  B("**Bước 3 – Thực thi:** chạy test case, ghi nhận Pass/Fail và lỗi nếu có."),
  B("**Bước 4 – Báo cáo:** tổng hợp kết quả, tỷ lệ lỗi, chuyển cho nhóm phát triển."),
  B("**Bước 5 – Kiểm thử lại:** sau khi lỗi được sửa, chạy lại để xác nhận."),
  H4("2.4.1.2. Kiểm thử hộp trắng"),
  P("**Định nghĩa:** kiểm thử hộp trắng dựa trên cấu trúc bên trong và mã nguồn. Nhóm đọc mã server/storage.ts và shared/schema.ts, viết unit test cho từng nhánh điều kiện: kiểm tra trùng lịch của bác sĩ và thú cưng, trừ tồn kho trong transaction, chặn tồn kho âm, xóa mềm lịch hẹn."),
  B("**Bước 1:** phân tích mã nguồn và các nhánh điều kiện."),
  B("**Bước 2:** thiết kế test case bao phủ từng nhánh (hợp lệ / ném lỗi)."),
  B("**Bước 3:** thực thi bằng Mocha, ghi nhận kết quả."),
  B("**Bước 4:** báo cáo và kiểm thử lại sau khi sửa."),
  H4("2.4.1.3. Kiểm thử thủ công"),
  P("**Định nghĩa:** người kiểm thử thao tác trực tiếp trên giao diện (nhấn nút, nhập liệu) để quan sát kết quả. Nhóm dùng kiểm thử thủ công để khám phá giao diện, xác định các bước và thông báo thực tế trước khi tự động hóa."),
  B("**Bước 1:** chuẩn bị môi trường và dữ liệu."), B("**Bước 2:** thực thi thủ công, quan sát và ghi nhận."),
  B("**Bước 3:** báo cáo lỗi."), B("**Bước 4:** kiểm thử lại."),
  H4("2.4.1.4. Kiểm thử tự động"),
  P(`**Định nghĩa:** kiểm thử bằng công cụ phần mềm. Toàn bộ ${totalAuto} test case chức năng được tự động hóa bằng Mocha và Selenium WebDriver, chạy được trên Chrome, Edge và Firefox, cho phép chạy lại nhanh sau mỗi lần sửa lỗi.`),
  B("**Bước 1:** chọn công cụ Mocha, Selenium WebDriver."),
  B("**Bước 2:** viết kịch bản cho từng test case."),
  B("**Bước 3:** thực thi kịch bản, so sánh với kết quả mong đợi."),
  B("**Bước 4:** ghi nhận và báo cáo."), B("**Bước 5:** kiểm thử lại (hồi quy)."),
  H3("2.4.2. Các loại kiểm thử"),
  H4("2.4.2.1. Kiểm thử chức năng"),
  P("Đảm bảo các chức năng hoạt động đúng đặc tả; dựa trên kiểm thử hộp đen."),
  B("**Kỹ thuật:** bao phủ cả dữ liệu hợp lệ và không hợp lệ; với dữ liệu không hợp lệ hệ thống phải đưa ra thông báo rõ ràng."),
  B("**Điều kiện dừng:** thực thi hết test case đã thiết kế, mọi lỗi được ghi nhận chi tiết."),
  B("**Chịu trách nhiệm:** Test Designer, Tester."),
  H4("2.4.2.2. Kiểm thử hiệu năng"),
  P("**Mục đích:** đo thời gian phản hồi và thông lượng của hệ thống, đối chiếu với yêu cầu phi chức năng ở mục 1.3.2: thao tác thông thường ≤ 3 giây khi có 200 người dùng đồng thời; tìm kiếm trên khoảng 10.000 bản ghi ≤ 2 giây."),
  P("**Công cụ đo:** **autocannon** – bộ sinh tải HTTP viết bằng Node.js, giả lập nhiều kết nối đồng thời gửi yêu cầu liên tục tới API và ghi nhận phân phối thời gian phản hồi. Có thể thay bằng các công cụ tương đương: Apache JMeter, k6, Locust."),
  P("**Các chỉ số đo:**"),
  B("**Thời gian phản hồi (latency):** trung bình, p50 (trung vị), p90, p99 (99% yêu cầu nhanh hơn giá trị này), lớn nhất."),
  B("**Thông lượng (throughput):** số yêu cầu xử lý mỗi giây (req/s)."),
  B("**Tỷ lệ lỗi:** phần trăm yêu cầu bị lỗi kết nối, quá thời gian chờ (10 giây) hoặc trả mã khác 2xx."),
  B("**Tài nguyên:** bộ nhớ (RAM) của tiến trình ứng dụng khi chạy tải liên tục."),
  P("**Lưu ý môi trường đo:** máy sinh tải, máy chủ ứng dụng và CSDL chạy trên cùng một máy kiểm thử theo cấu hình ở mục 2.2. Số liệu vì vậy mang tính tham khảo và cần đo lại trên hạ tầng triển khai thật."),
  H4("2.4.2.3. Kiểm thử tải (Load Testing)"),
  B("**Mục đích:** kiểm tra hệ thống đáp ứng đúng yêu cầu ở mức tải dự kiến – 200 người dùng đồng thời."),
  B("**Kỹ thuật:** autocannon giữ 200 kết nối đồng thời trong 30 giây cho từng kịch bản: trang Tổng quan, danh sách khách hàng, lịch hẹn, kho thuốc, kịch bản đọc hỗn hợp nhiều màn hình và kịch bản ghi (tạo hồ sơ khách hàng). Riêng tìm kiếm được đo trên 10.000 khách hàng."),
  B("**Tiêu chí đạt:** p99 ≤ 3.000 ms (tìm kiếm ≤ 2.000 ms) và tỷ lệ lỗi 0%."),
  B("**Chịu trách nhiệm:** Test Designer, Tester."),
  H4("2.4.2.4. Kiểm thử chịu tải (Stress Testing)"),
  B("**Mục đích:** xác định giới hạn tối đa hệ thống chịu được, cách hệ thống phản ứng khi quá tải và khả năng hồi phục khi tải giảm."),
  B("**Kỹ thuật:** tăng dần số kết nối 50 → 100 → 200 → 400 → 800 → 1.200 → 1.600, mỗi mức 15 giây với kịch bản hỗn hợp; sau đó giảm về 50 kết nối để kiểm tra hồi phục."),
  B("**Ngưỡng quá tải:** mức đầu tiên có p99 > 3 giây hoặc tỷ lệ lỗi > 1%."),
  B("**Tiêu chí đạt:** không quá tải ở mức ≤ 200 kết nối; máy chủ không sập; hồi phục hoàn toàn khi tải giảm."),
  H4("2.4.2.5. Kiểm thử toàn vẹn dữ liệu (Data Integrity Testing)"),
  B("**Mục đích:** đảm bảo dữ liệu luôn chính xác và nhất quán: khi nhiều người thao tác cùng lúc, giữa các bảng liên quan (hóa đơn – dòng hóa đơn – tồn kho, thú cưng – khách hàng), với dữ liệu đặc biệt và dữ liệu độc hại."),
  B("**Kỹ thuật:** gửi yêu cầu đồng thời để phát hiện race condition (bán thuốc, đặt lịch); đối chiếu trực tiếp trong CSDL bằng truy vấn SQL (tổng tiền, tồn kho âm, bản ghi mồ côi); lưu rồi đọc lại tiếng Việt, emoji, ký tự HTML, chuỗi rất dài, chuỗi SQL Injection."),
  B("**Công cụ:** Mocha + mysql2 (kết nối CSDL để đối chiếu)."),
  B("**Tiêu chí đạt:** không bán vượt tồn kho, không trùng lịch, không có bản ghi lệch hoặc mồ côi, dữ liệu đọc lại giống hệt dữ liệu đã ghi."),
  H4("2.4.2.6. Kiểm thử độ tin cậy và phục hồi (Reliability & Recovery Testing)"),
  B("**Mục đích:** đánh giá hệ thống hoạt động ổn định lâu dài và tự phục hồi sau sự cố, gắn với yêu cầu uptime ≥ 99%."),
  B("**Kỹ thuật:** bộ test tự khởi chạy một tiến trình ứng dụng riêng rồi chủ động gây sự cố: gửi yêu cầu sai định dạng; dừng MySQL khi ứng dụng đang chạy rồi bật lại; tắt đột ngột ứng dụng (kill) rồi khởi động lại; chạy tải liên tục 180 giây và theo dõi bộ nhớ."),
  B("**Tiêu chí đạt:** ứng dụng không sập khi mất CSDL; tự phục hồi ≤ 30 giây khi CSDL trở lại; không mất dữ liệu đã ghi; khởi động lại ≤ 10 giây; chạy liên tục không lỗi, bộ nhớ không tăng liên tục."),
  H4("2.4.2.7. Kiểm thử bảo mật"),
  P("Đảm bảo dữ liệu khách hàng và hồ sơ khám được bảo vệ. Nhóm kiểm tra việc truy cập chức năng khi chưa đăng nhập (SYS-TC004). Kết quả cho thấy hệ thống chưa có xác thực và phân quyền, đây là lỗi mức Cao. Đề xuất bổ sung kiểm thử SQL Injection, XSS bằng Burp Suite/OWASP ZAP sau khi có cơ chế đăng nhập."),
  H2("2.5. Điều kiện chấp thuận"),
  B("**Hoàn thành test case:** 100% test case được thực thi; không còn lỗi mức Cao; tỷ lệ Pass ≥ 90%."),
  B("**Ổn định:** hệ thống chạy ổn định trên Chrome, Edge và Firefox, không treo khi thao tác liên tục."),
  B("**Bảo mật:** có đăng nhập và phân quyền theo vai trò trước khi triển khai thực tế."),
  B("**Hiệu năng:** p99 ≤ 3 giây với 200 người dùng đồng thời; tìm kiếm ≤ 2 giây trên 10.000 bản ghi; không lỗi ở mức tải dự kiến."),
  B("**Toàn vẹn và tin cậy:** không mất, không sai lệch dữ liệu khi thao tác đồng thời; tự phục hồi sau sự cố CSDL."),
  B("**Khả năng bảo trì:** bộ test tự động chạy lại được bằng một lệnh để kiểm thử hồi quy."),
  H2("2.6. Defect Tracking (Lỗi)"),
  H3("2.6.1. Phân loại lỗi"),
  simpleTable(["Mức độ nghiêm trọng", "Đặc tả lỗi"], [
    ["Cao", "Chức năng chính không sử dụng được (không thêm được khách hàng, không tìm kiếm được); ô nhập liệu không nhập được; lỗ hổng bảo mật (không có đăng nhập)."],
    ["Trung bình", "Vi phạm quy tắc nghiệp vụ nhưng vẫn thao tác được: dữ liệu trùng, lịch hẹn quá khứ, ca trực sai giờ, hóa đơn rỗng."],
    ["Thấp", "Thông báo lỗi thiếu hoặc khó hiểu, bộ lọc không có kết quả, lỗi hiển thị giao diện."],
  ], [2300, 6771]),
  tableCaption("Bảng phân loại mức độ nghiêm trọng của lỗi"),
  H3("2.6.2. Quy trình xử lý lỗi"),
  N("**Ghi nhận lỗi:** mô tả lỗi, test case gây lỗi, các bước tái hiện và kết quả thực tế."),
  N("**Phân loại lỗi:** theo mức độ Cao, Trung bình, Thấp."),
  N("**Phân công xử lý:** chuyển cho thành viên phụ trách chức năng."),
  N("**Sửa lỗi:** nhóm phát triển sửa và chuyển lại cho Tester."),
  N("**Kiểm thử lại:** chạy lại test case liên quan và toàn bộ bộ test tự động để phát hiện lỗi hồi quy."),
  N("**Báo cáo lỗi:** cập nhật số lượng, mức độ và trạng thái lỗi cho các bên."),
  N("**Đánh giá và tổng kết:** rút kinh nghiệm cho các phiên bản sau."),
];

// ===== Chương 3 =====
const ch3 = [H1("3. Chương 3: Xây dựng các test case")];
ch3.push(P(`Nhóm xây dựng ${totalAuto} test case chức năng, chia theo tác nhân như bảng dưới đây. Cột Status là kết quả thực thi thực tế bằng bộ kiểm thử tự động ở Chương 5 (lần chạy ngày 02/10/2026).`));
const groupDefs = [
  ["3.1", "Chức năng của HỆ THỐNG"], ["3.2", "Chức năng của LỄ TÂN"], ["3.3", "Chức năng của BÁC SĨ"], ["3.4", "Chức năng của QUẢN TRỊ VIÊN / KẾ TOÁN"],
];
ch3.push(simpleTable(["Nhóm", "Số test case", "Pass", "Fail"], groupDefs.map(([, g]) => {
  const l = cases.filter((c) => c.group === g);
  return [g, String(l.length), String(l.filter((c) => results[c.id]?.status === "Pass").length), String(l.filter((c) => results[c.id]?.status === "Fail").length)];
}).concat([["Tổng cộng", String(totalAuto), String(passAuto), String(failAuto)]]), [4571, 1500, 1500, 1500], { center: [1, 2, 3] }));
ch3.push(tableCaption("Bảng tổng hợp số lượng test case theo tác nhân"));
for (const [num, g] of groupDefs) {
  ch3.push(H2(`${num}. ${g}`));
  const ucs = [...new Set(cases.filter((c) => c.group === g).map((c) => c.uc))];
  ucs.forEach((uc, i) => {
    ch3.push(H3(`${num}.${i + 1}. ${uc}`));
    ch3.push(testCaseTable(cases.filter((c) => c.group === g && c.uc === uc)));
    ch3.push(empty());
  });
}
ch3.push(
  H2("3.5. Test case phi chức năng"),
  P(`Ngoài kiểm thử chức năng, nhóm xây dựng ${NF_CASES.length} test case phi chức năng. Cột “Kết quả đo được” là số liệu thực tế của lần chạy ở Chương 5.`),
  H3("3.5.1. Kiểm thử tải và hiệu năng"), nfTable("load"), tableCaption("Bảng test case kiểm thử tải và hiệu năng"),
  H3("3.5.2. Kiểm thử chịu tải"), nfTable("stress"), tableCaption("Bảng test case kiểm thử chịu tải"),
  H3("3.5.3. Kiểm thử toàn vẹn dữ liệu"), nfTable("integrity"), tableCaption("Bảng test case kiểm thử toàn vẹn dữ liệu"),
  H3("3.5.4. Kiểm thử độ tin cậy và phục hồi"), nfTable("rel"), tableCaption("Bảng test case kiểm thử độ tin cậy và phục hồi"),
);
ch3.push(H2("3.6. Biểu đồ so sánh"), ...figure("chart_compare.png", "Biểu đồ so sánh các test case chức năng theo nhóm"));
ch3.push(
  H2("3.7. Danh sách lỗi phát hiện"),
  P(`Bộ kiểm thử phát hiện ${defects.length} lỗi, xếp theo mức độ nghiêm trọng. Cột “Vị trí nghi vấn” chỉ ra nơi trong mã nguồn gây lỗi để nhóm phát triển khắc phục.`),
  simpleTable(["Test Case", "Mức độ", "Mô tả lỗi", "Kết quả thực tế", "Vị trí nghi vấn"],
    defects.map(([id, sev, desc, where, actual]) => [id, sev, desc, actual, where]), [1150, 1000, 2400, 2400, 2121], { center: [0, 1] }),
  tableCaption("Bảng danh sách lỗi phát hiện qua kiểm thử chức năng và phi chức năng"),
);

// ===== Chương 4 =====
const ch4 = [
  H1("4. Chương 4: Cài đặt phần mềm"),
  H2("4.1. Giới thiệu"),
  P("Chương này hướng dẫn cài đặt phần mềm Pet Clinic Pro và bộ kiểm thử, gồm yêu cầu hệ thống, quy trình cài đặt và cách sử dụng cơ bản."),
  H2("4.2. Yêu cầu hệ thống"),
  H3("4.2.1. Yêu cầu phần cứng"),
  B("Bộ vi xử lý: Intel Core i3 / AMD Ryzen 3 hoặc tương đương trở lên."),
  B("RAM: tối thiểu 8 GB."), B("Dung lượng ổ cứng trống: tối thiểu 10 GB."), B("Độ phân giải màn hình: 1366×768 hoặc cao hơn."),
  H3("4.2.2. Yêu cầu phần mềm"),
  B("Node.js 20 trở lên, npm."), B("MySQL 8.x (cài trực tiếp hoặc qua Docker)."), B("Trình duyệt Google Chrome, Microsoft Edge hoặc Mozilla Firefox bản mới nhất."),
  H2("4.3. Quy trình cài đặt"),
  N("Cài thư viện: chạy lệnh npm install trong thư mục pet-pttkpm.", "install"),
  N("Khởi động MySQL: docker compose up -d db (hoặc dùng MySQL cài sẵn).", "install"),
  N("Tạo file .env từ .env.example và cập nhật DATABASE_URL.", "install"),
  N("Tạo bảng và dữ liệu mẫu: npm run db:setup.", "install"),
  N("Chạy ứng dụng: npm run dev, truy cập http://localhost:5000.", "install"),
  code("cd pet-pttkpm/pet-pttkpm\nnpm install\ncp .env.example .env          # sửa DATABASE_URL nếu cần\nnpm run db:setup              # drizzle-kit push + seed dữ liệu mẫu\nnpm run dev                   # http://localhost:5000"),
  H2("4.4. Hướng dẫn sử dụng cơ bản"),
  P("**B1:** mở trình duyệt, truy cập địa chỉ hệ thống; trang Tổng quan hiển thị doanh thu, số đơn hàng, tồn kho, lịch hẹn hôm nay."),
  P("**B2:** dùng menu bên trái để vào các chức năng: Bác sĩ, Khách hàng, Lịch hẹn, Hồ sơ khám, Ca bác sĩ, Kho thuốc, Hóa đơn, Camera giám sát."),
  P("**B3:** lễ tân thêm khách hàng, thêm thú cưng và tạo lịch hẹn; bác sĩ lập hồ sơ khám; quản trị viên/kế toán quản lý kho, lập hóa đơn và xác nhận thanh toán."),
];

// ===== Chương 5 =====
const ch5 = [
  H1("5. Chương 5: Kết quả kiểm thử và kết luận"),
  H2("5.1. Giới thiệu trang web quản lý phòng khám thú cưng"),
];
const pagesShots = [
  ["dashboard.png", "Giao diện Tổng quan vận hành phòng khám"], ["customers.png", "Giao diện Quản lý khách hàng"],
  ["appointments.png", "Giao diện Quản lý lịch hẹn"], ["doctors.png", "Giao diện Quản lý bác sĩ"],
  ["medical_records.png", "Giao diện Quản lý hồ sơ khám bệnh"], ["shifts.png", "Giao diện Ca làm việc bác sĩ"],
  ["inventory.png", "Giao diện Quản lý kho thuốc và vật tư"], ["invoices.png", "Giao diện Hóa đơn"], ["cameras.png", "Giao diện Camera giám sát"],
];
pagesShots.forEach(([f, cap], i) => ch5.push(H3(`5.1.${i + 1}. ${cap}`), ...figure(f, cap)));
ch5.push(H3(`5.1.${pagesShots.length + 1}. Một số màn hình ghi nhận trong quá trình kiểm thử`));
[
  ["uc11_empty.png", "UC1.1-TC001 – Thông báo lỗi khi bỏ trống form thêm khách hàng"],
  ["uc11_success.png", "UC1.1-TC007 – Thêm khách hàng thành công"],
  ["uc11_no_address.png", "UC1.1-TC010 (Fail) – Bỏ trống Địa chỉ bị từ chối kèm lỗi JSON"],
  ["uc21_success.png", "UC2.1-TC002 – Đặt lịch hẹn thành công"],
  ["uc31_empty.png", "UC3.1-TC001 – Thông báo lỗi khi bỏ trống hồ sơ khám"],
  ["uc43_lowstock.png", "UC4.3-TC001 – Cảnh báo tồn kho thấp"],
  ["uc51_success.png", "UC5.1-TC002 – Tạo hóa đơn thành công, tồn kho tự trừ"],
].forEach(([f, cap]) => ch5.push(...figure(path.join("tests", f), cap)));

const UNIT_DIR = path.join(PROJECT, "tests", "unit");
const AUTO_DIR = path.join(ROOT, "automation");
ch5.push(
  H2("5.2. Kiểm thử đơn vị (Unit Test) bằng Mocha"),
  H3("5.2.1. Mục tiêu và phạm vi"),
  P(`Kiểm thử hộp trắng cho hai thành phần lõi: (1) các schema kiểm tra dữ liệu dùng chung giữa client và server trong shared/schema.ts; (2) lớp nghiệp vụ DatabaseStorage trong server/storage.ts, chạy trên một CSDL MySQL thử nghiệm riêng. Tổng cộng ${unitRows.length} unit test.`),
  H3("5.2.2. Cài đặt và chạy"),
  P("Mã nguồn unit test nằm trong thư mục pet-pttkpm/tests/unit. Mocha được thêm vào devDependencies, tsx dùng để chạy trực tiếp file TypeScript và hiểu alias @shared:"),
  code("npm install --save-dev mocha@10\n# package.json → \"test:unit\": \"mocha --import=tsx \\\"tests/unit/**/*.test.ts\\\"\"\n\n# Chạy trên CSDL thử nghiệm (KHÔNG dùng CSDL thật)\n$env:DATABASE_URL = \"mysql://root@127.0.0.1:3307/petclinic\"   # PowerShell\nnpm run test:unit"),
  H3("5.2.3. Mã nguồn unit test"),
  P("**tests/unit/schema.test.ts** – kiểm tra schema khách hàng, thú cưng, lịch hẹn, kho, hóa đơn, ca trực (trích):"),
  codeFromFile(path.join(UNIT_DIR, "schema.test.ts"), "// Unit test", 'describe("UT-SCH: insertPetSchema"'),
  empty(),
  P("**tests/unit/storage.test.ts** – kiểm tra quy tắc trùng lịch, xóa mềm, trừ tồn kho trong transaction (trích):"),
  codeFromFile(path.join(UNIT_DIR, "storage.test.ts"), 'describe("UT-STO: DatabaseStorage"', '  describe("Khách hàng (UC1.1)"'),
  H3("5.2.4. Kết quả unit test"),
  simpleTable(["Mã UT", "Nội dung kiểm thử", "Status"], unitRows, [1300, 6871, 900], { center: [0, 2] }),
  tableCaption("Bảng kết quả kiểm thử đơn vị"),
  ...figure("term_unit.png", "Kết quả chạy unit test bằng Mocha"),
  P(`Kết quả: ${unitPass}/${unitRows.length} unit test Pass, ${unitFail} Fail. Các unit test Fail trùng khớp với lỗi tìm thấy ở kiểm thử giao diện và chỉ rõ nguyên nhân gốc:`),
  B("**UT-SCH-04:** nullableString = z.string().min(1) từ chối chuỗi rỗng → nguyên nhân của UC1.1-TC010."),
  B("**UT-SCH-05:** schema phía server không kiểm tra SĐT 10 chữ số – chỉ form phía client kiểm tra, gọi API trực tiếp vẫn lưu được SĐT “123”."),
  B("**UT-SCH-16, UT-STO-05, UT-STO-13:** thiếu kiểm tra giờ ca trực, lịch hẹn quá khứ, SĐT trùng."),
  B("**UT-STO-12:** nhập thêm lô hàng không làm tăng tồn kho của vật tư (R4.1)."),
  H2("5.3. Kiểm thử tự động bằng Mocha và Selenium WebDriver"),
  H3("5.3.1. Giới thiệu về Mocha"),
  P("Mocha là framework kiểm thử đơn giản, linh hoạt và phổ biến cho Node.js:"),
  B("Hỗ trợ nhiều dạng kiểm thử như unit test, integration test, end-to-end test."),
  B("Chạy đồng bộ và bất đồng bộ (async/await), phù hợp điều khiển trình duyệt."),
  B("Cung cấp nhiều dạng báo cáo (spec, json…), dễ theo dõi kết quả."),
  H3("5.3.2. Giới thiệu về Selenium WebDriver"),
  P("WebDriver là khuôn khổ tự động hóa web trong bộ Selenium, cho phép điều khiển các trình duyệt khác nhau:"),
  B("Miễn phí, mã nguồn mở."),
  B("Kiến trúc đơn giản: điều khiển trình duyệt trực tiếp qua driver (chromedriver, msedgedriver, geckodriver được Selenium Manager tự tải theo phiên bản trình duyệt)."),
  B("Hỗ trợ nhiều ngôn ngữ: Java, C#, Python, JavaScript…"),
  B("Tốc độ cao do tương tác trực tiếp với trình duyệt."),
  P("**Cách cài đặt:**"),
  code("cd PetClinic_TestCode/02_AutomationTest\nnpm install                    # selenium-webdriver, mocha, cross-env\n\n# Ứng dụng phải đang chạy tại http://localhost:5000\nnpm run test:edge              # Microsoft Edge (mặc định)\nnpm run test:chrome            # Google Chrome\nnpm run test:firefox           # Mozilla Firefox"),
  H3("5.3.3. Cấu trúc bộ kiểm thử tự động"),
  simpleTable(["File", "Vai trò"], [
    ["automation/helpers.js", "Khởi tạo trình duyệt headless (Chrome/Edge/Firefox), các hàm thao tác: mở trang, nhập liệu, chọn dropdown (Radix Select), chờ thông báo, chụp màn hình, gọi API"],
    ["automation/cases.js", `Định nghĩa ${totalAuto} test case: mã, mô tả, các bước, dữ liệu, kết quả mong đợi và hàm run() thực thi`],
    ["automation/petclinic.spec.js", "Bộ Mocha: duyệt các test case theo nhóm tác nhân, ghi kết quả ra results.json"],
    ["automation/results.json", "Kết quả Pass/Fail và kết quả thực tế của từng test case – nguồn của cột Status ở Chương 3"],
  ], [2900, 6171]),
  tableCaption("Bảng cấu trúc mã nguồn kiểm thử tự động"),
  H3("5.3.4. Mã nguồn kiểm thử tự động"),
  P("**helpers.js** – khởi tạo trình duyệt và chọn giá trị trong dropdown (trích):"),
  codeFromFile(path.join(AUTO_DIR, "helpers.js"), "let driver;", "async function stop()"),
  codeFromFile(path.join(AUTO_DIR, "helpers.js"), "async function selectByLabel", "async function bodyText()"),
  empty(),
  P("**petclinic.spec.js** – bộ kiểm thử Mocha:"),
  codeFromFile(path.join(AUTO_DIR, "petclinic.spec.js")),
  empty(),
  P("**cases.js** – ví dụ hai test case UC1.1-TC007 (hợp lệ) và UC2.1-TC003 (trùng giờ bác sĩ):"),
  codeFromFile(path.join(AUTO_DIR, "cases.js"), '  id: "UC1.1-TC007"', '  id: "UC1.1-TC008"'),
  codeFromFile(path.join(AUTO_DIR, "cases.js"), '  id: "UC2.1-TC003"', '  id: "UC2.1-TC004"'),
  H3("5.3.5. Kết quả kiểm thử tự động"),
  P("Kết quả dưới đây là lượt chạy đầy đủ trên Microsoft Edge (chế độ headless), dữ liệu mẫu được nạp lại trước khi chạy. Cùng bộ kịch bản có thể chạy lại trên Chrome và Firefox bằng biến môi trường BROWSER."),
  ...figure("term_auto_1.png", "Kết quả chạy kiểm thử tự động (phần 1)"),
  ...figure("term_auto_2.png", "Kết quả chạy kiểm thử tự động (phần 2)"),
  ...figure("term_auto_fail.png", "Chi tiết các test case Fail trong lần chạy tự động"),
  H3("5.3.6. Mục tiêu và phạm vi kiểm thử"),
  B(`**Mục tiêu:** tự động hóa các tác vụ kiểm thử để đảm bảo chức năng hoạt động đúng yêu cầu; tiết kiệm thời gian so với kiểm thử thủ công (toàn bộ ${totalAuto} test case chạy trong khoảng 4 phút); dùng làm bộ kiểm thử hồi quy sau mỗi lần sửa lỗi.`),
  B("**Phạm vi:** điều hướng, quản lý khách hàng và thú cưng, lịch hẹn, ca bác sĩ, hồ sơ khám, camera, bác sĩ, kho thuốc, hóa đơn, thanh toán và báo cáo doanh thu."),
  H2("5.4. Kiểm thử hiệu năng: tải và chịu tải"),
  H3("5.4.1. Giới thiệu công cụ autocannon"),
  P("autocannon là công cụ đo hiệu năng HTTP mã nguồn mở viết bằng Node.js, có thể chạy từ dòng lệnh hoặc gọi trong mã kiểm thử:"),
  B("Giả lập hàng trăm đến hàng nghìn kết nối đồng thời, gửi yêu cầu liên tục trong thời gian định trước."),
  B("Hỗ trợ nhiều kịch bản: một API, chuỗi API luân phiên, yêu cầu ghi (POST) với dữ liệu sinh động."),
  B("Báo cáo đầy đủ phân phối thời gian phản hồi (p50, p90, p99, max), thông lượng req/s, số lỗi và timeout."),
  B("Tích hợp được với Mocha để mỗi kịch bản là một test case có tiêu chí Pass/Fail tự động."),
  H3("5.4.2. Cài đặt và chạy"),
  code("cd PetClinic_TestCode/03_PerformanceTest\nnpm install                       # autocannon, mocha, mysql2\n\n# Ứng dụng chạy bản production: npm run build && npm start\nnpm run test:load                 # kiểm thử tải – 200 người dùng\nnpm run test:search               # tìm kiếm trên 10.000 bản ghi (cần DATABASE_URL)\nnpm run test:stress               # kiểm thử chịu tải – tăng dần kết nối\n\n# Tùy chỉnh: $env:LOAD_USERS=300; $env:LOAD_DURATION=60; $env:STRESS_LEVELS=\"100,500,1000\""),
  H3("5.4.3. Mã nguồn kiểm thử hiệu năng"),
  P("**perf/load.test.js** – mỗi kịch bản tải là một test case Mocha (trích):"),
  codeFromFile(path.join(NF, "perf", "load.test.js"), 'describe(`Kiểm thử tải'),
  P("**perf/stress.test.js** – tăng dần kết nối và xác định ngưỡng quá tải (trích):"),
  codeFromFile(path.join(NF, "perf", "stress.test.js"), '  it("STRESS-TC001', '  it("STRESS-TC002'),
  H3("5.4.4. Kết quả kiểm thử tải"),
  simpleTable(["Kịch bản", "Kết nối", "Yêu cầu", "req/s", "p50 (ms)", "p99 (ms)", "Lỗi", "Status"],
    nfLoad.map((l) => [`${l.id}\n${l.name}`, String(l.connections), l.requests.toLocaleString("vi-VN"), String(l.rps), String(l.latencyP50Ms), String(l.latencyP99Ms), `${l.errorRatePct}%`, nfStatus(l.id)]),
    [2871, 800, 1000, 750, 850, 850, 650, 1300], { center: [1, 2, 3, 4, 5, 6, 7] }),
  tableCaption("Bảng kết quả kiểm thử tải với 200 người dùng đồng thời"),
  ...figure("chart_load.png", "Thời gian phản hồi p50/p99 của các kịch bản tải"),
  ...figure("term_load.png", "Kết quả chạy kiểm thử tải"),
  P(`Tìm kiếm trên ${nfSearch.totalCustomers.toLocaleString("vi-VN")} khách hàng: một người dùng có thời gian trung bình ${ms(nfSearch.single.avgMs)}, p95 ${ms(nfSearch.single.p95Ms)}; 50 người dùng đồng thời đạt ${nfSearch.concurrent.rps} req/s với p99 ${ms(nfSearch.concurrent.latencyP99Ms)} – đạt yêu cầu ≤ 2 giây.`),
  ...figure("term_search.png", "Kết quả kiểm thử tìm kiếm trên 10.000 bản ghi"),
  P(`**Nhận xét:** cả ${nfLoad.length} kịch bản tải đạt yêu cầu: p99 cao nhất ${ms(Math.max(...nfLoad.map((l) => l.latencyP99Ms)))}, thấp hơn nhiều so với ngưỡng 3 giây, không có yêu cầu lỗi. Kịch bản hỗn hợp chậm hơn vì trả về nhiều dữ liệu liên kết (thú cưng, hồ sơ khám, hóa đơn).`),
  H3("5.4.5. Kết quả kiểm thử chịu tải"),
  simpleTable(["Số kết nối", "req/s", "p50 (ms)", "p99 (ms)", "Max (ms)", "Tỷ lệ lỗi", "Đánh giá"],
    nfStress.levels.map((l) => [l.recovery ? "50 (hồi phục)" : String(l.connections), String(l.rps), String(l.latencyP50Ms), String(l.latencyP99Ms), String(l.latencyMaxMs), `${l.errorRatePct}%`, l.recovery ? "Hồi phục" : l.overloaded ? "Quá tải" : "Đạt"]),
    [1500, 1100, 1200, 1200, 1200, 1271, 1600], { center: [0, 1, 2, 3, 4, 5, 6] }),
  tableCaption("Bảng kết quả kiểm thử chịu tải theo từng mức kết nối"),
  ...figure("chart_stress.png", "Thời gian phản hồi và tỷ lệ lỗi khi tăng dần tải"),
  ...figure("term_stress.png", "Kết quả chạy kiểm thử chịu tải"),
  P(`**Nhận xét:** thông lượng của kịch bản hỗn hợp đạt khoảng ${Math.max(...stressLv.map((l) => l.rps))} req/s và gần như không tăng khi thêm kết nối, nên thời gian phản hồi tăng tuyến tính theo số kết nối. Hệ thống đạt yêu cầu tới ${okUpTo} kết nối (gấp đôi yêu cầu 200), bắt đầu quá tải từ ${nfStress.breakingPoint} kết nối và phát sinh lỗi timeout từ ${stressLv.find((l) => l.errorRatePct > 0)?.connections ?? "–"} kết nối. Máy chủ không bị sập và hồi phục hoàn toàn khi tải giảm về 50 kết nối. Đề xuất: thêm phân trang và cache cho các API danh sách, tăng connectionLimit của pool MySQL, chạy nhiều tiến trình Node (cluster/PM2) khi triển khai.`),
  H2("5.5. Kiểm thử toàn vẹn dữ liệu"),
  H3("5.5.1. Cài đặt và chạy"),
  code("cd PetClinic_TestCode/04_DataIntegrityTest\nnpm install\n$env:BASE_URL = \"http://localhost:5000\"\n$env:DATABASE_URL = \"mysql://<user>:<pass>@localhost:3306/petclinic_test\"\nnpm run test:integrity"),
  H3("5.5.2. Mã nguồn kiểm thử toàn vẹn dữ liệu"),
  P("**integrity/integrity.test.js** – kiểm tra bán thuốc đồng thời (race condition) và đối chiếu trực tiếp trong CSDL (trích):"),
  codeFromFile(path.join(NF, "integrity", "integrity.test.js"), '    it("DI-TC001', '    it("DI-TC002'),
  codeFromFile(path.join(NF, "integrity", "integrity.test.js"), '    it("DI-TC003', '    it("DI-TC004'),
  H3("5.5.3. Kết quả kiểm thử toàn vẹn dữ liệu"),
  ...figure("term_integrity.png", "Kết quả chạy kiểm thử toàn vẹn dữ liệu"),
  P(`Kết quả: ${NF_CASES.filter((c) => c.sec === "integrity" && c.status === "Pass").length}/${NF_CASES.filter((c) => c.sec === "integrity").length} test case đạt. Dữ liệu tĩnh nhất quán: tổng tiền hóa đơn khớp các dòng, không có tồn kho âm, khóa ngoại được CSDL bảo vệ, dữ liệu tiếng Việt, emoji và ký tự HTML được lưu nguyên vẹn, truy vấn có tham số nên miễn nhiễm SQL Injection. Tuy nhiên phát hiện hai lỗi nghiêm trọng khi thao tác đồng thời:`),
  B("**DI-TC001 – bán vượt tồn kho:** 20 giao dịch bán đồng thời trên vật tư chỉ còn 10 hộp đều thành công, tồn kho ghi nhận còn 8 trong khi đã bán 20. Nguyên nhân: các giao dịch cùng đọc giá trị tồn kho cũ rồi ghi đè (lost update). Khắc phục: dùng UPDATE inventory SET stock = stock - ? WHERE id = ? AND stock >= ? và kiểm tra số dòng bị ảnh hưởng, hoặc SELECT … FOR UPDATE trong transaction."),
  B("**DI-TC002 – trùng lịch khi đặt đồng thời:** 10 yêu cầu cùng bác sĩ, cùng giờ đều được tạo. Khắc phục: thêm ràng buộc UNIQUE (veterinarian_id, appointment_date) cho lịch chưa hủy hoặc khóa bản ghi khi kiểm tra."),
  B("**DI-TC006, DI-TC007 – thanh toán:** thu tiền nhiều lần không cộng dồn nên hóa đơn không chuyển \"Đã thanh toán\", và hệ thống chấp nhận thu vượt số tiền hóa đơn."),
  H2("5.6. Kiểm thử độ tin cậy và phục hồi"),
  H3("5.6.1. Cài đặt và chạy"),
  P("Bộ test tự khởi chạy một tiến trình ứng dụng riêng ở cổng 5055 từ bản build production và cần lệnh dừng/khởi động MySQL phù hợp môi trường:"),
  code("cd PetClinic_TestCode/05_ReliabilityTest\nnpm install\n$env:APP_DIR      = \"..\\..\\pet-pttkpm\\pet-pttkpm\"     # đã chạy npm run build\n$env:DATABASE_URL = \"mysql://<user>:<pass>@localhost:3306/petclinic_test\"\n$env:DB_STOP_CMD  = \"net stop MySQL80\"                 # hoặc: docker stop petclinic-db\n$env:DB_START_CMD = \"net start MySQL80\"                # hoặc: docker start petclinic-db\n$env:SOAK_S       = \"180\"\nnpm run test:reliability"),
  H3("5.6.2. Mã nguồn kiểm thử độ tin cậy và phục hồi"),
  P("**reliability/reliability.test.js** – mất CSDL và tự phục hồi (trích):"),
  codeFromFile(path.join(NF, "reliability", "reliability.test.js"), '  it("REL-TC002', '  it("REL-TC004'),
  H3("5.6.3. Kết quả kiểm thử độ tin cậy và phục hồi"),
  simpleTable(["Chỉ số", "Kết quả đo", "Yêu cầu"], [
    ["Khởi động ứng dụng (lần đầu)", ms(nfRel.coldStartMs), "–"],
    ["Phản hồi khi mất CSDL", `HTTP ${nfRel.dbDown.apiStatus}, ứng dụng ${nfRel.dbDown.appAlive ? "không sập" : "bị sập"}`, "Báo lỗi có kiểm soát, không sập"],
    ["Thời gian tự phục hồi khi CSDL hoạt động lại", ms(nfRel.dbRecoveryMs), "≤ 30.000 ms"],
    ["Khởi động lại sau khi bị tắt đột ngột", ms(nfRel.restartMs), "≤ 10.000 ms"],
    [`Chạy tải liên tục ${Math.round(nfRel.soak.durationS)} giây (50 kết nối)`, `${nfRel.soak.requests.toLocaleString("vi-VN")} yêu cầu, lỗi ${nfRel.soak.errorRatePct}%, p99 ${ms(nfRel.soak.latencyP99Ms)}`, "Lỗi 0%, p99 ≤ 3.000 ms"],
    ["Bộ nhớ tiến trình khi chạy liên tục", `${nfRel.soak.rssStartMB} MB → cao nhất ${nfRel.soak.rssMaxMB} MB → cuối ${nfRel.soak.rssEndMB} MB`, "Không tăng liên tục"],
  ], [3300, 3471, 2300]),
  tableCaption("Bảng kết quả kiểm thử độ tin cậy và phục hồi"),
  ...figure("chart_soak_memory.png", "Bộ nhớ ứng dụng trong thời gian chạy tải liên tục"),
  ...figure("term_reliability.png", "Kết quả chạy kiểm thử độ tin cậy và phục hồi"),
  P(`**Nhận xét:** ${NF_CASES.filter((c) => c.sec === "rel" && c.status === "Pass").length}/${NF_CASES.filter((c) => c.sec === "rel").length} test case đạt. Ứng dụng không sập khi mất CSDL mà trả HTTP 500, rồi tự kết nối lại sau khoảng ${(nfRel.dbRecoveryMs / 1000).toFixed(1)} giây khi CSDL hoạt động trở lại mà không cần khởi động lại. Dữ liệu đã ghi không mất khi tiến trình bị tắt đột ngột, và ứng dụng khởi động lại trong dưới 1 giây. Khi chạy liên tục, bộ nhớ tăng trong khoảng 30 giây đầu (khởi tạo bộ đệm, kết nối) rồi ổn định quanh ${nfRel.soak.rssEndMB} MB. Chưa thấy dấu hiệu rò rỉ bộ nhớ trong ${Math.round(nfRel.soak.durationS)} giây; cần chạy dài hơn (vài giờ) trước khi triển khai thật.`),
  H2("5.7. Tổng hợp kết quả"),
  simpleTable(["Loại kiểm thử", "Công cụ", "Số test case", "Pass", "Fail", "Tỷ lệ Pass"], (() => {
    const row = (name, tool, t, p) => [name, tool, String(t), String(p), String(t - p), `${((p / t) * 100).toFixed(1)}%`];
    const sec = (k) => NF_CASES.filter((c) => c.sec === k);
    const pass = (k) => sec(k).filter((c) => c.status === "Pass").length;
    const rows = [
      row("Kiểm thử chức năng tự động", "Mocha + Selenium WebDriver", totalAuto, passAuto),
      row("Kiểm thử đơn vị (Unit Test)", "Mocha + tsx", unitRows.length, unitPass),
      row("Kiểm thử tải và hiệu năng", "autocannon + Mocha", sec("load").length, pass("load")),
      row("Kiểm thử chịu tải", "autocannon + Mocha", sec("stress").length, pass("stress")),
      row("Kiểm thử toàn vẹn dữ liệu", "Mocha + mysql2", sec("integrity").length, pass("integrity")),
      row("Kiểm thử độ tin cậy và phục hồi", "Mocha + autocannon", sec("rel").length, pass("rel")),
    ];
    const T = totalAuto + unitRows.length + NF_CASES.length;
    const Pp = passAuto + unitPass + nfPass;
    rows.push(["Tổng", "", String(T), String(Pp), String(T - Pp), `${((Pp / T) * 100).toFixed(1)}%`]);
    return rows;
  })(), [2671, 2300, 1100, 900, 900, 1200], { center: [2, 3, 4, 5] }),
  tableCaption("Bảng tổng hợp kết quả kiểm thử"),
  ...figure("chart_summary.png", "Tỷ lệ Pass/Fail của kiểm thử chức năng và kiểm thử đơn vị"),
  P(`Với tỷ lệ Pass của kiểm thử chức năng ${((passAuto / totalAuto) * 100).toFixed(1)}% và còn ${defects.filter((d) => d[1] === "Cao").length} lỗi mức Cao, phiên bản hiện tại **chưa đạt** điều kiện chấp thuận ở mục 2.5 (≥ 90% Pass, không còn lỗi mức Cao). Về hiệu năng, hệ thống đạt yêu cầu 200 người dùng đồng thời với dư địa lớn; về độ tin cậy, hệ thống tự phục hồi tốt sau sự cố.`),
  H2("5.8. KẾT LUẬN"),
  P("Hệ thống Pet Clinic Pro đã triển khai đầy đủ các nhóm chức năng chính: quản lý khách hàng và thú cưng, đặt lịch có kiểm tra trùng giờ bác sĩ và thú cưng, hồ sơ khám, ca trực, kho thuốc với cảnh báo tồn thấp, hóa đơn tự trừ tồn kho trong transaction, thanh toán và báo cáo doanh thu. Các luồng hợp lệ đều chạy đúng; trang Tổng quan phản ánh chính xác doanh thu từ hóa đơn đã thanh toán."),
  P(`Về phi chức năng, hệ thống đáp ứng tốt yêu cầu hiệu năng (p99 dưới 0,7 giây với 200 người dùng, tìm kiếm trên 10.000 bản ghi dưới 0,1 giây, chịu được tới ${okUpTo} kết nối), không sập khi quá tải hoặc mất CSDL và tự phục hồi nhanh.`),
  P("Tuy nhiên hệ thống còn những hạn chế đáng kể:"),
  B("Chưa có đăng nhập và phân quyền RBAC, bất kỳ ai truy cập đường dẫn đều thao tác được dữ liệu."),
  B("Không thêm được khách hàng khi bỏ trống ô Địa chỉ, và ô tìm kiếm khách hàng mất focus sau ký tự đầu – hai lỗi ảnh hưởng trực tiếp tới công việc hằng ngày của lễ tân."),
  B("Mất toàn vẹn dữ liệu khi thao tác đồng thời: bán vượt tồn kho, tạo trùng lịch hẹn – rủi ro lớn khi nhiều lễ tân, nhiều quầy cùng làm việc."),
  B("Nhiều quy tắc nghiệp vụ trong đặc tả chưa được kiểm tra ở phía server: trùng SĐT/email/microchip/mã vật tư, lịch hẹn quá khứ, hủy lịch trước 1 tiếng, giờ và trùng ca trực, cộng dồn thanh toán."),
  B("Một số thông báo lỗi hiển thị chuỗi JSON kỹ thuật hoặc không hiển thị, gây khó hiểu cho người dùng."),
  P("Hướng phát triển và đề xuất khắc phục:"),
  B("**Bảo mật:** bổ sung đăng nhập (JWT/session), middleware phân quyền theo vai trò cho toàn bộ API."),
  B("**Toàn vẹn dữ liệu:** trừ tồn kho bằng câu lệnh UPDATE có điều kiện hoặc khóa bản ghi; ràng buộc UNIQUE cho lịch hẹn, SĐT, email, microchip, mã vật tư; cộng dồn số tiền đã thu khi xác định trạng thái hóa đơn."),
  B("**Sửa lỗi mức Cao về giao diện:** gửi null thay cho chuỗi rỗng ở các trường không bắt buộc; không thay toàn bộ danh sách bằng trạng thái tải khi tìm kiếm (dùng placeholderData/keepPreviousData)."),
  B("**Hiệu năng khi mở rộng:** phân trang, cache cho API danh sách; chạy nhiều tiến trình Node; theo dõi bằng công cụ giám sát (APM)."),
  B("**Thông báo thân thiện:** chuyển lỗi Zod thành thông báo tiếng Việt theo từng trường."),
  B("**Duy trì kiểm thử:** tích hợp unit test, bộ Selenium, kiểm thử toàn vẹn dữ liệu và kiểm thử tải vào CI để kiểm thử hồi quy sau mỗi lần sửa."),
);

/* --------------------- danh mục hình, bảng & ghép --------------------- */
const listPart = [
  H1("DANH MỤC HÌNH ẢNH"), ...figures.map((f) => plain(f, { before: 20, after: 20 })),
  H1("DANH MỤC BẢNG BIỂU"), ...tables.map((t) => plain(t, { before: 20, after: 20 })),
];
body.splice(LIST_FIG_INDEX, 0, ...listPart);
push(...intro, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5);

const doc = new Document({
  creator: "Nhóm kiểm thử",
  title: "Báo cáo kiểm thử phần mềm Pet Clinic",
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: FONT, color: "000000" }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: FONT, color: "000000" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT, color: "000000" }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2, keepNext: true } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, italics: true, font: FONT, color: "000000" }, paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 3, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "o", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1260, hanging: 360 } } } },
        { level: 2, format: LevelFormat.BULLET, text: "▪", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1800, hanging: 360 } } } },
      ] },
      { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "Bước %1:", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 1080 } } } }] },
      { reference: "install", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  features: { updateFields: true },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
          borders: {
            pageBorderTop: { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 24, color: "000000", space: 24 },
            pageBorderBottom: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 24, color: "000000", space: 24 },
            pageBorderLeft: { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 24, color: "000000", space: 24 },
            pageBorderRight: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 24, color: "000000", space: 24 },
          },
        },
      },
      children: cover,
    },
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 }, pageNumbers: { start: 2 } },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24 })] })] }),
      },
      children: body,
    },
  ],
});

const out = path.join(ROOT, process.env.OUT_NAME || "N01_PetClinic_KiemThu.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("Written", out, `${figures.length} hình, ${tables.length} bảng, ${totalAuto} TC, ${unitRows.length} UT`);
});

// Xuất bảng test case ra CSV (mở bằng Excel): EXPORT_CSV=<thư mục> node build_doc.js
if (process.env.EXPORT_CSV) {
  const dir = process.env.EXPORT_CSV;
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const write = (f, rows) => fs.writeFileSync(path.join(dir, f), "\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n"));
  write("test_cases_chuc_nang.csv", [["Test Case ID", "Nhóm", "Use Case", "Mô tả", "Các bước", "Dữ liệu đầu vào", "Kết quả mong đợi", "Kết quả thực tế", "Status"],
    ...cases.map((c) => [c.id, c.group, c.uc, c.title, c.steps.map((s) => s[0]).join("\n"), c.steps.map((s) => s[2]).filter(Boolean).join("\n"), c.expected, results[c.id]?.actual, results[c.id]?.status])]);
  write("unit_tests.csv", [["Mã UT", "Nội dung", "Status"], ...unitRows]);
  write("test_cases_phi_chuc_nang.csv", [["Test Case ID", "Loại", "Mô tả", "Cách thực hiện", "Tiêu chí đạt", "Kết quả đo được", "Status"],
    ...NF_CASES.map((c) => [c.id, { load: "Tải & hiệu năng", stress: "Chịu tải", integrity: "Toàn vẹn dữ liệu", rel: "Tin cậy & phục hồi" }[c.sec], c.title, c.how, c.criteria, c.actual, c.status])]);
  write("danh_sach_loi.csv", [["Test Case", "Mức độ", "Mô tả lỗi", "Vị trí nghi vấn", "Kết quả thực tế"], ...defects]);
  console.log("CSV →", dir);
}
