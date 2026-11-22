import { useState } from "react";
import { api } from "../api";
import { money, fmtDate } from "../format";
import { Sparkles, TrendingUp, CircleAlert } from "lucide-react";

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

      if (!r.ai) {
        setError("The AI summary isn't available right now. Try again.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!forecast) {
    return <p className="muted">Loading forecast...</p>;
  }

  if (forecast.openCount === 0) {
    return (
      <div className="empty-state forecast-empty">
        <TrendingUp size={35} />
        <h3>No open invoices to forecast</h3>
        <p>Create invoices to start forecasting your cash flow.</p>
      </div>
    );
  }

  const cur = Object.keys(forecast.totals || {})[0] || "USD";
  const t = forecast.totals[cur] || {};

  const buckets = [
    ["Next 7 days", t.days0to7],
    ["8 to 14 days", t.days8to14],
    ["15 to 30 days", t.days15to30],
    ["After 30 days", t.after30],
  ];

  const max = Math.max(...buckets.map((b) => b[1] || 0), 1);

  return (
    <div className="forecast-layout">
      <div className="panel forecast-main">
        <div className="panel-header">
          <div>
            <h2>
              <TrendingUp size={18} />
              Expected Cash In
            </h2>
            <p>Estimated payments from your open invoices</p>
          </div>

          <button className="forecast-ai-button" onClick={explain} disabled={busy}>
            <Sparkles size={15} />
            {busy ? "Thinking..." : "Explain with AI"}
          </button>
        </div>

        <div className="forecast-total">
          <span>Expected incoming payments</span>
          <strong>{money(t.outstanding, cur)}</strong>
        </div>

        <div className="forecast-bars">
          {buckets.map(([label, value]) => (
            <div className="forecast-row" key={label}>
              <span>{label}</span>

              <div className="forecast-progress">
                <div
                  style={{
                    width: `${((value || 0) / max) * 100}%`,
                  }}
                />
              </div>

              <strong>{money(value, cur)}</strong>
            </div>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {ai && (
          <div className="forecast-ai-insight">
            <div className="forecast-ai-heading">
              <Sparkles size={16} />
              <strong>AI Forecast Insight</strong>
            </div>

            <p>{ai.summary}</p>

            {ai.actions?.length > 0 && (
              <div>
                <strong>Recommended actions</strong>

                <ul>
                  {ai.actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel forecast-table-panel">
        <div className="panel-header">
          <div>
            <h2>Invoice Forecast</h2>
            <p>Expected payment date and risk assessment</p>
          </div>
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
                    <span className={`badge risk-${i.risk}`}>
                      {i.risk}
                    </span>
                  </td>
                  <td>{i.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}