import { useState } from "react";
import { api } from "../api";
import { Sparkles, Send, CheckCircle2 } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export default function NewInvoice({ onCreated }) {
  const [text, setText] = useState("");
  const [form, setForm] = useState(null);
  const [missing, setMissing] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);

  const set = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

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
    <div className="invoice-form">
      <div className="ai-input-section">
        <label className="form-label">
          <Sparkles size={15} />
          Describe your invoice
        </label>

        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Example: Invoice Acme Studios for $250 for logo design. Due in 2 weeks."
        />

        <button
          className="ai-generate-button"
          onClick={draft}
          disabled={busy || !text.trim()}
        >
          <Sparkles size={15} />
          {busy && !form ? "Drafting..." : "Generate with Gemini"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <div className="invoice-edit-form">
          <div className="form-heading">
            <h3>Review your invoice</h3>
            <p>Check the details before sending.</p>
          </div>

          {missing.length > 0 && (
            <div className="missing-fields">
              The AI couldn't find: {missing.join(", ")}. Please complete them.
            </div>
          )}

          <div className="grid">
            <label>
              Client name
              <input
                value={form.clientName || ""}
                onChange={(e) => set("clientName", e.target.value)}
              />
            </label>

            <label>
              Client email
              <input
                value={form.clientEmail || ""}
                onChange={(e) => set("clientEmail", e.target.value)}
              />
            </label>

            <label className="wide">
              Description
              <input
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
              />
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
              <select
                value={form.currency || "USD"}
                onChange={(e) => set("currency", e.target.value)}
              >
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
                value={form.dueInDays || ""}
                onChange={(e) => set("dueInDays", e.target.value)}
              />
            </label>
          </div>

          <button
            className="send-invoice-button"
            onClick={send}
            disabled={busy || !ready}
          >
            <Send size={15} />
            {busy ? "Sending..." : "Confirm & Send via PayPal"}
          </button>
        </div>
      )}

      {sent && (
        <div className="invoice-success">
          <CheckCircle2 size={18} />

          <div>
            <strong>Invoice successfully sent!</strong>

            <p>
              Invoice {sent.invoiceNumber} has been created.
            </p>

            {sent.payLink && (
              <a href={sent.payLink} target="_blank" rel="noreferrer">
                Open payment page
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}