import { randomUUID } from "crypto";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  getTableColumns,
} from "drizzle-orm";
import * as schema from "@shared/schema";
import { db } from "./db";
import type {
  Appointment,
  CameraStream,
  Customer,
  DoctorShift,
  InsertAppointment,
  InsertCameraStream,
  InsertCustomer,
  InsertDoctor,
  InsertDoctorShift,
  InsertInventory,
  InsertInvoice,
  InsertInvoiceItem,
  InsertMedicalRecord,
  InsertPayment,
  InsertPet,
  InsertPrescription,
  InsertStockBatch,
  InsertUser,
  Inventory,
  Invoice,
  InvoiceItem,
  MedicalRecord,
  Payment,
  Pet,
  Prescription,
  StockBatch,
  User,
} from "@shared/schema";

export interface RevenueOverview {
  revenue: number;
  orderCount: number;
  medicineCount: number;
  remainingStock: number;
  lowStockCount: number;
}

export interface RevenueDailyPoint {
  date: string;
  label: string;
  revenue: number;
}

export interface ReminderCandidate {
  id: string;
  appointmentDate: Date;
  appointmentType: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  petName: string | null;
}

export interface IStorage {
  getUsers(role?: string): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDoctors(search?: string, active?: boolean): Promise<any[]>;
  getDoctorById(id: string): Promise<any | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<any>;
  updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<any | undefined>;

  getCustomers(limit?: number, offset?: number, search?: string, active?: boolean): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  getPets(customerId?: string, customerName?: string): Promise<any[]>;
  getPetById(id: string): Promise<Pet | undefined>;
  createPet(pet: InsertPet): Promise<Pet>;
  updatePet(id: string, pet: Partial<InsertPet>): Promise<Pet | undefined>;

  getAppointments(date?: Date, status?: string, search?: string): Promise<any[]>;
  getAppointmentById(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;
  getUpcomingAppointmentsForReminder(windowMinutes: number): Promise<ReminderCandidate[]>;
  markAppointmentReminderSent(
    appointmentId: string,
    channel: "email" | "sms",
    recipient: string,
    status?: string,
    error?: string | null,
  ): Promise<void>;

  getMedicalRecords(petId?: string): Promise<MedicalRecord[]>;
  getMedicalRecordById(id: string): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;

  getPrescriptions(medicalRecordId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;

  getInventory(search?: string): Promise<Inventory[]>;
  getInventoryById(id: string): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  updateInventoryStock(id: string, quantity: number): Promise<void>;
  getLowStockItems(): Promise<Inventory[]>;

  getStockBatches(inventoryId: string): Promise<StockBatch[]>;
  createStockBatch(batch: InsertStockBatch): Promise<StockBatch>;
  getExpiringBatches(daysUntilExpiry: number): Promise<StockBatch[]>;

  getInvoices(customerId?: string): Promise<any[]>;
  getInvoiceById(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string): Promise<void>;

  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;

  getPayments(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  getCameraStreams(petId?: string): Promise<any[]>;
  createCameraStream(stream: InsertCameraStream): Promise<CameraStream>;
  updateCameraStream(id: string, stream: Partial<InsertCameraStream>): Promise<CameraStream | undefined>;

  getDoctorShifts(veterinarianId?: string, shiftDate?: Date): Promise<any[]>;
  createDoctorShift(shift: InsertDoctorShift): Promise<DoctorShift>;
  updateDoctorShift(id: string, shift: Partial<InsertDoctorShift>): Promise<DoctorShift | undefined>;
  deleteDoctorShift(id: string): Promise<void>;

  getRevenueOverview(): Promise<RevenueOverview>;
  getRevenueDaily(days?: number): Promise<RevenueDailyPoint[]>;
}

const doctorCols = getTableColumns(schema.doctors);
const customerCols = getTableColumns(schema.customers);
const petCols = getTableColumns(schema.pets);
const appointmentCols = getTableColumns(schema.appointments);
const invoiceCols = getTableColumns(schema.invoices);
const streamCols = getTableColumns(schema.cameraStreams);
const doctorShiftCols = getTableColumns(schema.doctorShifts);

export class DatabaseStorage implements IStorage {
  private readonly db = db;

  async getUsers(role?: string): Promise<User[]> {
    if (role) {
      return this.db.select().from(schema.users).where(eq(schema.users.role, role as any));
    }
    return this.db.select().from(schema.users);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    await this.db.insert(schema.users).values({ id, ...user });
    const created = await this.getUserById(id);
    if (!created) throw new Error("Failed to create user");
    return created;
  }

  async getDoctors(search?: string, active?: boolean): Promise<any[]> {
    const conditions: any[] = [];

    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(schema.users.name, pattern),
          like(schema.users.email, pattern),
          like(schema.doctors.specialization, pattern),
          like(schema.doctors.licenseNumber, pattern),
        ),
      );
    }

    if (typeof active === "boolean") {
      conditions.push(eq(schema.users.isActive, active));
    }

    const query = this.db
      .select({
        ...doctorCols,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        isActive: schema.users.isActive,
      })
      .from(schema.doctors)
      .innerJoin(schema.users, eq(schema.doctors.id, schema.users.id));

    if (!conditions.length) {
      return query.where(eq(schema.users.role, "veterinarian")).orderBy(asc(schema.users.name));
    }

    return query.where(and(eq(schema.users.role, "veterinarian"), ...conditions)).orderBy(asc(schema.users.name));
  }

  async getDoctorById(id: string): Promise<any | undefined> {
    const [doctor] = await this.db
      .select({
        ...doctorCols,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        isActive: schema.users.isActive,
      })
      .from(schema.doctors)
      .innerJoin(schema.users, eq(schema.doctors.id, schema.users.id))
      .where(and(eq(schema.doctors.id, id), eq(schema.users.role, "veterinarian")))
      .limit(1);

    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<any> {
    const id = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone ?? null,
        isActive: doctor.isActive ?? true,
        role: "veterinarian",
      });

      await tx.insert(schema.doctors).values({
        id,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        yearsExperience: doctor.yearsExperience ?? 0,
        consultationFee: doctor.consultationFee ?? "0",
        bio: doctor.bio ?? null,
        isAvailable: doctor.isAvailable ?? true,
      });
    });

    const created = await this.getDoctorById(id);
    if (!created) throw new Error("Failed to create doctor");
    return created;
  }

  async updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<any | undefined> {
    await this.db.transaction(async (tx) => {
      const userPatch: Record<string, any> = {};
      const doctorPatch: Record<string, any> = {};

      if (typeof doctor.name === "string") userPatch.name = doctor.name;
      if (typeof doctor.email === "string") userPatch.email = doctor.email;
      if ("phone" in doctor) userPatch.phone = doctor.phone ?? null;
      if (typeof doctor.isActive === "boolean") userPatch.isActive = doctor.isActive;

      if (typeof doctor.specialization === "string") doctorPatch.specialization = doctor.specialization;
      if (typeof doctor.licenseNumber === "string") doctorPatch.licenseNumber = doctor.licenseNumber;
      if (typeof doctor.yearsExperience === "number") doctorPatch.yearsExperience = doctor.yearsExperience;
      if (doctor.consultationFee !== undefined) doctorPatch.consultationFee = doctor.consultationFee;
      if ("bio" in doctor) doctorPatch.bio = doctor.bio ?? null;
      if (typeof doctor.isAvailable === "boolean") doctorPatch.isAvailable = doctor.isAvailable;

      if (Object.keys(userPatch).length) {
        await tx.update(schema.users).set(userPatch).where(and(eq(schema.users.id, id), eq(schema.users.role, "veterinarian")));
      }

      if (Object.keys(doctorPatch).length) {
        await tx
          .update(schema.doctors)
          .set({ ...doctorPatch, updatedAt: new Date() })
          .where(eq(schema.doctors.id, id));
      }
    });

    return this.getDoctorById(id);
  }

  async getCustomers(limit = 100, offset = 0, search?: string, active?: boolean): Promise<Customer[]> {
    const conditions: any[] = [];

    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(schema.customers.name, pattern),
          like(schema.customers.email, pattern),
          like(schema.customers.phone, pattern),
        ),
      );
    }

    if (typeof active === "boolean") {
      conditions.push(eq(schema.customers.isActive, active));
    }

    const query = this.db.select().from(schema.customers);
    const withFilters = conditions.length ? query.where(and(...conditions)) : query;
    return withFilters.orderBy(desc(schema.customers.createdAt)).limit(limit).offset(offset);
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await this.db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    await this.db.insert(schema.customers).values({ id, ...customer });
    const created = await this.getCustomerById(id);
    if (!created) throw new Error("Failed to create customer");
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    await this.db
      .update(schema.customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(schema.customers.id, id));
    return this.getCustomerById(id);
  }

  async getPets(customerId?: string, customerName?: string): Promise<any[]> {
    const conditions: any[] = [];

    if (customerId) conditions.push(eq(schema.pets.customerId, customerId));
    if (customerName?.trim()) conditions.push(like(schema.customers.name, `%${customerName.trim()}%`));

    const query = this.db
      .select({
        ...petCols,
        customerName: schema.customers.name,
      })
      .from(schema.pets)
      .leftJoin(schema.customers, eq(schema.pets.customerId, schema.customers.id));

    return conditions.length ? query.where(and(...conditions)) : query;
  }

  async getPetById(id: string): Promise<Pet | undefined> {
    const [pet] = await this.db.select().from(schema.pets).where(eq(schema.pets.id, id)).limit(1);
    return pet;
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const id = randomUUID();
    await this.db.insert(schema.pets).values({ id, ...pet });
    const created = await this.getPetById(id);
    if (!created) throw new Error("Failed to create pet");
    return created;
  }

  async updatePet(id: string, pet: Partial<InsertPet>): Promise<Pet | undefined> {
    await this.db
      .update(schema.pets)
      .set({ ...pet, updatedAt: new Date() })
      .where(eq(schema.pets.id, id));
    return this.getPetById(id);
  }

  async getAppointments(date?: Date, status?: string, search?: string): Promise<any[]> {
    const conditions: any[] = [];

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      conditions.push(gte(schema.appointments.appointmentDate, start));
      conditions.push(lte(schema.appointments.appointmentDate, end));
    }

    if (status) {
      conditions.push(eq(schema.appointments.status, status as any));
    }

    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(or(like(schema.pets.name, pattern), like(schema.customers.name, pattern)));
    }

    const query = this.db
      .select({
        ...appointmentCols,
        petName: schema.pets.name,
        customerName: schema.customers.name,
        veterinarianName: schema.users.name,
      })
      .from(schema.appointments)
      .leftJoin(schema.pets, eq(schema.appointments.petId, schema.pets.id))
      .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
      .leftJoin(schema.users, eq(schema.appointments.veterinarianId, schema.users.id));

    const withFilters = conditions.length ? query.where(and(...conditions)) : query;

    // Daily view should be chronological, management view should surface newest updates first.
    if (date) {
      return withFilters.orderBy(asc(schema.appointments.appointmentDate));
    }

    return withFilters.orderBy(desc(schema.appointments.createdAt), desc(schema.appointments.appointmentDate));
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const [appointment] = await this.db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).limit(1);
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    if (appointment.veterinarianId) {
      const [sameVetSlot] = await this.db
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.veterinarianId, appointment.veterinarianId),
            eq(schema.appointments.appointmentDate, appointment.appointmentDate),
            ne(schema.appointments.status, "cancelled"),
          ),
        )
        .limit(1);

      if (sameVetSlot) {
        throw new Error("Veterinarian already has an appointment in this timeslot");
      }
    }

    const [samePetSlot] = await this.db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.petId, appointment.petId),
          eq(schema.appointments.appointmentDate, appointment.appointmentDate),
          ne(schema.appointments.status, "cancelled"),
        ),
      )
      .limit(1);

    if (samePetSlot) {
      throw new Error("Pet already has an appointment in this timeslot");
    }

    const id = randomUUID();
    await this.db.insert(schema.appointments).values({ id, ...appointment });
    const created = await this.getAppointmentById(id);
    if (!created) throw new Error("Failed to create appointment");
    return created;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const current = await this.getAppointmentById(id);
    if (!current) return undefined;

    const nextDate = appointment.appointmentDate ?? current.appointmentDate;
    const nextVet = appointment.veterinarianId ?? current.veterinarianId;
    const nextPet = appointment.petId ?? current.petId;

    if (nextVet && nextDate) {
      const [sameVetSlot] = await this.db
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.veterinarianId, nextVet),
            eq(schema.appointments.appointmentDate, nextDate),
            ne(schema.appointments.id, id),
            ne(schema.appointments.status, "cancelled"),
          ),
        )
        .limit(1);

      if (sameVetSlot) {
        throw new Error("Veterinarian already has an appointment in this timeslot");
      }
    }

    if (nextPet && nextDate) {
      const [samePetSlot] = await this.db
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.petId, nextPet),
            eq(schema.appointments.appointmentDate, nextDate),
            ne(schema.appointments.id, id),
            ne(schema.appointments.status, "cancelled"),
          ),
        )
        .limit(1);

      if (samePetSlot) {
        throw new Error("Pet already has an appointment in this timeslot");
      }
    }

    await this.db
      .update(schema.appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(schema.appointments.id, id));

    return this.getAppointmentById(id);
  }

  async deleteAppointment(id: string): Promise<void> {
    await this.db
      .update(schema.appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(schema.appointments.id, id));
  }

  async getUpcomingAppointmentsForReminder(windowMinutes: number): Promise<ReminderCandidate[]> {
    const now = new Date();
    const due = new Date(now.getTime() + windowMinutes * 60 * 1000);

    return this.db
      .select({
        id: schema.appointments.id,
        appointmentDate: schema.appointments.appointmentDate,
        appointmentType: schema.appointments.appointmentType,
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        customerPhone: schema.customers.phone,
        petName: schema.pets.name,
      })
      .from(schema.appointments)
      .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
      .leftJoin(schema.pets, eq(schema.appointments.petId, schema.pets.id))
      .where(
        and(
          inArray(schema.appointments.status, ["pending", "confirmed"] as any),
          gte(schema.appointments.appointmentDate, now),
          lte(schema.appointments.appointmentDate, due),
          isNull(schema.appointments.reminderSentAt),
        ),
      )
      .orderBy(asc(schema.appointments.appointmentDate));
  }

  async markAppointmentReminderSent(
    appointmentId: string,
    channel: "email" | "sms",
    recipient: string,
    status = "sent",
    error?: string | null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (status === "sent") {
        await tx
          .update(schema.appointments)
          .set({ reminderSentAt: new Date(), reminderChannel: channel, updatedAt: new Date() })
          .where(eq(schema.appointments.id, appointmentId));
      }

      await tx.insert(schema.appointmentReminders).values({
        id: randomUUID(),
        appointmentId,
        channel,
        recipient,
        status,
        error: error ?? null,
      });
    });
  }

  async getMedicalRecords(petId?: string): Promise<MedicalRecord[]> {
    if (petId) {
      return this.db
        .select()
        .from(schema.medicalRecords)
        .where(eq(schema.medicalRecords.petId, petId))
        .orderBy(desc(schema.medicalRecords.visitDate));
    }

    return this.db.select().from(schema.medicalRecords).orderBy(desc(schema.medicalRecords.visitDate));
  }

  async getMedicalRecordById(id: string): Promise<MedicalRecord | undefined> {
    const [record] = await this.db.select().from(schema.medicalRecords).where(eq(schema.medicalRecords.id, id)).limit(1);
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const id = randomUUID();
    await this.db.insert(schema.medicalRecords).values({ id, ...record });
    const created = await this.getMedicalRecordById(id);
    if (!created) throw new Error("Failed to create medical record");
    return created;
  }

  async getPrescriptions(medicalRecordId: string): Promise<Prescription[]> {
    return this.db
      .select()
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.medicalRecordId, medicalRecordId));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const id = randomUUID();
    await this.db.insert(schema.prescriptions).values({ id, ...prescription });
    const [created] = await this.db.select().from(schema.prescriptions).where(eq(schema.prescriptions.id, id)).limit(1);
    if (!created) throw new Error("Failed to create prescription");
    return created;
  }

  async getInventory(search?: string): Promise<Inventory[]> {
    if (search?.trim()) {
      const pattern = `%${search.trim()}%`;
      return this.db
        .select()
        .from(schema.inventory)
        .where(or(like(schema.inventory.name, pattern), like(schema.inventory.code, pattern)))
        .orderBy(asc(schema.inventory.name));
    }

    return this.db.select().from(schema.inventory).orderBy(asc(schema.inventory.name));
  }

  async getInventoryById(id: string): Promise<Inventory | undefined> {
    const [item] = await this.db.select().from(schema.inventory).where(eq(schema.inventory.id, id)).limit(1);
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    await this.db.insert(schema.inventory).values({ id, ...item });
    const created = await this.getInventoryById(id);
    if (!created) throw new Error("Failed to create inventory item");
    return created;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    await this.db
      .update(schema.inventory)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(schema.inventory.id, id));

    return this.getInventoryById(id);
  }

  async updateInventoryStock(id: string, quantity: number): Promise<void> {
    const current = await this.getInventoryById(id);
    if (!current) throw new Error("Inventory item not found");

    const nextStock = (current.stock ?? 0) + quantity;
    if (nextStock < 0) throw new Error("Insufficient stock");

    await this.db
      .update(schema.inventory)
      .set({ stock: nextStock, updatedAt: new Date() })
      .where(eq(schema.inventory.id, id));
  }

  async getLowStockItems(): Promise<Inventory[]> {
    return this.db
      .select()
      .from(schema.inventory)
      .where(sql`${schema.inventory.stock} <= ${schema.inventory.minStock}`)
      .orderBy(asc(schema.inventory.stock));
  }

  async getStockBatches(inventoryId: string): Promise<StockBatch[]> {
    return this.db
      .select()
      .from(schema.stockBatches)
      .where(eq(schema.stockBatches.inventoryId, inventoryId))
      .orderBy(desc(schema.stockBatches.expiryDate));
  }

  async createStockBatch(batch: InsertStockBatch): Promise<StockBatch> {
    const id = randomUUID();
    await this.db.insert(schema.stockBatches).values({ id, ...batch });
    const [created] = await this.db.select().from(schema.stockBatches).where(eq(schema.stockBatches.id, id)).limit(1);
    if (!created) throw new Error("Failed to create stock batch");
    return created;
  }

  async getExpiringBatches(daysUntilExpiry: number): Promise<StockBatch[]> {
    const until = new Date();
    until.setDate(until.getDate() + daysUntilExpiry);

    return this.db
      .select()
      .from(schema.stockBatches)
      .where(lte(schema.stockBatches.expiryDate, until))
      .orderBy(asc(schema.stockBatches.expiryDate));
  }

  async getInvoices(customerId?: string): Promise<any[]> {
    const query = this.db
      .select({
        ...invoiceCols,
        customerName: schema.customers.name,
      })
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id));

    const withFilter = customerId ? query.where(eq(schema.invoices.customerId, customerId)) : query;
    return withFilter.orderBy(desc(schema.invoices.issuedAt));
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const [invoice] = await this.db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1);
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    await this.db.insert(schema.invoices).values({ id, ...invoice });
    const created = await this.getInvoiceById(id);
    if (!created) throw new Error("Failed to create invoice");
    return created;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(schema.invoices)
      .set({ status: status as any })
      .where(eq(schema.invoices.id, id));
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return this.db
      .select()
      .from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    return this.db.transaction(async (tx) => {
      if (item.inventoryId) {
        const [inv] = await tx
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.id, item.inventoryId))
          .limit(1);

        if (!inv) throw new Error("Inventory item not found");
        if ((inv.stock ?? 0) < item.quantity) throw new Error("Insufficient inventory stock");

        await tx
          .update(schema.inventory)
          .set({ stock: (inv.stock ?? 0) - item.quantity, updatedAt: new Date() })
          .where(eq(schema.inventory.id, inv.id));
      }

      const itemId = randomUUID();
      await tx.insert(schema.invoiceItems).values({ id: itemId, ...item });

      const [created] = await tx.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.id, itemId)).limit(1);
      if (!created) throw new Error("Failed to create invoice item");

      const [sumRow] = await tx
        .select({ total: sql<string>`COALESCE(SUM(${schema.invoiceItems.totalPrice}), 0)` })
        .from(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, item.invoiceId));

      await tx
        .update(schema.invoices)
        .set({ totalAmount: sumRow?.total ?? "0" })
        .where(eq(schema.invoices.id, item.invoiceId));

      return created;
    });
  }

  async getPayments(invoiceId: string): Promise<Payment[]> {
    return this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.invoiceId, invoiceId))
      .orderBy(desc(schema.payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    await this.db.insert(schema.payments).values({ id, ...payment });
    const [created] = await this.db.select().from(schema.payments).where(eq(schema.payments.id, id)).limit(1);
    if (!created) throw new Error("Failed to create payment");
    return created;
  }

  async getCameraStreams(petId?: string): Promise<any[]> {
    const query = this.db
      .select({
        ...streamCols,
        petName: schema.pets.name,
      })
      .from(schema.cameraStreams)
      .leftJoin(schema.pets, eq(schema.cameraStreams.petId, schema.pets.id));

    if (petId) {
      return query.where(eq(schema.cameraStreams.petId, petId));
    }

    return query.where(eq(schema.cameraStreams.isActive, true));
  }

  async createCameraStream(stream: InsertCameraStream): Promise<CameraStream> {
    const id = randomUUID();
    await this.db.insert(schema.cameraStreams).values({ id, ...stream });
    const [created] = await this.db.select().from(schema.cameraStreams).where(eq(schema.cameraStreams.id, id)).limit(1);
    if (!created) throw new Error("Failed to create camera stream");
    return created;
  }

  async updateCameraStream(id: string, stream: Partial<InsertCameraStream>): Promise<CameraStream | undefined> {
    await this.db
      .update(schema.cameraStreams)
      .set({ ...stream, updatedAt: new Date() })
      .where(eq(schema.cameraStreams.id, id));

    const [updated] = await this.db.select().from(schema.cameraStreams).where(eq(schema.cameraStreams.id, id)).limit(1);
    return updated;
  }

  async getDoctorShifts(veterinarianId?: string, shiftDate?: Date): Promise<any[]> {
    const conditions: any[] = [];

    if (veterinarianId) {
      conditions.push(eq(schema.doctorShifts.veterinarianId, veterinarianId));
    }

    if (shiftDate) {
      const start = new Date(shiftDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(shiftDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(gte(schema.doctorShifts.shiftDate, start));
      conditions.push(lte(schema.doctorShifts.shiftDate, end));
    }

    const query = this.db
      .select({
        ...doctorShiftCols,
        veterinarianName: schema.users.name,
        specialization: schema.doctors.specialization,
      })
      .from(schema.doctorShifts)
      .leftJoin(schema.users, eq(schema.doctorShifts.veterinarianId, schema.users.id))
      .leftJoin(schema.doctors, eq(schema.doctorShifts.veterinarianId, schema.doctors.id));
    const withFilters = conditions.length ? query.where(and(...conditions)) : query;

    return withFilters.orderBy(asc(schema.doctorShifts.shiftDate));
  }

  async createDoctorShift(shift: InsertDoctorShift): Promise<DoctorShift> {
    const id = randomUUID();
    await this.db.insert(schema.doctorShifts).values({ id, ...shift });
    const [created] = await this.db.select().from(schema.doctorShifts).where(eq(schema.doctorShifts.id, id)).limit(1);
    if (!created) throw new Error("Failed to create doctor shift");
    return created;
  }

  async updateDoctorShift(id: string, shift: Partial<InsertDoctorShift>): Promise<DoctorShift | undefined> {
    await this.db
      .update(schema.doctorShifts)
      .set({ ...shift, updatedAt: new Date() })
      .where(eq(schema.doctorShifts.id, id));

    const [updated] = await this.db.select().from(schema.doctorShifts).where(eq(schema.doctorShifts.id, id)).limit(1);
    return updated;
  }

  async deleteDoctorShift(id: string): Promise<void> {
    await this.db.delete(schema.doctorShifts).where(eq(schema.doctorShifts.id, id));
  }

  async getRevenueOverview(): Promise<RevenueOverview> {
    const [paidRevenue] = await this.db
      .select({ revenue: sql<string>`COALESCE(SUM(${schema.invoices.totalAmount}), 0)` })
      .from(schema.invoices)
      .where(eq(schema.invoices.status, "paid"));

    const [orders] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(schema.invoices);
    const [medicine] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(schema.inventory);
    const [stock] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${schema.inventory.stock}), 0)` })
      .from(schema.inventory);

    const [lowStock] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.inventory)
      .where(sql`${schema.inventory.stock} <= ${schema.inventory.minStock}`);

    return {
      revenue: Number.parseFloat(paidRevenue?.revenue ?? "0"),
      orderCount: Number(orders?.count ?? 0),
      medicineCount: Number(medicine?.count ?? 0),
      remainingStock: Number(stock?.total ?? 0),
      lowStockCount: Number(lowStock?.count ?? 0),
    };
  }

  async getRevenueDaily(days = 15): Promise<RevenueDailyPoint[]> {
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(90, Math.trunc(days))) : 15;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const rows = await this.db
      .select({
        day: sql<string>`DATE(${schema.invoices.issuedAt})`,
        total: sql<string>`COALESCE(SUM(${schema.invoices.totalAmount}), 0)`,
      })
      .from(schema.invoices)
      .where(and(eq(schema.invoices.status, "paid"), gte(schema.invoices.issuedAt, start)))
      .groupBy(sql`DATE(${schema.invoices.issuedAt})`)
      .orderBy(asc(sql`DATE(${schema.invoices.issuedAt})`));

    const revenueMap = new Map<string, number>(
      rows.map((row) => [row.day, Number.parseFloat(row.total ?? "0")]),
    );

    const points: RevenueDailyPoint[] = [];
    for (let i = 0; i < safeDays; i += 1) {
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + i);
      const yyyy = cursor.getFullYear();
      const mm = `${cursor.getMonth() + 1}`.padStart(2, "0");
      const dd = `${cursor.getDate()}`.padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;

      points.push({
        date: key,
        label: `${dd}/${mm}`,
        revenue: revenueMap.get(key) ?? 0,
      });
    }

    return points;
  }
}

export const storage: IStorage = new DatabaseStorage();
