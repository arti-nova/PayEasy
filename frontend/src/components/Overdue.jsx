import { useState } from "react";
import { api } from "../api";
import { money, fmtDate } from "../format";
import { Sparkles, Send, Clock, Mail } from "lucide-react";

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
      setDraft(
        await api.post(
          `/api/invoices/${inv.paypalInvoiceId}/followup`,
          tone ? { tone } : {}
        )
      );
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
      setNote("Reminder sent successfully.");
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overdue-card">
      <div className="overdue-card-header">
        <div className="overdue-client">
          <div className="overdue-icon">
            <Clock size={18} />
          </div>

          <div>
            <h3>{inv.clientName}</h3>

            <p>
              Invoice {inv.invoiceNumber} · Due {fmtDate(inv.dueDate)}
            </p>
          </div>
        </div>

        <div className="overdue-amount">
          <strong>{money(inv.amount, inv.currency)}</strong>

          <span className="overdue-days">
            {inv.daysOverdue} days overdue
          </span>
        </div>
      </div>

      <div className="overdue-card-bottom">
        <div className="reminder-info">
          <Mail size={14} />
          {inv.reminders?.length || 0} reminders sent
        </div>

        <div className="reminder-controls">
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="">Auto tone</option>
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
            <option value="final">Final notice</option>
          </select>

          <button className="draft-reminder-button" onClick={makeDraft} disabled={busy}>
            <Sparkles size={14} />
            {busy ? "Generating..." : "Draft Follow-up"}
          </button>
        </div>
      </div>

      {draft && (
        <div className="followup-editor">
          <div className="followup-heading">
            <Sparkles size={15} />
            <strong>AI Follow-up Preview</strong>
          </div>

          <p className="muted">Tone: {draft.tone}</p>

          <label>
            Email Subject
            <input
              value={draft.subject}
              onChange={(e) =>
                setDraft({ ...draft, subject: e.target.value })
              }
            />
          </label>

          <label>
            Message
            <textarea
              rows={5}
              value={draft.message}
              onChange={(e) =>
                setDraft({ ...draft, message: e.target.value })
              }
            />
          </label>

          <button onClick={send} disabled={busy} className="send-reminder-button">
            <Send size={15} />
            Send Reminder via PayPal
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {note && <p className="success">{note}</p>}
    </div>
  );
}

export default function Overdue({ items, onChanged }) {
  if (!items.length) {
    return (
      <div className="empty-state overdue-empty">
        <Clock size={32} />
        <h3>You're all caught up!</h3>
        <p>There are no overdue invoices at the moment.</p>
      </div>
    );
  }

  return (
    <div className="overdue-list">
      {items.map((inv) => (
        <OverdueCard
          key={inv.paypalInvoiceId}
          inv={inv}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}