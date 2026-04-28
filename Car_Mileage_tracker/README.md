# MileageLog – Car Fuel Tracker PWA

## Files
- `index.html` — Main app
- `manifest.json` — PWA manifest (enables "Add to Home Screen")
- `sw.js` — Service worker (offline support)
- `icon-192.png` / `icon-512.png` — App icons

## How to host on GitHub Pages (free)

1. Push all 5 files into a GitHub repo (e.g. `mileagelog`)
2. Go to **Settings → Pages → Source → main branch / root**
3. GitHub gives you a URL like: `https://yourusername.github.io/mileagelog/`

## Install on Android (no Play Store needed)

1. Open Chrome on your Android phone
2. Go to your GitHub Pages URL
3. Tap the **three-dot menu (⋮)** in Chrome
4. Tap **"Add to Home screen"** or **"Install app"**
5. Confirm — app icon appears on your home screen!

The app runs **fully offline** after first load and stores all data in Chrome's localStorage on your phone.

## Features
- Add unlimited fuel entries
- Auto-calculates: Kms Traveled, Mileage (Kmpl), Expense per Km (₹/Km)
- Partial entries supported — shows `—` for uncalculatable fields
- Running totals + average mileage in footer
- Stats bar: total fills, total kms, avg mileage, total spend, total litres
- Data persists across sessions (localStorage)
- Works offline (service worker)
