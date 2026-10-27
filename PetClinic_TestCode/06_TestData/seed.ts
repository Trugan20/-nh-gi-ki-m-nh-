import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { db, pool } from "./db";

function plusDays(base: Date, days: number, hour = 9, minute = 0) {
  const value = new Date(base);
  value.setDate(base.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value;
}

async function main() {
  try {
    await db.delete(schema.appointmentReminders);
    await db.delete(schema.doctorShifts);
    await db.delete(schema.cameraStreams);
    await db.delete(schema.payments);
    await db.delete(schema.invoiceItems);
    await db.delete(schema.invoices);
    await db.delete(schema.stockBatches);
    await db.delete(schema.prescriptions);
    await db.delete(schema.inventory);
    await db.delete(schema.medicalRecords);
    await db.delete(schema.appointments);
    await db.delete(schema.pets);
    await db.delete(schema.customers);
    await db.delete(schema.doctors);
    await db.delete(schema.users);

    const adminId = randomUUID();
    const receptionistId = randomUUID();

    const vets = [
      { id: randomUUID(), name: "BS Nguyễn An", email: "dr.an@petclinic.local", phone: "0901000001", specialization: "Nội khoa thú nhỏ", licenseNumber: "VET-2026-001", yearsExperience: 8, consultationFee: "250000" },
      { id: randomUUID(), name: "BS Trần Bình", email: "dr.binh@petclinic.local", phone: "0901000002", specialization: "Phẫu thuật thú y", licenseNumber: "VET-2026-002", yearsExperience: 10, consultationFee: "320000" },
      { id: randomUUID(), name: "BS Lê Chi", email: "dr.chi@petclinic.local", phone: "0901000003", specialization: "Da liễu thú y", licenseNumber: "VET-2026-003", yearsExperience: 6, consultationFee: "220000" },
      { id: randomUUID(), name: "BS Phạm Dương", email: "dr.duong@petclinic.local", phone: "0901000004", specialization: "Nha khoa thú y", licenseNumber: "VET-2026-004", yearsExperience: 5, consultationFee: "200000" },
      { id: randomUUID(), name: "BS Võ Giang", email: "dr.giang@petclinic.local", phone: "0901000005", specialization: "Chẩn đoán hình ảnh thú y", licenseNumber: "VET-2026-005", yearsExperience: 7, consultationFee: "280000" },
    ];

    const customerUsers = [
      { id: randomUUID(), name: "Nguyễn Huy", email: "owner.huy@example.com", phone: "0911000001" },
      { id: randomUUID(), name: "Trần Lan", email: "owner.lan@example.com", phone: "0911000002" },
      { id: randomUUID(), name: "Phạm Tuấn", email: "owner.tuan@example.com", phone: "0911000003" },
      { id: randomUUID(), name: "Đỗ Quỳnh", email: "owner.quynh@example.com", phone: "0911000004" },
      { id: randomUUID(), name: "Lê Thành", email: "owner.thanh@example.com", phone: "0911000005" },
      { id: randomUUID(), name: "Vũ Nhi", email: "owner.nhi@example.com", phone: "0911000006" },
    ];

    await db.insert(schema.users).values([
      {
        id: adminId,
        name: "Quản trị viên",
        email: "admin@petclinic.local",
        role: "admin",
        phone: "0900000001",
        isActive: true,
      },
      {
        id: receptionistId,
        name: "Lễ tân",
        email: "reception@petclinic.local",
        role: "receptionist",
        phone: "0900000002",
        isActive: true,
      },
      ...vets.map((vet) => ({
        id: vet.id,
        name: vet.name,
        email: vet.email,
        role: "veterinarian" as const,
        phone: vet.phone,
        isActive: true,
      })),
      ...customerUsers.map((owner) => ({
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: "customer" as const,
        phone: owner.phone,
        isActive: true,
      })),
    ]);

    await db.insert(schema.doctors).values(
      vets.map((vet, index) => ({
        id: vet.id,
        specialization: vet.specialization,
        licenseNumber: vet.licenseNumber,
        yearsExperience: vet.yearsExperience,
        consultationFee: vet.consultationFee,
        bio: `Bác sĩ ${vet.name} phụ trách ${vet.specialization.toLowerCase()}.`,
        isAvailable: index !== 4,
      })),
    );

    const customers = [
      { id: randomUUID(), userId: customerUsers[0].id, name: "Nguyễn Huy", email: "owner.huy@example.com", phone: "0911000001", address: "Quận 1, TP HCM" },
      { id: randomUUID(), userId: customerUsers[1].id, name: "Trần Lan", email: "owner.lan@example.com", phone: "0911000002", address: "Gò Vấp, TP HCM" },
      { id: randomUUID(), userId: customerUsers[2].id, name: "Phạm Tuấn", email: "owner.tuan@example.com", phone: "0911000003", address: "Thủ Đức, TP HCM" },
      { id: randomUUID(), userId: customerUsers[3].id, name: "Đỗ Quỳnh", email: "owner.quynh@example.com", phone: "0911000004", address: "Đà Nẵng" },
      { id: randomUUID(), userId: customerUsers[4].id, name: "Lê Thành", email: "owner.thanh@example.com", phone: "0911000005", address: "Hà Nội" },
      { id: randomUUID(), userId: customerUsers[5].id, name: "Vũ Nhi", email: "owner.nhi@example.com", phone: "0911000006", address: "Cần Thơ" },
    ];

    await db.insert(schema.customers).values(
      customers.map((customer) => ({ ...customer, isActive: true })),
    );

    const pets = [
      { id: randomUUID(), customerId: customers[0].id, name: "Max", species: "Chó", breed: "Golden Retriever", age: 3, weight: "25.5", gender: "Đực", microchip: "MC-1001", imageUrl: "/attached_assets/stock_images/cute_golden_retrieve_eabbb615.jpg" },
      { id: randomUUID(), customerId: customers[0].id, name: "Milo", species: "Chó", breed: "Poodle", age: 2, weight: "8.2", gender: "Đực", microchip: "MC-1002", imageUrl: "/attached_assets/stock_images/cute_golden_retrieve_b51f28d9.jpg" },
      { id: randomUUID(), customerId: customers[1].id, name: "Miu", species: "Mèo", breed: "British Shorthair", age: 4, weight: "5.1", gender: "Cái", microchip: "MC-1003", imageUrl: "/attached_assets/stock_images/cute_cat_portrait_ve_6558cb17.jpg" },
      { id: randomUUID(), customerId: customers[2].id, name: "Bun", species: "Thỏ", breed: "Mini Lop", age: 1, weight: "2.4", gender: "Cái", microchip: "MC-1004", imageUrl: "/attached_assets/stock_images/cute_golden_retrieve_eabbb615.jpg" },
      { id: randomUUID(), customerId: customers[3].id, name: "Coco", species: "Chó", breed: "Corgi", age: 5, weight: "11.2", gender: "Cái", microchip: "MC-1005", imageUrl: "/attached_assets/stock_images/cute_golden_retrieve_b51f28d9.jpg" },
      { id: randomUUID(), customerId: customers[4].id, name: "Luna", species: "Mèo", breed: "Persian", age: 2, weight: "3.8", gender: "Cái", microchip: "MC-1006", imageUrl: "/attached_assets/stock_images/cute_cat_portrait_ve_6558cb17.jpg" },
      { id: randomUUID(), customerId: customers[5].id, name: "Toby", species: "Chó", breed: "Labrador", age: 3, weight: "28.4", gender: "Đực", microchip: "MC-1007", imageUrl: "/attached_assets/stock_images/cute_golden_retrieve_eabbb615.jpg" },
      { id: randomUUID(), customerId: customers[2].id, name: "Nau", species: "Mèo", breed: "Munchkin", age: 1, weight: "2.9", gender: "Đực", microchip: "MC-1008", imageUrl: "/attached_assets/stock_images/cute_cat_portrait_ve_6558cb17.jpg" },
    ];

    await db.insert(schema.pets).values(pets.map((pet) => ({ ...pet, isActive: true })));

    const inventory = [
      { id: randomUUID(), code: "MED-001", name: "Amoxicillin", category: "Medicine", unit: "hộp", stock: 80, minStock: 20, price: "45000" },
      { id: randomUUID(), code: "MED-002", name: "Cephalexin", category: "Medicine", unit: "hộp", stock: 65, minStock: 18, price: "52000" },
      { id: randomUUID(), code: "VAC-001", name: "Rabies Vaccine", category: "Vaccine", unit: "liều", stock: 90, minStock: 25, price: "130000" },
      { id: randomUUID(), code: "VAC-002", name: "5-in-1 Vaccine", category: "Vaccine", unit: "liều", stock: 70, minStock: 20, price: "180000" },
      { id: randomUUID(), code: "SUP-001", name: "Syringe 5ml", category: "Supplies", unit: "cái", stock: 350, minStock: 100, price: "3500" },
      { id: randomUUID(), code: "SUP-002", name: "Bandage", category: "Supplies", unit: "cuộn", stock: 120, minStock: 40, price: "12000" },
      { id: randomUUID(), code: "MED-003", name: "Skin Ointment", category: "Medicine", unit: "tuýp", stock: 42, minStock: 15, price: "70000" },
      { id: randomUUID(), code: "MED-004", name: "Ear Cleaner", category: "Medicine", unit: "chai", stock: 58, minStock: 20, price: "89000" },
      { id: randomUUID(), code: "SUP-003", name: "IV Set", category: "Supplies", unit: "bộ", stock: 36, minStock: 12, price: "45000" },
      { id: randomUUID(), code: "MED-005", name: "Deworm Tablet", category: "Medicine", unit: "viên", stock: 200, minStock: 60, price: "18000" },
    ];

    await db.insert(schema.inventory).values(inventory);

    const now = new Date();
    const appointments = [
      { id: randomUUID(), petId: pets[0].id, customerId: customers[0].id, veterinarianId: vets[0].id, appointmentDate: plusDays(now, 0, 8, 30), appointmentType: "Khám tổng quát", status: "confirmed" as const, notes: "Tái khám định kỳ" },
      { id: randomUUID(), petId: pets[1].id, customerId: customers[0].id, veterinarianId: vets[1].id, appointmentDate: plusDays(now, 0, 10, 0), appointmentType: "Tiêm phòng", status: "pending" as const, notes: "Mũi vaccine 2" },
      { id: randomUUID(), petId: pets[2].id, customerId: customers[1].id, veterinarianId: vets[2].id, appointmentDate: plusDays(now, 1, 9, 30), appointmentType: "Da liễu", status: "confirmed" as const, notes: "Kích ứng da" },
      { id: randomUUID(), petId: pets[3].id, customerId: customers[2].id, veterinarianId: vets[3].id, appointmentDate: plusDays(now, 1, 14, 0), appointmentType: "Nhổ răng", status: "completed" as const, notes: "Vệ sinh răng miệng" },
      { id: randomUUID(), petId: pets[4].id, customerId: customers[3].id, veterinarianId: vets[4].id, appointmentDate: plusDays(now, 2, 11, 0), appointmentType: "Chẩn đoán hình ảnh", status: "pending" as const, notes: "Cần chụp X-quang" },
      { id: randomUUID(), petId: pets[5].id, customerId: customers[4].id, veterinarianId: vets[0].id, appointmentDate: plusDays(now, 2, 16, 0), appointmentType: "Khám tổng quát", status: "urgent" as const, notes: "Bỏ ăn 2 ngày" },
      { id: randomUUID(), petId: pets[6].id, customerId: customers[5].id, veterinarianId: vets[1].id, appointmentDate: plusDays(now, 3, 8, 45), appointmentType: "Tiêm phòng", status: "confirmed" as const, notes: "Mũi nhắc lại" },
      { id: randomUUID(), petId: pets[7].id, customerId: customers[2].id, veterinarianId: vets[2].id, appointmentDate: plusDays(now, 4, 15, 30), appointmentType: "Tiêu hóa", status: "cancelled" as const, notes: "Khách đổi lịch" },
    ];

    await db.insert(schema.appointments).values(appointments);

    const medicalRecords = [
      { id: randomUUID(), petId: pets[0].id, appointmentId: appointments[0].id, veterinarianId: vets[0].id, visitDate: plusDays(now, -3, 9, 0), symptoms: "Ho nhẹ", diagnosis: "Viêm họng nhẹ", treatment: "Uống thuốc 5 ngày", notes: "Tái khám sau 1 tuần" },
      { id: randomUUID(), petId: pets[1].id, appointmentId: appointments[1].id, veterinarianId: vets[1].id, visitDate: plusDays(now, -2, 10, 0), symptoms: "Sốt nhẹ", diagnosis: "Phản ứng sau tiêm", treatment: "Theo dõi 24h", notes: "Không bất thường" },
      { id: randomUUID(), petId: pets[2].id, appointmentId: appointments[2].id, veterinarianId: vets[2].id, visitDate: plusDays(now, -5, 14, 0), symptoms: "Rụng lông", diagnosis: "Nấm da", treatment: "Bôi thuốc ngoài da", notes: "Tái khám 2 tuần" },
      { id: randomUUID(), petId: pets[3].id, appointmentId: appointments[3].id, veterinarianId: vets[3].id, visitDate: plusDays(now, -7, 8, 0), symptoms: "Hôi miệng", diagnosis: "Viêm lợi", treatment: "Cạo vôi răng", notes: "Vệ sinh răng hàng tuần" },
      { id: randomUUID(), petId: pets[4].id, appointmentId: appointments[4].id, veterinarianId: vets[4].id, visitDate: plusDays(now, -4, 11, 30), symptoms: "Đi cà khễnh", diagnosis: "Nghi sai khớp", treatment: "Chụp phim + nghỉ ngơi", notes: "Theo dõi vận động" },
      { id: randomUUID(), petId: pets[6].id, appointmentId: appointments[6].id, veterinarianId: vets[1].id, visitDate: plusDays(now, -1, 16, 0), symptoms: "Bị nôn", diagnosis: "Rối loạn tiêu hóa", treatment: "Boresol + men tiêu hóa", notes: "Đã ổn định" },
    ];

    await db.insert(schema.medicalRecords).values(medicalRecords);

    await db.insert(schema.prescriptions).values([
      { id: randomUUID(), medicalRecordId: medicalRecords[0].id, medicineId: inventory[0].id, quantity: 1, dosage: "2 viên/ngày", instructions: "Uống sau ăn" },
      { id: randomUUID(), medicalRecordId: medicalRecords[1].id, medicineId: inventory[1].id, quantity: 1, dosage: "1 viên/ngày", instructions: "Theo dõi thân nhiệt" },
      { id: randomUUID(), medicalRecordId: medicalRecords[2].id, medicineId: inventory[6].id, quantity: 2, dosage: "Bôi 2 lần/ngày", instructions: "Vệ sinh vùng da trước khi bôi" },
      { id: randomUUID(), medicalRecordId: medicalRecords[3].id, medicineId: inventory[5].id, quantity: 1, dosage: "Quấn 1 lần/ngày", instructions: "Dùng 5 ngày" },
      { id: randomUUID(), medicalRecordId: medicalRecords[4].id, medicineId: inventory[8].id, quantity: 1, dosage: "Theo chỉ định", instructions: "Tái khám sau 3 ngày" },
      { id: randomUUID(), medicalRecordId: medicalRecords[5].id, medicineId: inventory[9].id, quantity: 5, dosage: "1 viên/ngày", instructions: "Uống sau ăn sáng" },
      { id: randomUUID(), medicalRecordId: medicalRecords[0].id, medicineId: inventory[7].id, quantity: 1, dosage: "Nhỏ tai 1 lần/ngày", instructions: "Dùng 7 ngày" },
      { id: randomUUID(), medicalRecordId: medicalRecords[2].id, medicineId: inventory[4].id, quantity: 3, dosage: "Sử dụng khi cần", instructions: "Vật tư tiêu hao" },
    ]);

    await db.insert(schema.stockBatches).values([
      { id: randomUUID(), inventoryId: inventory[0].id, batchNumber: "B-2026-001", quantity: 40, expiryDate: plusDays(now, 240), supplier: "Vet Pharma" },
      { id: randomUUID(), inventoryId: inventory[1].id, batchNumber: "B-2026-002", quantity: 32, expiryDate: plusDays(now, 210), supplier: "PetMed" },
      { id: randomUUID(), inventoryId: inventory[2].id, batchNumber: "B-2026-003", quantity: 50, expiryDate: plusDays(now, 300), supplier: "BioVet" },
      { id: randomUUID(), inventoryId: inventory[3].id, batchNumber: "B-2026-004", quantity: 45, expiryDate: plusDays(now, 280), supplier: "BioVet" },
      { id: randomUUID(), inventoryId: inventory[4].id, batchNumber: "B-2026-005", quantity: 120, expiryDate: plusDays(now, 400), supplier: "MedicalSupply" },
      { id: randomUUID(), inventoryId: inventory[5].id, batchNumber: "B-2026-006", quantity: 70, expiryDate: plusDays(now, 350), supplier: "MedicalSupply" },
      { id: randomUUID(), inventoryId: inventory[6].id, batchNumber: "B-2026-007", quantity: 20, expiryDate: plusDays(now, 190), supplier: "Vet Pharma" },
      { id: randomUUID(), inventoryId: inventory[7].id, batchNumber: "B-2026-008", quantity: 30, expiryDate: plusDays(now, 170), supplier: "PetMed" },
      { id: randomUUID(), inventoryId: inventory[8].id, batchNumber: "B-2026-009", quantity: 15, expiryDate: plusDays(now, 500), supplier: "IV Global" },
      { id: randomUUID(), inventoryId: inventory[9].id, batchNumber: "B-2026-010", quantity: 110, expiryDate: plusDays(now, 260), supplier: "PetMed" },
    ]);

    await db.insert(schema.cameraStreams).values([
      { id: randomUUID(), petId: pets[0].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 01", isActive: true },
      { id: randomUUID(), petId: pets[1].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 02", isActive: true },
      { id: randomUUID(), petId: pets[2].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 03", isActive: true },
      { id: randomUUID(), petId: pets[3].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 04", isActive: false },
      { id: randomUUID(), petId: pets[4].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 05", isActive: true },
      { id: randomUUID(), petId: pets[5].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", roomNumber: "Phòng 06", isActive: true },
    ]);

    await db.insert(schema.doctorShifts).values([
      { id: randomUUID(), veterinarianId: vets[0].id, shiftDate: plusDays(now, 0, 0, 0), startTime: "08:00", endTime: "12:00", status: "planned", notes: "Ca sáng" },
      { id: randomUUID(), veterinarianId: vets[0].id, shiftDate: plusDays(now, 1, 0, 0), startTime: "13:00", endTime: "17:00", status: "planned", notes: "Ca chiều" },
      { id: randomUUID(), veterinarianId: vets[1].id, shiftDate: plusDays(now, 0, 0, 0), startTime: "09:00", endTime: "12:30", status: "planned", notes: "Phụ trách ngoại khoa" },
      { id: randomUUID(), veterinarianId: vets[1].id, shiftDate: plusDays(now, 2, 0, 0), startTime: "13:30", endTime: "18:00", status: "planned", notes: "Ca tối" },
      { id: randomUUID(), veterinarianId: vets[2].id, shiftDate: plusDays(now, 1, 0, 0), startTime: "08:00", endTime: "12:00", status: "planned", notes: "Khám da liễu" },
      { id: randomUUID(), veterinarianId: vets[2].id, shiftDate: plusDays(now, 3, 0, 0), startTime: "13:00", endTime: "17:00", status: "planned", notes: "Tư vấn" },
      { id: randomUUID(), veterinarianId: vets[3].id, shiftDate: plusDays(now, 0, 0, 0), startTime: "10:00", endTime: "14:00", status: "planned", notes: "Nha khoa" },
      { id: randomUUID(), veterinarianId: vets[3].id, shiftDate: plusDays(now, 4, 0, 0), startTime: "08:30", endTime: "12:30", status: "off", notes: "Nghỉ bù" },
      { id: randomUUID(), veterinarianId: vets[4].id, shiftDate: plusDays(now, 2, 0, 0), startTime: "09:00", endTime: "15:00", status: "planned", notes: "Siêu âm" },
      { id: randomUUID(), veterinarianId: vets[4].id, shiftDate: plusDays(now, 5, 0, 0), startTime: "08:00", endTime: "12:00", status: "completed", notes: "Đã hoàn thành" },
    ]);

    const invoices = [
      { id: randomUUID(), customerId: customers[0].id, appointmentId: appointments[0].id, invoiceNumber: "INV-2026-0001", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -14, 10, 0), dueDate: plusDays(now, -7, 17, 0) },
      { id: randomUUID(), customerId: customers[1].id, appointmentId: appointments[1].id, invoiceNumber: "INV-2026-0002", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -13, 15, 0), dueDate: plusDays(now, -6, 17, 0) },
      { id: randomUUID(), customerId: customers[2].id, appointmentId: appointments[2].id, invoiceNumber: "INV-2026-0003", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -12, 11, 0), dueDate: plusDays(now, -5, 17, 0) },
      { id: randomUUID(), customerId: customers[3].id, appointmentId: appointments[3].id, invoiceNumber: "INV-2026-0004", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -11, 9, 0), dueDate: plusDays(now, -4, 17, 0) },
      { id: randomUUID(), customerId: customers[4].id, appointmentId: appointments[4].id, invoiceNumber: "INV-2026-0005", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -10, 14, 0), dueDate: plusDays(now, -3, 17, 0) },
      { id: randomUUID(), customerId: customers[5].id, appointmentId: appointments[5].id, invoiceNumber: "INV-2026-0006", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -9, 16, 0), dueDate: plusDays(now, -2, 17, 0) },
      { id: randomUUID(), customerId: customers[0].id, appointmentId: appointments[6].id, invoiceNumber: "INV-2026-0007", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -8, 10, 0), dueDate: plusDays(now, -1, 17, 0) },
      { id: randomUUID(), customerId: customers[2].id, appointmentId: appointments[7].id, invoiceNumber: "INV-2026-0008", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -7, 9, 0), dueDate: plusDays(now, 0, 17, 0) },
      { id: randomUUID(), customerId: customers[1].id, appointmentId: null, invoiceNumber: "INV-2026-0009", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -6, 10, 0), dueDate: plusDays(now, 1, 17, 0) },
      { id: randomUUID(), customerId: customers[3].id, appointmentId: null, invoiceNumber: "INV-2026-0010", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -5, 11, 0), dueDate: plusDays(now, 2, 17, 0) },
      { id: randomUUID(), customerId: customers[4].id, appointmentId: null, invoiceNumber: "INV-2026-0011", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -4, 8, 30), dueDate: plusDays(now, 3, 17, 0) },
      { id: randomUUID(), customerId: customers[5].id, appointmentId: null, invoiceNumber: "INV-2026-0012", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -3, 13, 0), dueDate: plusDays(now, 4, 17, 0) },
      { id: randomUUID(), customerId: customers[0].id, appointmentId: null, invoiceNumber: "INV-2026-0013", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -2, 15, 0), dueDate: plusDays(now, 5, 17, 0) },
      { id: randomUUID(), customerId: customers[2].id, appointmentId: null, invoiceNumber: "INV-2026-0014", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, -1, 9, 0), dueDate: plusDays(now, 6, 17, 0) },
      { id: randomUUID(), customerId: customers[1].id, appointmentId: null, invoiceNumber: "INV-2026-0015", totalAmount: "0", status: "paid" as const, issuedAt: plusDays(now, 0, 10, 30), dueDate: plusDays(now, 7, 17, 0) },
    ];

    await db.insert(schema.invoices).values(invoices);

    await db.insert(schema.invoiceItems).values([
      { id: randomUUID(), invoiceId: invoices[0].id, inventoryId: inventory[0].id, description: "Amoxicillin", quantity: 2, unitPrice: "45000", totalPrice: "90000" },
      { id: randomUUID(), invoiceId: invoices[0].id, inventoryId: inventory[4].id, description: "Syringe 5ml", quantity: 3, unitPrice: "3500", totalPrice: "10500" },
      { id: randomUUID(), invoiceId: invoices[1].id, inventoryId: inventory[2].id, description: "Rabies Vaccine", quantity: 1, unitPrice: "130000", totalPrice: "130000" },
      { id: randomUUID(), invoiceId: invoices[2].id, inventoryId: inventory[6].id, description: "Skin Ointment", quantity: 1, unitPrice: "70000", totalPrice: "70000" },
      { id: randomUUID(), invoiceId: invoices[3].id, inventoryId: inventory[5].id, description: "Bandage", quantity: 4, unitPrice: "12000", totalPrice: "48000" },
      { id: randomUUID(), invoiceId: invoices[4].id, inventoryId: inventory[3].id, description: "5-in-1 Vaccine", quantity: 1, unitPrice: "180000", totalPrice: "180000" },
      { id: randomUUID(), invoiceId: invoices[5].id, inventoryId: inventory[1].id, description: "Cephalexin", quantity: 2, unitPrice: "52000", totalPrice: "104000" },
      { id: randomUUID(), invoiceId: invoices[6].id, inventoryId: inventory[9].id, description: "Deworm Tablet", quantity: 6, unitPrice: "18000", totalPrice: "108000" },
      { id: randomUUID(), invoiceId: invoices[7].id, inventoryId: inventory[8].id, description: "IV Set", quantity: 1, unitPrice: "45000", totalPrice: "45000" },
      { id: randomUUID(), invoiceId: invoices[3].id, inventoryId: inventory[7].id, description: "Ear Cleaner", quantity: 1, unitPrice: "89000", totalPrice: "89000" },
      { id: randomUUID(), invoiceId: invoices[8].id, inventoryId: inventory[1].id, description: "Cephalexin", quantity: 1, unitPrice: "52000", totalPrice: "52000" },
      { id: randomUUID(), invoiceId: invoices[9].id, inventoryId: inventory[6].id, description: "Skin Ointment", quantity: 1, unitPrice: "70000", totalPrice: "70000" },
      { id: randomUUID(), invoiceId: invoices[10].id, inventoryId: inventory[9].id, description: "Deworm Tablet", quantity: 2, unitPrice: "18000", totalPrice: "36000" },
      { id: randomUUID(), invoiceId: invoices[11].id, inventoryId: inventory[2].id, description: "Rabies Vaccine", quantity: 1, unitPrice: "130000", totalPrice: "130000" },
      { id: randomUUID(), invoiceId: invoices[12].id, inventoryId: inventory[5].id, description: "Bandage", quantity: 2, unitPrice: "12000", totalPrice: "24000" },
      { id: randomUUID(), invoiceId: invoices[13].id, inventoryId: inventory[7].id, description: "Ear Cleaner", quantity: 1, unitPrice: "89000", totalPrice: "89000" },
      { id: randomUUID(), invoiceId: invoices[14].id, inventoryId: inventory[8].id, description: "IV Set", quantity: 1, unitPrice: "45000", totalPrice: "45000" },
    ]);

    for (const invoice of invoices) {
      const [sumRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${schema.invoiceItems.totalPrice}), 0)` })
        .from(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, invoice.id));

      await db
        .update(schema.invoices)
        .set({ totalAmount: sumRow?.total ?? "0" })
        .where(eq(schema.invoices.id, invoice.id));
    }

    // ===================== Dữ liệu mẫu mở rộng phục vụ kiểm thử =====================
    // Sinh có quy luật (không ngẫu nhiên) để kết quả kiểm thử lặp lại được.
    const extraVets = [
      ["BS Hoàng Hải", "Tim mạch thú y"], ["BS Đặng Khoa", "Nội khoa thú lớn"], ["BS Bùi Minh", "Sản khoa thú y"],
      ["BS Ngô Ngọc", "Mắt thú y"], ["BS Hồ Phúc", "Dinh dưỡng thú cưng"], ["BS Lý Quân", "Thần kinh thú y"],
      ["BS Dương Sơn", "Cấp cứu thú y"],
    ].map(([name, specialization], i) => ({
      id: randomUUID(), name, specialization, email: `dr.extra${i + 1}@petclinic.local`, phone: `09010000${String(i + 6).padStart(2, "0")}`,
      licenseNumber: `VET-2026-${String(i + 6).padStart(3, "0")}`, yearsExperience: 2 + (i % 9), consultationFee: String(180000 + i * 20000),
    }));
    await db.insert(schema.users).values(extraVets.map((v) => ({ id: v.id, name: v.name, email: v.email, role: "veterinarian" as const, phone: v.phone, isActive: true })));
    await db.insert(schema.doctors).values(extraVets.map((v, i) => ({
      id: v.id, specialization: v.specialization, licenseNumber: v.licenseNumber, yearsExperience: v.yearsExperience,
      consultationFee: v.consultationFee, bio: `Bác sĩ ${v.name} phụ trách ${v.specialization.toLowerCase()}.`, isAvailable: i % 3 !== 2,
    })));
    const allVets = [...vets, ...extraVets];

    const extraCustomerNames = [
      "Nguyễn Minh Anh", "Trần Bảo Châu", "Lê Gia Hân", "Phạm Khánh Linh", "Hoàng Đức Long", "Huỳnh Hoàng Nam",
      "Phan Thu Hà", "Vũ Quốc Bảo", "Võ Ngọc Mai", "Đặng Tuấn Kiệt", "Bùi Thanh Tâm", "Đỗ Phương Thảo",
      "Hồ Hữu Phước", "Ngô Mỹ Duyên", "Dương Công Danh", "Lý Thùy Dung", "Nguyễn Văn Toàn", "Trần Diệu Linh",
      "Lê Quang Vinh", "Phạm Hải Yến", "Hoàng Minh Khôi", "Huỳnh Bích Ngọc", "Phan Trung Hiếu", "Vũ Kim Ngân",
    ];
    const districts = ["Cầu Giấy, Hà Nội", "Đống Đa, Hà Nội", "Hà Đông, Hà Nội", "Long Biên, Hà Nội", "Quận 3, TP HCM", "Bình Thạnh, TP HCM", "Hải Châu, Đà Nẵng", "Ninh Kiều, Cần Thơ"];
    const extraCustomers = extraCustomerNames.map((name, i) => ({
      id: randomUUID(), userId: null, name, email: `khach${String(i + 7).padStart(2, "0")}@example.com`,
      phone: `09120000${String(i + 7).padStart(2, "0")}`, address: districts[i % districts.length],
      isActive: i % 8 !== 5, // 3 khách hàng ở trạng thái "Chờ duyệt"
    }));
    await db.insert(schema.customers).values(extraCustomers);
    const allCustomers = [...customers, ...extraCustomers];

    const petNames = ["Bơ", "Mochi", "Lu", "Kem", "Sữa", "Đậu", "Gấu", "Na", "Su", "Bin", "Mít", "Tôm", "Xoài", "Cốm", "Mập", "Nâu", "Bông", "Chip", "Lucky", "Rex", "Kitty", "Simba", "Daisy", "Oreo", "Pepper", "Ruby", "Zoe", "Teddy", "Lily", "Bella", "Rocky", "Snow", "Coffee", "Muffin", "Peanut", "Tiger", "Ginger", "Sunny", "Pudding", "Panda", "Kiwi", "Candy"];
    const breeds: Record<string, string[]> = {
      "Chó": ["Poodle", "Corgi", "Shiba Inu", "Husky", "Phốc sóc", "Chihuahua", "Golden Retriever", "Labrador"],
      "Mèo": ["Anh lông ngắn", "Ba Tư", "Munchkin", "Mèo ta", "Scottish Fold", "Ragdoll"],
      "Thỏ": ["Mini Lop", "Hà Lan"], "Chim": ["Vẹt Cockatiel", "Yến phụng"], "Sóc": ["Sóc bay Úc"],
    };
    const speciesCycle = ["Chó", "Mèo", "Chó", "Mèo", "Thỏ", "Chó", "Mèo", "Chim", "Chó", "Sóc"];
    const extraPets = petNames.map((name, i) => {
      const species = speciesCycle[i % speciesCycle.length];
      const list = breeds[species];
      return {
        id: randomUUID(), customerId: extraCustomers[i % extraCustomers.length].id, name, species, breed: list[i % list.length],
        age: 1 + (i % 12), weight: species === "Chó" ? String(4 + (i % 25)) : species === "Mèo" ? String(2.5 + (i % 4)) : String(0.4 + (i % 3)),
        gender: i % 2 === 0 ? "Đực" : "Cái", microchip: `MC-${2001 + i}`, imageUrl: null, isActive: true,
      };
    });
    await db.insert(schema.pets).values(extraPets);
    const allPets = [...pets, ...extraPets];

    const extraInventory = [
      ["MED-006", "Metronidazole", "Medicine", "hộp", 60, 15, "38000"], ["MED-007", "Prednisolone", "Medicine", "hộp", 45, 15, "41000"],
      ["MED-008", "Doxycycline", "Medicine", "hộp", 8, 15, "56000"], ["MED-009", "Meloxicam", "Medicine", "chai", 33, 10, "95000"],
      ["MED-010", "Vitamin tổng hợp", "Medicine", "lọ", 120, 30, "65000"], ["MED-011", "Thuốc nhỏ mắt", "Medicine", "chai", 5, 12, "48000"],
      ["MED-012", "Men tiêu hóa", "Medicine", "gói", 240, 60, "8000"], ["MED-013", "Thuốc trị ve rận", "Medicine", "tuýp", 52, 20, "120000"],
      ["VAC-003", "Vaccine 7 bệnh", "Vaccine", "liều", 40, 15, "220000"], ["VAC-004", "Vaccine mèo 4 bệnh", "Vaccine", "liều", 12, 15, "190000"],
      ["VAC-005", "Vaccine Lepto", "Vaccine", "liều", 30, 10, "150000"], ["SUP-004", "Găng tay y tế", "Supplies", "hộp", 80, 20, "60000"],
      ["SUP-005", "Bông gạc", "Supplies", "gói", 150, 50, "15000"], ["SUP-006", "Kim tiêm 1ml", "Supplies", "cái", 400, 100, "2500"],
      ["SUP-007", "Vòng chống liếm", "Supplies", "cái", 25, 10, "55000"], ["SUP-008", "Ống truyền dịch", "Supplies", "bộ", 6, 10, "30000"],
      ["FOOD-001", "Pate dinh dưỡng", "Food", "hộp", 90, 30, "35000"], ["FOOD-002", "Hạt cho chó con 1kg", "Food", "túi", 40, 10, "185000"],
      ["FOOD-003", "Hạt cho mèo 1kg", "Food", "túi", 38, 10, "175000"], ["FOOD-004", "Sữa cho thú non", "Food", "hộp", 18, 8, "210000"],
    ].map(([code, name, category, unit, stock, minStock, price]) => ({
      id: randomUUID(), code: code as string, name: name as string, category: category as string, unit: unit as string,
      stock: stock as number, minStock: minStock as number, price: price as string,
    }));
    await db.insert(schema.inventory).values(extraInventory);
    const allInventory = [...inventory, ...extraInventory];
    await db.insert(schema.stockBatches).values(extraInventory.map((item, i) => ({
      id: randomUUID(), inventoryId: item.id, batchNumber: `B-2026-${String(i + 11).padStart(3, "0")}`, quantity: Math.max(item.stock, 1),
      expiryDate: plusDays(now, i % 7 === 3 ? 20 + i : 150 + i * 15), // vài lô sắp hết hạn trong 30 ngày
      supplier: ["Vet Pharma", "PetMed", "BioVet", "MedicalSupply", "PetFood VN"][i % 5],
    })));

    // Lịch hẹn: 52 lịch, từ 10 ngày trước đến 14 ngày tới; tránh khung 09:00, 11:00, 15:00 dành cho test case.
    const services = ["Khám tổng quát", "Tiêm phòng", "Tái khám", "Chăm sóc", "Phẫu thuật", "Da liễu", "Nha khoa"];
    const hours: Array<[number, number]> = [[8, 0], [8, 30], [10, 0], [10, 30], [13, 30], [14, 0], [16, 0], [16, 30]];
    const extraAppointments = Array.from({ length: 52 }, (_, i) => {
      const day = -10 + (i % 25);
      const [h, m] = hours[(i * 3) % hours.length];
      const status = day < 0 ? (i % 5 === 0 ? "cancelled" : "completed") : (["pending", "confirmed", "pending", "urgent", "confirmed"] as const)[i % 5];
      return {
        id: randomUUID(), petId: extraPets[i % extraPets.length].id, customerId: extraPets[i % extraPets.length].customerId,
        veterinarianId: extraVets[i % extraVets.length].id, appointmentDate: plusDays(now, day, h, m),
        appointmentType: services[i % services.length], status: status as (typeof schema.appointmentStatusValues)[number], notes: null,
      };
    });
    await db.insert(schema.appointments).values(extraAppointments);

    const diagnoses: Array<[string, string, string]> = [
      ["Bỏ ăn, mệt", "Viêm dạ dày cấp", "Truyền dịch, kháng sinh 5 ngày"], ["Ngứa, gãi nhiều", "Viêm da dị ứng", "Thuốc bôi + tắm thuốc"],
      ["Ho, chảy mũi", "Viêm đường hô hấp trên", "Kháng sinh 7 ngày"], ["Tiêu chảy", "Nhiễm giun đường ruột", "Tẩy giun + men tiêu hóa"],
      ["Chảy nước mắt", "Viêm kết mạc", "Nhỏ mắt 3 lần/ngày"], ["Đi khập khiễng", "Bong gân chân sau", "Nghỉ ngơi, giảm đau"],
      ["Hôi miệng", "Cao răng", "Cạo vôi răng"], ["Rụng lông từng mảng", "Nấm da", "Thuốc kháng nấm 14 ngày"],
      ["Nôn sau ăn", "Rối loạn tiêu hóa", "Ăn nhẹ, men tiêu hóa"], ["Lắc đầu, gãi tai", "Viêm tai ngoài", "Vệ sinh tai, nhỏ tai"],
    ];
    const pastAppointments = extraAppointments.filter((a) => a.status === "completed");
    await db.insert(schema.medicalRecords).values(pastAppointments.map((a, i) => ({
      id: randomUUID(), petId: a.petId, appointmentId: a.id, veterinarianId: a.veterinarianId!, visitDate: a.appointmentDate,
      symptoms: diagnoses[i % diagnoses.length][0], diagnosis: diagnoses[i % diagnoses.length][1], treatment: diagnoses[i % diagnoses.length][2],
      notes: i % 3 === 0 ? "Tái khám sau 1 tuần" : null,
    })));
    // 20 hồ sơ khám cũ (15–34 ngày trước) không gắn lịch hẹn
    const olderRecords = Array.from({ length: 20 }, (_, i) => ({
      id: randomUUID(), petId: extraPets[(i * 2) % extraPets.length].id, appointmentId: null, veterinarianId: allVets[i % allVets.length].id,
      visitDate: plusDays(now, -15 - i, 9 + (i % 7), 0), symptoms: diagnoses[(i + 3) % diagnoses.length][0],
      diagnosis: diagnoses[(i + 3) % diagnoses.length][1], treatment: diagnoses[(i + 3) % diagnoses.length][2], notes: null,
    }));
    await db.insert(schema.medicalRecords).values(olderRecords);

    // Camera phòng 07–15; phòng 09 và 13 ngoại tuyến.
    await db.insert(schema.cameraStreams).values(Array.from({ length: 9 }, (_, i) => ({
      id: randomUUID(), petId: extraPets[i].id, streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      roomNumber: `Phòng ${String(i + 7).padStart(2, "0")}`, isActive: ![9, 13].includes(i + 7),
    })));

    // Ca trực 7 ngày tới cho các bác sĩ bổ sung (ca sáng/chiều xen kẽ).
    await db.insert(schema.doctorShifts).values(Array.from({ length: 21 }, (_, i) => {
      const morning = i % 2 === 0;
      return {
        id: randomUUID(), veterinarianId: extraVets[i % extraVets.length].id, shiftDate: plusDays(now, Math.floor(i / 3), 0, 0),
        startTime: morning ? "08:00" : "13:30", endTime: morning ? "12:00" : "17:30", status: "planned" as const, notes: morning ? "Ca sáng" : "Ca chiều",
      };
    }));

    // Hóa đơn: 45 hóa đơn trong 30 ngày, đủ các trạng thái.
    const invoiceStatuses = ["paid", "paid", "paid", "pending", "paid", "overdue", "paid", "cancelled", "paid"] as const;
    const extraInvoices = Array.from({ length: 45 }, (_, i) => ({
      id: randomUUID(), customerId: allCustomers[(i * 5) % allCustomers.length].id, appointmentId: null,
      invoiceNumber: `INV-2026-${String(i + 16).padStart(4, "0")}`, totalAmount: "0", status: invoiceStatuses[i % invoiceStatuses.length],
      issuedAt: plusDays(now, -30 + Math.floor((i * 30) / 45), 9 + (i % 8), 0), dueDate: plusDays(now, -23 + Math.floor((i * 30) / 45), 17, 0),
    }));
    await db.insert(schema.invoices).values(extraInvoices);
    await db.insert(schema.invoiceItems).values(extraInvoices.flatMap((inv, i) => {
      const lines = 1 + (i % 3);
      return Array.from({ length: lines }, (_, j) => {
        const item = allInventory[(i * 7 + j * 3) % allInventory.length];
        const qty = 1 + ((i + j) % 4);
        return {
          id: randomUUID(), invoiceId: inv.id, inventoryId: item.id, description: item.name, quantity: qty,
          unitPrice: item.price, totalPrice: (parseFloat(item.price) * qty).toFixed(2),
        };
      });
    }));
    for (const invoice of extraInvoices) {
      const [sumRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${schema.invoiceItems.totalPrice}), 0)` })
        .from(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, invoice.id));
      await db.update(schema.invoices).set({ totalAmount: sumRow?.total ?? "0" }).where(eq(schema.invoices.id, invoice.id));
    }
    console.log(
      `Seed: ${allVets.length} bác sĩ, ${allCustomers.length} khách hàng, ${allPets.length} thú cưng, ${allInventory.length} vật tư, ` +
      `${appointments.length + extraAppointments.length} lịch hẹn, ${medicalRecords.length + pastAppointments.length + olderRecords.length} hồ sơ khám, ` +
      `15 camera, 31 ca trực, ${invoices.length + extraInvoices.length} hóa đơn`,
    );

    const paymentMethods = ["cash", "card", "bank_transfer", "e_wallet"] as const;
    const paidInvoices = await db
      .select({
        id: schema.invoices.id,
        totalAmount: schema.invoices.totalAmount,
        issuedAt: schema.invoices.issuedAt,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.status, "paid"));

    await db.insert(schema.payments).values(
      paidInvoices.map((invoice, index) => {
        const paymentDate = new Date(invoice.issuedAt);
        paymentDate.setHours(paymentDate.getHours() + 1);

        return {
          id: randomUUID(),
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          paymentMethod: paymentMethods[index % paymentMethods.length],
          paymentDate,
          notes: `Thanh toán đủ - ngày ${index + 1}`,
        };
      }),
    );

    await db.insert(schema.appointmentReminders).values([
      { id: randomUUID(), appointmentId: appointments[0].id, channel: "email", recipient: customers[0].email, status: "sent", error: null, sentAt: plusDays(now, -1, 8, 0) },
      { id: randomUUID(), appointmentId: appointments[1].id, channel: "sms", recipient: customers[0].phone, status: "sent", error: null, sentAt: plusDays(now, -1, 9, 0) },
      { id: randomUUID(), appointmentId: appointments[2].id, channel: "email", recipient: customers[1].email, status: "failed", error: "SMTP timeout", sentAt: plusDays(now, -1, 10, 0) },
      { id: randomUUID(), appointmentId: appointments[4].id, channel: "sms", recipient: customers[3].phone, status: "sent", error: null, sentAt: plusDays(now, 0, 9, 30) },
      { id: randomUUID(), appointmentId: appointments[6].id, channel: "email", recipient: customers[5].email, status: "sent", error: null, sentAt: plusDays(now, 1, 7, 45) },
    ]);

    console.log("Seed completed with doctors module and expanded sample data");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

