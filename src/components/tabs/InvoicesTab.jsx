import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Empty } from "../Shared";
import { fmtDate } from "../../utils/helpers";

export default function InvoicesTab({ feeData, school, currency, onOpen }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return feeData.invoices;
    return feeData.invoices.filter((i) => [i.invoiceNo, i.studentName, i.studentClass].join(" ").toLowerCase().includes(term));
  }, [feeData.invoices, q]);
  return (
    <div className="sm-panel">
      <div className="sm-panel-head">
        <div className="sm-search"><Search size={15} color="var(--slate)" /><input placeholder="Search invoice #, student…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {filtered.length === 0 ? <Empty text="No invoices yet — invoices are created automatically when you collect a fee payment." /> : (
        <table className="sm-table">
          <thead><tr><th>Invoice #</th><th>Date</th><th>Student</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).map((inv) => (
              <tr key={inv.id}>
                <td className="sm-mono">{inv.invoiceNo}</td>
                <td>{fmtDate(inv.date)}</td>
                <td>{inv.studentName}</td>
                <td className="sm-mono">{currency}{inv.amount}</td>
                <td><span className="sm-pill sm-pill-sage">{inv.status}</span></td>
                <td><button className="sm-icon-btn" onClick={() => onOpen(inv)}><span role="img" aria-label="print">🖨️</span></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
