# Agent Reference & Database Connection Protocol

This repository is configured with full direct PostgreSQL pooler access to Supabase for autonomous schema migrations, administrative database writes, and row-level queries.

---

## Direct Database Connection Protocol

When performing database setup, schema modifications, or direct table operations, use the direct PostgreSQL connection parameters stored in `.env.local` or the `getPgClient()` utility in `lib/supabase-admin.ts`.

### Connection Parameters:
All connection details are read from environment variables — never hardcode
host, project ref, user, or password in the repo. See `.env.example`.

- **Host**: `process.env.SUPABASE_DB_HOST`
- **Port**: `process.env.SUPABASE_DB_PORT`
- **Database**: `process.env.SUPABASE_DB_NAME`
- **User**: `process.env.SUPABASE_DB_USER`
- **Password**: `process.env.SUPABASE_PASSWORD`
- **Direct Connection URL**: `process.env.SUPABASE_DIRECT_URL`

---

## Code Utilities to Access Supabase & Postgres

### 1. Direct PostgreSQL Client (for DDL / Migrations / Admin SQL)
```typescript
import { getPgClient } from '@/lib/supabase-admin';

const client = getPgClient();
await client.connect();
const res = await client.query('SELECT * FROM protocols');
await client.end();
```

### 2. Supabase Admin JS Client (for Service Role Operations)
```typescript
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const supabaseAdmin = getSupabaseAdmin();
const { data, error } = await supabaseAdmin.from('protocols').select('*');
```

### 3. Server Component Client (for App Router Requests)
```typescript
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const supabase = createClient(cookieStore);
```

### 4. Migration Execution Script
```bash
node scripts/migrate.js
```
*(Executes `sql/schema.sql` and `sql/rls-policies.sql` against PostgreSQL).*
