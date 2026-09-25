# Functional Websites — Quotes & Invoices

Open `index.html` in Chrome, Edge, or Safari. No installation, account, build step, server, or internet connection is needed to prepare documents. Keep `index.html`, `app.css`, `app.js`, and the `assets` folder together. The logo and JetBrains Mono fonts are bundled for offline use. A copy of this folder can live anywhere on your computer.

## Daily use

1. Choose **New document** to start a quote or invoice.
2. Fill in customer details, line items, quantities, prices, dates, and terms. Business details are editable at the bottom and are reused for new documents.
3. Set discount and tax percentages if needed. Tax is calculated after discount. Enter received payments manually in **Already paid**.
4. Choose **Save PDF**, then the browser's **Save as PDF** destination. Disable browser headers and footers. The document contains clickable payment links. Review the saved PDF before sending.
5. Use **Convert to invoice** to preserve a quote and create a separate invoice. Adjust invoice terms as needed. Converting or duplicating resets received payments.

Documents autosave in this browser on this device. Local file storage behavior depends on the browser. Keep using the same file location and browser; moving the folder, clearing browser data, or using private browsing can remove access to drafts. **Export backup** regularly. Import merges copies and keeps existing documents. A JSON backup contains customer details; store it privately. Backups are editable records, not PDFs.

If preferred, serve this folder on a stable local address:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory tools/invoice
```

Then open http://127.0.0.1:8765 in your browser. Data stored under file:// and localhost is separate; transfer it with backup export/import.

## Stripe and payment links

The default destination is `https://functionalwebsites.com/pay/`. The generator adds the USD balance as `amount` and the document number/project as `for`, matching the existing payment page's query parameters. It does not put customer email or address in the URL. That page calls the website's existing `/webhook/stripe/create-payment-session` endpoint to create Stripe checkout. This needs a functioning deployed endpoint and Stripe configuration; the local generator does not need or store a Stripe key.

Alternatively, paste an existing public HTTPS Stripe Payment Link or hosted invoice URL into **My Stripe / payment link**. You must ensure the link's amount and currency match the document. The app cannot modify Stripe prices, lock the amount on the public payment page, reconcile payments, send invoices, or verify payment status. No payment is automatically initiated. Quotes explicitly say approval is required before payment.

The existing website payment page accepts USD payments from $1 to $50,000. Other currencies require a matching custom payment link or no link. Amounts use two decimal places; line amounts, percentage discounts, and taxes are rounded to cents in order. This is a document preparation tool; tax rates and payment records are supplied by you.

The app makes no network requests and needs no password. Local storage is not encrypted; use your computer account's protections. Publishing these static files does not publish your browser's saved customer data.
