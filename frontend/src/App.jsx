import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Clock,
  ChartNoAxesCombined,
  Settings,
  Wallet,
  CircleAlert,
  Sparkles,
  Plus,
  Bell,
  Menu,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import logo from "./assets/logo.gif";
import { api } from "./api";
import { money } from "./format";

import NewInvoice from "./components/NewInvoice";
import InvoiceTable from "./components/InvoiceTable";
import Overdue from "./components/Overdue";
import Forecast from "./components/Forecast";

import "./App.css";
import "./theme.css";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Invoices", icon: FileText },
  { name: "Overdue", icon: Clock },
  { name: "Forecast", icon: ChartNoAxesCombined },
];

const PROFILE_KEY = "payeasy_profile";
const DEFAULT_PROFILE = { name: "Arti", username: "arti" };

function loadProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY)) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [invoices, setInvoices] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 10000);
    return () => clearInterval(timer);
  }, [reload]);

  const updateProfile = (field, value) => {
    const clean = field === "username" ? value.replace(/[^a-zA-Z0-9_.-]/g, "").toLowerCase() : value;
    const next = { ...profile, [field]: clean };
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable, keep the value in memory only */
    }
  };

  const cur = Object.keys(forecast?.totals || {})[0] || "USD";
  const totals = forecast?.totals?.[cur] || {};
  const collected = totals.collected || 0;
  const outstanding = totals.outstanding || 0;
  const atRisk = totals.atRisk || 0;

  const paidInvoices = invoices.filter((i) => String(i.status).toUpperCase() === "PAID").length;

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt || b.dueDate) - new Date(a.createdAt || a.dueDate))
    .slice(0, 4);

  const flow = [
    ["Next 7 days", totals.days0to7],
    ["8 to 14 days", totals.days8to14],
    ["15 to 30 days", totals.days15to30],
    ["After 30 days", totals.after30],
  ];
  const flowMax = Math.max(...flow.map(([, v]) => v || 0), 1);

  const firstName = (profile.name || "").trim().split(" ")[0] || "there";
  const initial = (profile.name || "?").trim().charAt(0).toUpperCase();

  const go = (name) => {
    setTab(name);
    setSidebarOpen(false);
  };

  const getStatus = (invoice) => {
    const s = String(invoice.status || "DRAFT").toUpperCase();
    if (["SENT", "PARTIALLY_PAID"].includes(s) && new Date(invoice.dueDate) < new Date()) {
      return "OVERDUE";
    }
    return s;
  };

  const statusClass = (status) => status.toLowerCase().replaceAll("_", "-");

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="profile-card">
          <div className="avatar">{initial}</div>
          <div className="profile-text">
            <strong>{profile.name || "Add your name"}</strong>
            <span>@{profile.username || "username"}</span>
          </div>
        </div>

        <p className="sidebar-label">Workspace</p>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${tab === name ? "active" : ""}`}
              onClick={() => go(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Overdue" && overdue.length > 0 && (
                <span className="nav-count">{overdue.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${tab === "Settings" ? "active" : ""}`}
            onClick={() => go("Settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="top-brand">
            <img src={logo} alt="" />
            <span>PayEasy</span>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <CircleAlert size={18} />
            Can't reach the server: {error}
          </div>
        )}

        {loading && !forecast ? (
          <div className="loading-state">
            <div className="loader" />
            <p>Loading your dashboard</p>
          </div>
        ) : (
          <>
            {tab === "Dashboard" && (
              <div className="page-content">
                <div className="welcome-section">
                  <div>
                    <h1>Welcome back, {firstName}</h1>
                    <p>Here is where your invoices stand today.</p>
                  </div>
                  <button className="primary-button" onClick={() => go("Invoices")}>
                    <Plus size={16} />
                    New invoice
                  </button>
                </div>

                <section className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon">
                        <Wallet size={20} />
                      </div>
                      <span className="stat-label">Collected</span>
                    </div>
                    <h2>{money(collected, cur)}</h2>
                    <div className="stat-footer">Payments received</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon">
                        <FileText size={20} />
                      </div>
                      <span className="stat-label">Outstanding</span>
                    </div>
                    <h2>{money(outstanding, cur)}</h2>
                    <div className="stat-footer">Awaiting payment</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon red">
                        <CircleAlert size={20} />
                      </div>
                      <span className="stat-label">At risk</span>
                    </div>
                    <h2>{money(atRisk, cur)}</h2>
                    <div className="stat-footer negative">Likely to be paid late</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon">
                        <CheckCircle2 size={20} />
                      </div>
                      <span className="stat-label">Invoices</span>
                    </div>
                    <h2>{invoices.length}</h2>
                    <div className="stat-footer">{paidInvoices} paid</div>
                  </div>
                </section>

                <section className="dashboard-grid">
                  <div className="panel cash-flow-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Expected cash in</h2>
                        <p>Open invoices, grouped by predicted payment date</p>
                      </div>
                    </div>
                    <div className="flow-list">
                      {flow.map(([label, value]) => (
                        <div className="flow-row" key={label}>
                          <span>{label}</span>
                          <div className="flow-track">
                            <div
                              className="flow-fill"
                              style={{ width: `${((value || 0) / flowMax) * 100}%` }}
                            />
                          </div>
                          <strong>{money(value, cur)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel recent-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Recent invoices</h2>
                        <p>Your latest billing activity</p>
                      </div>
                      <button className="text-button" onClick={() => go("Invoices")}>
                        View all <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="recent-list">
                      {recentInvoices.length === 0 ? (
                        <div className="empty-state">
                          <FileText size={28} />
                          <p>No invoices yet. Create your first one.</p>
                        </div>
                      ) : (
                        recentInvoices.map((invoice) => {
                          const status = getStatus(invoice);
                          return (
                            <div className="recent-invoice" key={invoice.paypalInvoiceId}>
                              <div className={`recent-status ${statusClass(status)}`}>
                                {status === "PAID" ? (
                                  <CheckCircle2 size={16} />
                                ) : status === "OVERDUE" ? (
                                  <CircleAlert size={16} />
                                ) : (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div className="recent-details">
                                <strong>{invoice.invoiceNumber}</strong>
                                <span>{invoice.clientName}</span>
                              </div>
                              <div className="recent-amount">
                                <strong>{money(invoice.amount, invoice.currency)}</strong>
                                <span className={`status-badge ${statusClass(status)}`}>{status}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="panel quick-actions-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Quick actions</h2>
                        <p>Common tasks</p>
                      </div>
                    </div>
                    <div className="quick-actions">
                      <button className="quick-action primary-action" onClick={() => go("Invoices")}>
                        <Plus size={16} />
                        New invoice
                      </button>
                      <button className="quick-action" onClick={() => go("Invoices")}>
                        <Sparkles size={16} />
                        Draft with AI
                      </button>
                      <button className="quick-action" onClick={() => go("Overdue")}>
                        <Bell size={16} />
                        Send reminders
                      </button>
                      <button className="quick-action" onClick={() => go("Forecast")}>
                        <ChartNoAxesCombined size={16} />
                        View forecast
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {tab === "Invoices" && (
              <div className="page-content">
                <div className="welcome-section">
                  <div>
                    <h1>Invoices</h1>
                    <p>Create, send and track invoices in one place.</p>
                  </div>
                </div>
                <div className="invoice-page-grid">
                  <div className="panel invoice-list-panel">
                    <div className="panel-header">
                      <div>
                        <h2>All invoices</h2>
                        <p>{invoices.length} in your workspace</p>
                      </div>
                    </div>
                    <InvoiceTable invoices={invoices} />
                  </div>
                  <div className="panel new-invoice-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Create invoice</h2>
                        <p>Describe the job and let AI draft it, then review before sending.</p>
                      </div>
                    </div>
                    <NewInvoice onCreated={reload} />
                  </div>
                </div>
              </div>
            )}

            {tab === "Overdue" && (
              <div className="page-content">
                <div className="welcome-section">
                  <div>
                    <h1>Overdue invoices</h1>
                    <p>Follow up on unpaid invoices and get paid sooner.</p>
                  </div>
                </div>
                <div className="overdue-page">
                  <Overdue items={overdue} onChanged={reload} />
                </div>
              </div>
            )}

            {tab === "Forecast" && (
              <div className="page-content">
                <div className="welcome-section">
                  <div>
                    <h1>Cash flow forecast</h1>
                    <p>See what is coming in and which invoices need attention.</p>
                  </div>
                </div>
                <Forecast forecast={forecast} />
              </div>
            )}

            {tab === "Settings" && (
              <div className="page-content">
                <div className="welcome-section">
                  <div>
                    <h1>Settings</h1>
                    <p>Manage your profile and workspace.</p>
                  </div>
                </div>

                <div className="panel settings-panel">
                  <div className="settings-profile">
                    <div className="avatar large">{initial}</div>
                    <div>
                      <h2>{profile.name || "Your name"}</h2>
                      <p>@{profile.username || "username"}</p>
                    </div>
                  </div>

                  <div className="settings-fields">
                    <label>
                      Name
                      <input
                        value={profile.name}
                        onChange={(e) => updateProfile("name", e.target.value)}
                        maxLength={40}
                      />
                    </label>
                    <label>
                      Username
                      <input
                        value={profile.username}
                        onChange={(e) => updateProfile("username", e.target.value)}
                        maxLength={30}
                      />
                    </label>
                  </div>

                  <div className="settings-item">
                    <div>
                      <strong>Payment provider</strong>
                      <p>PayPal sandbox</p>
                    </div>
                    <span className="settings-connected">
                      <span className="live-dot" />
                      Connected
                    </span>
                  </div>

                  <div className="settings-item">
                    <div>
                      <strong>AI provider</strong>
                      <p>Google Gemini</p>
                    </div>
                    <span className="settings-connected">
                      <Sparkles size={14} />
                      Enabled
                    </span>
                  </div>

                  <div className="settings-item">
                    <div>
                      <strong>Data refresh</strong>
                      <p>The dashboard updates automatically every 10 seconds.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}