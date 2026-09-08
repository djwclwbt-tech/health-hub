# Local Setup

This Raspberry Pi is configured to edit and deploy Health Hub.

## Repo

- Path: `/home/dwrzl/health-hub`
- GitHub: `https://github.com/djwclwbt-tech/health-hub.git`
- Default branch: `main`
- Git identity in this repo: `Dylan <dylanwurzel@yahoo.com>`

## Auth / Deploy

- GitHub CLI authenticated as `djwclwbt-tech`
- Vercel CLI authenticated as `djwclwbt-tech`
- Vercel project linked: `health-hub`
- Live app: `https://health-hub-topaz-sigma.vercel.app`

Vercel secrets stay in Vercel. Local `.env.local` and `.vercel/` are ignored by git.

## Normal Workflow

```bash
cd ~/health-hub
git pull
npm install          # first time, or when package.json changed
# edit src/app.jsx (UI) or index.html (shell/CSS) or api/*.js
npm run check        # rebuilds app.js and syntax-checks the API
git add src/app.jsx app.js <other files>
git commit -m "Describe change"
git push
```

`app.js` is generated from `src/app.jsx`; commit both. CI rebuilds it on `claude/**` pushes if you forget.

Vercel auto-deploys pushes to `main`.

Use `vercel --prod` only when a manual production deploy is needed.

## Verification Commands

```bash
git status --short --branch
gh auth status
vercel whoami
cat .vercel/project.json
```
