# My House Rent Manager

Simple static tenant and monthly rent management app. It uses browser `localStorage`, so no backend, database, login, or internet connection is required.

Use **Export JSON** to download a backup of the tenant records. Use **Import JSON** on another browser/device to restore that backup into its local storage.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server --directory house-rental 8002
```

Then open <http://localhost:8002>.

## Deploy with GitHub Pages

Create a GitHub repository and upload the contents of this `house-rental` folder to the repository root. `index.html`, `style.css`, and `script.js` must be at the top level.

```bash
cd house-rental
git init -b main
git add .
git commit -m "Add house rent manager"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then click **Save**. After deployment, open the URL GitHub provides, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.