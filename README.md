# YolkPay Website

Static, responsive multi-page marketing website for YolkPay Inc.

## Pages

- Home
- Products
- Pricing
- Merchant application
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

## Forms

The contact form posts to the site's own `/api/contact` Worker endpoint. Cloudflare Email Service sends every inquiry to `info@yolkpay.com`; the visitor's address is used only as Reply-To.
