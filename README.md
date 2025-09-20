# RotaWave — Team Rota PWA

A mobile-first rota builder where managers post **open shifts** and staff **claim** them. View the final rota as a **Table** or **Gantt**, then export as **text** or **PDF/image** and share via **WhatsApp**.

## Features
- Local-only prototype (no server). Workspaces stored by code (e.g., `novare-team`).
- Roles: **Manager** can add shifts & team; **Staff** can claim shifts.
- **Views:** Table and Gantt (toggle) for the selected week. Swipe to change weeks.
- **Export:** One-tap text export (clipboard + WhatsApp deeplink) and PDF/image export (html2canvas + jsPDF).
- **Freemium gate:** Free up to 15 staff. Paywall modal wired for PayPal; add your client & plan IDs.
- **PWA:** Offline cached, installable.

## Deploy (GitHub Pages)
1. Create a new **public repo** (e.g., `rotawave`).
2. Upload all files from this folder to the repo root.
3. In GitHub > Settings > Pages: set Source to **Deploy from branch**, branch **main**, folder **/**.
4. Wait for Pages to publish. Visit your site URL.
5. (Optional) Add a custom domain; keep HTTPS forced.

## Configure PayPal (when ready)
- Replace `YOUR_PAYPAL_CLIENT_ID` in `index.html` script URL.
- Replace `YOUR_PAYPAL_PLAN_ID` in `app.js` inside the PayPal Buttons block.
- In live mode, the subscription modal enables **Pro** and removes the 15-staff cap.

## Notes / Roadmap
- This prototype is **single-device** per workspace. For real teams across devices, add a backend (Supabase or Firebase) to sync: staff list, open shifts, and assignments.
- Add sign-in by magic link or social (Supabase Auth) and per-staff URL (`?staff=...`) for read-only personal view.
- Add CSV import/export for staff and shifts.
- Add roles/permissions and audit logs.
- Add multi-location and rota templates.

## Privacy
No tracking or analytics in this demo. Data lives in the browser `localStorage`.
