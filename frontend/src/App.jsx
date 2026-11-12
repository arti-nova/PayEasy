import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { money } from "./format";
import NewInvoice from "./components/NewInvoice";
import InvoiceTable from "./components/InvoiceTable";
import Overdue from "./components/Overdue";
import Forecast from "./components/Forecast";
import "./App.css";

const TABS = ["Invoices", "Overdue", "Forecast"];

export default function App() {
  const [tab, setTab] = useState("Invoices");
  const [invoices, setInvoices] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [inv, od, fc] = await Promise.all([
        api.get("/api/invoices"),
        api.get("/api/invoices/overdue"),
        api.get("/api/forecast?explain=false"),
      ]);
      setInvoices(inv);
      setOverdue(od);
      setForecast(fc);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 10000);
    return () => clearInterval(timer);
  }, [reload]);

  const cur = Object.keys(forecast?.totals || {})[0] || "USD";
  const t = forecast?.totals?.[cur] || {};

  return (
    <div className="app">
      <header>
        <h1>PayEasy</h1>
        <p className="muted">Create, track and chase invoices, and see your cash coming in.</p>
      </header>

      {error && <div className="alert">Can't reach the server: {error}</div>}

      <section className="stats">
        <div className="card stat">
          <span>Collected</span>
          <strong>{money(t.collected, cur)}</strong>
        </div>
        <div className="card stat">
          <span>Outstanding</span>
          <strong>{money(t.outstanding, cur)}</strong>
        </div>
        <div className="card stat danger">
          <span>At risk</span>
          <strong>{money(t.atRisk, cur)}</strong>
        </div>
      </section>

      <NewInvoice onCreated={reload} />

      <nav className="tabs">
        {TABS.map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>
            {name}
            {name === "Overdue" && overdue.length > 0 ? ` (${overdue.length})` : ""}
          </button>
        ))}
      </nav>

      {tab === "Invoices" && <InvoiceTable invoices={invoices} />}
      {tab === "Overdue" && <Overdue items={overdue} onChanged={reload} />}
      {tab === "Forecast" && <Forecast forecast={forecast} />}
    </div>
  );
}