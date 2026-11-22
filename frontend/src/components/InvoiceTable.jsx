import { money, fmtDate } from "../format";
import { Eye, MoreHorizontal } from "lucide-react";

const isOverdue = (i) =>
  ["SENT", "PARTIALLY_PAID"].includes(String(i.status).toUpperCase()) &&
  new Date(i.dueDate) < new Date();

export default function InvoiceTable({ invoices }) {
  if (!invoices.length) {
    return (
      <div className="empty-state">
        <div>
          <h3>No invoices yet</h3>
          <p>Create your first invoice to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((i) => {
            const overdue = isOverdue(i);
            const status = overdue ? "OVERDUE" : String(i.status).toUpperCase();

            return (
              <tr key={i.paypalInvoiceId}>
                <td>
                  <strong>{i.invoiceNumber}</strong>
                </td>

                <td>
                  <div className="client-cell">
                    <strong>{i.clientName}</strong>
                    {i.isDemo && <span className="tag">Demo</span>}
                  </div>
                </td>

                <td>
                  <strong>{money(i.amount, i.currency)}</strong>
                </td>

                <td>{fmtDate(i.dueDate)}</td>

                <td>
                  <span className={`badge ${status.toLowerCase()}`}>
                    {status}
                  </span>
                </td>

                <td>
                  <div className="table-actions">
                    <button title="View invoice" className="icon-button">
                      <Eye size={16} />
                    </button>

                    <button title="More options" className="icon-button">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}