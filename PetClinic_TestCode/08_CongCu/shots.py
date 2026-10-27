from playwright.sync_api import sync_playwright
pages = [("dashboard","/"),("customers","/customers"),("appointments","/appointments"),("doctors","/doctors"),
         ("medical_records","/medical-records"),("inventory","/inventory"),("invoices","/invoices"),("cameras","/cameras"),("shifts","/shifts")]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1440,"height":900})
    for name,url in pages:
        pg.goto("http://localhost:5000"+url); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
        pg.screenshot(path=f"images/{name}.png")
    b.close()
