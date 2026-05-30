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
- Upload processed documents via Cloudinary
- Residents directory
- Internal admin notes per request
- Request timeline
- Admin profile settings

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Run the Database Migration

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → **SQL Editor**
3. Paste and run: `supabase/migrations/20240101000000_initial.sql`

This creates all tables, enums, RLS policies, indexes, and the auto-incrementing control number trigger.

### 4. Create Your Admin Account

1. Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Enter email + password (use: `biyjSTAVzwfsBIha` or your preferred password)
3. After first login, go to `/admin/settings` to set your name and role

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
│       ├── requests/route.ts       # GET list + POST new request
│       ├── requests/[id]/route.ts  # GET one + PATCH update status
│       ├── upload/route.ts         # Cloudinary upload endpoint
│       └── auth/callback/route.ts  # Supabase auth callback
├── components/
│   ├── admin-sidebar.tsx           # Collapsible sidebar with nav
│   ├── toaster.tsx
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase/client.ts          # Browser Supabase client
│   ├── supabase/server.ts          # Server Supabase client
│   ├── cloudinary.ts               # Cloudinary upload utility
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

---

## Security

- Supabase Row Level Security (RLS) on all tables
- Admin routes protected by `middleware.ts`
- Residents can submit requests and track via control number only
- File uploads require an authenticated admin session

---

*Brgy. Bakakeng · Baguio City, Benguet · Cordillera Administrative Region*

# Account
``Email: admin@bakakeng.com ``
``password: admin@bakakeng.com``