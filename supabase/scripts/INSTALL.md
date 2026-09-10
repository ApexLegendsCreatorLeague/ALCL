# Install ALCL database (one command - recommended)

The SQL files are valid. Splitting was only needed because **Supabase SQL Editor
truncates large pastes**. Avoid pasting entirely:

```powershell
cd C:\Users\reall\OneDrive\Desktop\ALCL
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

That applies all three migrations in order - no copy/paste, no splits.

Get `YOUR_PROJECT_REF` from Supabase Dashboard → Project Settings → General.

## Reset first

Run `00-teardown.sql` in SQL Editor once (no RLS / run as postgres), then:

```powershell
npx supabase db push
```

If teardown errors on storage deletes, use the updated `00-teardown.sql` (no
storage deletes, no BEGIN/COMMIT).

## SQL Editor fallback (single file)

If you cannot use the CLI, use **`production-install.sql`** (~1800 lines).
Paste the **entire** file. If you see `syntax error at end of input`, the editor
cut your paste - use `db push` instead.

Do **not** run `seed.sql` on production.
