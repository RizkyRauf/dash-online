# Media Configs Dashboard

A web dashboard for managing media configurations stored in Supabase, with full CRUD operations, authentication, and user-friendly JSON field editing.

## Features

- 🔐 **Authentication** - Supabase Auth (email/password) with protected routes
- 📊 **Dashboard** - Table view with search, filter, sort, and pagination
- ✏️ **Create/Edit Forms** - User-friendly form builder for JSONB fields (no raw JSON textareas)
- 🗑️ **Delete** - Confirmation modal before deletion
- 📤 **CSV Export** - Export filtered data to CSV files
- 📱 **Responsive** - Works on mobile and desktop
- 🔔 **Notifications** - Toast notifications for all actions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router v7 |
| Data Fetching | TanStack React Query |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |

## Project Structure

```
src/
├── components/
│   ├── ui/               # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   └── forms/
│       └── JsonFieldBuilder.tsx  # User-friendly JSON field editor
├── contexts/
│   └── AuthContext.tsx   # Authentication state management
├── pages/
│   ├── LoginPage.tsx     # Login screen
│   ├── DashboardPage.tsx # Main list view with CRUD
│   └── MediaConfigFormPage.tsx  # Create/Edit form
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── utils.ts          # Utility functions
│   └── export.ts         # CSV export logic
└── types/
    └── database.ts       # TypeScript type definitions
```

## Getting Started

### 1. Install Dependencies

```bash
cd media-dashboard
npm install
```

### 2. Configure Environment Variables

The `.env` file is already configured with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://qtjvyljojwvabdjapwfx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Supabase Auth

Before logging in, you need to create a user in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **Add User** and create an email/password user
4. Or use the Supabase Auth UI at `https://your-project.supabase.co/auth/v1/authorize`

### 4. Create the Database Table

Run this SQL in your Supabase SQL Editor:

```sql
create table public.media_configs (
  id bigint generated always as identity,
  page integer not null,
  media_id varchar(50) unique not null,
  media_name varchar(255) not null,
  config jsonb not null default '{}'::jsonb,
  index_content_link jsonb,
  index_pagination jsonb,
  content_title jsonb,
  content_text jsonb,
  content_summary jsonb,
  content_topic jsonb,
  content_journalist jsonb,
  content_editor jsonb,
  content_published jsonb,
  content_image_url jsonb,
  content_image_caption jsonb,
  content_video_url jsonb,
  content_url jsonb,
  paginated_links jsonb,
  content_pagination jsonb,
  is_active boolean default true,
  is_premium boolean default false,
  use_cache boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.media_configs enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users have full access"
  on public.media_configs
  for all
  to authenticated
  using (true)
  with check (true);
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder.

## JSON Field Builder

The dashboard uses a **form-based approach** for JSONB fields instead of raw textareas:

### Selector Template
Used for content fields (title, text, summary, etc.)
- CSS Selector input
- Attribute dropdown (text, href, src, etc.)
- Required checkbox
- Fallback value

### Config Template
Used for the main config field
- Type selector (static/dynamic)
- Wait time input
- Headers builder (key-value pairs)

### Key-Value Template
Generic key-value pair builder for any JSON object

### Link Template
For extracting links from pages
- Container selector
- Link selector
- Base URL

### Pagination Template
For pagination configuration
- Type (next button, page numbers, etc.)
- Selector
- Max pages

## Usage

1. **Login** with your Supabase credentials
2. **View** all media configs in a sortable, filterable table
3. **Search** by media name or ID
4. **Filter** by active/inactive status
5. **Create** new configs with the "+ Add New" button
6. **Edit** existing configs by clicking the Edit button
7. **Delete** configs with confirmation modal
8. **Export** filtered data to CSV

## Screenshots

### Dashboard
- Sortable columns (click headers to sort)
- Status badges (Active, Premium, Cache)
- Pagination controls
- Search and filter bar

### Form
- Collapsible sections for organized editing
- Toggle switches for boolean fields
- Structured JSON field builders
- Form validation with error messages
