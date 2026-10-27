/**
 * storage.test.ts – UNIT TEST CHO LỚP NGHIỆP VỤ DatabaseStorage (server/storage.ts)
 * -------------------------------------------------------------------------------
 * storage.ts chứa các quy tắc nghiệp vụ chính: kiểm tra trùng lịch, trừ tồn kho khi bán,
 * cảnh báo tồn thấp, hủy lịch (xóa mềm)… Đây là kiểm thử HỘP TRẮNG: đọc mã nguồn rồi
 * viết test cho từng nhánh if/else (nhánh hợp lệ và nhánh ném lỗi).
 *
 * Test chạy trên MỘT CSDL MySQL THỬ NGHIỆM thật (biến DATABASE_URL) – KHÔNG dùng CSDL đang sử dụng.
 * Mỗi lần chạy tạo dữ liệu riêng có hậu tố RUN (6 chữ số) nên không đụng dữ liệu cũ.
 *
 *   - before : tạo sẵn 1 khách hàng, 1 thú cưng, 1 bác sĩ dùng chung cho các test
 *   - after  : đóng kết nối CSDL để Mocha kết thúc
 *   - assert.rejects(promise, ...) : kiểm tra hàm PHẢI ném lỗi (dùng cho các nhánh từ chối)
 *
 * Chạy: $env:DATABASE_URL="mysql://...petclinic_test"; npm run test:unit
 */
import assert from "node:assert/strict";
import { pool } from "../../server/db";
import { storage } from "../../server/storage";

// Hậu tố 6 chữ số cho dữ liệu test của lần chạy này (tránh trùng email/SĐT với lần trước).
const RUN = Date.now().toString().slice(-6);

// Kiểm tra promise PHẢI bị từ chối với thông báo lỗi khớp mẫu (ví dụ /Insufficient stock/).
async function rejects(promise: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(promise, (err: any) => pattern.test(err?.message ?? ""));
}

describe("UT-STO: DatabaseStorage", function () {
  this.timeout(20000);

  let customerId: string;
  let petId: string;
  let vetId: string;

  before(async () => {
    const customer = await storage.createCustomer({ name: `UT Khách ${RUN}`, email: `ut${RUN}@test.vn`, phone: `08${RUN}00`, isActive: true });
    customerId = customer.id;
    const pet = await storage.createPet({ customerId, name: `UT Pet ${RUN}`, species: "Chó", isActive: true });
    petId = pet.id;
    const vet = await storage.createDoctor({
      name: `UT BS ${RUN}`, email: `utbs${RUN}@test.vn`, specialization: "Nội khoa", licenseNumber: `UT-${RUN}`,
      yearsExperience: 1, consultationFee: "100000", isActive: true, isAvailable: true,
    });
    vetId = vet.id;
  });

  after(async () => {
    await pool.end();
  });

  describe("Lịch hẹn (UC2.1, UC2.2)", () => {
    const slot = new Date("2031-03-10T09:00:00");

    // Luồng chuẩn: tạo lịch hẹn hợp lệ, trạng thái mặc định pending.
    it("UT-STO-01: tạo lịch hẹn hợp lệ với trạng thái mặc định pending", async () => {
      const ap = await storage.createAppointment({ petId, customerId, veterinarianId: vetId, appointmentDate: slot, appointmentType: "Khám tổng quát", status: "pending" });
      assert.equal(ap.status, "pending");
    });

    // Nhánh kiểm tra trùng bác sĩ trong createAppointment(): cùng bác sĩ, cùng giờ → phải ném lỗi.
    it("UT-STO-02: từ chối lịch hẹn trùng khung giờ của bác sĩ", async () => {
      const otherPet = await storage.createPet({ customerId, name: `UT Pet2 ${RUN}`, species: "Mèo", isActive: true });
      await rejects(
        storage.createAppointment({ petId: otherPet.id, customerId, veterinarianId: vetId, appointmentDate: slot, appointmentType: "Tiêm phòng", status: "pending" }),
        /Veterinarian already has an appointment/,
      );
    });

    // Nhánh kiểm tra trùng thú cưng: cùng thú cưng, cùng giờ → phải ném lỗi.
    it("UT-STO-03: từ chối lịch hẹn trùng khung giờ của thú cưng", async () => {
      await rejects(
        storage.createAppointment({ petId, customerId, appointmentDate: slot, appointmentType: "Tái khám", status: "pending" }),
        /Pet already has an appointment/,
      );
    });

    // deleteAppointment() không xóa hẳn mà đổi status = cancelled (xóa mềm).
    // Sau khi hủy, khung giờ đó phải đặt lại được (vì truy vấn trùng lịch bỏ qua lịch đã hủy).
    it("UT-STO-04: hủy lịch hẹn là xóa mềm (status = cancelled), khung giờ được giải phóng", async () => {
      const t = new Date("2031-03-11T10:00:00");
      const ap = await storage.createAppointment({ petId, customerId, appointmentDate: t, appointmentType: "Chăm sóc", status: "pending" });
      await storage.deleteAppointment(ap.id);
      const after = await storage.getAppointmentById(ap.id);
      assert.equal(after?.status, "cancelled");
      const again = await storage.createAppointment({ petId, customerId, appointmentDate: t, appointmentType: "Chăm sóc", status: "pending" });
      assert.ok(again.id);
    });

    // Lịch hẹn trong quá khứ phải bị từ chối. Hiện FAIL: storage không kiểm tra ngày.
    it("UT-STO-05: từ chối lịch hẹn có ngày trong quá khứ", async () => {
      const past = new Date(Date.now() - 24 * 3600 * 1000);
      await assert.rejects(
        storage.createAppointment({ petId, customerId, appointmentDate: past, appointmentType: "Khám tổng quát", status: "pending" }),
        "Lịch hẹn trong quá khứ vẫn được tạo",
      );
    });
  });

  describe("Kho thuốc và hóa đơn (UC4, UC5)", () => {
    let itemId: string;
    let invoiceId: string;

    before(async () => {
      const item = await storage.createInventoryItem({ code: `UT-${RUN}`, name: `UT Thuốc ${RUN}`, category: "Thuốc", unit: "Hộp", stock: 10, minStock: 3, price: "20000" });
      itemId = item.id;
      const inv = await storage.createInvoice({ customerId, invoiceNumber: `UT-INV-${RUN}`, totalAmount: "0", status: "pending" });
      invoiceId = inv.id;
    });

    // updateInventoryStock(): +5 rồi −3 trên tồn kho 10 → phải còn 12.
    it("UT-STO-06: điều chỉnh tồn kho cộng/trừ đúng số lượng", async () => {
      await storage.updateInventoryStock(itemId, 5);
      await storage.updateInventoryStock(itemId, -3);
      assert.equal((await storage.getInventoryById(itemId))?.stock, 12);
    });

    // Trừ quá số đang có phải ném lỗi "Insufficient stock" và tồn kho giữ nguyên.
    it("UT-STO-07: từ chối điều chỉnh làm tồn kho âm", async () => {
      await rejects(storage.updateInventoryStock(itemId, -100), /Insufficient stock/);
      assert.equal((await storage.getInventoryById(itemId))?.stock, 12);
    });

    // createInvoiceItem(): bán 2 hộp → tồn kho giảm 2 và tổng tiền hóa đơn = tổng các dòng (40.000đ).
    it("UT-STO-08: thêm dòng hóa đơn tự trừ tồn kho và cập nhật tổng tiền hóa đơn", async () => {
      await storage.createInvoiceItem({ invoiceId, inventoryId: itemId, description: "UT Thuốc", quantity: 2, unitPrice: "20000", totalPrice: "40000" });
      assert.equal((await storage.getInventoryById(itemId))?.stock, 10);
      assert.equal(parseFloat((await storage.getInvoiceById(invoiceId))!.totalAmount), 40000);
    });

    // Bán vượt tồn kho → ném lỗi; nhờ transaction, tồn kho không bị trừ dở dang (rollback).
    it("UT-STO-09: từ chối dòng hóa đơn vượt tồn kho, không thay đổi tồn kho (transaction rollback)", async () => {
      await rejects(
        storage.createInvoiceItem({ invoiceId, inventoryId: itemId, description: "UT Thuốc", quantity: 999, unitPrice: "20000", totalPrice: "19980000" }),
        /Insufficient inventory stock/,
      );
      assert.equal((await storage.getInventoryById(itemId))?.stock, 10);
    });

    // Vật tư có tồn kho ≤ tồn tối thiểu phải nằm trong getLowStockItems() (cảnh báo sắp hết).
    it("UT-STO-10: vật tư có tồn kho <= tồn tối thiểu nằm trong danh sách sắp hết", async () => {
      await storage.updateInventoryStock(itemId, -8);
      const low = await storage.getLowStockItems();
      assert.ok(low.some((i) => i.id === itemId));
    });

    // Lô hàng hết hạn trong 10 ngày tới phải nằm trong getExpiringBatches(30).
    it("UT-STO-11: lô hàng hết hạn trong 30 ngày nằm trong danh sách sắp hết hạn", async () => {
      const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000);
      const batch = await storage.createStockBatch({ inventoryId: itemId, batchNumber: `UT-B-${RUN}`, quantity: 5, expiryDate: soon });
      const expiring = await storage.getExpiringBatches(30);
      assert.ok(expiring.some((b) => b.id === batch.id));
    });

    // Đặc tả R4.1 – nhập thêm lô hàng phải cộng vào tồn kho. Hiện FAIL: createStockBatch() chỉ lưu lô, không cập nhật tồn kho.
    it("UT-STO-12: nhập lô hàng mới làm tăng tồn kho của vật tư (R4.1)", async () => {
      const before = (await storage.getInventoryById(itemId))!.stock;
      await storage.createStockBatch({ inventoryId: itemId, batchNumber: `UT-B2-${RUN}`, quantity: 20, expiryDate: new Date("2032-01-01") });
      const after = (await storage.getInventoryById(itemId))!.stock;
      assert.equal(after, before + 20, `Tồn kho không đổi (${before} → ${after}) sau khi nhập lô 20`);
    });
  });

  describe("Khách hàng (UC1.1)", () => {
    // Quy tắc UC1.1: SĐT không được trùng. Hiện FAIL: createCustomer() không kiểm tra trùng.
    it("UT-STO-13: từ chối tạo khách hàng trùng số điện thoại", async () => {
      await assert.rejects(
        storage.createCustomer({ name: "UT Trùng", email: `uttrung${RUN}@test.vn`, phone: `08${RUN}00`, isActive: true }),
        "Khách hàng trùng SĐT vẫn được tạo",
      );
    });

    // Tìm kiếm theo SĐT phải trả về đúng khách hàng vừa tạo.
    it("UT-STO-14: tìm kiếm khách hàng theo số điện thoại", async () => {
      const found = await storage.getCustomers(100, 0, `08${RUN}00`);
      assert.ok(found.some((c) => c.id === customerId));
    });
  });
});
