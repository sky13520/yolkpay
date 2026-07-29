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

The current static contact form still opens the visitor's email app. Production delivery must use the site's own Cloudflare email endpoint so customer form data is not disclosed to an unapproved third-party form service.
