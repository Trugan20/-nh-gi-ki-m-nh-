import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { z } from "zod";

export const userRoleValues = ["admin", "veterinarian", "receptionist", "customer"] as const;
export const appointmentStatusValues = ["pending", "confirmed", "urgent", "cancelled", "completed"] as const;
export const paymentStatusValues = ["pending", "paid", "overdue", "cancelled"] as const;
export const paymentMethodValues = ["cash", "card", "bank_transfer", "e_wallet"] as const;
export const doctorShiftStatusValues = ["planned", "completed", "off"] as const;
export const reminderChannelValues = ["email", "sms"] as const;

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: mysqlEnum("role", userRoleValues).notNull().default("customer"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const doctors = mysqlTable("doctors", {
  id: varchar("id", { length: 36 }).primaryKey().references(() => users.id),
  specialization: text("specialization").notNull(),
  licenseNumber: varchar("license_number", { length: 64 }).notNull(),
  yearsExperience: int("years_experience").notNull().default(0),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  bio: text("bio"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = mysqlTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pets = mysqlTable("pets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  customerId: varchar("customer_id", { length: 36 }).notNull().references(() => customers.id),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  age: int("age"),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  gender: text("gender"),
  microchip: text("microchip"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointments = mysqlTable("appointments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  petId: varchar("pet_id", { length: 36 }).notNull().references(() => pets.id),
  customerId: varchar("customer_id", { length: 36 }).notNull().references(() => customers.id),
  veterinarianId: varchar("veterinarian_id", { length: 36 }).references(() => users.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentType: text("appointment_type").notNull(),
  status: mysqlEnum("status", appointmentStatusValues).notNull().default("pending"),
  notes: text("notes"),
  reminderSentAt: timestamp("reminder_sent_at"),
  reminderChannel: mysqlEnum("reminder_channel", reminderChannelValues),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const medicalRecords = mysqlTable("medical_records", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  petId: varchar("pet_id", { length: 36 }).notNull().references(() => pets.id),
  appointmentId: varchar("appointment_id", { length: 36 }).references(() => appointments.id),
  veterinarianId: varchar("veterinarian_id", { length: 36 }).notNull().references(() => users.id),
  visitDate: timestamp("visit_date").notNull().defaultNow(),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventory = mysqlTable("inventory", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  stock: int("stock").notNull().default(0),
  minStock: int("min_stock").notNull().default(10),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prescriptions = mysqlTable("prescriptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  medicalRecordId: varchar("medical_record_id", { length: 36 }).notNull().references(() => medicalRecords.id),
  medicineId: varchar("medicine_id", { length: 36 }).notNull().references(() => inventory.id),
  quantity: int("quantity").notNull(),
  dosage: text("dosage"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockBatches = mysqlTable("stock_batches", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  inventoryId: varchar("inventory_id", { length: 36 }).notNull().references(() => inventory.id),
  batchNumber: text("batch_number").notNull(),
  quantity: int("quantity").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  supplier: text("supplier"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoices = mysqlTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  customerId: varchar("customer_id", { length: 36 }).notNull().references(() => customers.id),
  appointmentId: varchar("appointment_id", { length: 36 }).references(() => appointments.id),
  invoiceNumber: text("invoice_number").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", paymentStatusValues).notNull().default("pending"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceItems = mysqlTable("invoice_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  invoiceId: varchar("invoice_id", { length: 36 }).notNull().references(() => invoices.id),
  inventoryId: varchar("inventory_id", { length: 36 }).references(() => inventory.id),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  invoiceId: varchar("invoice_id", { length: 36 }).notNull().references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("payment_method", paymentMethodValues).notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cameraStreams = mysqlTable("camera_streams", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  petId: varchar("pet_id", { length: 36 }).notNull().references(() => pets.id),
  streamUrl: text("stream_url").notNull(),
  roomNumber: text("room_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const doctorShifts = mysqlTable("doctor_shifts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  veterinarianId: varchar("veterinarian_id", { length: 36 }).notNull().references(() => users.id),
  shiftDate: timestamp("shift_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: mysqlEnum("status", doctorShiftStatusValues).notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointmentReminders = mysqlTable("appointment_reminders", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  appointmentId: varchar("appointment_id", { length: 36 }).notNull().references(() => appointments.id),
  channel: mysqlEnum("channel", reminderChannelValues).notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

const nullableString = z.string().min(1).nullable().optional();
const decimalString = z.union([z.string(), z.number()]).transform((value) => String(value));
const dateSchema = z.preprocess((val) => {
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  if (val instanceof Date) return val;
  return val;
}, z.date());

export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(userRoleValues).optional().default("customer"),
  phone: nullableString,
  isActive: z.boolean().optional().default(true),
});

export const insertDoctorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: nullableString,
  isActive: z.boolean().optional().default(true),
  specialization: z.string().min(1),
  licenseNumber: z.string().min(1),
  yearsExperience: z.number().int().min(0).optional().default(0),
  consultationFee: decimalString.optional().default("0"),
  bio: nullableString,
  isAvailable: z.boolean().optional().default(true),
});

export const insertCustomerSchema = z.object({
  userId: z.string().min(1).nullable().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: nullableString,
  isActive: z.boolean().optional().default(true),
});

export const insertPetSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  breed: nullableString,
  age: z.number().int().min(0).nullable().optional(),
  weight: decimalString.nullable().optional(),
  gender: nullableString,
  microchip: nullableString,
  imageUrl: nullableString,
  isActive: z.boolean().optional().default(true),
});

export const insertAppointmentSchema = z.object({
  petId: z.string().min(1),
  customerId: z.string().min(1),
  veterinarianId: z.string().min(1).nullable().optional(),
  appointmentDate: dateSchema,
  appointmentType: z.string().min(1),
  status: z.enum(appointmentStatusValues).optional().default("pending"),
  notes: nullableString,
});

export const insertMedicalRecordSchema = z.object({
  petId: z.string().min(1),
  appointmentId: z.string().min(1).nullable().optional(),
  veterinarianId: z.string().min(1),
  visitDate: dateSchema.optional(),
  symptoms: nullableString,
  diagnosis: nullableString,
  treatment: nullableString,
  notes: nullableString,
});

export const insertPrescriptionSchema = z.object({
  medicalRecordId: z.string().min(1),
  medicineId: z.string().min(1),
  quantity: z.number().int().min(1),
  dosage: nullableString,
  instructions: nullableString,
});

export const insertInventorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  stock: z.number().int().min(0).optional().default(0),
  minStock: z.number().int().min(0).optional().default(10),
  price: decimalString,
});

export const insertStockBatchSchema = z.object({
  inventoryId: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.number().int().min(1),
  expiryDate: dateSchema,
  supplier: nullableString,
});

export const insertInvoiceSchema = z.object({
  customerId: z.string().min(1),
  appointmentId: z.string().min(1).nullable().optional(),
  invoiceNumber: z.string().min(1),
  totalAmount: decimalString,
  status: z.enum(paymentStatusValues).optional().default("pending"),
  issuedAt: dateSchema.optional(),
  dueDate: dateSchema.nullable().optional(),
});

export const insertInvoiceItemSchema = z.object({
  invoiceId: z.string().min(1),
  inventoryId: z.string().min(1).nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: decimalString,
  totalPrice: decimalString,
});

export const insertPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: decimalString,
  paymentMethod: z.enum(paymentMethodValues),
  paymentDate: dateSchema.optional(),
  notes: nullableString,
});

export const insertCameraStreamSchema = z.object({
  petId: z.string().min(1),
  streamUrl: z.string().min(1),
  roomNumber: nullableString,
  isActive: z.boolean().optional().default(true),
});

export const insertDoctorShiftSchema = z.object({
  veterinarianId: z.string().min(1),
  shiftDate: dateSchema,
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  status: z.enum(doctorShiftStatusValues).optional().default("planned"),
  notes: nullableString,
});

export const insertAppointmentReminderSchema = z.object({
  appointmentId: z.string().min(1),
  channel: z.enum(reminderChannelValues),
  recipient: z.string().min(1),
  status: z.string().min(1),
  error: nullableString,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = z.infer<typeof insertPetSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type StockBatch = typeof stockBatches.$inferSelect;
export type InsertStockBatch = z.infer<typeof insertStockBatchSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type CameraStream = typeof cameraStreams.$inferSelect;
export type InsertCameraStream = z.infer<typeof insertCameraStreamSchema>;

export type DoctorShift = typeof doctorShifts.$inferSelect;
export type InsertDoctorShift = z.infer<typeof insertDoctorShiftSchema>;

export type AppointmentReminder = typeof appointmentReminders.$inferSelect;
export type InsertAppointmentReminder = z.infer<typeof insertAppointmentReminderSchema>;
