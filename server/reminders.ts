import nodemailer from "nodemailer";
import type { IStorage, ReminderCandidate } from "./storage";

type Channel = "email" | "sms";

function buildMessage(candidate: ReminderCandidate): string {
  const when = new Date(candidate.appointmentDate).toLocaleString("vi-VN");
  return `Lịch khám sắp tới: ${candidate.petName || "Thú cưng"} - ${candidate.appointmentType} vào ${when}.`;
}

async function sendEmail(candidate: ReminderCandidate): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.REMINDER_EMAIL_FROM || user;

  if (!host || !user || !pass || !from || !candidate.customerEmail) {
    return { ok: false, error: "SMTP/email config missing" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: candidate.customerEmail,
      subject: "Nhac lich kham thu cung",
      text: buildMessage(candidate),
    });

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Email send failed" };
  }
}

async function sendSms(candidate: ReminderCandidate): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = candidate.customerPhone;

  if (!sid || !token || !from || !to) {
    return { ok: false, error: "Twilio/SMS config missing" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: buildMessage(candidate),
    });

    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Twilio error: ${text}` };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "SMS send failed" };
  }
}

async function sendReminder(candidate: ReminderCandidate): Promise<{ channel: Channel; ok: boolean; error?: string; recipient: string }> {
  if (candidate.customerEmail) {
    const result = await sendEmail(candidate);
    return {
      channel: "email",
      ok: result.ok,
      error: result.error,
      recipient: candidate.customerEmail,
    };
  }

  const result = await sendSms(candidate);
  return {
    channel: "sms",
    ok: result.ok,
    error: result.error,
    recipient: candidate.customerPhone || "",
  };
}

export function startReminderWorker(storage: IStorage) {
  if (process.env.ENABLE_AUTO_REMINDER === "false") {
    console.log("[reminder] auto reminder disabled");
    return;
  }

  const windowMinutes = parseInt(process.env.REMINDER_WINDOW_MINUTES || "60", 10);
  const intervalMs = parseInt(process.env.REMINDER_INTERVAL_SECONDS || "60", 10) * 1000;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const candidates = await storage.getUpcomingAppointmentsForReminder(windowMinutes);
      for (const candidate of candidates) {
        const result = await sendReminder(candidate);
        await storage.markAppointmentReminderSent(
          candidate.id,
          result.channel,
          result.recipient,
          result.ok ? "sent" : "failed",
          result.ok ? null : result.error || "Reminder failed",
        );
      }
    } catch (error) {
      console.error("[reminder] worker error:", error);
    } finally {
      running = false;
    }
  };

  setInterval(tick, intervalMs);
  tick();
  console.log(`[reminder] worker started (window=${windowMinutes}m, interval=${intervalMs / 1000}s)`);
}
