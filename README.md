# Snake Arcade

A responsive, high-performance 2D Snake game for desktop, Android, iPhone, and tablets.

## Run locally

Open `index.html` directly in a browser, or serve this folder:

```bash
python3 -m http.server --directory snake 8000
```

Then open <http://localhost:8000>.

Controls:

- Desktop: Arrow keys or WASD. Press Space to pause.
- Mobile/tablet: Tap the direction buttons or swipe on the game board.

## Publish with GitHub Pages

The contents of this `snake` folder are the deployable site. Create a GitHub repository and upload the contents of `snake` to the repository root, so `index.html` is at the top level.

Using Git:

```bash
cd snake
git init
git add .
git commit -m "Create responsive 3D Snake game"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Then on GitHub:

1. Open the repository's **Settings**.
2. Select **Pages** in the left sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then click **Save**.
5. Wait for the deployment. GitHub will show the public URL, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Open that URL from any desktop browser, Android phone, iPhone, iPad, or tablet. The game uses relative asset paths, so it also works when the repository name appears in the URL.

The game uses only native HTML, CSS, and JavaScript, so it has no backend or runtime dependency.