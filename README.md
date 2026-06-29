# 🪵Perforsol Negoce  — Inventory & Business Management System



---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features & Modules](#features--modules)
  - [Dashboard](#1-dashboard)
  - [Sales (Ventes)](#2-sales-ventes)
  - [Purchases (Achats)](#3-purchases-achats)
  - [Caisse (Cash Register)](#4-caisse-cash-register)
  - [Bank Payments (Paiements Bancaires)](#5-bank-payments-paiements-bancaires)
  - [TVA (VAT Tracking)](#6-tva-vat-tracking)
  - [Transports](#7-transports)
  - [Reports (Rapports)](#8-reports-rapports)
  - [Admin Panel](#9-admin-panel)
  - [Profile](#10-profile)
- [Authentication & Security](#authentication--security)
- [Internationalization](#internationalization)
- [Data Export & Printing](#data-export--printing)
- [Getting Started](#getting-started)

---

## Overview

Perforsol Negoce Inventory is a multi-user business management platform covering the full operational cycle of the business: from tracking raw materials in the warehouse, to recording sales invoices and purchase orders, managing cash and bank flows, computing VAT obligations, and tracking transport logistics — all in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 (via Vite) |
| **Backend / Database** | Supabase (PostgreSQL, Auth, RLS) |
| **State Management** | Zustand |
| **Routing** | React Router DOM v7 |
| **Styling** | Tailwind CSS |
| **Form Handling** | React Hook Form + Zod |
| **Localization** | i18next (English + French) |
| **Date Formatting** | date-fns |
| **Icons** | Lucide React |

---

## Project Structure

```
src/
├── App.jsx                  # Root router, auth guards, protected routes
├── main.jsx                 # React entry point
│
├── pages/                   # One file per application module
│   ├── Dashboard.jsx
│   ├── Sales.jsx
│   ├── Purchases.jsx
│   ├── Caisse.jsx
│   ├── BankPayments.jsx
│   ├── TVA.jsx
│   ├── Transports.jsx
│   ├── Reports.jsx
│   ├── AdminPanel.jsx
│   ├── Profile.jsx
│   └── Login.jsx
│
├── components/
│   ├── ui/
│   │   ├── HScrollWrapper.jsx   # Responsive horizontal scroll container
│   │   └── ...
│   └── layout/
│       ├── Sidebar.jsx
│       └── Layout.jsx
│
├── hooks/                   # Data-fetching hooks (one per domain)
│   ├── useAuth.jsx
│   ├── useSettings.jsx
│   ├── useInventory.jsx
│   ├── useSales.jsx
│   ├── usePurchases.jsx
│   ├── useCaisse.jsx
│   ├── useBankPayments.jsx
│   ├── useTva.jsx
│   ├── useTransports.jsx
│   ├── useClients.jsx
│   └── useCompanies.jsx
│
├── store/                   # Zustand global state
│   └── authStore.js
│
├── lib/
│   ├── supabase.js          # Supabase client
│   └── utils.js             # fmtDate, formatDate, getPaymentStatus, etc.
│
└── locales/
    ├── en/translation.json
    └── fr/translation.json
```

---

## Features & Modules

### 1. Dashboard

**Route:** `/`

The central hub providing a real-time snapshot of the warehouse and business activity.

- **Inventory Overview:** Displays all items with quantity, unit price, and category. Supports text search and category filtering.
- **Low Stock Alerts:** Highlights items that have fallen below a configurable threshold.
- **Add/Edit/Delete Items:** Full CRUD for inventory items with category assignment.
- **Recent Transactions Feed:** Shows the latest sales and purchase activity.
- **Summary Metrics:** Total items in stock, number of low-stock items.

---

### 2. Sales (Ventes)

**Route:** `/sales`

Full management of customer companies and outgoing sales invoices.

**Company (Client) Management:**
- Create, edit, and delete customer company records (name, address, ICE, RC, IF numbers).
- Deduplicated company list used across all modules.

**Sales Invoice Management:**
- Create invoices with multiple line items (product, quantity, unit price HT).
- Automatic TVA (VAT) calculation and TTC total.
- Auto-generated sequential receipt numbers.
- Dynamic line-item addition/removal.
- Auto-deducts quantity from the inventory upon sale creation.
- Auto-creates a corresponding **Caisse** and **TVA** entry upon saving.

**Filtering:**
- Filter by date range (from/to), payment status (Paid / Unpaid / Pending), payment method (Cash, Bank Check, TPE, Bank Transfer), and sort order (newest/oldest).
- Search by receipt number, company name, or notes.
- Active filter count badge on the filter button.

**Invoice Printing:**
- Generates a print-ready A4 PDF invoice with the company's letterhead (name, address, ICE), itemized table, totals HT/TVA/TTC.
- Amounts are written out in French words (e.g., *"Dix mille dirhams"*) using a custom number-to-words utility.

---

### 3. Purchases (Achats)

**Route:** `/purchases`

Mirror of the Sales module, focused on incoming purchases from suppliers.

**Supplier Company Management:**
- Same structure as client management but for vendors/suppliers.

**Purchase Order Management:**
- Create purchase orders with multiple line items.
- Supports creating **new inventory items on-the-fly** directly from the purchase form if a product doesn't exist yet.
- Auto-increases inventory quantity upon purchase confirmation.
- Auto-creates corresponding **Caisse** (cash out) and **TVA** (achat) entries.
- Same filtering, sorting, and PDF print capabilities as Sales.

---

### 4. Caisse (Cash Register)

**Route:** `/caisse`

A double-entry cash ledger tracking all cash movements (entrées/sorties).

- **Manual Entries:** Add cash-in (entrées) or cash-out (sorties) with a description (libellé), receipt number, transaction date, and optional payment date.
- **Auto-linked Entries:** Transactions from Sales and Purchases automatically appear here with a `Sale` or `Purchase` badge. Auto-sourced entries are read-only (cannot be edited/deleted manually).
- **Balance Calculation:** Totals only count transactions where a `payment_date` is set (i.e., confirmed paid). Displays total entrées, total sorties, and net balance.
- **Payment Status Tracking:** Each entry can be marked as Paid (has payment date), Pending (payment date in future), or Unpaid.
- **Filters:** Date field toggle (transaction date vs. payment date), source filter (Sales / Purchases / Manual), payment status filter.
- **Export:** CSV download and print-friendly A4 report with balance summary.
- **Role Restriction:** The `comptable` role can view but not add/edit/delete manual entries.

---

### 5. Bank Payments (Paiements Bancaires)

**Route:** `/bank`

Identical structure to Caisse, but tracks bank-level transactions (wire transfers, checks, etc.).

- Separate ledger for bank account movements, independent of the cash register.
- Balance is calculated on **all** transactions (not just paid ones), since bank entries are inherently recorded as settled.
- Same filtering, export, and print capabilities as Caisse.
- Auto-sourced entries from Sales/Purchases appear with source badges and are read-only.

---

### 6. TVA (VAT Tracking)

**Route:** `/tva`

A side-by-side VAT register tracking output tax (from sales) and input tax (from purchases).

- **Vente (Output TVA):** VAT collected on sales invoices. Automatically populated from Sales module.
- **Achat (Input TVA):** VAT paid on purchase invoices. Automatically populated from Purchases module.
- **Manual Entries:** Additional TVA amounts can be manually added, linked to a client or supplier.
- **Net TVA Balance:** Displays `Total Achat TVA − Total Vente TVA`. A positive balance means a TVA credit (owed to the company); negative means TVA due to authorities.
- **Filters:** Date range, sort order, search by receipt number or client/supplier name.
- **Export:** CSV download and print-ready A4 landscape report showing both columns side by side with the net balance.

---

### 7. Transports

**Route:** `/transports`

A logbook for tracking vehicle routes and associated costs.

- **Route Entries:** Log each trip with: date, license plate, departure location, arrival location, notes, gas cost (MAD), and vehicle rental price (MAD).
- **Payment Status per Cost:** Gas and rental price each have an independent paid/unpaid toggle.
- **Summary:** Shows total gas costs and total rental costs for the filtered date range.
- **Filters:** Date range, sort order, text search across plate, departure, arrival, and notes.
- **Print Report:** Generates a clean A4 landscape printout of all routes with cost totals.

---

### 8. Reports (Rapports)

**Route:** `/reports`

Analytical views of inventory and stock performance.

- **Stock Level Chart:** Visual bar/chart representation of stock quantities per item.
- **Category Distribution:** Breakdown of stock value/quantity by category.
- **Top Moving Items:** Identifies the highest-activity items based on sales/purchase volume within a configurable date range.
- **Date Range Filter:** All report views can be scoped to a specific time window.

---

### 9. Admin Panel

**Route:** `/admin` *(Admin role required)*

Full user lifecycle management for the application.

- **User List:** Displays all registered users with their email, full name, role, and join date.
- **Invite New Users:** Sends an email invitation to a new user with a magic link. Supports pre-assigning a role at the time of invitation.
- **Role Management:** Admins can change any user's role between `admin`, `user`, and `comptable`.
- **Password Reset:** Admins can trigger a password reset email for any user.
- **Delete Users:** Remove users from the system with a confirmation dialog.
- **Role Descriptions:**
  - `admin` — Full access to all modules and the Admin Panel.
  - `user` — Standard access to inventory, sales, purchases, and financial modules.
  - `comptable` — Read-only access to financial modules (Caisse, Bank); cannot add/edit/delete manual entries.

---

### 10. Profile

**Route:** `/profile`

Personal account management for the logged-in user.

- **Display Name:** View and inline-edit full name (saved to the `profiles` table in Supabase).
- **Account Info:** Shows email address, assigned role badge, and member-since date.
- **Password Change:** Secure form with new password + confirmation fields (validated with Zod schema). Calls `supabase.auth.updateUser` directly.

---

## Authentication & Security

- **Supabase Auth** handles all login, session management, and password resets.
- **Protected Routes:** All pages are behind a route guard in `App.jsx` that checks for a valid Supabase session.
- **Admin Guard:** The Admin Panel route additionally checks that `profile.role === 'admin'`.
- **Password Reset Flow:** `App.jsx` intercepts the `#access_token` hash on load (from password reset emails) and redirects the user to the Profile page to set a new password.
- **Email Invites:** New users are invited via Supabase's `admin.inviteUserByEmail()` API and are assigned a role during the invite process.

---

## Internationalization

The app supports **English (en)** and **French (fr)** via `i18next`.

- All UI strings are defined in `src/locales/{lang}/translation.json`.
- Dates use `date-fns` with locale-aware formatting.
- Financial amounts are formatted with `toLocaleString()` to 2 decimal places.
- Invoice print templates use French locale for date display (e.g., *"25 mai 2026"*).

---

## Data Export & Printing

Every financial module (Sales, Purchases, Caisse, Bank, TVA, Transports) supports:

| Action | Description |
|---|---|
| **CSV Export** | Downloads a UTF-8 BOM encoded CSV file compatible with Excel/LibreOffice |
| **Print / PDF** | Opens a new browser window with a styled, print-ready A4 HTML document that auto-triggers `window.print()` |

Sales and Purchase invoices additionally include:
- Full company letterhead (name, address, ICE, RC, IF)
- Itemized product table with HT, TVA %, and TTC columns
- Amount in words (French) generated by a custom `numberToWords` utility

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A Supabase project with the required tables (`profiles`, `inventory`, `sales`, `purchases`, `caisse_transactions`, `bank_transactions`, `tva_transactions`, `transport_routes`, `clients`, `companies`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mecawood-inventory

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your Supabase URL and anon key to .env:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Output is in the `dist/` directory, ready for deployment to Vercel, Netlify, or any static host.

---

> Built for **Meca Wood** · Morocco · 2025
