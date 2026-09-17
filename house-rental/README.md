# My House Rent Manager

Static tenant and monthly rent management app using Supabase for shared tenant and payment data.

## Configure Supabase

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase-schema.sql`.
3. Open **Project Settings → API**.
4. Copy the project URL and the public `anon` key into `config.js`.
5. Never use or publish a `service_role` key in this frontend.

The RLS policies in `supabase-schema.sql` allow public CRUD access because this simple app has no login system. Anyone who can access the app can read, add, edit, or delete records. Add Supabase Auth and user-based policies before using this for sensitive data.

**Export JSON** downloads the currently loaded records as a manual backup; database records are stored in Supabase, not localStorage.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server --directory house-rental 8002
```

Then open <http://localhost:8002>.

## Deploy with GitHub Pages

Create a GitHub repository and upload the contents of this `house-rental` folder to the repository root. `index.html`, `style.css`, `script.js`, `config.js`, `supabase-schema.sql`, and `vendor/supabase.js` must be included.

```bash
cd house-rental
git init -b main
git add .
git commit -m "Add house rent manager"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then click **Save**. After deployment, open the URL GitHub provides, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.