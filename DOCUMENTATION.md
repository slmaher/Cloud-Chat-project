# Project Documentation

## App Flow

1. **User Signup**: User registers with email, password, and selects an organization.
2. **Email Confirmation**: User confirms their email via a link sent by Supabase Auth.
3. **User Creation**: On first login, the app ensures a row exists for the user in the `User` table, associated with the selected organization.
4. **Login**: User logs in and is redirected to the chat page.
5. **Chat**: User can send and view messages. Only messages from their organization are visible, enforced by RLS policies.
6. **AI Response (Stub)**: When a user sends a message, the UI displays an AI response in the format: `AI response to: [user's message]`. This is a static, stubbed response and does not call any external API. See below for details.

---

## How to Run This Project

### 1. Prerequisites
- Node.js (v18+ recommended)
- Supabase account and project

### 2. Clone the Repository
```bash
# Clone your repo and enter the directory
# git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 3. Configure Environment Variables
Create a `.env` file in the project root with:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=your-supabase-database-url
```
> **NOTE:** choose the Session pooler when you connect Data base
- Get these values from your Supabase project settings.

### 4. Install Dependencies
```bash
npm install
```

### 5. Set Up the Database
```bash
npx prisma migrate dev
npx prisma db seed
```

### 6. Start the Development Server
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

#### 6.1. Enable RLS and Policies
Enable Row Level Security (RLS) on all tables and add these policies for the `Message` table:

```sql
-- Enable RLS
alter table "Message" enable row level security;

-- Allow users to read messages only for their own organization
create policy "Read messages for own org"
on "Message"
for select
using (
  exists (
    select 1 from "User"
    where "User".id::text = auth.uid()::text
    and "User"."organizationId"::text = "Message"."organizationId"::text
  )
);

-- Allow users to insert messages only for their own organization
create policy "Insert messages for own org"
on "Message"
for insert
with check (
  exists (
    select 1 from "User"
    where "User".id::text = auth.uid()::text
    and "User"."organizationId"::text = "Message"."organizationId"::text
  )
);
```

---

## 7. Environment Variables

Create a `.env` file in the project root. Example:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=your-supabase-database-url
```

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are from your Supabase project settings.
- `DATABASE_URL` is found in your Supabase project > Database > Connection string.

---

## 8. Directory Structure & Task Breakdown

- `src/app/` — Next.js app directory (App Router)
  - `login/` — Login page (email/password or magic link)
  - `signup/` — Signup page (registers user and assigns to org)
  - `chat/` — Chat UI (shows org messages, sends via API route)
  - `api/relay/` — API endpoint for posting messages
    - `route.ts` — **Edge Function** that:
      - Authenticates the user using Supabase JWT
      - Inserts the user message
      - (Stub) Inserts a fake "AI bot" response after the user’s message
- `src/lib/` — Supabase client setup for server and browser
- `prisma/` — Prisma schema for database models

### Task Breakdown
- **Authentication**: Handled in `signup/`, `login/`, and `auth/callback/` pages.
- **Organization Assignment**: User selects org at signup; stored in `User` table.
- **Chat**: Users can only see and send messages for their organization.
- **RLS**: Enforced in Supabase as described above.
- **AI Response**: Not implemented; stub in `api/relay/route.ts`.

---



## 9. Notes
- The AI response is a stub and does not call any external API. The message shown is always `AI response to: [user's message]`.
- All organization and message isolation is enforced at the database level via RLS.
- The structure is modular and each directory is documented above.