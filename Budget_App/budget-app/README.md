# RupeeTrack – Smart Budget Manager 💰

A full-featured personal budget monitoring PWA (Progressive Web App) for Android, built with HTML/CSS/JS. No server needed. Installable directly from GitHub Pages.

---

## ✨ Features

- **Income & Expense Tracking** – Log every transaction with categories, accounts, and notes
- **Multiple Accounts** – Cash, Bank, Credit/Debit Card, Wallet
- **Budget Limits** – Set monthly limits per category with visual progress bars
- **Budget Alerts** – In-app alerts + push notifications when budgets hit 80% / 100%
- **Recurring Transactions** – Auto-generate daily/weekly/monthly/yearly entries
- **Reports & Charts** – Monthly trends, category breakdown, 6-month bar charts, donut charts
- **Bank Statement Import** – Upload XLS/XLSX files and map columns manually
- **Smart Categorization Rules** – Define keyword-based rules to auto-categorize imported transactions
- **Export** – CSV and JSON export; Google Drive backup
- **PIN Lock** – 4-digit PIN security on app open
- **Dark/Light Theme** – Toggle with one tap
- **Custom Categories** – Add unlimited expense/income categories
- **Offline Support** – Works without internet after first load (Service Worker)
- **PWA Installable** – Add to Home Screen from Chrome on Android

---

## 🚀 Setup & Installation

### Option 1: GitHub Pages (Recommended)

1. **Fork or upload** this folder to a GitHub repository
2. Go to **Settings → Pages → Source → main branch / root**
3. GitHub will give you a URL like: `https://yourusername.github.io/rupeetrack/`
4. On your Android phone, open that URL in **Chrome**
5. Tap the **three-dot menu → "Add to Home screen"**
6. Done! App installs like a native app ✅

### Option 2: Local File (No internet needed after setup)

1. Download/clone this repo to your phone via **Files by Google** or **Cx File Explorer**
2. Open Chrome and type: `file:///sdcard/Download/rupeetrack/index.html`
3. Use the app (note: Service Worker won't work on file:// but app still functions)

### Option 3: Termux Local Server (Best offline experience)

```bash
# Install Termux from F-Droid
pkg install python
cd /sdcard/Download/rupeetrack
python -m http.server 8080
# Open Chrome: http://localhost:8080
# Add to Home Screen for full PWA install
```

---

## 📱 How to Reinstall (Phone Changed / Uninstalled)

Just open the GitHub Pages URL again in Chrome and tap "Add to Home Screen". Your data is stored in **Chrome's localStorage** on the device. To transfer data:

1. Go to **Reports → Export JSON** on old phone
2. On new phone, install the app
3. Go to **Settings → (future: Import JSON)** — for now, use browser console:
   ```js
   localStorage.setItem('rupeetrack_db', '<paste JSON here>');
   location.reload();
   ```

---

## 🏦 Bank Statement Import Guide

1. Download your bank statement as **XLS or XLSX** from your bank's net banking portal
2. In the app, go to **Transactions → Import Bank Statement**
3. Select the file
4. **Map the columns**: Match your file's column names to Date, Description, Amount (or Debit/Credit)
5. **Set categorization rules**: Enter keywords that appear in descriptions → assign category
   - Example: `swiggy` → Food & Dining
   - Example: `uber` → Transport
6. Tap **Import Transactions** → Preview → **Confirm Import**

Rules are saved and reused for future imports.

---

## 📁 File Structure

```
rupeetrack/
├── index.html          # Main app HTML
├── style.css           # All styles (dark/light themes)
├── app.js              # All app logic
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline)
├── generate_icons.py   # Icon generator script
├── icons/              # App icons (auto-generated)
│   ├── icon-72.png
│   ├── icon-192.png
│   └── ...
└── README.md           # This file
```

---

## 🛠 Tech Stack

- **HTML5 / CSS3 / Vanilla JS** – No framework, fast and lightweight
- **Chart.js** – Beautiful charts
- **SheetJS (xlsx.js)** – XLS/XLSX parsing
- **LocalStorage** – All data stored locally on device
- **Service Worker** – Offline functionality
- **Web App Manifest** – PWA install support

---

## 💾 Data Storage

All data is stored in your browser's **localStorage** under the key `rupeetrack_db`. This means:
- ✅ No server, no account needed
- ✅ Completely private
- ⚠️ Clearing Chrome's site data will erase app data — use **Export JSON** to back up regularly

---

## 🔒 Security

- 4-digit PIN lock option
- All data stays on device
- No tracking, no analytics, no external calls (except fonts/libraries from CDN on first load)

---

## 📊 Currency

Configured for **Indian Rupee (₹)** with `en-IN` locale formatting.

---

*Built as a PWA — works on Android Chrome, can be packaged into APK using Capacitor if needed.*
