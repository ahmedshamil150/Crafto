# Order Confirmation Email Setup

When deploying to your real domain, configure branded order confirmation emails via Resend.

## 1. Sign up for Resend

Go to https://resend.com and create a free account (100 emails/day).

## 2. Verify a domain

Add and verify a domain in Resend (e.g., `crafto.pk` or your own domain).
This lets you send emails from `orders@yourdomain.com`.

## 3. Create an API key

Generate a Resend API key (starts with `re_...`).

## 4. Set Vercel environment variables

In your Vercel project dashboard → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | `re_...` (from step 3) |
| `EMAIL_FROM` | `Crafto <orders@yourdomain.com>` (domain must match step 2) |

## How it works

- `api/send-order-email.js` is a Vercel serverless function
- When a customer places an order, `checkout.js` calls `/api/send-order-email`
- The function sends a branded HTML email via Resend with:
  - Crafto branding (green header, logo)
  - Order ID
  - Item list with prices
  - Total amount
  - **Track Your Order** button linking to your order-status page
  - "We will confirm your order and let you know in a while" message

## Testing

After setting the env vars, place a test order to verify the email arrives.
Check spam folder if it doesn't appear in the inbox.
