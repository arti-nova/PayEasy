const express = require("express");
const { paypalRequest } = require("../paypal");
const Invoice = require("../models/Invoice");

const router = express.Router();

async function isValidWebhook(req) {
  const h = req.headers;
  const result = await paypalRequest("post", "/v1/notifications/verify-webhook-signature", {
    auth_algo: h["paypal-auth-algo"],
    cert_url: h["paypal-cert-url"],
    transmission_id: h["paypal-transmission-id"],
    transmission_sig: h["paypal-transmission-sig"],
    transmission_time: h["paypal-transmission-time"],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: req.body,
  });
  return result.verification_status === "SUCCESS";
}

const STATUS_BY_EVENT = {
  "INVOICING.INVOICE.PAID": "PAID",
  "INVOICING.INVOICE.CANCELLED": "CANCELLED",
  "INVOICING.INVOICE.REFUNDED": "REFUNDED",
};


router.post("/paypal", async (req, res) => {
  console.log("Webhook hit:", req.body?.event_type);
  try {
    if (!(await isValidWebhook(req))) {
      console.warn("Webhook rejected: signature check failed");
      return res.sendStatus(401);
    }

    const event = req.body;
    console.log("Webhook received:", event.event_type);

    const newStatus = STATUS_BY_EVENT[event.event_type];
    const invoiceId = event.resource?.invoice?.id || event.resource?.id;

    if (newStatus && invoiceId) {
      const invoice = await Invoice.findOne({ paypalInvoiceId: invoiceId });
      if (invoice && !invoice.processedEvents.includes(event.id)) {
        invoice.status = newStatus;
        if (newStatus === "PAID") invoice.paidAt = new Date();
        invoice.processedEvents.push(event.id);
        await invoice.save();
        console.log(`Invoice ${invoiceId} -> ${newStatus}`);
      }
    }

    res.sendStatus(200); // always answer 200 quickly or PayPal retries
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;