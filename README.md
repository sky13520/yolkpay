# YolkPay Website

Responsive multi-page website and Cloudflare Worker application for YolkPay Inc.

## Pages

- Home
- Products
- Pricing
- Secure multi-step merchant application
- Protected merchant application admin
- About
- Contact
- Privacy Policy
- Terms of Use

## Local preview

Open `index.html` directly, or serve the folder with any static server:

```bash
npx serve .
```

## Cloudflare Pages

This project requires no build step.

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

Connect the GitHub repository to Cloudflare Pages and deploy the `main` branch.

## Forms and application storage

The contact form posts to the site's own `/api/contact` Worker endpoint. Cloudflare Email Service sends every inquiry to `info@yolkpay.com`; the visitor's address is used only as Reply-To.

Merchant applications post to `/api/registration`. Application fields and private document chunks are stored in a SQLite-backed Durable Object. The admin at `/admin.html` uses a one-time code sent only to `info@yolkpay.com`; sessions use secure, HttpOnly cookies. Registration notifications are also sent to `info@yolkpay.com`, with the applicant's address as Reply-To.

The registration flow intentionally does not collect a merchant portal password. Account credentials must be created through a separate activation process after approval.
