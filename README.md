# Bộ mã kiểm thử – Phần mềm quản lý phòng khám thú cưng (Pet Clinic)

Gói này chứa toàn bộ mã kiểm thử, dữ liệu mẫu và kết quả kiểm thử dùng trong báo cáo `Nhóm12_PetClinic_KiemThu.docx`.
## Video demo

Video giới thiệu và chạy thử hệ thống PetClinic:

[📹 Xem video demo](video-demo/Meeting%20in%20General-20261028_161227-Meeting%20Recording.mp4)

**Đọc trước:**
- `HuongDan_KiemThu_PetClinic.docx` – hướng dẫn từng bước: chuẩn bị, chạy từng loại test, đọc kết quả, xử lý lỗi thường gặp.
- `PetClinic_BaoCaoKiemThu.xlsx` – báo cáo kiểm thử dạng bảng: Tổng quan, test case chức năng, unit test, test case phi chức năng, danh sách lỗi.

Mọi file code đều có comment tiếng Việt giải thích mục đích, cách hoạt động và tiêu chí Pass/Fail của từng test.

| Thư mục | Loại kiểm thử | Công cụ | Kết quả |
|---|---|---|---|
| `01_UnitTest/` | Kiểm thử đơn vị (hộp trắng) | Mocha + tsx + node:assert | 30 test – 24 Pass / 6 Fail |
| `02_AutomationTest/` | Kiểm thử chức năng tự động trên giao diện | Mocha + Selenium WebDriver (Chrome / Edge / Firefox) | 74 test – 56 Pass / 18 Fail |
| `03_PerformanceTest/` | Kiểm thử hiệu năng: **tải**, **chịu tải**, tìm kiếm 10.000 bản ghi | **autocannon** + Mocha | 11 test – 11 Pass |
| `04_DataIntegrityTest/` | Kiểm thử **toàn vẹn dữ liệu** | Mocha + mysql2 | 11 test – 7 Pass / 4 Fail |
| `05_ReliabilityTest/` | Kiểm thử **độ tin cậy và phục hồi** | Mocha + autocannon | 6 test – 6 Pass |
| `06_TestData/` | Script sinh dữ liệu mẫu `seed.ts` | – | 12 bác sĩ, 30 khách hàng, 50 thú cưng, 30 vật tư, 60 lịch hẹn, 43 hồ sơ khám, 15 camera, 31 ca trực, 60 hóa đơn |
| `07_KetQua/` | Kết quả lần chạy dùng trong báo cáo | – | log, JSON, CSV (mở bằng Excel), ảnh chụp, biểu đồ |
| `08_CongCu/` | Script hỗ trợ | Playwright, Matplotlib, docx | chụp màn hình, vẽ biểu đồ, sinh file Word |

Các test **Fail** là **lỗi thật của ứng dụng**, đã được kiểm tra lại (danh sách ở `07_KetQua/danh_sach_loi.csv` và mục 3.7 của báo cáo). Mocha báo `failing` là kết quả đúng với phiên bản hiện tại.

```
PetClinic_TestCode/
├── 01_UnitTest/
│   ├── schema.test.ts           UT-SCH-01..16  schema kiểm tra dữ liệu (shared/schema.ts)
│   └── storage.test.ts          UT-STO-01..14  lớp nghiệp vụ DatabaseStorage (server/storage.ts)
├── 02_AutomationTest/
│   ├── package.json             test:edge | test:chrome | test:firefox
│   ├── helpers.js               khởi tạo trình duyệt, hàm thao tác giao diện, gọi API
│   ├── cases.js                 74 test case: bước, dữ liệu, kết quả mong đợi, hàm run()
│   └── petclinic.spec.js        bộ Mocha chạy test case theo nhóm tác nhân
├── 03_PerformanceTest/
│   ├── package.json             test:load | test:search | test:stress
│   ├── common.js                chạy autocannon, tóm tắt p50/p99/req/s/tỷ lệ lỗi
│   ├── load.test.js             LOAD-TC001..006  tải 200 người dùng đồng thời
│   ├── search10k.test.js        PERF-TC001..002  tìm kiếm trên 10.000 khách hàng
│   └── stress.test.js           STRESS-TC001..003 tăng dần 50 → 1.600 kết nối
├── 04_DataIntegrityTest/
│   ├── package.json             test:integrity
│   └── integrity.test.js        DI-TC001..011  race condition, nhất quán bảng, dữ liệu đặc biệt
├── 05_ReliabilityTest/
│   ├── package.json             test:reliability
│   ├── common.js
│   └── reliability.test.js      REL-TC001..006 mất CSDL, kill ứng dụng, chạy liên tục
├── 06_TestData/seed.ts
├── 07_KetQua/
│   ├── test_cases_chuc_nang.csv       74 test case chức năng + kết quả thực tế
│   ├── test_cases_phi_chuc_nang.csv   28 test case phi chức năng + số liệu đo
│   ├── unit_tests.csv                 30 unit test
│   ├── danh_sach_loi.csv              lỗi phát hiện, mức độ, vị trí trong mã nguồn
│   ├── unit/ automation/ performance/ integrity/ reliability/   log + JSON từng loại
│   └── images/                        biểu đồ, ảnh log dùng trong báo cáo
├── 08_CongCu/  shots.py, make_images.py, make_nf_images.py, build_doc.js (báo cáo Word), build_excel.py (file Excel), build_guide.js (hướng dẫn)
├── HuongDan_KiemThu_PetClinic.docx
└── PetClinic_BaoCaoKiemThu.xlsx
```

## Yêu cầu

- Node.js 20 LTS trở lên, MySQL 8.0 trở lên.
- Trình duyệt Google Chrome, Microsoft Edge hoặc Mozilla Firefox bản mới nhất. Selenium Manager tự tải driver.
- **Dùng CSDL riêng cho kiểm thử.** Seed, kiểm thử tải và kiểm thử toàn vẹn đều ghi hoặc xóa dữ liệu.

## 1. Chuẩn bị ứng dụng và dữ liệu mẫu

```powershell
cd pet-pttkpm/pet-pttkpm
npm install
# .env: DATABASE_URL=mysql://<user>:<pass>@localhost:3306/petclinic_test
npm run db:push
npm run db:seed                       # nạp dữ liệu mẫu (06_TestData/seed.ts)
npm run build                         # bản production – dùng cho kiểm thử hiệu năng, tin cậy
$env:ENABLE_AUTO_REMINDER = "false"
npm start                             # http://localhost:5000
```

Nạp lại dữ liệu (`npm run db:seed`) trước mỗi bộ test để kết quả khớp báo cáo.

## 2. Unit Test – `01_UnitTest`

Unit test import trực tiếp mã nguồn dự án, nên phải nằm trong dự án. Hai file đã được cài sẵn tại `pet-pttkpm/pet-pttkpm/tests/unit/`.

```powershell
cd pet-pttkpm/pet-pttkpm
$env:DATABASE_URL = "mysql://<user>:<pass>@localhost:3306/petclinic_test"
npm run test:unit                     # mocha --import=tsx "tests/unit/**/*.test.ts"
```

## 3. Automation Test – `02_AutomationTest`

```powershell
cd PetClinic_TestCode/02_AutomationTest
npm install
npm run test:edge                     # hoặc test:chrome / test:firefox
```

Đổi địa chỉ ứng dụng bằng `$env:BASE_URL`. Kết quả ghi vào `07_KetQua/automation/`.

## 4. Kiểm thử hiệu năng: tải và chịu tải – `03_PerformanceTest`

```powershell
cd PetClinic_TestCode/03_PerformanceTest
npm install
npm run test:load                     # 200 người dùng × 6 kịch bản × 30 giây  (~3 phút)
npm run test:search                   # cần $env:DATABASE_URL – tự nạp rồi xóa 10.000 khách hàng
npm run test:stress                   # 50 → 1.600 kết nối, 15 giây/mức     (~2 phút)
```

Tùy chỉnh: `$env:LOAD_USERS`, `$env:LOAD_DURATION`, `$env:STRESS_LEVELS="100,500,1000"`, `$env:STRESS_STEP`.
Kịch bản LOAD-TC006 tạo khoảng 20.000 khách hàng, nên seed lại sau khi chạy.

## 5. Kiểm thử toàn vẹn dữ liệu – `04_DataIntegrityTest`

```powershell
cd PetClinic_TestCode/04_DataIntegrityTest
npm install
$env:DATABASE_URL = "mysql://<user>:<pass>@localhost:3306/petclinic_test"
npm run test:integrity
```

## 6. Kiểm thử độ tin cậy và phục hồi – `05_ReliabilityTest`

Bộ test tự khởi chạy ứng dụng ở cổng 5055 (từ `npm run build`), rồi dừng và khởi động lại MySQL bằng lệnh bạn cung cấp:

```powershell
cd PetClinic_TestCode/05_ReliabilityTest
npm install
$env:APP_DIR      = "..\..\..\pet-pttkpm\pet-pttkpm"
$env:DATABASE_URL = "mysql://<user>:<pass>@localhost:3306/petclinic_test"
$env:DB_STOP_CMD  = "net stop MySQL80"           # hoặc: docker stop petclinic-db
$env:DB_START_CMD = "net start MySQL80"          # hoặc: docker start petclinic-db
$env:SOAK_S       = "180"
npm run test:reliability
```

Không đặt `DB_STOP_CMD` / `DB_START_CMD` thì REL-TC002, REL-TC003 được bỏ qua (pending). REL-TC005 dùng số đo của REL-TC004, nên hãy chạy cả bộ.

## 7. Quy ước mã test case

| Tiền tố | Ý nghĩa |
|---|---|
| `SYS-TCxxx`, `UCx.y-TCxxx` | Test case chức năng (theo Use Case trong đặc tả) |
| `UT-SCH-xx`, `UT-STO-xx` | Unit test schema / lớp nghiệp vụ |
| `LOAD-TCxxx`, `PERF-TCxxx` | Kiểm thử tải và hiệu năng |
| `STRESS-TCxxx` | Kiểm thử chịu tải |
| `DI-TCxxx` | Kiểm thử toàn vẹn dữ liệu |
| `REL-TCxxx` | Kiểm thử độ tin cậy và phục hồi |
