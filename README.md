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

The initial static release opens a pre-filled message in the visitor's email app and sends it to `hello@yolkpay.com`. Replace this with a secure form endpoint or Cloudflare Pages Function before using forms for production lead capture.
