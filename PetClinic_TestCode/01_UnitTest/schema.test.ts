/**
 * schema.test.ts – UNIT TEST CHO CÁC SCHEMA KIỂM TRA DỮ LIỆU (shared/schema.ts)
 * ---------------------------------------------------------------------------
 * Schema (thư viện Zod) là "bộ lọc" dữ liệu: mọi yêu cầu tạo/sửa đều đi qua đây trước khi lưu vào CSDL.
 * Unit test gọi trực tiếp schema, KHÔNG cần mở web hay CSDL → chạy rất nhanh (vài mili giây).
 *
 * Cách đọc một test:
 *   - schema.parse(dữ liệu)      : dữ liệu hợp lệ thì trả về dữ liệu đã chuẩn hóa, sai thì ném lỗi.
 *   - schema.safeParse(dữ liệu)  : không ném lỗi, trả về { success: true/false }.
 *   - assert.equal(a, b, "...")   : nếu a khác b → test FAIL, in câu thông báo phía sau.
 *
 * Kỹ thuật thiết kế: phân vùng tương đương (hợp lệ / không hợp lệ) và giá trị biên (0, âm, rỗng).
 * Chạy: npm run test:unit
 */
import assert from "node:assert/strict";
import {
  insertAppointmentSchema,
  insertCustomerSchema,
  insertDoctorShiftSchema,
  insertInventorySchema,
  insertInvoiceItemSchema,
  insertPaymentSchema,
  insertPetSchema,
  insertStockBatchSchema,
} from "@shared/schema";

// Một khách hàng hợp lệ mẫu – các test sửa từng trường để tạo dữ liệu sai.
const validCustomer = {
  name: "Nguyễn Văn A",
  email: "a@example.com",
  phone: "0912345678",
  address: "Hà Nội",
};

describe("UT-SCH: insertCustomerSchema", () => {
  // Dữ liệu đúng chuẩn phải được chấp nhận; trường isActive không truyền vào thì tự nhận giá trị mặc định true.
  it("UT-SCH-01: chấp nhận dữ liệu khách hàng hợp lệ và gán isActive mặc định = true", () => {
    const parsed = insertCustomerSchema.parse(validCustomer);
    assert.equal(parsed.isActive, true);
  });

  // Email thiếu @ phải bị từ chối (safeParse trả success = false).
  it("UT-SCH-02: từ chối email sai định dạng", () => {
    const r = insertCustomerSchema.safeParse({ ...validCustomer, email: "a.example.com" });
    assert.equal(r.success, false);
  });

  // Họ tên là trường bắt buộc – chuỗi rỗng phải bị từ chối.
  it("UT-SCH-03: từ chối họ tên rỗng", () => {
    const r = insertCustomerSchema.safeParse({ ...validCustomer, name: "" });
    assert.equal(r.success, false);
  });

  // Địa chỉ không bắt buộc. Form gửi address = "" khi bỏ trống, nên schema phải chấp nhận.
  // Hiện FAIL: nullableString = z.string().min(1) từ chối chuỗi rỗng → nguyên nhân lỗi UC1.1-TC010.
  it("UT-SCH-04: chấp nhận địa chỉ rỗng vì đây là trường không bắt buộc", () => {
    // Form thêm khách hàng gửi address = "" khi người dùng bỏ trống ô Địa chỉ.
    const r = insertCustomerSchema.safeParse({ ...validCustomer, address: "" });
    assert.equal(r.success, true, "address = \"\" bị từ chối: String must contain at least 1 character(s)");
  });

  // Quy tắc nghiệp vụ: SĐT phải đủ 10 chữ số. Kiểm tra phía server (gọi API trực tiếp vẫn phải bị chặn).
  // Hiện FAIL: chỉ form giao diện kiểm tra, schema server chấp nhận "123".
  it("UT-SCH-05: từ chối số điện thoại không đủ 10 chữ số (quy tắc nghiệp vụ UC1.1)", () => {
    const r = insertCustomerSchema.safeParse({ ...validCustomer, phone: "123" });
    assert.equal(r.success, false, "Schema phía server chấp nhận SĐT \"123\"");
  });
});

describe("UT-SCH: insertPetSchema", () => {
  const validPet = { customerId: "c-1", name: "Milo", species: "Chó" };

  // Cân nặng gửi lên dạng số (4.5) phải được chuyển thành chuỗi "4.5" để lưu vào cột DECIMAL.
  it("UT-SCH-06: chuyển cân nặng kiểu số sang chuỗi (decimal)", () => {
    const parsed = insertPetSchema.parse({ ...validPet, weight: 4.5 });
    assert.equal(parsed.weight, "4.5");
  });

  // Giá trị biên: tuổi âm phải bị từ chối.
  it("UT-SCH-07: từ chối tuổi âm", () => {
    const r = insertPetSchema.safeParse({ ...validPet, age: -1 });
    assert.equal(r.success, false);
  });

  // Loài là trường bắt buộc – thiếu loài phải bị từ chối.
  it("UT-SCH-08: từ chối thú cưng thiếu loài", () => {
    const r = insertPetSchema.safeParse({ customerId: "c-1", name: "Milo" });
    assert.equal(r.success, false);
  });
});

describe("UT-SCH: insertAppointmentSchema", () => {
  const base = { petId: "p-1", customerId: "c-1", appointmentType: "Khám tổng quát" };

  // Chuỗi ngày giờ phải được chuyển thành đối tượng Date; trạng thái mặc định là "pending" (chờ xác nhận).
  it("UT-SCH-09: chuyển chuỗi ngày giờ thành đối tượng Date, trạng thái mặc định pending", () => {
    const parsed = insertAppointmentSchema.parse({ ...base, appointmentDate: "2030-01-15T09:00:00" });
    assert.ok(parsed.appointmentDate instanceof Date);
    assert.equal(parsed.status, "pending");
  });

  // Trạng thái chỉ được là pending/confirmed/urgent/cancelled/completed – giá trị khác phải bị từ chối.
  it("UT-SCH-10: từ chối trạng thái không thuộc danh sách cho phép", () => {
    const r = insertAppointmentSchema.safeParse({ ...base, appointmentDate: "2030-01-15T09:00:00", status: "done" });
    assert.equal(r.success, false);
  });

  // Ngày giờ không đọc được ("khong-phai-ngay") phải bị từ chối.
  it("UT-SCH-11: từ chối ngày giờ không hợp lệ", () => {
    const r = insertAppointmentSchema.safeParse({ ...base, appointmentDate: "khong-phai-ngay" });
    assert.equal(r.success, false);
  });
});

describe("UT-SCH: kho, hóa đơn, thanh toán, ca trực", () => {
  // Giá trị biên: tồn kho âm phải bị từ chối.
  it("UT-SCH-12: từ chối vật tư có tồn kho âm", () => {
    const r = insertInventorySchema.safeParse({ code: "M1", name: "Thuốc", category: "Thuốc", unit: "Hộp", stock: -5, price: "1000" });
    assert.equal(r.success, false);
  });

  // Lô hàng nhập kho phải có số lượng ≥ 1.
  it("UT-SCH-13: từ chối lô hàng có số lượng 0", () => {
    const r = insertStockBatchSchema.safeParse({ inventoryId: "i-1", batchNumber: "B1", quantity: 0, expiryDate: "2030-01-01" });
    assert.equal(r.success, false);
  });

  // Dòng hóa đơn phải có số lượng ≥ 1.
  it("UT-SCH-14: từ chối dòng hóa đơn có số lượng 0", () => {
    const r = insertInvoiceItemSchema.safeParse({ invoiceId: "inv-1", description: "Thuốc", quantity: 0, unitPrice: "1000", totalPrice: "0" });
    assert.equal(r.success, false);
  });

  // Phân vùng tương đương: 1 phương thức hợp lệ (e_wallet) được nhận, 1 phương thức lạ (bitcoin) bị từ chối.
  it("UT-SCH-15: chỉ chấp nhận phương thức thanh toán cash, card, bank_transfer, e_wallet", () => {
    assert.equal(insertPaymentSchema.safeParse({ invoiceId: "inv-1", amount: 1000, paymentMethod: "e_wallet" }).success, true);
    assert.equal(insertPaymentSchema.safeParse({ invoiceId: "inv-1", amount: 1000, paymentMethod: "bitcoin" }).success, false);
  });

  // Ca trực có giờ kết thúc trước giờ bắt đầu phải bị từ chối.
  // Hiện FAIL: schema chỉ kiểm tra có nhập giờ, không so sánh hai giờ.
  it("UT-SCH-16: từ chối ca trực có giờ kết thúc trước giờ bắt đầu", () => {
    const r = insertDoctorShiftSchema.safeParse({ veterinarianId: "v-1", shiftDate: "2030-01-01", startTime: "17:00", endTime: "13:00" });
    assert.equal(r.success, false, "Schema chấp nhận ca 17:00 – 13:00");
  });
});
