import { money, fmtDate } from "../format";

const isOverdue = (i) =>
  ["SENT", "PARTIALLY_PAID"].includes(i.status) && new Date(i.dueDate) < new Date();

export default function InvoiceTable({ invoices }) {
  if (!invoices.length) return <p className="muted">No invoices yet. Create one above.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Client</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.paypalInvoiceId}>
              <td>{i.invoiceNumber}</td>
              <td>
                {i.clientName}
                {i.isDemo && <span className="tag">demo</span>}
              </td>
              <td>{i.description}</td>
              <td>{money(i.amount, i.currency)}</td>
              <td>{fmtDate(i.dueDate)}</td>
              <td>
                {isOverdue(i) ? (
                  <span className="badge overdue">OVERDUE</span>
                ) : (
                  <span className={`badge ${String(i.status).toLowerCase()}`}>{i.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}