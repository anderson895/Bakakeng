# Brgy. Bakakeng — Document Management System

A full-stack web application for Barangay Bakakeng, Baguio City.

Built with **Next.js 15** · **TypeScript** · **Supabase** · **Cloudinary** · **Tailwind CSS v4** · **shadcn/ui**

---

## Features

**Resident Portal**
- Submit document requests (Barangay Clearance, Certificate, Indigency, Residency, Business Clearance, etc.)
- Track request status using your Control Number
- Mobile-friendly responsive design

**Admin Panel**
- Dashboard with live stats (pending, processing, ready, released, today's count)
- Full request management: filter by status, search by name / control number, pagination
- Status workflow: Pending → Processing → Ready for Release → Released
- Reject requests with written reason
- **Email notifications** (Nodemailer + Gmail SMTP) — auto-sent to the resident when a request is **rejected** (with the missing requirements) or **ready for release**
- **Delete document requests** (with Cloudinary file cleanup)
- Upload processed documents via Cloudinary
- Residents directory with **delete resident** (cascades to their requests + files)
- Internal admin notes per request
- Request timeline
- Admin profile settings

**Data integrity**
- Email is the resident identity key — repeat requests from the same email update one resident record instead of creating duplicates

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudinary (document uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gmail SMTP (email notifications) — use a Gmail App Password, NOT your normal password
GMAIL_USER=your-barangay-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=Brgy. Bakakeng DMS
```

### 3. Supabase Setup

Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, then run **each migration in order** (New query → paste → Run):

| # | File | What it sets up |
|---|------|-----------------|
| 1 | `supabase/migrations/20240101000000_initial.sql` | All tables, enums, RLS policies, indexes, and the auto-incrementing control-number trigger |
| 2 | `supabase/migrations/20260531000000_add_delete_policies.sql` | **DELETE** RLS policies for `document_requests` + `uploaded_documents` (required for "Delete Request") |
| 3 | `supabase/migrations/20260531000001_dedup_residents.sql` | `get_or_create_resident()` function — dedupes residents by **email** on submission |
| 4 | `supabase/migrations/20260531000002_delete_residents_policy.sql` | **DELETE** RLS policy for `residents` (required for "Delete Resident") |

> ⚠️ Without migrations **2** and **4**, delete actions silently affect 0 rows (RLS blocks them). Without **3**, every submission creates a duplicate resident.

**Optional — hard-enforce unique resident emails** (run after the DB has no duplicate emails):

```sql
CREATE UNIQUE INDEX residents_email_unique ON residents (lower(email)) WHERE email IS NOT NULL;
```

**Auth settings:** Dashboard → **Authentication** → **Providers** → Email. For local/testing you may turn **"Confirm email" OFF** so admin accounts can log in immediately.

### 4. Create Your Admin Account

1. Supabase Dashboard → **Authentication** → **Users** → **Add User** (set a password)
2. After first login at `/login`, go to `/admin/settings` to set your name and role

   *(Alternatively, run `node scripts/seed.js` to create the admin account + sample data interactively.)*

### 5. Run Development Server

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Resident portal |
| http://localhost:3000/login | Admin login |
| http://localhost:3000/admin | Admin dashboard |

---

## Email Notifications (Gmail SMTP)

The admin panel emails the resident when a request is **rejected** (including the missing requirements) or marked **ready for release**. To enable it:

1. Use a Gmail account for the barangay and turn on **2-Step Verification**:
   <https://myaccount.google.com/signinoptions/two-step-verification>
2. Generate a **16-character App Password** (App passwords require 2-Step Verification):
   <https://myaccount.google.com/apppasswords>
3. Put the values in `.env.local` (remove spaces from the App Password):

   ```env
   GMAIL_USER=your-barangay-email@gmail.com
   GMAIL_APP_PASSWORD=your16charapppass
   EMAIL_FROM_NAME=Brgy. Bakakeng DMS
   ```
4. Restart the dev server (env vars load on startup).

> Emails are **best-effort**: if the credentials are missing or sending fails, the status update still succeeds and the error is logged to the server console. Resident email is **required** on the request form, so every request has a recipient.

---

## Project Structure

```
bakakeng/
├── app/
│   ├── page.tsx                    # Resident portal (home / form / track)
│   ├── login/page.tsx              # Admin login page
│   ├── admin/
│   │   ├── layout.tsx              # Admin shell with sidebar
│   │   ├── page.tsx                # Dashboard with stats
│   │   ├── requests/
│   │   │   ├── page.tsx            # All requests (filter, search, paginate)
│   │   │   └── [id]/page.tsx       # Request detail + management
│   │   ├── residents/page.tsx      # Residents directory
│   │   └── settings/page.tsx       # Admin profile
│   └── api/
│       ├── requests/route.ts       # GET list + POST new request (email-dedup)
│       ├── requests/[id]/route.ts  # GET one + PATCH status + DELETE request
│       ├── residents/[id]/route.ts # DELETE resident (+ Cloudinary cleanup)
│       ├── upload/route.ts         # Cloudinary upload endpoint
│       └── auth/callback/route.ts  # Supabase auth callback
├── components/
│   ├── admin-sidebar.tsx           # Collapsible sidebar with nav
│   ├── toaster.tsx
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase/client.ts          # Browser Supabase client
│   ├── supabase/server.ts          # Server Supabase client
│   ├── cloudinary.ts               # Cloudinary upload + delete utility
│   ├── email.ts                    # Nodemailer (Gmail SMTP) notifications
│   └── utils.ts                    # Date + class helpers
├── hooks/use-toast.ts
├── types/index.ts                  # All TypeScript types + constants
├── supabase/migrations/            # DB migration SQL files
└── middleware.ts                   # Protects /admin/* routes
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `residents` | Personal info of residents |
| `document_requests` | Requests with auto-generated control number |
| `uploaded_documents` | Cloudinary URLs attached to requests |
| `admin_profiles` | Admin name/role linked to Supabase Auth |
| `activity_logs` | Audit trail of all admin actions |

**Control Number format:** `BKK-YYYY-NNNNN` (e.g. `BKK-2024-00001`)

**Function:** `get_or_create_resident(...)` — `SECURITY DEFINER` helper that lets the public `anon` role reuse an existing resident (matched by email) instead of creating duplicates.

---

## Security

- Supabase Row Level Security (RLS) on all tables — `anon` can only INSERT submissions; SELECT/UPDATE/DELETE are restricted to authenticated admins
- DELETE policies (migrations 2 & 4) scope record removal to authenticated admins; resident/request deletes also clean up Cloudinary files
- Admin routes protected by `middleware.ts`
- Residents can submit requests and track via control number only
- File uploads require an authenticated admin session

---

*Brgy. Bakakeng · Baguio City, Benguet · Cordillera Administrative Region*

# Account
``Email: admin@bakakeng.com ``
``password: admin@bakakeng.com``