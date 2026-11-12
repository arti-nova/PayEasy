import { useState } from "react";
import { api } from "../api";
import { money, fmtDate } from "../format";

function OverdueCard({ inv, onChanged }) {
  const [tone, setTone] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function makeDraft() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      setDraft(await api.post(`/api/invoices/${inv.paypalInvoiceId}/followup`, tone ? { tone } : {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/invoices/${inv.paypalInvoiceId}/remind`, {
        subject: draft.subject,
        message: draft.message,
        tone: draft.tone,
      });
      setDraft(null);
      setNote("Reminder sent.");
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row">
        <div>
          <strong>{inv.clientName}</strong> · {money(inv.amount, inv.currency)}
          <div className="muted">
            Invoice {inv.invoiceNumber} · due {fmtDate(inv.dueDate)} ·{" "}
            <span className="danger-text">{inv.daysOverdue} days overdue</span> ·{" "}
            {inv.reminders?.length || 0} reminders sent
          </div>
        </div>
        <div className="row">
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="">Auto tone</option>
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
            <option value="final">Final</option>
          </select>
          <button onClick={makeDraft} disabled={busy}>
            Draft follow-up
          </button>
        </div>
      </div>

      {draft && (
        <div className="preview">
          <p className="muted">Tone: {draft.tone}. Edit if you like, then send.</p>
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <textarea
            rows={4}
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          />
          <button onClick={send} disabled={busy}>
            Send reminder via PayPal
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {note && <p className="success">{note}</p>}
    </div>
  );
}

export default function Overdue({ items, onChanged }) {
  if (!items.length) return <p className="muted">Nothing overdue. Nice.</p>;
  return (
    <div className="stack">
      {items.map((inv) => (
        <OverdueCard key={inv.paypalInvoiceId} inv={inv} onChanged={onChanged} />
      ))}
    </div>
  );
}