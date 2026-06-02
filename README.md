# La Paleta Admin App

This app now uses Supabase for authentication and data storage.

## Local setup

1. Clone the repository.
2. Navigate to the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local` and set your Supabase environment variables:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_LOGIN_URL=/login
   ```

5. Run locally:

   ```bash
   npm run dev
   ```

## Preview

- Local preview: open the URL shown by `npm run dev`.
- Netlify preview: connect this GitHub repository to Netlify, enable deploy previews for pull requests, and set the same Supabase env vars in the Netlify site settings.

## Netlify deployment

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_LOGIN_URL`

## Notes

- Legacy Base44 integration has been removed.
- If you want to recreate the Supabase schema, use the existing app data models and tables from the current React app.
