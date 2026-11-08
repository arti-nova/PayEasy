const DAY = 86400000;
const UNPAID = ["SENT", "PARTIALLY_PAID"];
const LATE_AFTER_DAYS = 1; // paid more than 1 day after due date counts as late

const keyOf = (inv) => (inv.clientEmail || inv.clientName || "unknown").toLowerCase();
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const summarize = (delays) => ({
  n: delays.length,
  avgDelay: mean(delays),
  lateRate: delays.filter((d) => d > LATE_AFTER_DAYS).length / delays.length,
});

function computeForecast(invoices, now = new Date()) {
  const paid = invoices.filter((i) => i.status === "PAID" && i.paidAt && i.dueDate);
  const open = invoices.filter((i) => UNPAID.includes(i.status) && i.dueDate);

  // Payment behaviour per client: days paid after the due date
  const byClient = {};
  const names = {};
  const allDelays = [];
  for (const inv of paid) {
    const delay = (new Date(inv.paidAt) - new Date(inv.dueDate)) / DAY;
    allDelays.push(delay);
    const k = keyOf(inv);
    (byClient[k] = byClient[k] || []).push(delay);
    names[k] = inv.clientName || k;
  }
  const stats = {};
  for (const k of Object.keys(byClient)) stats[k] = summarize(byClient[k]);
  const global = allDelays.length ? summarize(allDelays) : null;

  const totals = {};
  const bucket = (c) =>
    (totals[c] = totals[c] || {
      collected: 0, outstanding: 0, atRisk: 0,
      days0to7: 0, days8to14: 0, days15to30: 0, after30: 0,
    });

  for (const inv of paid) bucket(inv.currency || "USD").collected += inv.amount || 0;

  const items = open.map((inv) => {
    const s = stats[keyOf(inv)] || null;
    const basis = s || global;
    const confidence = s ? (s.n >= 3 ? "high" : "low") : global ? "low" : "none";
    const avgDelay = basis ? basis.avgDelay : 0;
    const lateRate = basis ? basis.lateRate : 0;

    const due = new Date(inv.dueDate);
    const overdueDays = Math.max(0, Math.floor((now - due) / DAY));

    let expected = new Date(due.getTime() + avgDelay * DAY);
    if (expected < now) expected = new Date(now.getTime() + 2 * DAY);
    const daysUntil = (expected - now) / DAY;

    let risk = "low";
    if (lateRate >= 0.5 || avgDelay >= 7 || overdueDays > 14) risk = "high";
    else if (lateRate >= 0.25 || avgDelay >= 3 || overdueDays > 0) risk = "medium";
    if (confidence !== "high" && risk === "high" && overdueDays <= 14) risk = "medium";

    const t = bucket(inv.currency || "USD");
    const amount = inv.amount || 0;
    t.outstanding += amount;
    if (risk === "high") t.atRisk += amount;
    if (daysUntil <= 7) t.days0to7 += amount;
    else if (daysUntil <= 14) t.days8to14 += amount;
    else if (daysUntil <= 30) t.days15to30 += amount;
    else t.after30 += amount;

    return {
      paypalInvoiceId: inv.paypalInvoiceId,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount,
      currency: inv.currency || "USD",
      dueDate: due.toISOString().slice(0, 10),
      overdueDays,
      expectedPayDate: expected.toISOString().slice(0, 10),
      risk,
      confidence,
      clientAvgDaysAfterDue: round1(avgDelay),
    };
  });

  for (const c of Object.keys(totals)) {
    for (const f of Object.keys(totals[c])) totals[c][f] = round2(totals[c][f]);
  }

  items.sort((a, b) => a.expectedPayDate.localeCompare(b.expectedPayDate));

  const clients = Object.keys(stats).map((k) => ({
    client: names[k],
    paidInvoices: stats[k].n,
    avgDaysAfterDue: round1(stats[k].avgDelay),
    latePercent: Math.round(stats[k].lateRate * 100),
  }));

  return {
    generatedAt: now.toISOString(),
    openCount: open.length,
    paidCount: paid.length,
    totals,
    clients,
    invoices: items,
  };
}

module.exports = { computeForecast };