const express = require("express");
const { paypalRequest } = require("../paypal");

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