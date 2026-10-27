import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertCameraStreamSchema,
  insertCustomerSchema,
  insertDoctorSchema,
  insertDoctorShiftSchema,
  insertInventorySchema,
  insertInvoiceItemSchema,
  insertInvoiceSchema,
  insertMedicalRecordSchema,
  insertPaymentSchema,
  insertPetSchema,
  insertStockBatchSchema,
} from "@shared/schema";

function parseDateQuery(date?: string): Date | undefined {
  if (!date) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const { limit, offset, search, active } = req.query;
      const customers = await storage.getCustomers(
        limit ? parseInt(limit as string, 10) : undefined,
        offset ? parseInt(offset as string, 10) : undefined,
        search as string | undefined,
        typeof active === "string" ? active === "true" : undefined,
      );
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const payload = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(payload);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update customer" });
    }
  });

  app.post("/api/customers/:id/approve", async (req, res) => {
    try {
      const updated = await storage.updateCustomer(req.params.id, { isActive: true } as any);
      if (!updated) return res.status(404).json({ error: "Customer not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to approve customer" });
    }
  });

  app.post("/api/customers/:id/deactivate", async (req, res) => {
    try {
      const updated = await storage.updateCustomer(req.params.id, { isActive: false } as any);
      if (!updated) return res.status(404).json({ error: "Customer not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to deactivate customer" });
    }
  });

  // Pets
  app.get("/api/pets", async (req, res) => {
    try {
      const { customerId, customerName } = req.query;
      const pets = await storage.getPets(
        customerId as string | undefined,
        customerName as string | undefined,
      );
      res.json(pets);
    } catch {
      res.status(500).json({ error: "Failed to fetch pets" });
    }
  });

  app.get("/api/pets/:id", async (req, res) => {
    try {
      const pet = await storage.getPetById(req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      res.json(pet);
    } catch {
      res.status(500).json({ error: "Failed to fetch pet" });
    }
  });

  app.post("/api/pets", async (req, res) => {
    try {
      const payload = insertPetSchema.parse(req.body);
      const pet = await storage.createPet(payload);
      res.status(201).json(pet);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid pet data" });
    }
  });

  app.patch("/api/pets/:id", async (req, res) => {
    try {
      const pet = await storage.updatePet(req.params.id, req.body);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      res.json(pet);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update pet" });
    }
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const { date, status, search } = req.query;
      const filterDate = parseDateQuery(date as string | undefined);
      const appointments = await storage.getAppointments(
        filterDate,
        status as string | undefined,
        search as string | undefined,
      );
      res.json(appointments);
    } catch {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointmentById(req.params.id);
      if (!appointment) return res.status(404).json({ error: "Appointment not found" });
      res.json(appointment);
    } catch {
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const payload = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(payload);
      res.status(201).json(appointment);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid appointment data" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      if (!appointment) return res.status(404).json({ error: "Appointment not found" });
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to cancel appointment" });
    }
  });

  // Medical records
  app.get("/api/medical-records", async (req, res) => {
    try {
      const { petId } = req.query;
      const records = await storage.getMedicalRecords(petId as string | undefined);
      res.json(records);
    } catch {
      res.status(500).json({ error: "Failed to fetch medical records" });
    }
  });

  app.get("/api/medical-records/:id", async (req, res) => {
    try {
      const record = await storage.getMedicalRecordById(req.params.id);
      if (!record) return res.status(404).json({ error: "Medical record not found" });
      res.json(record);
    } catch {
      res.status(500).json({ error: "Failed to fetch medical record" });
    }
  });

  app.post("/api/medical-records", async (req, res) => {
    try {
      const payload = insertMedicalRecordSchema.parse(req.body);
      const record = await storage.createMedicalRecord(payload);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid medical record data" });
    }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try {
      const { search } = req.query;
      const inventory = await storage.getInventory(search as string | undefined);
      res.json(inventory);
    } catch {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low-stock", async (_req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch {
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.getInventoryById(req.params.id);
      if (!item) return res.status(404).json({ error: "Inventory item not found" });
      res.json(item);
    } catch {
      res.status(500).json({ error: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const payload = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(payload);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid inventory data" });
    }
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.updateInventoryItem(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Inventory item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update inventory item" });
    }
  });

  app.post("/api/inventory/:id/adjust-stock", async (req, res) => {
    try {
      const quantity = Number(req.body?.quantity);
      if (Number.isNaN(quantity)) return res.status(400).json({ error: "Quantity must be numeric" });
      await storage.updateInventoryStock(req.params.id, quantity);
      const updated = await storage.getInventoryById(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to adjust stock" });
    }
  });

  // Stock batches
  app.get("/api/stock-batches", async (req, res) => {
    try {
      const { inventoryId } = req.query;
      if (!inventoryId) return res.status(400).json({ error: "inventoryId is required" });
      const batches = await storage.getStockBatches(inventoryId as string);
      res.json(batches);
    } catch {
      res.status(500).json({ error: "Failed to fetch stock batches" });
    }
  });

  app.get("/api/stock-batches/expiring", async (req, res) => {
    try {
      const days = parseInt((req.query.days as string) || "60", 10);
      const batches = await storage.getExpiringBatches(days);
      res.json(batches);
    } catch {
      res.status(500).json({ error: "Failed to fetch expiring batches" });
    }
  });

  app.post("/api/stock-batches", async (req, res) => {
    try {
      const payload = insertStockBatchSchema.parse(req.body);
      const batch = await storage.createStockBatch(payload);
      res.status(201).json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid stock batch data" });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices(req.query.customerId as string | undefined);
      res.json(invoices);
    } catch {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceById(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const payload = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(payload);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid invoice data" });
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const status = req.body?.status;
      if (!status) return res.status(400).json({ error: "status is required" });
      await storage.updateInvoiceStatus(req.params.id, status);
      const invoice = await storage.getInvoiceById(req.params.id);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update invoice status" });
    }
  });

  // Invoice items
  app.get("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(req.params.invoiceId);
      res.json(items);
    } catch {
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoice-items", async (req, res) => {
    try {
      const payload = insertInvoiceItemSchema.parse(req.body);
      const item = await storage.createInvoiceItem(payload);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid invoice item data" });
    }
  });

  // Payments
  app.get("/api/invoices/:invoiceId/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments(req.params.invoiceId);
      res.json(payments);
    } catch {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const payload = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(payload);

      const invoice = await storage.getInvoiceById(payload.invoiceId);
      if (invoice && parseFloat(payment.amount) >= parseFloat(invoice.totalAmount)) {
        await storage.updateInvoiceStatus(invoice.id, "paid");
      }

      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid payment data" });
    }
  });

  // Camera streams
  app.get("/api/camera-streams", async (req, res) => {
    try {
      const streams = await storage.getCameraStreams(req.query.petId as string | undefined);
      res.json(streams);
    } catch {
      res.status(500).json({ error: "Failed to fetch camera streams" });
    }
  });

  app.post("/api/camera-streams", async (req, res) => {
    try {
      const payload = insertCameraStreamSchema.parse(req.body);
      const stream = await storage.createCameraStream(payload);
      res.status(201).json(stream);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid camera stream data" });
    }
  });

  app.patch("/api/camera-streams/:id", async (req, res) => {
    try {
      const stream = await storage.updateCameraStream(req.params.id, req.body);
      if (!stream) return res.status(404).json({ error: "Camera stream not found" });
      res.json(stream);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update camera stream" });
    }
  });

  // Doctor shifts
  app.get("/api/doctor-shifts", async (req, res) => {
    try {
      const { veterinarianId, date } = req.query;
      const shifts = await storage.getDoctorShifts(
        veterinarianId as string | undefined,
        parseDateQuery(date as string | undefined),
      );
      res.json(shifts);
    } catch {
      res.status(500).json({ error: "Failed to fetch doctor shifts" });
    }
  });

  app.post("/api/doctor-shifts", async (req, res) => {
    try {
      const payload = insertDoctorShiftSchema.parse(req.body);
      const shift = await storage.createDoctorShift(payload);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid doctor shift data" });
    }
  });

  app.patch("/api/doctor-shifts/:id", async (req, res) => {
    try {
      const shift = await storage.updateDoctorShift(req.params.id, req.body);
      if (!shift) return res.status(404).json({ error: "Doctor shift not found" });
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update doctor shift" });
    }
  });

  app.delete("/api/doctor-shifts/:id", async (req, res) => {
    try {
      await storage.deleteDoctorShift(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to delete doctor shift" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers(req.query.role as string | undefined);
      res.json(users);
    } catch {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Doctors
  app.get("/api/doctors", async (req, res) => {
    try {
      const { search, active } = req.query;
      const doctors = await storage.getDoctors(
        search as string | undefined,
        typeof active === "string" ? active === "true" : undefined,
      );
      res.json(doctors);
    } catch {
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const doctor = await storage.getDoctorById(req.params.id);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      res.json(doctor);
    } catch {
      res.status(500).json({ error: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", async (req, res) => {
    try {
      const payload = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor(payload);
      res.status(201).json(doctor);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Invalid doctor data" });
    }
  });

  app.patch("/api/doctors/:id", async (req, res) => {
    try {
      const payload = insertDoctorSchema.partial().parse(req.body);
      const doctor = await storage.updateDoctor(req.params.id, payload);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      res.json(doctor);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Failed to update doctor" });
    }
  });

  // CSV export
  app.get("/api/export/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers(10000, 0);
      const headers = ["CustomerID", "Name", "Email", "Phone", "Address", "Active", "CreatedAt"];
      const rows = [headers.join(",")].concat(
        customers.map((c) =>
          [
            c.id,
            JSON.stringify(c.name),
            c.email,
            c.phone,
            JSON.stringify(c.address || ""),
            c.isActive ? "true" : "false",
            c.createdAt,
          ].join(","),
        ),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="customers.csv"');
      res.send(rows.join("\n"));
    } catch {
      res.status(500).json({ error: "Failed to export customers" });
    }
  });

  app.get("/api/export/pets", async (_req, res) => {
    try {
      const pets = await storage.getPets();
      const headers = ["PetID", "CustomerID", "CustomerName", "Name", "Species", "Breed", "Age", "Gender", "Microchip", "Active", "CreatedAt"];
      const rows = [headers.join(",")].concat(
        pets.map((p: any) =>
          [
            p.id,
            p.customerId,
            JSON.stringify(p.customerName || ""),
            JSON.stringify(p.name),
            JSON.stringify(p.species),
            JSON.stringify(p.breed || ""),
            p.age ?? "",
            JSON.stringify(p.gender || ""),
            JSON.stringify(p.microchip || ""),
            p.isActive ? "true" : "false",
            p.createdAt,
          ].join(","),
        ),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="pets.csv"');
      res.send(rows.join("\n"));
    } catch {
      res.status(500).json({ error: "Failed to export pets" });
    }
  });

  // Reports & dashboard
  app.get("/api/reports/overview", async (_req, res) => {
    try {
      const overview = await storage.getRevenueOverview();
      res.json(overview);
    } catch {
      res.status(500).json({ error: "Failed to fetch report overview" });
    }
  });

  app.get("/api/reports/revenue-daily", async (req, res) => {
    try {
      const days = Number.parseInt((req.query.days as string) || "15", 10);
      const points = await storage.getRevenueDaily(days);
      res.json(points);
    } catch {
      res.status(500).json({ error: "Failed to fetch daily revenue report" });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [appointments, lowStock, overview] = await Promise.all([
        storage.getAppointments(today),
        storage.getLowStockItems(),
        storage.getRevenueOverview(),
      ]);

      res.json({
        todayAppointments: appointments.length,
        lowStockCount: lowStock.length,
        monthlyRevenue: overview.revenue,
        orderCount: overview.orderCount,
        medicineCount: overview.medicineCount,
        remainingStock: overview.remainingStock,
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  return createServer(app);
}
