import json, re, html
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from playwright.sync_api import sync_playwright
R = "nonfunctional/results/"
st = json.load(open(R + "stress.json", encoding="utf-8"))
lv = [l for l in st["levels"] if not l.get("recovery")]
x = [l["connections"] for l in lv]
fig, ax = plt.subplots(figsize=(10, 4.8), dpi=150)
ax.plot(x, [l["latencyP50Ms"] / 1000 for l in lv], "o-", color="#2a9d8f", label="p50")
ax.plot(x, [l["latencyP99Ms"] / 1000 for l in lv], "o-", color="#e76f51", label="p99")
ax.axhline(3, ls="--", color="#555", lw=1); ax.text(x[0], 3.15, "Ngưỡng yêu cầu 3 giây", fontsize=9, color="#555")
ax.set_xlabel("Số kết nối đồng thời"); ax.set_ylabel("Thời gian phản hồi (giây)")
ax2 = ax.twinx(); ax2.bar(x, [l["errorRatePct"] for l in lv], width=[c * 0.25 for c in x], alpha=0.25, color="#c00000", label="Tỷ lệ lỗi (%)")
ax2.set_ylabel("Tỷ lệ lỗi (%)"); ax2.set_ylim(0, 100)
ax.set_xscale("log"); ax.set_xticks(x); ax.set_xticklabels([str(v) for v in x])
bp = st["breakingPoint"]; ax.axvline(bp, color="#c00000", lw=1, ls=":"); ax.text(bp * 1.03, max(l["latencyP99Ms"] for l in lv) / 1000 * 0.9, f"Ngưỡng quá tải\n{bp} kết nối", color="#c00000", fontsize=9)
h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels(); ax.legend(h1 + h2, l1 + l2, frameon=False, loc="upper left")
ax.set_title("Kiểm thử chịu tải – thời gian phản hồi và tỷ lệ lỗi theo số kết nối", fontsize=12)
ax.spines[["top"]].set_visible(False); plt.tight_layout(); plt.savefig("images/chart_stress.png"); plt.close()

rel = json.load(open(R + "reliability.json", encoding="utf-8"))
mem = [m for m in rel["soak"]["memory"] if m["rssMB"]]
fig, ax = plt.subplots(figsize=(10, 3.8), dpi=150)
ax.plot([m["t"] for m in mem], [m["rssMB"] for m in mem], "o-", color="#2b5797")
ax.set_xlabel("Thời gian chạy (giây)"); ax.set_ylabel("Bộ nhớ tiến trình (MB)"); ax.set_ylim(0, max(m["rssMB"] for m in mem) * 1.3)
ax.set_title(f"Bộ nhớ ứng dụng khi chạy tải liên tục {round(rel['soak']['durationS'])} giây với 50 kết nối", fontsize=12)
ax.spines[["top", "right"]].set_visible(False); plt.tight_layout(); plt.savefig("images/chart_soak_memory.png"); plt.close()

ld = json.load(open(R + "load.json", encoding="utf-8"))
fig, ax = plt.subplots(figsize=(10, 4.2), dpi=150)
names = [s["id"] for s in ld]; import numpy as np; xi = np.arange(len(ld)); w = 0.38
b1 = ax.bar(xi - w/2, [s["latencyP50Ms"] for s in ld], w, label="p50", color="#2a9d8f")
b2 = ax.bar(xi + w/2, [s["latencyP99Ms"] for s in ld], w, label="p99", color="#e76f51")
ax.bar_label(b1, fontsize=8, padding=2); ax.bar_label(b2, fontsize=8, padding=2)
ax.set_xticks(xi); ax.set_xticklabels(names, fontsize=9); ax.set_ylabel("Thời gian phản hồi (ms)")
ax.set_title("Kiểm thử tải – 200 người dùng đồng thời (yêu cầu ≤ 3.000 ms)", fontsize=12)
ax.legend(frameon=False); ax.spines[["top", "right"]].set_visible(False); plt.tight_layout(); plt.savefig("images/chart_load.png"); plt.close()

def clean(p):
    t = re.sub(r"\x1b\[[0-9;]*m", "", open(p, encoding="utf-8").read())
    keep = []
    for ln in t.splitlines():
        if re.match(r"\s+at ", ln) or "TimeoutNegativeWarning" in ln or "trace-warnings" in ln or "Timeout duration" in ln: continue
        keep.append(ln)
    t = "\n".join(keep)
    head, _, fails = t.partition("\n  1) ")
    msgs = re.findall(r"\n\s+(?:\d+\) [^\n]*\n\s+)?(DI-TC\d+[^\n]*):\n\n\s+AssertionError[^:]*: ([^\n]+)", "\n  1) " + fails)
    if msgs: head += "\n" + "\n".join(f"  ✘ {a}\n      {b}" for a, b in msgs)
    return re.sub(r"\n{3,}", "\n\n", head.strip("\n"))

def term(title, body):
    lines = []
    for ln in body.splitlines():
        e = html.escape(ln)
        if "✔" in ln or "passing" in ln: e = f'<span class="ok">{e}</span>'
        elif re.match(r"\s+\d+\) ", ln) or "failing" in ln or "✘" in ln: e = f'<span class="bad">{e}</span>'
        elif not ln.startswith("    "): e = f'<span class="hd">{e}</span>'
        lines.append(e)
    return f"<html><head><meta charset='utf-8'><style>body{{margin:0;background:#1e1e1e;font-family:Consolas,monospace;font-size:13px;color:#d4d4d4}}.bar{{background:#323233;color:#ccc;padding:6px 12px;font-family:Segoe UI;font-size:13px}}pre{{margin:0;padding:12px 16px;line-height:1.45}}.ok{{color:#6a9955}}.bad{{color:#f14c4c}}.hd{{color:#4fc1ff}}</style></head><body><div class='bar'>{html.escape(title)}</div><pre>{chr(10).join(lines)}</pre></body></html>"

shots = [("term_load.png", "PowerShell — npm run test:load", "nonfunctional/results_load.txt"),
         ("term_search.png", "PowerShell — npm run test:search", "nonfunctional/results_search.txt"),
         ("term_stress.png", "PowerShell — npm run test:stress", "nonfunctional/results_stress.txt"),
         ("term_integrity.png", "PowerShell — npm run test:integrity", "nonfunctional/results_integrity.txt"),
         ("term_reliability.png", "PowerShell — npm run test:reliability", "nonfunctional/results_reliability.txt")]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1250, "height": 200})
    for f, t, src in shots:
        pg.set_content(term(t, clean(src))); pg.screenshot(path="images/" + f, full_page=True)
    b.close()
print("ok", bp)
