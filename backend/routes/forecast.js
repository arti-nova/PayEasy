const express = require("express");
const Invoice = require("../models/Invoice");
const { computeForecast } = require("../forecast");
const { explainForecast } = require("../ai");

const router = express.Router();
const DAY = 86400000;

// Forecast + AI explanation. Add ?explain=false to skip the AI call.
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().lean();
    const forecast = computeForecast(invoices);

    let ai = null;
    if (req.query.explain !== "false" && forecast.openCount > 0) {
      try {
        ai = await explainForecast(forecast);
      } catch (err) {
        console.error("Forecast explanation failed:", err.response?.data || err.message);
      }
    }
    res.json({ ...forecast, ai });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEMO ONLY: create sample payment history and open invoices
router.post("/demo-seed", async (req, res) => {
  if (process.env.DEMO_MODE !== "true") {
    return res.status(403).json({ error: "Demo mode is off" });
  }
  try {
    await Invoice.deleteMany({ isDemo: true });
    const now = Date.now();
    let n = 0;
    const docs = [];

    const paid = (name, email, amount, dueDaysAgo, delay) => {
      const due = now - dueDaysAgo * DAY;
      docs.push({
        paypalInvoiceId: `DEMO-${++n}`, invoiceNumber: `DEMO-${n}`,
        clientName: name, clientEmail: email, description: "Demo invoice (paid)",
        amount, currency: "USD", dueDate: new Date(due),
        status: "PAID", paidAt: new Date(due + delay * DAY), isDemo: true,
      });
    };
    const open = (name, email, amount, dueInDays) => {
      docs.push({
        paypalInvoiceId: `DEMO-${++n}`, invoiceNumber: `DEMO-${n}`,
        clientName: name, clientEmail: email, description: "Demo invoice (open)",
        amount, currency: "USD", dueDate: new Date(now + dueInDays * DAY),
        status: "SENT", isDemo: true,
      });
    };

    // Northwind Design: reliable payer
    [[-1, 120], [0, 90], [1, 60], [0, 30]].forEach(([d, ago]) =>
      paid("Northwind Design", "northwind@example.com", 300, ago, d));
    // Slow Pay Studios: chronically late
    [[12, 150], [18, 110], [9, 70], [15, 35]].forEach(([d, ago]) =>
      paid("Slow Pay Studios", "slowpay@example.com", 500, ago, d));

    open("Northwind Design", "northwind@example.com", 400, 10);
    open("Northwind Design", "northwind@example.com", 250, 20);
    open("Slow Pay Studios", "slowpay@example.com", 1200, 5);
    open("Slow Pay Studios", "slowpay@example.com", 800, -6); // already 6 days overdue
    open("New Client Co", "newclient@example.com", 600, 15);   // no history

    await Invoice.insertMany(docs);
    res.json({ seeded: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove demo data
router.delete("/demo-seed", async (req, res) => {
  const result = await Invoice.deleteMany({ isDemo: true });
  res.json({ removed: result.deletedCount });
});

module.exports = router;