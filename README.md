# PayEasy

**Create, track and chase invoices, and see your cash coming in.**
Built for the *Build What's Next with PayPal and AI* hackathon.

- **Live demo:** `<YOUR-RENDER-URL>`
- **Demo video:** `<YOUR-YOUTUBE-LINK>`
- **License:** MIT

> The first request to the live demo can take up to a minute because the free hosting tier sleeps when idle.

---

## The problem

Freelancers and small businesses do the work first and get paid later, and "later" is unpredictable. Three manual chores make it worse:

1. **Invoicing overhead.** Writing invoices, tracking who has paid, and matching payments to orders.
2. **Chasing late payments.** Noticing an invoice is overdue, deciding what to say, and following up awkwardly.
3. **Cash flow blindness.** Not knowing what money is coming in, when, or what is at risk.

These are one problem: payment is treated as something that happens *to* you instead of something you can manage. PayLoop connects the three into one loop: **create, track, chase, forecast**.

## What it does

| Step | What happens |
|---|---|
| **Create** | Type a sentence like "Invoice Acme (billing@acme.com) 250 USD for logo design, due in 2 weeks". AI turns it into a structured draft, you review and edit it, then confirm. PayPal creates and sends the invoice. |
| **Track** | PayPal webhooks notify the server when an invoice is paid, cancelled or refunded. The dashboard updates automatically with no manual reconciliation. |
| **Chase** | Unpaid invoices past their due date appear in an Overdue tab. AI drafts a follow-up whose tone (friendly, firm or final) depends on how late the invoice is and how many reminders were already sent. You edit and approve it, then it is sent through PayPal's invoice reminder API. |
| **Forecast** | The app learns each client's payment behaviour from their paid invoices, predicts when open invoices will be paid, and flags risky ones. AI explains the result in plain language. |

## How PayPal is used

PayPal is central to every step. All calls use the **PayPal sandbox**.

- **OAuth 2.0** client credentials for API access (token cached until expiry).
- **Invoicing API v2:** generate the next invoice number, create an invoice, send it, fetch its status, and send reminders.
- **Webhooks:** the server receives invoice events (sent, created, paid, cancelled, refunded). Every event is **verified with PayPal's webhook signature verification API** before it is trusted, and each event ID is stored so duplicate deliveries are not processed twice.

## How AI is used

**Model:** Google Gemini (`gemini-2.5-flash-lite` by default, configurable with `GEMINI_MODEL`), called from the backend through the Gemini REST API.

| Feature | What the AI does |
|---|---|
| Invoice drafting | Extracts client, email, description, amount, currency and due date from plain language into strict JSON. |
| Follow-up writing | Writes a reminder in the right tone using only the facts of the invoice. |
| Forecast explanation | Turns computed numbers into a short summary and up to three suggested actions. |

**Design principles:**

- The AI never moves money on its own. Every invoice and reminder is shown as an editable preview and needs a human click to send.
- Model output is treated as untrusted. The server validates every field, rejects unsupported currencies, and reports missing fields instead of guessing.
- The forecast numbers are computed in plain code from payment history. The AI only *explains* them and is told not to invent figures.

## Architecture

```
React dashboard (Vite)
        |  /api
        v
Express backend ----> PayPal Invoicing API (sandbox)
   |    |  ^                     |
   |    |  +---- webhooks -------+   (signature verified)
   |    +--------> Google Gemini API
   v
MongoDB Atlas
```

In production the Express server also serves the built React app, so there is a single deployment.

## Tech stack

React (Vite), Node.js, Express, MongoDB (Mongoose), PayPal REST APIs and Webhooks, Google Gemini API, hosted on Render.

## Run it locally

**Prerequisites:** Node.js 20 or newer, a free MongoDB Atlas cluster, a PayPal Developer account (sandbox), and a Google AI Studio API key.

```bash
git clone https://github.com/arti-nova/PayEasy.git
cd PayEasy

# backend
cd backend
npm install
cp .env.example .env     # on Windows: copy .env.example .env
# fill in the values (see the table below)
npm run dev              # http://localhost:5000

# frontend, in a second terminal
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api to the backend)
```

To receive PayPal webhooks locally, expose the backend with a tunnel such as ngrok (`ngrok http 5000`), register `https://<tunnel-address>/api/webhooks/paypal` as a webhook on your PayPal sandbox app (invoice events), and put that webhook's ID in `PAYPAL_WEBHOOK_ID`.

**Production-style run** (what the hosted version does):

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && node server.js   # serves API and built frontend on one port
```

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Sandbox app credentials |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_BUSINESS_EMAIL` | Email of the sandbox **business** account (the invoice sender) |
| `PAYPAL_WEBHOOK_ID` | ID of the registered webhook (letters and numbers only) |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Model name, e.g. `gemini-2.5-flash-lite` |
| `BUSINESS_NAME` | Optional name shown on invoices |
| `DEMO_MODE` | `true` enables the demo helper endpoints below |

## Try it as a judge

1. Open the live demo. You need a **PayPal sandbox personal account** to play the client. Use your own, or the shared one: `<SANDBOX-CLIENT-EMAIL>` / `<SANDBOX-CLIENT-PASSWORD>` (sandbox only, no real money).
   Note: sandbox invoices cannot be sent between two India-based accounts, so the client account should be created in another country, such as the United States.
2. In **New invoice**, type a sentence and use the client's sandbox email. Click **Draft with AI**, review the preview, and click **Confirm and send via PayPal**.
3. Click **Open payment page**, log in as the sandbox client, and pay. Back on the dashboard, the invoice flips to **PAID** within about 10 seconds with no refresh.
4. Create a second invoice and leave it unpaid. To see the overdue flow without waiting, send `POST /api/invoices/<invoiceId>/demo-backdate` with `{ "days": 10 }` (the `invoiceId` comes from `GET /api/invoices`). It then appears under **Overdue**, where you can draft and send a follow-up.
5. For the forecast, send `POST /api/forecast/demo-seed` to load sample payment history, then open the **Forecast** tab and click **Explain with AI**.

## Demo helpers

Real invoices only become overdue with time, and a new account has no payment history, so with `DEMO_MODE=true` two helpers exist:

- `POST /api/invoices/:id/demo-backdate` moves one invoice's due date into the past, **in this app's database only**.
- `POST /api/forecast/demo-seed` adds fake paid and open invoices (tagged `demo` in the UI). `DELETE /api/forecast/demo-seed` removes them. Demo invoices have no real PayPal invoice behind them, so reminders cannot be sent for them.

Real paid invoices flow into the same forecast calculation automatically through the webhook.

## API overview

| Method and path | Purpose |
|---|---|
| `POST /api/invoices/draft` | AI draft from plain text (preview only) |
| `POST /api/invoices` | Create and send an invoice through PayPal |
| `GET /api/invoices` | List stored invoices |
| `GET /api/invoices/overdue` | Unpaid invoices past their due date |
| `GET /api/invoices/:id` | Live status from PayPal |
| `POST /api/invoices/:id/followup` | AI follow-up draft (preview only) |
| `POST /api/invoices/:id/remind` | Send the approved reminder through PayPal |
| `GET /api/forecast` | Forecast plus AI explanation (`?explain=false` skips the AI) |
| `POST /api/webhooks/paypal` | PayPal webhook receiver (signature verified) |

## Known limitations

- **Sandbox only.** No real money moves.
- **No user accounts yet.** The demo acts as a single sandbox business. A production version would add login and per-user data.
- **Forecast quality depends on history.** With few paid invoices, predictions are marked low confidence.
- **Currencies:** invoices support USD, EUR, GBP, CAD and AUD.
- **Free hosting sleeps** when idle, so the first request can be slow.

## License

MIT. See [LICENSE](LICENSE).
