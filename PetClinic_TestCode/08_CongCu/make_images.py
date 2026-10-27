import re, json, html
from playwright.sync_api import sync_playwright
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyBboxPatch

ansi = re.compile(r"\x1b\[[0-9;]*m")
def clean(p):
    return ansi.sub("", open(p, encoding="utf-8").read())

def term_html(title, body):
    lines = []
    for ln in body.splitlines():
        e = html.escape(ln)
        if "✔" in ln: e = f'<span class="ok">{e}</span>'
        elif re.match(r"\s+\d+\) ", ln) or "failing" in ln: e = f'<span class="bad">{e}</span>'
        elif "passing" in ln: e = f'<span class="ok">{e}</span>'
        elif ln.strip().startswith(("UT-", "Chức năng", "Pet Clinic", "Lịch hẹn", "Kho", "Khách")): e = f'<span class="hd">{e}</span>'
        lines.append(e)
    return f"""<html><head><meta charset='utf-8'><style>
body{{margin:0;background:#1e1e1e;font-family:Consolas,'Cascadia Mono',monospace;font-size:14px;color:#d4d4d4}}
.bar{{background:#323233;color:#ccc;padding:6px 12px;font-family:Segoe UI;font-size:13px}}
pre{{margin:0;padding:12px 16px;line-height:1.45;white-space:pre}}
.ok{{color:#6a9955}} .bad{{color:#f14c4c}} .hd{{color:#4fc1ff}}
</style></head><body><div class='bar'>{html.escape(title)}</div><pre>{chr(10).join(lines)}</pre></body></html>"""

auto = clean("automation/run_final.txt")
unit = clean("unit_run.txt")
auto_list = auto.split("  1) Pet Clinic")[0].rstrip()
unit_list = unit.split("  1) UT-SCH")[0].rstrip()
# failure detail (only headline lines)
fails = []
for m in re.finditer(r"\n  (\d+\)) Pet Clinic[^\n]*\n\s+([^\n]+)\n\s+([^\n]+):\n\s+(Error: [^\n]+)", auto):
    fails.append(f"  {m.group(1)} {m.group(3).strip()}\n       {m.group(4)}")
auto_fail = "\n".join(fails)

shots = [
    ("term_unit.png", "PowerShell — npm run test:unit (pet-pttkpm)", unit_list),
    ("term_auto_1.png", "PowerShell — npx mocha petclinic.spec.js", "\n".join(auto_list.splitlines()[:len(auto_list.splitlines())//2])),
    ("term_auto_2.png", "PowerShell — npx mocha petclinic.spec.js (tiếp)", "\n".join(auto_list.splitlines()[len(auto_list.splitlines())//2:])),
    ("term_auto_fail.png", "PowerShell — npx mocha petclinic.spec.js (chi tiết các test case Fail)", auto_fail),
]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1180, "height": 300})
    for name, title, body in shots:
        pg.set_content(term_html(title, body)); pg.screenshot(path=f"images/{name}", full_page=True)
    b.close()

# ---------- Biểu đồ so sánh ----------
r = json.load(open("automation/results.json", encoding="utf-8"))
groups = [("SYS", "Hệ thống"), ("UC1", "Khách hàng &\nthú cưng"), ("UC2.1", "Đặt lịch"), ("UC2.2", "Xử lý\nlịch hẹn"),
          ("UC2.4", "Ca trực"), ("UC3", "Hồ sơ khám"), ("UC8", "Camera"), ("UC6", "Bác sĩ"), ("UC4", "Kho thuốc"),
          ("UC5", "Hóa đơn &\nthanh toán"), ("UC7", "Báo cáo")]
P, F = [], []
for pre, _ in groups:
    ks = [k for k in r if k.startswith(pre + "-") or k.startswith(pre + ".")]
    P.append(sum(r[k]["status"] == "Pass" for k in ks)); F.append(sum(r[k]["status"] == "Fail" for k in ks))
fig, ax = plt.subplots(figsize=(11, 5.2), dpi=150)
x = range(len(groups)); w = 0.38
b1 = ax.bar([i - w/2 for i in x], P, w, label="Pass", color="#2a9d8f")
b2 = ax.bar([i + w/2 for i in x], F, w, label="Fail", color="#e76f51")
ax.bar_label(b1, padding=2, fontsize=9); ax.bar_label(b2, padding=2, fontsize=9)
ax.set_xticks(list(x)); ax.set_xticklabels([g[1] for g in groups], fontsize=9)
ax.set_ylabel("Số test case"); ax.set_title(f"So sánh kết quả {sum(P)+sum(F)} test case chức năng theo nhóm (Pass {sum(P)} – Fail {sum(F)})", fontsize=12)
ax.spines[["top", "right"]].set_visible(False); ax.legend(frameon=False); ax.set_ylim(0, max(P + F) + 2)
plt.tight_layout(); plt.savefig("images/chart_compare.png"); plt.close()

# pie tổng hợp
fig, axs = plt.subplots(1, 2, figsize=(10, 4.4), dpi=150)
for a, (title, ok, bad) in zip(axs, [(f"Kiểm thử tự động giao diện ({sum(P)+sum(F)} TC)", sum(P), sum(F)), ("Kiểm thử đơn vị (30 TC)", 24, 6)]):
    a.pie([ok, bad], labels=[f"Pass ({ok})", f"Fail ({bad})"], colors=["#2a9d8f", "#e76f51"], autopct="%1.1f%%",
          startangle=90, wedgeprops={"width": 0.45, "edgecolor": "white"}, textprops={"fontsize": 10})
    a.set_title(title, fontsize=11)
plt.tight_layout(); plt.savefig("images/chart_summary.png"); plt.close()

# ---------- Sơ đồ use case tổng quát ----------
fig, ax = plt.subplots(figsize=(13, 9), dpi=150); ax.set_xlim(0, 13); ax.set_ylim(0, 9); ax.axis("off")
ax.add_patch(FancyBboxPatch((2.6, 0.3), 7.8, 8.4, boxstyle="round,pad=0.02", fc="#f8fbff", ec="#335", lw=1.2))
ax.text(6.5, 8.45, "Hệ thống quản lý phòng khám thú cưng (Pet Clinic Pro)", ha="center", fontsize=12, weight="bold")
def actor(x, y, name):
    ax.add_patch(plt.Circle((x, y + 0.55), 0.17, fc="white", ec="black"))
    ax.plot([x, x], [y + 0.38, y - 0.1], c="black"); ax.plot([x - 0.25, x + 0.25], [y + 0.22, y + 0.22], c="black")
    ax.plot([x, x - 0.22], [y - 0.1, y - 0.45], c="black"); ax.plot([x, x + 0.22], [y - 0.1, y - 0.45], c="black")
    ax.text(x, y - 0.75, name, ha="center", fontsize=10, weight="bold")
    return (x, y)
ucs = {
 "uc11": (4.4, 7.7, "UC1.1 Tạo hồ sơ khách hàng"), "uc12": (4.4, 6.9, "UC1.2 Tạo hồ sơ thú cưng"),
 "uc13": (4.4, 6.1, "UC1.3/1.4 Sửa, khóa hồ sơ"), "uc15": (4.4, 5.3, "UC1.5 Tìm kiếm KH/thú cưng"),
 "uc21": (4.4, 4.5, "UC2.1 Đặt lịch khám"), "uc22": (4.4, 3.7, "UC2.2 Xác nhận/Hủy lịch"),
 "uc31": (8.6, 7.7, "UC3.1 Tạo hồ sơ khám"), "uc33": (8.6, 6.9, "UC3.3 Tra cứu lịch sử khám"),
 "uc24": (8.6, 6.1, "UC2.4 Quản lý ca bác sĩ"), "uc82": (6.5, 2.0, "UC8.2 Xem camera thú cưng"),
 "uc61": (8.6, 5.3, "UC6.1 Quản lý bác sĩ"), "uc41": (8.6, 4.5, "UC4.1/4.3 Quản lý kho thuốc"),
 "uc51": (8.6, 3.7, "UC5.1/5.2 Hóa đơn, thanh toán"), "uc72": (8.6, 2.9, "UC7 Báo cáo, thống kê"),
 "uc_rem": (4.4, 2.9, "R2.3 Nhắc lịch tự động"),
}
for k, (x, y, t) in ucs.items():
    ax.add_patch(Ellipse((x, y), 3.3, 0.62, fc="#e8f1ff", ec="#2b5797", lw=1)); ax.text(x, y, t, ha="center", va="center", fontsize=8.6)
A = {n: actor(x, y, n) for n, x, y in [("Lễ tân", 1.2, 5.6), ("Khách hàng", 1.2, 2.2), ("Bác sĩ", 11.8, 7.0), ("Quản trị viên", 11.8, 4.4), ("Kế toán", 11.8, 1.8)]}
links = {"Lễ tân": ["uc11", "uc12", "uc13", "uc15", "uc21", "uc22"], "Khách hàng": ["uc11", "uc21", "uc82", "uc_rem"],
         "Bác sĩ": ["uc31", "uc33", "uc24", "uc82"], "Quản trị viên": ["uc61", "uc24", "uc41", "uc13"], "Kế toán": ["uc51", "uc72", "uc41"]}
for a, ks in links.items():
    ax_, ay = A[a]
    for k in ks:
        x, y, _ = ucs[k]; ex = x - 1.65 if ax_ < x else x + 1.65
        ax.plot([ax_ + (0.3 if ax_ < x else -0.3), ex], [ay + 0.2, y], c="#555", lw=0.7)
plt.savefig("images/usecase_overview.png", bbox_inches="tight"); plt.close()
print("ok", P, F)
