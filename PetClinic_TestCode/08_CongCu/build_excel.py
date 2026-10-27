"""
build_excel.py – Sinh file Excel báo cáo kiểm thử (test case + kết quả + danh sách lỗi).

Nguồn dữ liệu (đều là kết quả chạy thật):
  - automation/cases.js + results.json   → test case chức năng (xuất trước ra cases_dump.json)
  - unit_run.txt                          → kết quả unit test
  - PetClinic_TestCode/07_KetQua/*.csv    → test case phi chức năng, danh sách lỗi (do build_doc.js xuất)
Chạy: python build_excel.py <cases_dump.json> <file_xlsx_đầu_ra>
"""
import csv
import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
DUMP = Path(sys.argv[1])
OUT = Path(sys.argv[2])
RES = ROOT / "PetClinic_TestCode" / "07_KetQua"

FONT = "Arial"
F = Font(name=FONT, size=10)
FB = Font(name=FONT, size=10, bold=True)
FH = Font(name=FONT, size=10, bold=True, color="FFFFFF")
FT = Font(name=FONT, size=16, bold=True, color="1F3864")
FS = Font(name=FONT, size=11, bold=True, color="1F3864")
HEAD = PatternFill("solid", fgColor="1F3864")
SUB = PatternFill("solid", fgColor="D9E2F3")
NOTE = PatternFill("solid", fgColor="F2F2F2")
thin = Side(style="thin", color="A6A6A6")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="top", wrap_text=True)
GREEN = PatternFill("solid", fgColor="C6EFCE")
RED = PatternFill("solid", fgColor="FFC7CE")
YELLOW = PatternFill("solid", fgColor="FFEB9C")

TESTER = "Nhóm kiểm thử"
DATE_AUTO = "03/10/2026"


def read_csv(name):
    with open(RES / name, encoding="utf-8-sig") as f:
        return list(csv.reader(f))[1:]


def table(ws, start_row, headers, rows, widths, center_cols=(), status_col=None):
    """Ghi bảng có tiêu đề, viền, xuống dòng, lọc, cố định dòng tiêu đề."""
    for j, h in enumerate(headers, 1):
        c = ws.cell(row=start_row, column=j, value=h)
        c.font, c.fill, c.border, c.alignment = FH, HEAD, BOX, Alignment(horizontal="center", vertical="center", wrap_text=True)
    for i, r in enumerate(rows, start_row + 1):
        for j, v in enumerate(r, 1):
            c = ws.cell(row=i, column=j, value=v)
            c.font, c.border = F, BOX
            c.alignment = CENTER if j in center_cols else WRAP
    for j, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(j)].width = w
    last = start_row + len(rows)
    ws.auto_filter.ref = f"A{start_row}:{get_column_letter(len(headers))}{last}"
    ws.freeze_panes = ws.cell(row=start_row + 1, column=3)
    ws.row_dimensions[start_row].height = 32
    if status_col:
        col = get_column_letter(status_col)
        rng = f"{col}{start_row + 1}:{col}{last}"
        dv = DataValidation(type="list", formula1='"Pass,Fail,Blocked,Not Run"', allow_blank=True)
        dv.error, dv.errorTitle = "Chỉ chọn Pass, Fail, Blocked hoặc Not Run", "Trạng thái không hợp lệ"
        ws.add_data_validation(dv)
        dv.add(rng)
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Pass"'], fill=GREEN, font=Font(name=FONT, bold=True, color="006100")))
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Fail"'], fill=RED, font=Font(name=FONT, bold=True, color="9C0006")))
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Blocked"'], fill=YELLOW))
    return last


def title(ws, text, sub):
    ws["A1"] = text
    ws["A1"].font = FT
    ws["A2"] = sub
    ws["A2"].font = Font(name=FONT, size=10, italic=True, color="595959")


wb = Workbook()
wb.calculation.fullCalcOnLoad = True  # Excel/Google Sheets tự tính lại công thức khi mở file

# ---------------------------------------------------------------- dữ liệu
cases = json.loads(DUMP.read_text(encoding="utf-8"))
nf = read_csv("test_cases_phi_chuc_nang.csv")
bugs_raw = read_csv("danh_sach_loi.csv")
# Hai lỗi chỉ unit test phát hiện (không có test giao diện tương ứng) – bổ sung vào danh sách lỗi
bugs_raw += [
    ["UT-SCH-05", "Trung bình", "API không kiểm tra định dạng SĐT 10 chữ số (chỉ form giao diện kiểm tra)",
     "shared/schema.ts – insertCustomerSchema.phone chỉ yêu cầu min(1)", 'Schema phía server chấp nhận SĐT "123"'],
    ["UT-STO-12", "Trung bình", "Nhập thêm lô hàng không cộng vào tồn kho của vật tư (R4.1)",
     "server/storage.ts – createStockBatch() chỉ lưu lô, không cập nhật inventory.stock", "Tồn kho không đổi sau khi nhập lô 20"],
]
sev_rank = {"Cao": 0, "Trung bình": 1, "Thấp": 2}
bugs_raw.sort(key=lambda r: sev_rank.get(r[1], 9))
bug_id = {r[0]: f"BUG-{i:03d}" for i, r in enumerate(bugs_raw, 1)}
bug_sev = {r[0]: r[1] for r in bugs_raw}
# Unit test Fail trùng nguyên nhân với lỗi đã phát hiện ở test giao diện → dùng chung mã lỗi
for ut, tc in {"UT-SCH-04": "UC1.1-TC010", "UT-SCH-16": "UC2.4-TC003", "UT-STO-05": "UC2.1-TC005", "UT-STO-13": "UC1.1-TC008"}.items():
    bug_id[ut] = bug_id[tc]

unit_txt = re.sub(r"\x1b\[[0-9;]*m", "", (ROOT / "unit_run.txt").read_text(encoding="utf-8"))
unit_rows = []
for line in unit_txt.splitlines():
    m = re.search(r"✔ (UT-[A-Z]+-\d+): (.*)$", line)
    if m:
        unit_rows.append([m.group(1), m.group(2).strip(), "Pass"])
        continue
    m = re.match(r"^\s+\d+\) (UT-[A-Z]+-\d+): (.*?):?$", line)
    if m and not any(r[0] == m.group(1) for r in unit_rows):
        unit_rows.append([m.group(1), m.group(2).strip(), "Fail"])
unit_msg = {m.group(1): m.group(2) for m in re.finditer(r"(UT-[A-Z]+-\d+):[^\n]*:\n\n\s+(?:AssertionError[^:]*: )?([^\n]+)", unit_txt)}
unit_msg.setdefault("UT-STO-05", "Lịch hẹn trong quá khứ vẫn được tạo")
unit_msg.setdefault("UT-STO-13", "Khách hàng trùng SĐT vẫn được tạo")
unit_target = {}
for n in range(1, 6): unit_target[f"UT-SCH-{n:02d}"] = "insertCustomerSchema"
for n in range(6, 9): unit_target[f"UT-SCH-{n:02d}"] = "insertPetSchema"
for n in range(9, 12): unit_target[f"UT-SCH-{n:02d}"] = "insertAppointmentSchema"
unit_target.update({"UT-SCH-12": "insertInventorySchema", "UT-SCH-13": "insertStockBatchSchema", "UT-SCH-14": "insertInvoiceItemSchema",
                    "UT-SCH-15": "insertPaymentSchema", "UT-SCH-16": "insertDoctorShiftSchema"})
for n in range(1, 4): unit_target[f"UT-STO-{n:02d}"] = "createAppointment()"
unit_target.update({"UT-STO-04": "deleteAppointment()", "UT-STO-05": "createAppointment()", "UT-STO-06": "updateInventoryStock()",
                    "UT-STO-07": "updateInventoryStock()", "UT-STO-08": "createInvoiceItem()", "UT-STO-09": "createInvoiceItem()",
                    "UT-STO-10": "getLowStockItems()", "UT-STO-11": "getExpiringBatches()", "UT-STO-12": "createStockBatch()",
                    "UT-STO-13": "createCustomer()", "UT-STO-14": "getCustomers()"})

# ---------------------------------------------------------------- 1. Hướng dẫn
ws0 = wb.active
ws0.title = "Hướng dẫn"
title(ws0, "BÁO CÁO KIỂM THỬ – PHẦN MỀM QUẢN LÝ PHÒNG KHÁM THÚ CƯNG (PET CLINIC)", "File tổng hợp test case, kết quả thực thi và danh sách lỗi. Đọc sheet này trước.")
guide = [
    ("Sheet", "Nội dung", "Cách đọc"),
    ("Tổng quan", "Thông tin dự án, môi trường, bảng thống kê Pass/Fail, lỗi theo mức độ", "Các con số được tính tự động bằng công thức từ các sheet bên dưới"),
    ("TC chức năng", "74 test case kiểm thử chức năng trên giao diện (chạy tự động bằng Selenium)", "Mỗi dòng 1 test case: các bước, dữ liệu nhập, kết quả mong đợi, kết quả thực tế, trạng thái"),
    ("Unit test", "30 unit test kiểm tra mã nguồn bên trong (schema dữ liệu, lớp nghiệp vụ)", "Cột “Đối tượng được test” cho biết hàm/schema nào trong mã nguồn"),
    ("TC phi chức năng", "28 test case: tải, chịu tải, toàn vẹn dữ liệu, độ tin cậy và phục hồi", "Cột “Kết quả đo được” là số liệu thật đo bằng autocannon / Mocha"),
    ("Danh sách lỗi", "Lỗi phát hiện, mức độ nghiêm trọng, bước tái hiện, vị trí nghi vấn trong mã nguồn", "Mã lỗi BUG-xxx được ghi ngược lại ở cột “Mã lỗi” của sheet test case"),
]
for i, r in enumerate(guide, 4):
    for j, v in enumerate(r, 1):
        c = ws0.cell(row=i, column=j, value=v)
        c.border, c.alignment = BOX, WRAP
        c.font = FH if i == 4 else F
        if i == 4:
            c.fill = HEAD
legend = [
    ("Trạng thái", ""),
    ("Pass", "Kết quả thực tế đúng như kết quả mong đợi"),
    ("Fail", "Kết quả thực tế khác kết quả mong đợi → có lỗi, xem sheet Danh sách lỗi"),
    ("Blocked", "Không thực hiện được do bị chặn bởi lỗi khác / thiếu môi trường"),
    ("Not Run", "Chưa thực hiện"),
    ("", ""),
    ("Mức độ lỗi", ""),
    ("Cao", "Chức năng chính không dùng được, mất/sai dữ liệu, lỗ hổng bảo mật"),
    ("Trung bình", "Vi phạm quy tắc nghiệp vụ nhưng vẫn thao tác được"),
    ("Thấp", "Thông báo thiếu/khó hiểu, lỗi hiển thị"),
    ("", ""),
    ("Cập nhật kết quả", "Khi kiểm thử lại: sửa cột Trạng thái (chọn trong danh sách) và Kết quả thực tế; sheet Tổng quan tự cập nhật."),
]
r0 = 4 + len(guide) + 1
for i, (a, b) in enumerate(legend, r0):
    ws0.cell(row=i, column=1, value=a).font = FB if b == "" else F
    ws0.cell(row=i, column=2, value=b).font = F
    ws0.cell(row=i, column=2).alignment = WRAP
    if a == "Pass": ws0.cell(row=i, column=1).fill = GREEN
    if a == "Fail": ws0.cell(row=i, column=1).fill = RED
    if a == "Blocked": ws0.cell(row=i, column=1).fill = YELLOW
for col, w in zip("ABC", (22, 70, 70)):
    ws0.column_dimensions[col].width = w

# ---------------------------------------------------------------- 3. TC chức năng
ws1 = wb.create_sheet("TC chức năng")
title(ws1, "TEST CASE KIỂM THỬ CHỨC NĂNG", "Công cụ: Mocha + Selenium WebDriver (Microsoft Edge, headless). Dữ liệu mẫu nạp lại trước khi chạy.")
rows1 = []
for i, c in enumerate(cases, 1):
    steps = "\n".join(f"{s[0]}" + (f"  → {s[1]}" if s[1] else "") for s in c["steps"])
    data = "\n".join(s[2] for s in c["steps"] if s[2])
    rows1.append([i, c["id"], c["group"].replace("Chức năng của ", ""), c["uc"], c["title"], "Ứng dụng đang chạy; dữ liệu mẫu đã nạp",
                  steps, data, c["expected"], c["actual"], c["status"], bug_sev.get(c["id"], ""), bug_id.get(c["id"], ""), TESTER, DATE_AUTO])
H1 = ["STT", "Test Case ID", "Tác nhân", "Chức năng (Use Case)", "Mô tả test case", "Điều kiện trước", "Các bước thực hiện → kết quả từng bước",
      "Dữ liệu đầu vào", "Kết quả mong đợi", "Kết quả thực tế", "Trạng thái", "Mức độ lỗi", "Mã lỗi", "Người test", "Ngày test"]
last1 = table(ws1, 4, H1, rows1, [5, 13, 16, 22, 30, 18, 48, 22, 34, 38, 11, 11, 10, 14, 11], center_cols=(1, 2, 11, 12, 13, 15), status_col=11)

# ---------------------------------------------------------------- 4. Unit test
ws2 = wb.create_sheet("Unit test")
title(ws2, "KIỂM THỬ ĐƠN VỊ (UNIT TEST)", "Công cụ: Mocha + tsx + node:assert. Lệnh chạy: npm run test:unit (thư mục pet-pttkpm).")
rows2 = []
for i, (uid, desc, st) in enumerate(unit_rows, 1):
    f = "tests/unit/schema.test.ts" if "SCH" in uid else "tests/unit/storage.test.ts"
    lop = "shared/schema.ts" if "SCH" in uid else "server/storage.ts"
    actual = "Đúng như mong đợi" if st == "Pass" else unit_msg.get(uid, "")
    rows2.append([i, uid, f, f"{lop} – {unit_target.get(uid, '')}", desc, actual, st, bug_id.get(uid, ""), TESTER, DATE_AUTO])
H2 = ["STT", "Mã UT", "File test", "Đối tượng được test", "Nội dung kiểm tra (kết quả mong đợi)", "Kết quả thực tế", "Trạng thái", "Mã lỗi", "Người test", "Ngày test"]
last2 = table(ws2, 4, H2, rows2, [5, 12, 26, 34, 60, 45, 11, 10, 14, 11], center_cols=(1, 2, 7, 8, 10), status_col=7)

# ---------------------------------------------------------------- 5. TC phi chức năng
ws3 = wb.create_sheet("TC phi chức năng")
title(ws3, "TEST CASE KIỂM THỬ PHI CHỨC NĂNG", "Tải & hiệu năng, chịu tải: autocannon. Toàn vẹn dữ liệu: Mocha + mysql2. Tin cậy & phục hồi: Mocha + autocannon.")
tool = {"Tải & hiệu năng": "autocannon + Mocha", "Chịu tải": "autocannon + Mocha", "Toàn vẹn dữ liệu": "Mocha + mysql2", "Tin cậy & phục hồi": "Mocha + autocannon"}
rows3 = [[i, r[0], r[1], r[2], r[3], tool.get(r[1], ""), r[4], r[5], r[6], bug_sev.get(r[0], ""), bug_id.get(r[0], ""), TESTER, DATE_AUTO] for i, r in enumerate(nf, 1)]
H3 = ["STT", "Test Case ID", "Loại kiểm thử", "Mô tả", "Cách thực hiện", "Công cụ", "Tiêu chí đạt", "Kết quả đo được", "Trạng thái", "Mức độ lỗi", "Mã lỗi", "Người test", "Ngày test"]
last3 = table(ws3, 4, H3, rows3, [5, 14, 17, 34, 38, 17, 30, 44, 11, 11, 10, 14, 11], center_cols=(1, 2, 9, 10, 11, 13), status_col=9)

# ---------------------------------------------------------------- 6. Danh sách lỗi
ws4 = wb.create_sheet("Danh sách lỗi")
title(ws4, "DANH SÁCH LỖI (BUG REPORT)", "Mỗi lỗi gắn với test case phát hiện ra nó. Trạng thái xử lý cập nhật khi nhóm phát triển sửa lỗi.")
case_by_id = {c["id"]: c for c in cases}
nf_by_id = {r[0]: r for r in nf}
prio = {"Cao": "P1 – Gấp", "Trung bình": "P2 – Cao", "Thấp": "P3 – Bình thường"}
rows4 = []
for i, (tc, sev, desc, where, actual) in enumerate(bugs_raw, 1):
    if tc in case_by_id:
        c = case_by_id[tc]
        steps = "\n".join(s[0] + (f" ({s[2]})" if s[2] else "") for s in c["steps"])
        exp = c["expected"]
        loai = "Chức năng"
    elif tc in nf_by_id:
        r = nf_by_id[tc]
        steps, exp, loai = r[3], r[4], r[1]
    else:
        u = next((x for x in unit_rows if x[0] == tc), [tc, "", ""])
        steps, exp, loai = f"Chạy unit test {tc} (npm run test:unit)", u[1], "Unit test"
    rows4.append([bug_id[tc], tc, loai, desc, sev, prio.get(sev, ""), steps, exp, actual, where, "Mới (New)", TESTER, DATE_AUTO])
H4 = ["Mã lỗi", "Test case", "Loại", "Tiêu đề lỗi", "Mức độ", "Ưu tiên", "Bước tái hiện", "Kết quả mong đợi", "Kết quả thực tế",
      "Vị trí nghi vấn trong mã nguồn", "Trạng thái xử lý", "Người phát hiện", "Ngày phát hiện"]
last4 = table(ws4, 4, H4, rows4, [10, 13, 15, 40, 11, 15, 42, 34, 40, 42, 14, 14, 12], center_cols=(1, 2, 5, 6, 11, 13))
sev_rng = f"E5:E{last4}"
ws4.conditional_formatting.add(sev_rng, CellIsRule(operator="equal", formula=['"Cao"'], fill=RED, font=Font(name=FONT, bold=True, color="9C0006")))
ws4.conditional_formatting.add(sev_rng, CellIsRule(operator="equal", formula=['"Trung bình"'], fill=YELLOW))
dv = DataValidation(type="list", formula1='"Mới (New),Đang sửa (In progress),Đã sửa (Fixed),Đã kiểm lại (Verified),Đóng (Closed)"', allow_blank=True)
ws4.add_data_validation(dv)
dv.add(f"K5:K{last4}")

# ---------------------------------------------------------------- 2. Tổng quan (đặt thứ 2)
ws = wb.create_sheet("Tổng quan", 1)
title(ws, "TỔNG QUAN KẾT QUẢ KIỂM THỬ", "Các ô số liệu là công thức – tự cập nhật khi sửa Trạng thái ở các sheet test case.")
info = [
    ("Phần mềm", "Pet Clinic Pro – quản lý phòng khám thú cưng (React + Express + MySQL)"),
    ("Phiên bản kiểm thử", "1.0.0 (MySQL Edition), bản build production"),
    ("Môi trường", "Windows 10/11; Microsoft Edge (headless 1440×900); Node.js 20+; MySQL 8.x – CSDL kiểm thử riêng"),
    ("Dữ liệu mẫu", "12 bác sĩ, 30 khách hàng, 50 thú cưng, 30 vật tư, 60 lịch hẹn, 43 hồ sơ khám, 15 camera, 31 ca trực, 60 hóa đơn"),
    ("Công cụ", "Mocha, Selenium WebDriver, tsx, autocannon, mysql2"),
    ("Thời gian thực hiện", "02/10/2026 – 03/10/2026"),
    ("Người thực hiện", TESTER),
]
for i, (a, b) in enumerate(info, 4):
    ws.cell(row=i, column=1, value=a).font = FB
    ws.cell(row=i, column=2, value=b).font = F
    ws.cell(row=i, column=1).fill = SUB
    for j in (1, 2, 3, 4, 5, 6):
        ws.cell(row=i, column=j).border = BOX
    ws.merge_cells(start_row=i, start_column=2, end_row=i, end_column=6)

r = 4 + len(info) + 1
ws.cell(row=r, column=1, value="1. Kết quả theo loại kiểm thử").font = FS
r += 1
hdr = ["Loại kiểm thử", "Tổng", "Pass", "Fail", "Chưa chạy / Blocked", "Tỷ lệ Pass"]
for j, h in enumerate(hdr, 1):
    c = ws.cell(row=r, column=j, value=h)
    c.font, c.fill, c.border, c.alignment = FH, HEAD, BOX, Alignment(horizontal="center", vertical="center", wrap_text=True)
srcs = [("Kiểm thử chức năng (giao diện)", "'TC chức năng'", "B", "K", last1),
        ("Kiểm thử đơn vị (Unit test)", "'Unit test'", "B", "G", last2),
        ("Kiểm thử phi chức năng", "'TC phi chức năng'", "B", "I", last3)]
first = r + 1
for k, (name, sh, idc, stc, last) in enumerate(srcs):
    rr = r + 1 + k
    ws.cell(row=rr, column=1, value=name)
    ws.cell(row=rr, column=2, value=f"=COUNTA({sh}!{idc}5:{idc}{last})")
    ws.cell(row=rr, column=3, value=f'=COUNTIF({sh}!{stc}5:{stc}{last},"Pass")')
    ws.cell(row=rr, column=4, value=f'=COUNTIF({sh}!{stc}5:{stc}{last},"Fail")')
    ws.cell(row=rr, column=5, value=f"=B{rr}-C{rr}-D{rr}")
    ws.cell(row=rr, column=6, value=f"=IF(B{rr}=0,0,C{rr}/B{rr})")
tot = r + 1 + len(srcs)
ws.cell(row=tot, column=1, value="TỔNG CỘNG")
for j, col in zip(range(2, 6), "BCDE"):
    ws.cell(row=tot, column=j, value=f"=SUM({col}{first}:{col}{tot - 1})")
ws.cell(row=tot, column=6, value=f"=IF(B{tot}=0,0,C{tot}/B{tot})")
for rr in range(first, tot + 1):
    for j in range(1, 7):
        c = ws.cell(row=rr, column=j)
        c.border, c.font = BOX, FB if rr == tot else F
        c.alignment = Alignment(horizontal="center") if j > 1 else Alignment()
        if rr == tot:
            c.fill = SUB
    ws.cell(row=rr, column=6).number_format = "0.0%"

r = tot + 2
ws.cell(row=r, column=1, value="2. Kiểm thử chức năng theo tác nhân").font = FS
r += 1
for j, h in enumerate(["Tác nhân", "Tổng", "Pass", "Fail", "", "Tỷ lệ Pass"], 1):
    c = ws.cell(row=r, column=j, value=h if h else None)
    c.font, c.fill, c.border, c.alignment = FH, HEAD, BOX, Alignment(horizontal="center")
groups = list(dict.fromkeys(row[2] for row in rows1))
for k, g in enumerate(groups):
    rr = r + 1 + k
    ws.cell(row=rr, column=1, value=g)
    ws.cell(row=rr, column=2, value=f"=COUNTIF('TC chức năng'!C5:C{last1},A{rr})")
    ws.cell(row=rr, column=3, value=f"=COUNTIFS('TC chức năng'!C5:C{last1},A{rr},'TC chức năng'!K5:K{last1},\"Pass\")")
    ws.cell(row=rr, column=4, value=f"=COUNTIFS('TC chức năng'!C5:C{last1},A{rr},'TC chức năng'!K5:K{last1},\"Fail\")")
    ws.cell(row=rr, column=6, value=f"=IF(B{rr}=0,0,C{rr}/B{rr})")
    for j in range(1, 7):
        c = ws.cell(row=rr, column=j)
        c.border, c.font = BOX, F
        c.alignment = Alignment(horizontal="center") if j > 1 else Alignment()
    ws.cell(row=rr, column=6).number_format = "0.0%"
grp_last = r + len(groups)

r = grp_last + 2
ws.cell(row=r, column=1, value="3. Kiểm thử phi chức năng theo loại").font = FS
r += 1
for j, h in enumerate(["Loại", "Tổng", "Pass", "Fail", "", "Tỷ lệ Pass"], 1):
    c = ws.cell(row=r, column=j, value=h if h else None)
    c.font, c.fill, c.border, c.alignment = FH, HEAD, BOX, Alignment(horizontal="center")
kinds = list(dict.fromkeys(row[2] for row in rows3))
for k, g in enumerate(kinds):
    rr = r + 1 + k
    ws.cell(row=rr, column=1, value=g)
    ws.cell(row=rr, column=2, value=f"=COUNTIF('TC phi chức năng'!C5:C{last3},A{rr})")
    ws.cell(row=rr, column=3, value=f"=COUNTIFS('TC phi chức năng'!C5:C{last3},A{rr},'TC phi chức năng'!I5:I{last3},\"Pass\")")
    ws.cell(row=rr, column=4, value=f"=COUNTIFS('TC phi chức năng'!C5:C{last3},A{rr},'TC phi chức năng'!I5:I{last3},\"Fail\")")
    ws.cell(row=rr, column=6, value=f"=IF(B{rr}=0,0,C{rr}/B{rr})")
    for j in range(1, 7):
        c = ws.cell(row=rr, column=j)
        c.border, c.font = BOX, F
        c.alignment = Alignment(horizontal="center") if j > 1 else Alignment()
    ws.cell(row=rr, column=6).number_format = "0.0%"
kind_last = r + len(kinds)

r = kind_last + 2
ws.cell(row=r, column=1, value="4. Lỗi theo mức độ nghiêm trọng").font = FS
r += 1
for j, h in enumerate(["Mức độ", "Số lỗi", "Chưa đóng"], 1):
    c = ws.cell(row=r, column=j, value=h)
    c.font, c.fill, c.border, c.alignment = FH, HEAD, BOX, Alignment(horizontal="center")
for k, sev in enumerate(["Cao", "Trung bình", "Thấp"]):
    rr = r + 1 + k
    ws.cell(row=rr, column=1, value=sev)
    ws.cell(row=rr, column=2, value=f"=COUNTIF('Danh sách lỗi'!E5:E{last4},A{rr})")
    ws.cell(row=rr, column=3, value=f"=COUNTIFS('Danh sách lỗi'!E5:E{last4},A{rr},'Danh sách lỗi'!K5:K{last4},\"<>Đóng (Closed)\")")
    for j in range(1, 4):
        c = ws.cell(row=rr, column=j)
        c.border, c.font = BOX, F
        c.alignment = Alignment(horizontal="center") if j > 1 else Alignment()
ws.cell(row=r + 1, column=1).fill = RED
ws.cell(row=r + 2, column=1).fill = YELLOW
rt = r + 4
ws.cell(row=rt, column=1, value="Tổng số lỗi").font = FB
ws.cell(row=rt, column=2, value=f"=SUM(B{r + 1}:B{r + 3})").font = FB
ws.cell(row=rt, column=3, value=f"=SUM(C{r + 1}:C{r + 3})").font = FB
for j in range(1, 4):
    ws.cell(row=rt, column=j).border = BOX
    ws.cell(row=rt, column=j).fill = SUB
sev_tot_row = rt

r = rt + 2
ws.cell(row=r, column=1, value="5. Kết luận").font = FS
ws.cell(row=r + 1, column=1, value=f'=IF(AND(F{first}>=0.9,B{sev_tot_row - 3}=0),"ĐẠT điều kiện chấp thuận","CHƯA ĐẠT điều kiện chấp thuận (cần ≥ 90% Pass chức năng và không còn lỗi mức Cao)")').font = Font(name=FONT, size=11, bold=True, color="9C0006")
ws.merge_cells(start_row=r + 1, start_column=1, end_row=r + 1, end_column=6)
ws.cell(row=r + 2, column=1, value="Ghi chú: số liệu hiệu năng đo khi máy sinh tải và máy chủ chạy chung một máy – mang tính tham khảo.").font = Font(name=FONT, size=9, italic=True, color="595959")
ws.merge_cells(start_row=r + 2, start_column=1, end_row=r + 2, end_column=6)
for col, w in zip("ABCDEF", (36, 12, 12, 12, 16, 14)):
    ws.column_dimensions[col].width = w

for sh in wb.worksheets:
    sh.sheet_view.zoomScale = 90
OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)

# Đối chiếu số liệu (Python) để kiểm tra công thức
cnt = lambda rows, k: (len(rows), sum(1 for x in rows if x[k] == "Pass"), sum(1 for x in rows if x[k] == "Fail"))
print("TC chức năng", cnt(rows1, 10), "| Unit", cnt(rows2, 6), "| Phi chức năng", cnt(rows3, 8), "| Lỗi", len(rows4),
      {s: sum(1 for x in rows4 if x[4] == s) for s in ("Cao", "Trung bình", "Thấp")})
print("saved", OUT)
