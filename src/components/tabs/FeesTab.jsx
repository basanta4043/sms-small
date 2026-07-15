import React, { useState } from "react";
import { Plus, X, Check, Pencil, Trash2, Printer } from "lucide-react";
import { Modal, Field, Empty } from "../Shared";
import { api } from "../../api/client";
import { uid, camelizeKeys, todayStr } from "../../utils/helpers";

function FeeStructureForm({ initial, onSave, onClose }) {
  const [className, setClassName] = useState(initial?.className || "");
  const [items, setItems] = useState(initial?.items || [{ name: "Tuition", amount: "" }]);
  function updateItem(i, k, v) { setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it))); }
  function addItem() { setItems((p) => [...p, { name: "", amount: "" }]); }
  function removeItem(i) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function submit(e) {
    e.preventDefault();
    if (!className.trim()) return;
    const cleanItems = items.filter((it) => it.name.trim()).map((it) => ({ name: it.name.trim(), amount: Number(it.amount) || 0 }));
    const total = cleanItems.reduce((s, it) => s + it.amount, 0);
    onSave({ id: initial?.id || uid(), className: className.trim(), items: cleanItems, total });
  }
  return (
    <Modal title={initial ? "Edit fee structure" : "Add fee structure"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Class / Grade"><input className="sm-input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 5" /></Field>
        <div className="sm-divider" />
        <label className="sm-label">Fee items</label>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="sm-input" placeholder="Item name (e.g. Tuition)" value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 130 }} type="number" placeholder="Amount" value={it.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
            <button type="button" className="sm-icon-btn" onClick={() => removeItem(i)}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="sm-btn sm-btn-ghost" onClick={addItem}><Plus size={14} /> Add item</button>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Save structure</button>
        </div>
      </form>
    </Modal>
  );
}

function CollectFeeForm({ students, feeData, currency, onSave, onClose }) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const student = students.find((s) => s.id === studentId);
  const structure = feeData.feeStructures.find((f) => f.className.trim().toLowerCase() === (student?.className || "").trim().toLowerCase());
  const paidSoFar = feeData.payments.filter((p) => p.studentId === studentId).reduce((s, p) => s + p.amount, 0);
  const due = structure ? Math.max(structure.total - paidSoFar, 0) : null;

  function submit(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!studentId || !amt || amt <= 0) return;
    onSave({ studentId, amount: amt, method, note: note.trim(), date });
  }

  return (
    <Modal title="Record a fee payment" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Student">
          <select className="sm-select" value={studentId} onChange={(e) => {
            const raw = e.target.value;
            const parsed = Number(raw);
            setStudentId(Number.isNaN(parsed) ? raw : parsed);
          }}>
            {students.length === 0 && <option value="">No students yet</option>}
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}
          </select>
        </Field>
        {structure ? (
          <p className="sm-note">Fee structure for {student.className}: {currency}{structure.total}. Paid so far: {currency}{paidSoFar}. Due: <strong>{currency}{due}</strong></p>
        ) : (
          <p className="sm-note">No fee structure set for this class yet — you can still record the payment.</p>
        )}
        <div className="sm-form-grid">
          <Field label={`Amount (${currency})`}><input className="sm-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Payment date"><input className="sm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method">
            <select className="sm-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option><option>Bank transfer</option><option>Mobile wallet</option><option>Cheque</option>
            </select>
          </Field>
          <Field label="Note (optional)"><input className="sm-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary" disabled={students.length === 0}><Check size={16} /> Record payment &amp; create invoice</button>
        </div>
      </form>
    </Modal>
  );
}

export function InvoiceDoc({ invoice, school, currency, onClose }) {
  return (
    <Modal title="" onClose={onClose} wide>
      <div className="sm-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <button className="sm-btn sm-btn-gold" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </div>
      <div className="sm-print-area">
        <div className="sm-print-doc">
          <div className="sm-print-head">
            <div>
              <div className="sm-display" style={{ fontSize: 20 }}>{school.name || "Your School"}</div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{school.address}</div>
            </div>
            <div className="sm-print-seal">{(school.name || "S").trim()[0]?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Billed to</div>
              <div style={{ fontWeight: 700 }}>{invoice.studentName}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{invoice.studentClass}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Invoice</div>
              <div className="sm-mono" style={{ fontWeight: 700 }}>{invoice.invoiceNo}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{invoice.date}</div>
            </div>
          </div>
          <table className="sm-table" style={{ marginBottom: 14 }}>
            <thead><tr><th>Description</th><th>Method</th><th>Amount</th></tr></thead>
            <tbody>
              <tr>
                <td>Fee payment{invoice.note ? ` — ${invoice.note}` : ""}</td>
                <td>{invoice.method}</td>
                <td className="sm-mono">{currency}{invoice.amount}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="sm-stamp">PAID</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>Total received</div>
              <div className="sm-display" style={{ fontSize: 22 }}>{currency}{invoice.amount}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function FeesTab({ students, feeData, setFeeData, currency, token, onOpenInvoice }) {
  const [sub, setSub] = useState("structures");
  const [showStructForm, setShowStructForm] = useState(false);
  const [editStruct, setEditStruct] = useState(null);
  const [showCollect, setShowCollect] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveStructure(s) {
    setFeeError("");
    setSaving(true);
    try {
      if (token) {
        const payload = { class_name: s.className, items: s.items, total: s.total };
        const response = s.id
          ? await api(`/fees/structures/${s.id}`, { method: "PUT", body: payload, token })
          : await api("/fees/structures", { method: "POST", body: payload, token });
        const structure = camelizeKeys(response.feeStructure);
        setFeeData((prev) => {
          const exists = prev.feeStructures.some((x) => x.id === structure.id);
          const feeStructures = exists ? prev.feeStructures.map((x) => (x.id === structure.id ? structure : x)) : [...prev.feeStructures, structure];
          return { ...prev, feeStructures };
        });
      } else {
        setFeeData((prev) => {
          const exists = prev.feeStructures.some((x) => x.id === s.id);
          const feeStructures = exists ? prev.feeStructures.map((x) => (x.id === s.id ? s : x)) : [...prev.feeStructures, s];
          return { ...prev, feeStructures };
        });
      }
      setShowStructForm(false); setEditStruct(null);
    } catch (e) {
      setFeeError(e.message || "Unable to save fee structure.");
    } finally {
      setSaving(false);
    }
  }

  async function removeStructure(id) {
    setFeeError("");
    try {
      if (token) {
        await api(`/fees/structures/${id}`, { method: "DELETE", token });
      }
      setFeeData((prev) => ({ ...prev, feeStructures: prev.feeStructures.filter((x) => x.id !== id) }));
    } catch (e) {
      setFeeError(e.message || "Unable to remove fee structure.");
    }
  }

  async function recordPayment({ studentId, amount, method, note, date }) {
    setFeeError("");
    setSaving(true);
    try {
      if (token) {
        const response = await api("/fees/payments", { method: "POST", body: { student_id: studentId, amount, method, note, date }, token });
        const payment = camelizeKeys(response.payment);
        const invoice = camelizeKeys(response.invoice);
        const student = students.find((s) => s.id === payment.studentId);
        invoice.studentName = invoice.studentName || student?.name || "—";
        invoice.studentClass = invoice.studentClass || student?.className || "—";
        setFeeData((prev) => ({ ...prev, payments: [...prev.payments, payment], invoices: [...prev.invoices, invoice] }));
      } else {
        const invoiceNo = `INV-${String(feeData.nextInvoiceNo).padStart(4, "0")}`;
        const invoiceId = uid();
        const student = students.find((s) => s.id === studentId);
        const invoice = {
          id: invoiceId, invoiceNo, studentId, studentName: student?.name || "—", studentClass: student?.className || "—",
          date, amount, method, note, status: "Paid",
        };
        const payment = { id: uid(), studentId, amount, method, note, date, invoiceId };
        setFeeData((prev) => ({ ...prev, payments: [...prev.payments, payment], invoices: [...prev.invoices, invoice], nextInvoiceNo: prev.nextInvoiceNo + 1 }));
      }
      setShowCollect(false);
    } catch (e) {
      setFeeError(e.message || "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  }

  const dueByStudent = students.map((s) => {
    const structure = feeData.feeStructures.find((f) => f.className.trim().toLowerCase() === s.className.trim().toLowerCase());
    const paid = feeData.payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
    const total = structure ? structure.total : null;
    const due = total !== null ? Math.max(total - paid, 0) : null;
    return { student: s, total, paid, due };
  });

  return (
    <div>
      <div className="sm-subtabs">
        <button className={"sm-subtab" + (sub === "structures" ? " active" : "")} onClick={() => setSub("structures")}>Fee structure</button>
        <button className={"sm-subtab" + (sub === "dues" ? " active" : "")} onClick={() => setSub("dues")}>Student dues</button>
        <button className={"sm-subtab" + (sub === "payments" ? " active" : "")} onClick={() => setSub("payments")}>Payment history</button>
      </div>
      {feeError && <div className="sm-error" style={{ margin: "10px 0 16px" }}>{feeError}</div>}

      {sub === "structures" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Set what each class owes for the year/term.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => { setEditStruct(null); setShowStructForm(true); }}><Plus size={16} /> Add class fee</button>
          </div>
          {feeData.feeStructures.length === 0 ? <Empty text="No fee structures set yet." /> : (
            <table className="sm-table">
              <thead><tr><th>Class</th><th>Items</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {feeData.feeStructures.map((f) => (
                  <tr key={f.id}>
                    <td>{f.className}</td>
                    <td style={{ color: "var(--slate)" }}>{f.items.map((it) => it.name).join(", ")}</td>
                    <td className="sm-mono">{currency}{f.total}</td>
                    <td>
                      <button className="sm-icon-btn" onClick={() => { setEditStruct(f); setShowStructForm(true); }}><Pencil size={15} /></button>
                      <button className="sm-icon-btn" onClick={() => removeStructure(f.id)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === "dues" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Who owes what, based on class fee structures.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => setShowCollect(true)}><Plus size={16} /> Collect fee</button>
          </div>
          {dueByStudent.length === 0 ? <Empty text="Add students first to see dues here." /> : (
            <table className="sm-table">
              <thead><tr><th>Student</th><th>Class</th><th>Total fee</th><th>Paid</th><th>Due</th></tr></thead>
              <tbody>
                {dueByStudent.map(({ student, total, paid, due }) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.class_name}</td>
                    <td className="sm-mono">{total === null ? "—" : currency + total}</td>
                    <td className="sm-mono">{currency}{paid}</td>
                    <td>{total === null ? <span style={{ color: "var(--slate)" }}>No structure</span> : due === 0 ? <span className="sm-pill sm-pill-sage">Cleared</span> : <span className="sm-pill sm-pill-rust">{currency}{due} due</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === "payments" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Every fee payment recorded, newest first.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => setShowCollect(true)}><Plus size={16} /> Collect fee</button>
          </div>
          {feeData.payments.length === 0 ? <Empty text="No payments recorded yet." /> : (
            <table className="sm-table">
              <thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Invoice</th></tr></thead>
              <tbody>
                {[...feeData.payments].sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => {
                  const student = students.find((s) => s.id === p.studentId);
                  const invoice = feeData.invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>{student?.name || "—"}</td>
                      <td className="sm-mono">{currency}{p.amount}</td>
                      <td>{p.method}</td>
                      <td>
                        {invoice ? <button className="sm-btn sm-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onOpenInvoice(invoice)}><Printer size={13} /> {invoice.invoiceNo}</button> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showStructForm && <FeeStructureForm initial={editStruct} onSave={saveStructure} onClose={() => { setShowStructForm(false); setEditStruct(null); }} />}
      {showCollect && <CollectFeeForm students={students} feeData={feeData} currency={currency} onSave={recordPayment} onClose={() => setShowCollect(false)} />}
    </div>
  );
}
