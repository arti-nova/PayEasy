const Invoice = require("../models/Invoice");
const express = require("express");
const { paypalRequest } = require("../paypal");
const { draftInvoiceFromText, draftFollowUp } = require("../ai");
const router = express.Router();

// Create AND send an invoice
router.post("/", async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      description,
      amount,
      currency = "USD",
      dueInDays = 30,
      note = "Thank you for your business.",
    } = req.body;

    if (!clientName || !clientEmail || !description || !(Number(amount) > 0)) {
      return res.status(400).json({
        error: "clientName, clientEmail, description and a positive amount are required",
      });
    }

    // 1. Get the next invoice number from PayPal
    const next = await paypalRequest("post", "/v2/invoicing/generate-next-invoice-number");

    // 2. Build dates
    const today = new Date();
    const due = new Date(today.getTime() + Number(dueInDays) * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);

    // 3. Create a draft invoice
    const invoiceBody = {
      detail: {
        invoice_number: next.invoice_number,
        invoice_date: fmt(today),
        currency_code: currency,
        note,
        payment_term: {
          term_type: "DUE_ON_DATE_SPECIFIED",
          due_date: fmt(due),
        },
      },
      invoicer: {
        business_name: process.env.BUSINESS_NAME || "PayEasy Demo Business",
        email_address: process.env.PAYPAL_BUSINESS_EMAIL,
      },
      primary_recipients: [
        {
          billing_info: {
            business_name: clientName,
            email_address: clientEmail,
          },
        },
      ],
      items: [
        {
          name: description,
          quantity: "1",
          unit_amount: {
            currency_code: currency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
    };

    const created = await paypalRequest("post", "/v2/invoicing/invoices", invoiceBody);
    const invoiceId = created.href.split("/").pop();

    // 4. Send it
    const sent = await paypalRequest("post", `/v2/invoicing/invoices/${invoiceId}/send`, {
      send_to_invoicer: true,
      send_to_recipient: true,
      subject: `Invoice ${next.invoice_number}`,
      note,
    });
    await Invoice.create({
      paypalInvoiceId: invoiceId,
      invoiceNumber: next.invoice_number,
      clientName,
      clientEmail,
      description,
      amount: Number(amount),
      currency,
      dueDate: due,
      status: "SENT",
    });
    res.status(201).json({
      invoiceId,
      invoiceNumber: next.invoice_number,
      dueDate: fmt(due),
      payLink: sent.href || null,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message,
    });
  }
});
router.get("/", async (req, res) => {
  const invoices = await Invoice.find().sort({ createdAt: -1 });
  res.json(invoices);
});

// AI: turn plain text into a draft invoice (preview only, nothing is sent)
router.post("/draft", async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== "string" || !text.trim() || text.length > 1000) {
      return res.status(400).json({ error: "Provide a 'text' string up to 1000 characters." });
    }
    const result = await draftInvoiceFromText(text.trim());
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || err.response?.status || 500).json({
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

const UNPAID = ["SENT", "PARTIALLY_PAID"];
const daysOverdue = (inv) =>
  Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000));

// List unpaid invoices that are past due
router.get("/overdue", async (req, res) => {
  try {
    const list = await Invoice.find({
      status: { $in: UNPAID },
      dueDate: { $lt: new Date() },
    }).sort({ dueDate: 1 });
    res.json(list.map((i) => ({ ...i.toObject(), daysOverdue: daysOverdue(i) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: draft a follow-up (preview only, nothing is sent)
router.post("/:id/followup", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ paypalInvoiceId: req.params.id });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!UNPAID.includes(invoice.status)) {
      return res.status(400).json({ error: `Invoice is ${invoice.status}, no reminder needed.` });
    }
    const days = daysOverdue(invoice);
    if (days < 1) return res.status(400).json({ error: "Invoice is not overdue yet." });

    const draft = await draftFollowUp(invoice, days, req.body?.tone);
    res.json({ invoiceId: invoice.paypalInvoiceId, daysOverdue: days, ...draft });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || err.response?.status || 500).json({
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

// Send the approved reminder through PayPal and log it
router.post("/:id/remind", async (req, res) => {
  try {
    const { subject, message, tone } = req.body;
    if (typeof subject !== "string" || typeof message !== "string" || !subject.trim() || !message.trim()) {
      return res.status(400).json({ error: "subject and message are required" });
    }
    const invoice = await Invoice.findOne({ paypalInvoiceId: req.params.id });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!UNPAID.includes(invoice.status)) {
      return res.status(400).json({ error: `Invoice is ${invoice.status}, no reminder needed.` });
    }

    await paypalRequest("post", `/v2/invoicing/invoices/${invoice.paypalInvoiceId}/remind`, {
      subject: subject.trim().slice(0, 100),
      note: message.trim().slice(0, 800),
      send_to_invoicer: true,
    });

    invoice.reminders.push({ sentAt: new Date(), tone: tone || "custom", message: message.trim() });
    await invoice.save();
    res.json({ sent: true, remindersSent: invoice.reminders.length });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// DEMO ONLY: make an invoice look overdue so you can show the feature
router.post("/:id/demo-backdate", async (req, res) => {
  if (process.env.DEMO_MODE !== "true") {
    return res.status(403).json({ error: "Demo mode is off" });
  }
  const days = Math.min(Math.max(Number(req.body?.days) || 10, 1), 90);
  const invoice = await Invoice.findOne({ paypalInvoiceId: req.params.id });
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  invoice.dueDate = new Date(Date.now() - days * 86400000);
  await invoice.save();
  res.json({ dueDate: invoice.dueDate, daysOverdue: days });
});
// Check an invoice's current status
router.get("/:id", async (req, res) => {
  try {
    const invoice = await paypalRequest("get", `/v2/invoicing/invoices/${req.params.id}`);
    res.json({ id: invoice.id, status: invoice.status, amount: invoice.amount });
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;