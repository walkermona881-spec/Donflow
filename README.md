# State Coin Payments

A modern, responsive payment checkout and merchant dashboard built with Vite, vanilla JavaScript, and a small Node.js API.

## Run

```bash
npm install
npm run build
PORT=3000 node server.mjs
```

The production build is written to `dist/`. The API and static server both run from `server.mjs`.

## Routes

- `/` — shareable checkout page. Optional query parameters: `invoice`, `amount`, `description`.
- `/success?id=...` — payment confirmation and receipt.
- `/dashboard` — merchant payment dashboard with search, filters, CSV export, and transaction details.

Example payment link:

```text
https://your-domain.example/?invoice=INV-2048&amount=249.00
```

## Sandbox

Use the test card `4242 4242 4242 4242`, any future expiry date, and any 3-digit security code. The checkout is a sandbox demonstration and must never be used with real card details.

## Email notifications

Set these environment variables (or create a `.env` file from `.env.example`):

```bash
MERCHANT_EMAIL=you@example.com
RESEND_API_KEY=re_...
EMAIL_FROM=State Coin <payments@your-verified-domain.com>
APP_URL=https://your-domain.example
```

When `RESEND_API_KEY` is configured, every successful payment sends a merchant notification through Resend. Without a key, notifications are recorded in sandbox mode and shown in the dashboard.

## Security boundary

This project deliberately does **not** accept, store, log, or email full card numbers, CVVs, PINs, or other card authentication data. The API rejects requests containing those fields. Only the card brand, expiry, cardholder name, and last four digits are retained so a payment can be recognised in the dashboard.

Before accepting live payments, replace the sandbox card form with a PCI-compliant provider such as Stripe Elements, Adyen Components, or Braintree Hosted Fields. The provider tokenizes the card inside its own iframe; your server should receive only the token and non-sensitive metadata. Add authenticated dashboard access, encrypted persistent storage, webhook signature verification, and provider-side fraud controls before launch.

## Scripts

- `start.sh` installs dependencies when needed, builds the app, writes worker metadata, and serves it in the foreground on `PORT` (default `3000`).
- `capture.sh` captures `final-desktop.png` and `final-mobile.png` into `CAPTURE_DIR` from `CAPTURE_URL`.
- `startup.sh` is reserved for once-per-worker prerequisites.

## OMGithub

Remixed using [OMGithub.com](https://omgithub.com).

- [Open the project](https://omgithub.com/walkermona881-spec/Donflow)
- [Remix this project](https://omgithub.com/?remix=walkermona881-spec%2FDonflow)
- [Explore the source](https://github.com/walkermona881-spec/Donflow)
