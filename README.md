# Health Hub

Personal cut tracker: training, food, scale, recovery. Single-page PWA on Vercel with Supabase sync.

```bash
npm install        # once
npm run build      # src/app.jsx → app.js (minified)
npm run check      # build + syntax-check every api/*.js
npm run serve      # http://127.0.0.1:8080 (static shell; /api needs Vercel)
```

Edit `src/app.jsx` (React, JSX) and `index.html` (shell + CSS tokens). Commit `app.js` with your change; CI rebuilds it on every push to `claude/**` anyway. See `CLAUDE.md` for the architecture and rules.
