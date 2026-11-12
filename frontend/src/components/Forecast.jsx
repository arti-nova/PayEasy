import { useState } from "react";
import { api } from "../api";
import { money, fmtDate } from "../format";

export default function Forecast({ forecast }) {
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function explain() {
    setBusy(true);
    setError("");
    try {
      const r = await api.get("/api/forecast");
      setAi(r.ai);
      if (!r.ai) setError("The AI summary isn't available right now. Try again in a minute.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!forecast) return <p className="muted">Loading…</p>;
  if (forecast.openCount === 0) return <p className="muted">No open invoices to forecast.</p>;

  const cur = Object.keys(forecast.totals)[0] || "USD";
  const t = forecast.totals[cur] || {};
  const buckets = [
    ["Next 7 days", t.days0to7],
    ["8 to 14 days", t.days8to14],
    ["15 to 30 days", t.days15to30],
    ["After 30 days", t.after30],
  ];
  const max = Math.max(...buckets.map((b) => b[1] || 0), 1);

  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <h2>Expected cash in</h2>
          <button onClick={explain} disabled={busy}>
            {busy ? "Thinking…" : "Explain with AI"}
          </button>
        </div>
        {buckets.map(([label, value]) => (
          <div className="bar-row" key={label}>
            <span>{label}</span>
            <div className="bar">
              <div style={{ width: `${((value || 0) / max) * 100}%` }} />
            </div>
            <strong>{money(value, cur)}</strong>
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        {ai && (
          <div className="preview">
            <p>{ai.summary}</p>
            {ai.actions.length > 0 && (
              <ul>
                {ai.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Expected</th>
              <th>Risk</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {forecast.invoices.map((i) => (
              <tr key={i.paypalInvoiceId}>
                <td>{i.clientName}</td>
                <td>{money(i.amount, i.currency)}</td>
                <td>{fmtDate(i.dueDate)}</td>
                <td>{fmtDate(i.expectedPayDate)}</td>
                <td>
                  <span className={`badge risk-${i.risk}`}>{i.risk}</span>
                </td>
                <td>{i.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}