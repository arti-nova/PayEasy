import { useState } from "react";
import { api } from "../api";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export default function NewInvoice({ onCreated }) {
  const [text, setText] = useState("");
  const [form, setForm] = useState(null);
  const [missing, setMissing] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function draft() {
    setBusy(true);
    setError("");
    setSent(null);
    try {
      const r = await api.post("/api/invoices/draft", { text });
      setForm(r.draft);
      setMissing(r.missing);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const ready =
    form &&
    form.clientName &&
    /^\S+@\S+\.\S+$/.test(form.clientEmail || "") &&
    form.description &&
    Number(form.amount) > 0;

  async function send() {
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/api/invoices", {
        ...form,
        amount: Number(form.amount),
        dueInDays: Number(form.dueInDays),
      });
      setSent(r);
      setForm(null);
      setText("");
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>New invoice</h2>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Invoice Acme Studios (billing@acme.com) 250 USD for logo design with 3 revisions, due in 2 weeks"
      />
      <button onClick={draft} disabled={busy || !text.trim()}>
        {busy && !form ? "Drafting…" : "Draft with AI"}
      </button>

      {error && <p className="error">{error}</p>}

      {form && (
        <div className="preview">
          <h3>Preview. Check it, then send.</h3>
          {missing.length > 0 && (
            <p className="error">The AI couldn't find: {missing.join(", ")}. Fill them in below.</p>
          )}
          <div className="grid">
            <label>
              Client name
              <input value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
            </label>
            <label>
              Client email
              <input value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
            </label>
            <label className="wide">
              Description
              <input value={form.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0"
                value={form.amount || ""}
                onChange={(e) => set("amount", e.target.value)}
              />
            </label>
            <label>
              Currency
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Due in (days)
              <input
                type="number"
                min="1"
                value={form.dueInDays}
                onChange={(e) => set("dueInDays", e.target.value)}
              />
            </label>
          </div>
          <button onClick={send} disabled={busy || !ready}>
            {busy ? "Sending…" : "Confirm and send via PayPal"}
          </button>
        </div>
      )}

      {sent && (
        <p className="success">
          Invoice {sent.invoiceNumber} sent.{" "}
          {sent.payLink && (
            <a href={sent.payLink} target="_blank" rel="noreferrer">
              Open payment page
            </a>
          )}
        </p>
      )}
    </section>
  );
}