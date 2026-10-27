# Pet Clinic Management (MySQL Edition)

This project is standardized to run on MySQL with Drizzle ORM.

## Core features

- Customer and pet management
- Doctor management (profile, specialization, availability)
- Search pets by customer name
- Appointment booking + appointment management
- Doctor shift management
- Medical records
- Inventory + stock management
- Invoice + medicine sale with automatic stock deduction
- Revenue/operations dashboard
- Camera streaming by pet room
- Automatic appointment reminders (email/SMS via env config)

## Tech stack

- Frontend: React + Vite + TanStack Query
- Backend: Express + TypeScript
- Database: MySQL + Drizzle ORM

## Quick start (local)

1. Install dependencies:

```bash
npm install
```

2. Start MySQL:

```bash
docker compose up -d db
```

3. Configure environment:

```bash
cp .env.example .env
```

Update `DATABASE_URL` if needed.

4. Push schema and seed data:

```bash
npm run db:setup

# optional: create DB from SQL bootstrap file
# mysql -u root -p < database/petclinic_init.sql
```

5. Run app:

```bash
npm run dev
```

Open:

- App: `http://localhost:5000`
- API: `http://localhost:5000/api/dashboard/stats`

## Full Docker deploy (app + db)

```bash
docker compose up -d --build
```

This will:

- start MySQL
- build app image
- run schema push + seed
- start backend/frontend on port `5000`

## Reminder configuration

The reminder worker is enabled by default.

Environment variables:

- `ENABLE_AUTO_REMINDER`
- `REMINDER_WINDOW_MINUTES`
- `REMINDER_INTERVAL_SECONDS`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `REMINDER_EMAIL_FROM`
- Twilio SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

If SMTP/Twilio is not configured, reminders are recorded with failed status in DB.

## Useful scripts

- `npm run dev` - local development
- `npm run build` - build client + server bundle
- `npm run start` - run production server from `dist`
- `npm run check` - TypeScript type check
- `npm run db:up` - start database container
- `npm run db:push` - sync schema to database
- `npm run db:seed` - seed demo data
- `npm run db:setup` - `db:push` + `db:seed`
