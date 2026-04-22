# FluxBooking - The Universal Booking SaaS

FluxBooking is a professional, multi-tenant booking platform designed for businesses like salons, gyms, and clinics. It allows business owners to register, define their services, manage staff, and receive a custom booking link for their customers.

## 🚀 Key Features

- **Multi-Tenancy**: Data isolation ensuring each business has its own private workspace.
- **Smart Booking Engine**: Automatic slot calculation based on staff availability and existing appointments.
- **Business Dashboard**: Comprehensive tools for managing services, staff, and customer bookings.
- **Public Booking Funnel**: Mobile-friendly, 3-step booking process for end-customers.
- **Secure Authentication**: Built-in owner registration and login using NextAuth.js and bcrypt.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React.
- **Backend**: Next.js Server Actions, NextAuth.js.
- **Database**: PostgreSQL with Prisma ORM.
- **Logic**: date-fns for complex scheduling calculations.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18+ installed.
- A PostgreSQL database instance.

### 2. Setup
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your database credentials and `NEXTAUTH_SECRET`.
4. Run `npx prisma generate` to generate the client.
5. Run `npx prisma db push` to sync the schema with your database.

### 3. Run Locally
```bash
npm run dev
```
Visit `http://localhost:3000` to see the landing page.

## 📂 Project Structure

- `/src/app/b/[slug]`: Public booking funnel.
- `/src/app/dashboard`: Business owner admin panel.
- `/src/app/actions`: Server-side logic for bookings, registration, and dashboard.
- `/src/lib`: Core utilities (Auth configuration, Prisma client).
- `/prisma`: Database schema definition.

---
Built with ❤️ for every business.
