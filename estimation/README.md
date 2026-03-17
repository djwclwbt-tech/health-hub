# Calorie Estimation System (Extracted)

This code was extracted from the main Health Hub app for independent development and testing.
It does not currently work and needs to be rebuilt before merging back.

## Contents

- `api/estimate.js` — Claude AI meal nutrition estimation endpoint
- `api/usda.js` — USDA food database lookup endpoint
- `frontend-snippets.js` — Extracted frontend code (state, functions, UI components)

## Features (when working)

- AI-powered meal estimation via Claude API (text + photo)
- Barcode scanning via html5-qrcode
- Food search (Open Food Facts + USDA dual-source)
- Quick meals library
- Frequent meals auto-matching
- Correction feedback loop for AI calibration
- Portion size adjustment (small/normal/large)

## Dependencies

- html5-qrcode@2.3.8 (barcode scanner)
- Open Food Facts API (product lookup)
- USDA FDC API (food search, requires USDA_API_KEY)
- Claude API (estimation, requires ANTHROPIC_API_KEY)
