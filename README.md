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

The contact form submits over HTTPS through FormSubmit and sends every inquiry to `info@yolkpay.com`. The endpoint is fixed in both the form fallback action and the JavaScript AJAX handler.
