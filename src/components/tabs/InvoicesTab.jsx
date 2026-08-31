import React, { useMemo, useState } from "react";
import { Check, Plus, Printer, Search } from "lucide-react";
import { Empty, Field, Modal } from "../Shared";
import { api } from "../../api/client";
import { camelizeKeys, fmtDate, todayStr, uid } from "../../utils/helpers";

function CreateInvoiceForm({ students, feeData, currency, onSave, onClose, saving }) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [months, setMonths] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const student = students.find((item) => String(item.id) === String(studentId));
  const structure = feeData.feeStructures.find((item) => item.className.trim().toLowerCase() === (student?.className || "").trim().toLowerCase());
  const monthlyItem = structure?.items.find((item) => /monthly/i.test(item.name));
  const monthlyFee = Number(monthlyItem?.amount) || Number(structure?.total) || 0;
  const otherItems = monthlyItem ? structure.items.filter((item) => item !== monthlyItem) : [];
  const monthCount = Math.max(1, parseInt(months, 10) || 1);
  const subtotal = monthlyFee * monthCount + otherItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmount = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const total = subtotal - discountAmount;
  const items = [
    { name: monthlyItem ? `${monthlyItem.name} (${monthCount} month${monthCount === 1 ? "" : "s"})` : "Monthly Fee", amount: monthlyFee * monthCount },
    ...otherItems.map((item) => ({ name: item.name, amount: Number(item.amount) || 0 })),
  ].filter((item) => item.amount > 0);

  function submit(event) {
    event.preventDefault();
    if (!student || !structure || total <= 0) return;
    onSave({ studentId, amount: total, method, note: note.trim(), date, feeMonths: monthCount, discount: discountAmount, items });
  }

  return (
    <Modal title="Create invoice" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Student">
          <select className="sm-select" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.length === 0 && <option value="">No students yet</option>}
            {students.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.className}</option>)}
          </select>
        </Field>
        {student && <div className="sm-note" style={{ marginBottom: 16 }}><strong>{student.name}</strong> · Class {student.className || "—"} · Section {student.section || "—"} · Roll {student.rollNo || "—"}</div>}
        {!structure ? <div className="sm-error">No fee structure is set for this student&apos;s class.</div> : (
          <>
            <div className="sm-form-grid">
              <Field label="Months to pay"><input className="sm-input" type="number" min="1" step="1" value={months} onChange={(event) => setMonths(event.target.value)} /></Field>
              <Field label={`Flat discount (${currency})`}><input className="sm-input" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></Field>
              <Field label="Payment date"><input className="sm-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
              <Field label="Method"><select className="sm-select" value={method} onChange={(event) => setMethod(event.target.value)}><option>Cash</option><option>Bank transfer</option><option>Mobile wallet</option><option>Cheque</option></select></Field>
              <Field label="Note (optional)" span2><input className="sm-input" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
            </div>
            <div className="sm-note" style={{ marginTop: 4 }}>Monthly fee: {currency}{monthlyFee} · Subtotal: {currency}{subtotal} · Total: <strong>{currency}{total}</strong></div>
          </>
        )}
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary" disabled={saving || !student || !structure || total <= 0}><Check size={16} /> {saving ? "Creating..." : "Create invoice"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvoicesTab({ feeData, students, currency, token, setFeeData, onOpen }) {
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return feeData.invoices;
    return feeData.invoices.filter((i) => [i.invoiceNo, i.studentName, i.studentClass].join(" ").toLowerCase().includes(term));
  }, [feeData.invoices, q]);

  async function createInvoice(data) {
    setError("");
    setSaving(true);
    try {
      let invoice;
      let payment;
      if (token) {
        const response = await api("/fees/payments", { method: "POST", body: {
          student_id: data.studentId, amount: data.amount, method: data.method, note: data.note, date: data.date,
          fee_months: data.feeMonths, discount: data.discount, items: data.items,
        }, token });
        invoice = camelizeKeys(response.invoice);
        payment = camelizeKeys(response.payment);
      } else {
        const student = students.find((item) => String(item.id) === String(data.studentId));
        invoice = { id: uid(), invoiceNo: `INV-${String(feeData.nextInvoiceNo).padStart(4, "0")}`, studentId: data.studentId, date: data.date, amount: data.amount, method: data.method, note: data.note, status: "Paid", feeMonths: data.feeMonths, discount: data.discount, items: data.items, studentName: student?.name || "—", studentClass: student?.className || "—", studentSection: student?.section || "—", studentRollNo: student?.rollNo || "—" };
        payment = { id: uid(), studentId: data.studentId, amount: data.amount, method: data.method, note: data.note, date: data.date, invoiceId: invoice.id };
      }
      const student = students.find((item) => String(item.id) === String(data.studentId));
      invoice = { ...invoice, studentName: invoice.studentName || student?.name || "—", studentClass: invoice.studentClass || student?.className || "—", studentSection: invoice.studentSection || student?.section || "—", studentRollNo: invoice.studentRollNo || student?.rollNo || "—", items: invoice.items || data.items, feeMonths: invoice.feeMonths || data.feeMonths, discount: invoice.discount || data.discount };
      setFeeData((previous) => ({ ...previous, payments: [...previous.payments, payment], invoices: [...previous.invoices, invoice], nextInvoiceNo: token ? previous.nextInvoiceNo : previous.nextInvoiceNo + 1 }));
      setShowCreate(false);
      onOpen(invoice);
    } catch (e) {
      setError(e.message || "Unable to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sm-panel">
      <div className="sm-panel-head">
        <div className="sm-search"><Search size={15} color="var(--slate)" /><input placeholder="Search invoice #, student..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="sm-btn sm-btn-gold" onClick={() => setShowCreate(true)}><Plus size={16} /> Create invoice</button>
      </div>
      {error && <div className="sm-error" style={{ margin: "0 18px 12px" }}>{error}</div>}
      {filtered.length === 0 ? <Empty text="No invoices yet. Create the first invoice for a student." /> : (
        <table className="sm-table">
          <thead><tr><th>Invoice #</th><th>Date</th><th>Student</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).map((inv) => (
              <tr key={inv.id}><td className="sm-mono">{inv.invoiceNo}</td><td>{fmtDate(inv.date)}</td><td>{inv.studentName}</td><td className="sm-mono">{currency}{inv.amount}</td><td><span className="sm-pill sm-pill-sage">{inv.status}</span></td><td><button className="sm-icon-btn" onClick={() => onOpen(inv)} title="Print invoice"><Printer size={15} /></button></td></tr>
            ))}
          </tbody>
        </table>
      )}
      {showCreate && <CreateInvoiceForm students={students} feeData={feeData} currency={currency} onSave={createInvoice} onClose={() => setShowCreate(false)} saving={saving} />}
    </div>
  );
}