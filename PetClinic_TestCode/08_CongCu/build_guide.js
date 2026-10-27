// build_guide.js – sinh file Word "Hướng dẫn chạy và đọc hiểu bộ kiểm thử Pet Clinic"
// Chạy: node build_guide.js   (kết quả: TestingDoc/HuongDan_KiemThu_PetClinic.docx)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel,
  BorderStyle, ShadingType, VerticalAlign, TableOfContents, Footer, PageNumber, LevelFormat, TableLayoutType, PageBreak,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const IMG = path.join(ROOT, "images");
const FONT = "Times New Roman";
const W = 9071;

const runs = (text, o = {}) => String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((p) =>
  p.startsWith("**") ? new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, size: o.size || 26 })
    : p.startsWith("`") ? new TextRun({ text: p.slice(1, -1), font: "Consolas", size: 22, shading: { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } })
      : new TextRun({ text: p, font: FONT, size: o.size || 26, bold: o.bold, italics: o.italics, color: o.color }));
const P = (t, o = {}) => new Paragraph({ children: runs(t, o), alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { before: 60, after: 80, line: 340 } });
const H1 = (t, br = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: br, children: [new TextRun({ text: t, font: FONT })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const B = (t, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, children: runs(t), spacing: { before: 30, after: 30, line: 320 } });
let stepRef = 0;
const steps = (items) => { stepRef += 1; const ref = `steps${stepRef}`; numberingConfigs.push(ref); return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { before: 40, after: 40, line: 320 } })); };
const numberingConfigs = [];
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (t, w, o = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 90, right: 90 },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined, verticalAlign: VerticalAlign.CENTER,
  children: String(t).split("\n").map((l) => new Paragraph({ alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: runs(l, { size: 22, bold: o.bold }) })),
});
const table = (headers, rows, widths) => new Table({
  layout: TableLayoutType.FIXED, width: { size: W, type: WidthType.DXA }, columnWidths: widths,
  rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: "D9E2F3", center: true })) }),
    ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(v, widths[i])) }))],
});
const code = (text) => new Table({
  layout: TableLayoutType.FIXED, width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" }, right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" } },
    width: { size: W, type: WidthType.DXA }, shading: { fill: "F5F5F5", type: ShadingType.CLEAR, color: "auto" }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: text.split("\n").map((l) => new Paragraph({ spacing: { before: 0, after: 0, line: 250 }, children: [new TextRun({ text: l || " ", font: "Consolas", size: 18 })] })),
  })] })],
});
const note = (t) => new Table({
  layout: TableLayoutType.FIXED, width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 24, color: "2E75B6" } },
    width: { size: W, type: WidthType.DXA }, shading: { fill: "EAF2FB", type: ShadingType.CLEAR, color: "auto" }, margins: { top: 80, bottom: 80, left: 160, right: 120 },
    children: [new Paragraph({ children: runs(t, { size: 24 }) })],
  })] })],
});
let fig = 0;
function image(file, caption, maxW = 600) {
  const buf = fs.readFileSync(path.join(IMG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const width = Math.min(maxW, w), height = Math.round((h / w) * width);
  fig += 1;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 100 }, children: [new ImageRun({ type: "png", data: buf, transformation: { width, height }, altText: { title: caption, description: caption, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `Hình ${fig}: ${caption}`, italics: true, font: FONT, size: 22 })] }),
  ];
}
const sp = () => new Paragraph({ children: [] });

/* =============================== NỘI DUNG =============================== */
const body = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: "HƯỚNG DẪN", font: FONT, size: 44, bold: true, color: "1F3864" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "CHẠY VÀ ĐỌC HIỂU BỘ KIỂM THỬ", font: FONT, size: 36, bold: true, color: "1F3864" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [new TextRun({ text: "Phần mềm quản lý phòng khám thú cưng – Pet Clinic", font: FONT, size: 30 })] }),
  P("Tài liệu giải thích **từng bước, theo thứ tự**: bộ kiểm thử gồm những gì, chuẩn bị máy ra sao, chạy từng loại test bằng lệnh nào, đọc kết quả thế nào và cập nhật báo cáo Excel khi kiểm thử lại.", { align: AlignmentType.CENTER }),
  P("Dành cho: thành viên nhóm, giảng viên, hoặc bất kỳ ai cần chạy lại bộ test – không cần biết trước về Mocha hay Selenium.", { align: AlignmentType.CENTER, italics: true }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "MỤC LỤC", font: FONT, size: 30, bold: true })] }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-2" }),

  // ------------------------------------------------------------------ 1
  H1("1. Bộ kiểm thử gồm những gì?"),
  P("Bộ kiểm thử có **5 loại**, mỗi loại kiểm tra một khía cạnh của phần mềm. Toàn bộ nằm trong thư mục `PetClinic_TestCode`:"),
  table(["Thư mục", "Loại kiểm thử", "Kiểm tra điều gì? (nói đơn giản)", "Công cụ"], [
    ["01_UnitTest", "Kiểm thử đơn vị", "Từng hàm nhỏ bên trong mã nguồn có làm đúng không (ví dụ: email sai có bị chặn không, bán hàng có trừ kho không)", "Mocha + tsx"],
    ["02_AutomationTest", "Kiểm thử chức năng tự động", "Máy tự mở trình duyệt, tự bấm nút, gõ chữ như người dùng thật rồi kiểm tra màn hình hiện đúng không", "Mocha + Selenium WebDriver"],
    ["03_PerformanceTest", "Kiểm thử tải, chịu tải", "Khi 200 người dùng cùng lúc thì web có nhanh không; tăng lên bao nhiêu người thì web bắt đầu chậm hoặc lỗi", "autocannon"],
    ["04_DataIntegrityTest", "Kiểm thử toàn vẹn dữ liệu", "Dữ liệu có bị sai, bị mất, bị trùng khi nhiều người thao tác cùng lúc không", "Mocha + mysql2"],
    ["05_ReliabilityTest", "Kiểm thử độ tin cậy, phục hồi", "Khi CSDL bị tắt hay ứng dụng bị tắt đột ngột thì web có sập không, có tự phục hồi không, có mất dữ liệu không", "Mocha + autocannon"],
  ], [2000, 1900, 3471, 1700]),
  sp(),
  P("Ngoài ra còn có:"),
  B("`06_TestData/seed.ts` – script tạo **dữ liệu mẫu** (30 khách hàng, 50 thú cưng, 60 lịch hẹn…) để lần chạy nào cũng giống nhau."),
  B("`07_KetQua/` – kết quả các lần chạy: log, ảnh chụp màn hình, file JSON, CSV."),
  B("`PetClinic_BaoCaoKiemThu.xlsx` – **file Excel báo cáo** (test case, kết quả, danh sách lỗi) – xem mục 9."),

  H2("1.1. Một vài khái niệm cần biết"),
  table(["Thuật ngữ", "Giải thích"], [
    ["Test case", "Một tình huống kiểm tra: làm các bước gì, nhập dữ liệu gì, mong đợi kết quả gì. Ví dụ: “Bỏ trống họ tên rồi bấm Lưu → phải báo lỗi Họ tên là bắt buộc”."],
    ["Pass / Fail", "Pass: kết quả thực tế đúng như mong đợi. Fail: khác mong đợi → phần mềm có lỗi."],
    ["Mocha", "Chương trình chạy test: gọi từng test case, đếm số Pass/Fail và in ra màn hình (✔ là Pass, số thứ tự màu đỏ là Fail)."],
    ["Selenium WebDriver", "Thư viện điều khiển trình duyệt (Edge, Chrome, Firefox) bằng code: mở trang, bấm, gõ, đọc chữ trên màn hình."],
    ["Headless", "Trình duyệt chạy ẩn, không hiện cửa sổ – vẫn làm đầy đủ thao tác, chỉ là không nhìn thấy."],
    ["autocannon", "Công cụ “bắn” rất nhiều yêu cầu cùng lúc vào web để đo tốc độ."],
    ["p50 / p99", "p50: một nửa số yêu cầu nhanh hơn mức này. p99: 99% số yêu cầu nhanh hơn mức này. Đặc tả yêu cầu p99 ≤ 3 giây."],
    ["req/s", "Số yêu cầu web xử lý được mỗi giây."],
    ["Race condition", "Lỗi khi nhiều người làm cùng một việc cùng lúc (ví dụ cùng mua món hàng cuối cùng) và hệ thống xử lý sai."],
    ["Seed", "Xóa dữ liệu cũ và nạp lại dữ liệu mẫu chuẩn."],
  ], [2200, 6871]),

  // ------------------------------------------------------------------ 2
  H1("2. Bước chuẩn bị (làm một lần)"),
  H2("2.1. Cài phần mềm cần thiết"),
  ...steps([
    "Cài **Node.js 20 LTS** trở lên (nodejs.org). Kiểm tra: mở PowerShell gõ `node -v`.",
    "Cài **MySQL 8** (hoặc Docker để chạy MySQL bằng `docker compose up -d db`).",
    "Cài trình duyệt **Microsoft Edge**, **Google Chrome** hoặc **Firefox** bản mới. Không cần tải driver – Selenium tự tải.",
  ]),
  H2("2.2. Tạo CSDL riêng cho kiểm thử"),
  note("**Quan trọng:** luôn dùng một CSDL riêng (ví dụ `petclinic_test`). Lệnh seed và nhiều bài test sẽ **xóa hoặc ghi thêm** dữ liệu – tuyệt đối không chạy trên CSDL đang dùng thật."),
  sp(),
  code("mysql -u root -p\nCREATE DATABASE petclinic_test CHARACTER SET utf8mb4;"),
  H2("2.3. Cài và chạy ứng dụng Pet Clinic"),
  ...steps([
    "Mở PowerShell, vào thư mục dự án: `cd pet-pttkpm/pet-pttkpm`",
    "Cài thư viện: `npm install`",
    "Tạo file `.env` (chép từ `.env.example`) và sửa dòng `DATABASE_URL=mysql://root:<mật khẩu>@localhost:3306/petclinic_test`",
    "Tạo bảng: `npm run db:push`",
    "Nạp dữ liệu mẫu: `npm run db:seed` → thấy dòng “Seed: 12 bác sĩ, 30 khách hàng…” là được.",
    "Build bản chạy thật: `npm run build`",
    "Chạy ứng dụng: `npm start` → mở trình duyệt vào http://localhost:5000 thấy trang Tổng quan là thành công. **Giữ cửa sổ này mở** trong suốt lúc test.",
  ]),
  code("cd pet-pttkpm/pet-pttkpm\nnpm install\nnpm run db:push\nnpm run db:seed\nnpm run build\n$env:ENABLE_AUTO_REMINDER = \"false\"     # tắt gửi email/SMS nhắc lịch khi test\nnpm start"),
  sp(),
  P("Mở **một cửa sổ PowerShell thứ hai** để chạy các lệnh test ở các bước tiếp theo."),

  // ------------------------------------------------------------------ 3
  H1("3. Thứ tự chạy khuyến nghị"),
  P("Chạy theo đúng thứ tự dưới đây. Trước mỗi bước có dấu ★, nên **seed lại dữ liệu** (`npm run db:seed` trong thư mục dự án) để kết quả khớp với báo cáo."),
  table(["Bước", "Việc cần làm", "Lệnh chính", "Thời gian"], [
    ["1", "Unit test", "npm run test:unit", "~ 5 giây"],
    ["2 ★", "Kiểm thử chức năng tự động", "npm run test:edge", "~ 4–5 phút"],
    ["3 ★", "Kiểm thử tải", "npm run test:load", "~ 3 phút"],
    ["4 ★", "Kiểm thử tìm kiếm 10.000 bản ghi + chịu tải", "npm run test:search\nnpm run test:stress", "~ 3 phút"],
    ["5 ★", "Kiểm thử toàn vẹn dữ liệu", "npm run test:integrity", "~ 5 giây"],
    ["6", "Kiểm thử độ tin cậy và phục hồi", "npm run test:reliability", "~ 4 phút"],
    ["7", "Cập nhật file Excel báo cáo", "Mở PetClinic_BaoCaoKiemThu.xlsx", "–"],
  ], [1000, 3600, 2971, 1500]),
  sp(),
  note("**Thấy chữ “failing” màu đỏ là bình thường.** Các test Fail đang chỉ ra **lỗi thật của phần mềm** (ví dụ chưa có đăng nhập, bán vượt tồn kho). Mỗi lỗi đã ghi trong sheet “Danh sách lỗi” của file Excel. Khi nhóm phát triển sửa xong, chạy lại test đó sẽ chuyển thành Pass."),

  // ------------------------------------------------------------------ 4
  H1("4. Bước 1 – Unit test (kiểm thử đơn vị)"),
  H2("4.1. Unit test là gì?"),
  P("Unit test kiểm tra **từng hàm nhỏ bên trong mã nguồn**, không cần mở trình duyệt. Ví dụ hàm kiểm tra dữ liệu khách hàng có chặn email sai không, hàm bán hàng có trừ đúng tồn kho không. Chạy rất nhanh nên phát hiện lỗi sớm và chỉ ra chính xác dòng code gây lỗi."),
  table(["File", "Kiểm tra", "Số test"], [
    ["tests/unit/schema.test.ts", "Các “bộ lọc dữ liệu” (schema) – dữ liệu sai có bị chặn không", "16"],
    ["tests/unit/storage.test.ts", "Các quy tắc nghiệp vụ – trùng lịch, trừ tồn kho, cảnh báo sắp hết, hủy lịch", "14"],
  ], [3000, 4871, 1200]),
  H2("4.2. Chạy"),
  code("cd pet-pttkpm/pet-pttkpm\n$env:DATABASE_URL = \"mysql://root:<mật khẩu>@localhost:3306/petclinic_test\"\nnpm run test:unit"),
  H2("4.3. Đọc kết quả"),
  ...image("term_unit.png", "Kết quả chạy unit test"),
  B("Dòng có dấu **✔** = test Pass. Dòng có **số thứ tự** (1), 2)…) = test Fail."),
  B("Cuối cùng Mocha tổng kết: **24 passing, 6 failing**."),
  B("Bên dưới là chi tiết từng test Fail: câu mô tả lỗi và dòng code của test (ví dụ `schema.test.ts:41`)."),
  H2("4.4. Hiểu một unit test"),
  code("// Họ tên là trường bắt buộc – chuỗi rỗng phải bị từ chối.\nit(\"UT-SCH-03: từ chối họ tên rỗng\", () => {\n  const r = insertCustomerSchema.safeParse({ ...validCustomer, name: \"\" });  // thử dữ liệu có họ tên rỗng\n  assert.equal(r.success, false);                                           // mong đợi: KHÔNG hợp lệ\n});"),
  P("Đọc như sau: lấy một khách hàng hợp lệ mẫu, sửa họ tên thành rỗng, đưa vào bộ lọc. `assert.equal(r.success, false)` nghĩa là “kết quả phải là không hợp lệ” – nếu bộ lọc lại cho qua thì test Fail."),

  // ------------------------------------------------------------------ 5
  H1("5. Bước 2 – Kiểm thử chức năng tự động (Selenium)"),
  H2("5.1. Cách bộ test hoạt động"),
  P("Bộ test gồm 3 file, mỗi file một việc:"),
  table(["File", "Vai trò", "Ví von"], [
    ["petclinic.spec.js", "Mở trình duyệt, lần lượt chạy 74 test case, ghi kết quả ra results.json", "Người điều phối"],
    ["cases.js", "Danh sách 74 test case: các bước, dữ liệu, kết quả mong đợi, đoạn code thực hiện", "Kịch bản"],
    ["helpers.js", "Các thao tác cơ bản: mở trang, bấm nút, gõ chữ, chọn trong danh sách, chụp màn hình", "Đôi tay"],
  ], [2400, 4971, 1700]),
  sp(),
  P("Luồng chạy: **petclinic.spec.js** đọc danh sách trong **cases.js** → với mỗi test case gọi hàm `run()` → `run()` dùng các hàm trong **helpers.js** để điều khiển trình duyệt → so sánh màn hình với kết quả mong đợi → ghi **Pass** hoặc **Fail** kèm kết quả thực tế."),
  H2("5.2. Chạy"),
  code("cd PetClinic_TestCode/02_AutomationTest\nnpm install                 # lần đầu\nnpm run test:edge           # chạy trên Microsoft Edge\nnpm run test:chrome         # hoặc Google Chrome\nnpm run test:firefox        # hoặc Mozilla Firefox"),
  P("Ứng dụng phải đang chạy ở http://localhost:5000 (Bước chuẩn bị 2.3). Nếu chạy ở địa chỉ khác: `$env:BASE_URL = \"http://địa-chỉ:cổng\"`."),
  H2("5.3. Đọc kết quả"),
  ...image("term_auto_1.png", "Kết quả chạy kiểm thử tự động (phần đầu)"),
  B("Test được nhóm theo tác nhân: Hệ thống, Lễ tân, Bác sĩ, Quản trị viên / Kế toán."),
  B("Số trong ngoặc (3608ms) là thời gian chạy test đó."),
  B("Kết quả chi tiết lưu ở `07_KetQua/automation/results.json`; ảnh chụp bằng chứng ở `07_KetQua/automation/screenshots/`."),
  H2("5.4. Hiểu một test case"),
  P("Mỗi test case trong cases.js có phần mô tả (dùng in ra báo cáo) và hàm `run()` (dùng để chạy):"),
  code("// UC1.1-TC004: Kiểm thử giá trị biên: SĐT 9 chữ số\n// Pass khi: Hiển thị lỗi \"Số điện thoại phải gồm đúng 10 chữ số\"\nadd({\n  id: \"UC1.1-TC004\", ...\n  steps: [ [\"1. Chọn \\\"Thêm khách hàng\\\"\", \"Form hiển thị\", \"\"],        // [bước, kết quả bước, dữ liệu]\n           [\"3. Nhập SĐT 9 chữ số\", \"\", \"098765432\"], ... ],\n  async run() {\n    await openAddCustomer();                                          // mở form thêm khách hàng\n    await fillCustomer({ name: \"Lê Minh\", email: \"leminh@test.vn\", phone: \"098765432\" });\n    return expect(await h.waitText(\"Số điện thoại phải gồm đúng 10 chữ số\", 2000),\n                  \"Hiển thị lỗi SĐT\",          // ghi khi Pass\n                  \"Không báo lỗi SĐT\");        // ghi khi Fail\n  },\n});"),
  P("`expect(điều kiện, chữ khi Pass, chữ khi Fail)` là chỗ kết luận: nếu trong 2 giây màn hình hiện thông báo lỗi SĐT thì Pass, ngược lại Fail."),

  // ------------------------------------------------------------------ 6
  H1("6. Bước 3, 4 – Kiểm thử tải và chịu tải"),
  H2("6.1. Ý tưởng"),
  B("**Kiểm thử tải:** giả lập **200 người dùng cùng lúc** (đúng yêu cầu đặc tả) trong 30 giây cho mỗi màn hình. Đạt khi p99 ≤ 3 giây và không có lỗi."),
  B("**Tìm kiếm 10.000 bản ghi:** tự nạp 10.000 khách hàng rồi đo tốc độ tìm kiếm; đạt khi ≤ 2 giây. Xong tự xóa dữ liệu đã nạp."),
  B("**Kiểm thử chịu tải:** tăng dần 50 → 100 → 200 → 400 → 800 → 1.200 → 1.600 người để tìm **điểm bắt đầu quá tải**, rồi giảm tải để xem web có tự hồi phục không."),
  H2("6.2. Chạy"),
  code("cd PetClinic_TestCode/03_PerformanceTest\nnpm install\nnpm run test:load\n$env:DATABASE_URL = \"mysql://root:<mật khẩu>@localhost:3306/petclinic_test\"\nnpm run test:search\nnpm run test:stress"),
  note("Kịch bản LOAD-TC006 (tải ghi) tạo khoảng **20.000 khách hàng** trong CSDL. Hãy **seed lại** trước khi chạy các bước sau."),
  H2("6.3. Đọc kết quả"),
  ...image("term_load.png", "Kết quả kiểm thử tải – mỗi dòng là một kịch bản"),
  P("Mỗi dòng: `conn` = số người dùng đồng thời, `req` = tổng số yêu cầu đã gửi, `rps` = số yêu cầu/giây, `p50`/`p99`/`max` = thời gian phản hồi (ms), `lỗi` = tỷ lệ yêu cầu lỗi."),
  ...image("chart_stress.png", "Kiểm thử chịu tải – đường p99 vượt vạch 3 giây ở mức 800 kết nối"),
  P("Trong lần chạy của nhóm: web đạt yêu cầu tới **400** người dùng cùng lúc, bắt đầu quá tải ở **800**, có lỗi từ **1.200**, không bị sập và hồi phục bình thường khi giảm tải."),
  note("Máy sinh tải và web chạy chung một máy nên số liệu chỉ để tham khảo. Muốn số chính xác, chạy autocannon trên một máy khác trỏ tới máy chủ thật."),

  // ------------------------------------------------------------------ 7
  H1("7. Bước 5 – Kiểm thử toàn vẹn dữ liệu"),
  P("Bộ test gửi yêu cầu qua API rồi **kiểm tra thẳng trong CSDL** xem dữ liệu có đúng không. Có 3 nhóm:"),
  B("**Thao tác đồng thời:** 20 người cùng mua 1 vật tư chỉ còn 10 hộp; 10 người cùng đặt 1 bác sĩ cùng 1 giờ."),
  B("**Nhất quán giữa các bảng:** tổng tiền hóa đơn = tổng các dòng; không có tồn kho âm; thú cưng phải thuộc một khách hàng có thật; thanh toán đúng."),
  B("**Dữ liệu đặc biệt:** tiếng Việt có dấu, emoji, ký tự HTML, tên dài 5.000 ký tự, chuỗi tấn công SQL Injection."),
  code("cd PetClinic_TestCode/04_DataIntegrityTest\nnpm install\n$env:DATABASE_URL = \"mysql://root:<mật khẩu>@localhost:3306/petclinic_test\"\nnpm run test:integrity"),
  ...image("term_integrity.png", "Kết quả kiểm thử toàn vẹn dữ liệu"),
  P("Ví dụ đọc kết quả DI-TC001: “bán thành công 20/20, tồn kho còn 8” – nghĩa là 20 người đều mua được dù chỉ có 10 hộp, và con số tồn kho còn bị ghi sai. Đây là lỗi **bán vượt tồn kho** mức Cao."),

  // ------------------------------------------------------------------ 8
  H1("8. Bước 6 – Kiểm thử độ tin cậy và phục hồi"),
  P("Bộ test **tự khởi động một bản ứng dụng riêng** (cổng 5055), rồi cố tình gây sự cố để xem ứng dụng phản ứng ra sao:"),
  table(["Test case", "Sự cố giả lập", "Mong đợi"], [
    ["REL-TC001", "Gửi dữ liệu hỏng", "Báo lỗi 4xx, ứng dụng vẫn chạy"],
    ["REL-TC002", "Tắt MySQL khi ứng dụng đang chạy", "Báo lỗi 5xx, ứng dụng không sập"],
    ["REL-TC003", "Bật lại MySQL", "Ứng dụng tự kết nối lại trong ≤ 30 giây"],
    ["REL-TC004", "Tắt đột ngột ứng dụng (kill) rồi bật lại", "Dữ liệu vừa ghi vẫn còn"],
    ["REL-TC005", "Đo thời gian khởi động lại", "≤ 10 giây"],
    ["REL-TC006", "Chạy tải liên tục 3 phút", "Không lỗi, bộ nhớ không tăng mãi"],
  ], [1600, 4071, 3400]),
  sp(),
  P("Bộ test cần biết **lệnh tắt/bật MySQL** trên máy bạn, khai báo qua 2 biến môi trường:"),
  code("cd PetClinic_TestCode/05_ReliabilityTest\nnpm install\n$env:APP_DIR      = \"..\\..\\..\\pet-pttkpm\\pet-pttkpm\"   # thư mục dự án (đã npm run build)\n$env:DATABASE_URL = \"mysql://root:<mật khẩu>@localhost:3306/petclinic_test\"\n$env:DB_STOP_CMD  = \"net stop MySQL80\"     # MySQL cài dạng dịch vụ Windows (PowerShell chạy quyền Admin)\n$env:DB_START_CMD = \"net start MySQL80\"\n#   hoặc dùng Docker:  docker stop petclinic-db  /  docker start petclinic-db\nnpm run test:reliability"),
  P("Nếu không khai báo 2 lệnh này, REL-TC002 và REL-TC003 sẽ được **bỏ qua (pending)**, các test còn lại vẫn chạy."),
  ...image("term_reliability.png", "Kết quả kiểm thử độ tin cậy và phục hồi"),

  // ------------------------------------------------------------------ 9
  H1("9. Bước 7 – Xem và cập nhật file Excel báo cáo"),
  P("File `PetClinic_BaoCaoKiemThu.xlsx` là báo cáo kiểm thử dạng bảng, gồm 6 sheet:"),
  table(["Sheet", "Nội dung", "Dùng để"], [
    ["Hướng dẫn", "Giải thích các sheet, ý nghĩa trạng thái và mức độ lỗi", "Đọc trước tiên"],
    ["Tổng quan", "Thông tin dự án, môi trường; bảng thống kê Pass/Fail; lỗi theo mức độ; kết luận", "Báo cáo nhanh cho giảng viên / trưởng nhóm"],
    ["TC chức năng", "74 test case: bước, dữ liệu, kết quả mong đợi, kết quả thực tế, trạng thái, mã lỗi", "Tra cứu từng test case"],
    ["Unit test", "30 unit test, hàm được kiểm tra, kết quả", "Tra cứu lỗi ở mức mã nguồn"],
    ["TC phi chức năng", "28 test case tải, chịu tải, toàn vẹn dữ liệu, tin cậy, kèm số liệu đo", "Xem hiệu năng, độ ổn định"],
    ["Danh sách lỗi", "24 lỗi: mức độ, ưu tiên, bước tái hiện, kết quả thực tế, vị trí trong code, trạng thái xử lý", "Giao cho nhóm phát triển sửa"],
  ], [2000, 4571, 2500]),
  H2("9.1. Cập nhật khi kiểm thử lại"),
  ...steps([
    "Chạy lại test liên quan (ví dụ sau khi nhóm phát triển sửa lỗi BUG-003).",
    "Mở sheet test case tương ứng, ở cột **Trạng thái** chọn Pass/Fail từ danh sách thả xuống; sửa cột **Kết quả thực tế** và **Ngày test**.",
    "Ở sheet **Danh sách lỗi**, đổi **Trạng thái xử lý** của lỗi: Mới → Đang sửa → Đã sửa → Đã kiểm lại → Đóng.",
    "Sheet **Tổng quan** tự tính lại số Pass/Fail, số lỗi chưa đóng và dòng kết luận ĐẠT / CHƯA ĐẠT.",
  ]),
  H2("9.2. Quy trình xử lý một lỗi"),
  P("**Phát hiện** (test Fail) → **ghi vào Danh sách lỗi** (mã BUG, mức độ, bước tái hiện) → **giao nhóm phát triển** → **sửa** → **chạy lại test** (kiểm thử lại + chạy cả bộ để chắc không sinh lỗi mới) → **đóng lỗi**."),

  // ------------------------------------------------------------------ 10
  H1("10. Lỗi thường gặp khi chạy test"),
  table(["Hiện tượng", "Nguyên nhân", "Cách xử lý"], [
    ["ECONNREFUSED / fetch failed", "Ứng dụng chưa chạy hoặc sai địa chỉ", "Chạy `npm start` trong thư mục dự án; kiểm tra BASE_URL"],
    ["Access denied for user / ER_BAD_DB_ERROR", "Sai DATABASE_URL hoặc chưa tạo CSDL", "Kiểm tra tài khoản, mật khẩu, tên CSDL trong DATABASE_URL"],
    ["SessionNotCreatedError (Selenium)", "Chưa cài trình duyệt hoặc không tải được driver", "Cài Edge/Chrome/Firefox bản mới; kiểm tra mạng (Selenium Manager cần tải driver lần đầu)"],
    ["Nhiều test Fail khác báo cáo", "Dữ liệu cũ còn trong CSDL", "Chạy `npm run db:seed` rồi chạy lại"],
    ["EADDRINUSE :5055 (reliability)", "Cổng 5055 đang bị dùng", "Đổi cổng: `$env:REL_PORT = \"5066\"`"],
    ["REL-TC002, REL-TC003 pending", "Chưa khai báo DB_STOP_CMD / DB_START_CMD", "Khai báo 2 biến môi trường (mục 8)"],
    ["Kết quả tải thấp hơn báo cáo", "Máy yếu hơn hoặc đang chạy nhiều chương trình khác", "Bình thường; so sánh tương đối, tắt bớt ứng dụng khác khi đo"],
  ], [2700, 2900, 3471]),

  // ------------------------------------------------------------------ 11
  H1("11. Tóm tắt kết quả lần chạy của nhóm"),
  table(["Loại kiểm thử", "Tổng", "Pass", "Fail", "Nhận xét chính"], [
    ["Chức năng (Selenium)", "74", "56", "18", "Chưa có đăng nhập; lỗi thêm KH khi bỏ trống địa chỉ; ô tìm kiếm mất focus; thiếu kiểm tra trùng dữ liệu"],
    ["Unit test", "30", "24", "6", "Chỉ ra nguyên nhân trong mã nguồn của các lỗi trên"],
    ["Tải và hiệu năng", "8", "8", "0", "200 người dùng: p99 < 0,7 giây; tìm kiếm 10.000 bản ghi ~ 36 ms"],
    ["Chịu tải", "3", "3", "0", "Ổn tới 400 kết nối, quá tải từ 800, tự hồi phục"],
    ["Toàn vẹn dữ liệu", "11", "7", "4", "Bán vượt tồn kho, trùng lịch khi thao tác đồng thời; thanh toán chưa cộng dồn"],
    ["Tin cậy và phục hồi", "6", "6", "0", "Không sập khi mất CSDL, tự phục hồi ~ 1 giây, không mất dữ liệu"],
  ], [2300, 800, 800, 800, 4371]),
  sp(),
  P("Kết luận: phần mềm **nhanh và ổn định** nhưng **chưa đạt** điều kiện chấp thuận vì còn lỗi mức Cao (bảo mật, toàn vẹn dữ liệu khi thao tác đồng thời, một số lỗi giao diện chặn nghiệp vụ)."),
];

const doc = new Document({
  creator: "Nhóm kiểm thử",
  title: "Hướng dẫn chạy và đọc hiểu bộ kiểm thử Pet Clinic",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 26 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: FONT, color: "1F3864" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 27, bold: true, font: FONT, color: "2E75B6" }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "o", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1260, hanging: 360 } } } },
      ] },
      ...numberingConfigs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] }) },
    children: body,
  }],
});

const out = path.join(ROOT, process.env.OUT_NAME || "HuongDan_KiemThu_PetClinic.docx");
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("Written", out); });
