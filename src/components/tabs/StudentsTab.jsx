import React, { useMemo, useState } from "react";
import { Users, Search, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { Modal, Field, Empty } from "../Shared";
import { api } from "../../api/client";
import { uid, todayStr, camelizeKeys } from "../../utils/helpers";

function StudentForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    rollNo: "", name: "", className: "", section: "", gender: "Female",
    dob: "", guardianName: "", phone: "", address: "", admissionDate: todayStr(), status: "Active",
  });
  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.className.trim()) return;
    onSave({ ...f, id: f.id || uid() });
  }
  return (
    <Modal title={initial ? "Edit student" : "Add student"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="sm-form-grid">
          <Field label="Full name"><input className="sm-input" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
          <Field label="Roll number"><input className="sm-input" value={f.rollNo} onChange={(e) => set("rollNo", e.target.value)} /></Field>
          <Field label="Class / Grade"><input className="sm-input" value={f.className} onChange={(e) => set("className", e.target.value)} placeholder="e.g. Grade 5" /></Field>
          <Field label="Section"><input className="sm-input" value={f.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. A" /></Field>
          <Field label="Gender">
            <select className="sm-select" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" className="sm-input" value={f.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Guardian name"><input className="sm-input" value={f.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
          <Field label="Contact phone"><input className="sm-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Admission date"><input type="date" className="sm-input" value={f.admissionDate} onChange={(e) => set("admissionDate", e.target.value)} /></Field>
          <Field label="Status">
            <select className="sm-select" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </Field>
          <Field label="Address" span2><input className="sm-input" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Save student</button>
        </div>
      </form>
    </Modal>
  );
}

export default function StudentsTab({ students, setStudents, token }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [err, setErr] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.name, s.rollNo, s.className, s.section, s.guardianName].join(" ").toLowerCase().includes(term)
    );
  }, [students, q]);

  async function save(student) {
    setErr("");
    try {
      const payload = {
        roll_no: student.rollNo || null,
        name: student.name,
        class_name: student.className || null,
        section: student.section || null,
        gender: student.gender || null,
        dob: student.dob || null,
        guardian_name: student.guardianName || null,
        phone: student.phone || null,
        address: student.address || null,
        admission_date: student.admissionDate || null,
        status: student.status || "Active",
      };
      const isExisting = typeof student.id === "number" || /^\d+$/.test(String(student.id));
      const data = isExisting
        ? await api(`/students/${student.id}`, { method: "PUT", body: payload, token })
        : await api("/students", { method: "POST", body: payload, token });
      const saved = camelizeKeys(data.student);
      setStudents((prev) => {
        const exists = prev.some((s) => String(s.id) === String(saved.id));
        return exists ? prev.map((s) => (String(s.id) === String(saved.id) ? saved : s)) : [...prev, saved];
      });
      setShowForm(false); setEditing(null);
    } catch (e) {
      setErr(e.message || "Unable to save student.");
    }
  }

  async function remove(id) {
    setErr("");
    try {
      await api(`/students/${id}`, { method: "DELETE", token });
      setStudents((prev) => prev.filter((s) => String(s.id) !== String(id)));
      setConfirmDel(null);
    } catch (e) {
      setErr(e.message || "Unable to delete student.");
    }
  }

  return (
    <div>
      <div className="sm-panel">
        <div className="sm-panel-head">
          <div className="sm-search"><Search size={15} color="var(--slate)" /><input placeholder="Search name, roll no, class…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className="sm-btn sm-btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add student</button>
        </div>
        {err && <div className="sm-error" style={{ margin: "0 18px 12px" }}>{err}</div>}
        {filtered.length === 0 ? (
          <Empty text={students.length === 0 ? "No students yet. Add your first student to get started." : "No students match your search."} />
        ) : (
          <table className="sm-table">
            <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Guardian</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="sm-mono">{s.rollNo || "—"}</td>
                  <td>{s.name}</td>
                  <td>{s.className}{s.section ? ` · ${s.section}` : ""}</td>
                  <td>{s.guardianName || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td><span className={"sm-pill " + (s.status === "Active" ? "sm-pill-sage" : "sm-pill-rust")}>{s.status}</span></td>
                  <td>
                    <button className="sm-icon-btn" onClick={() => { setEditing(s); setShowForm(true); }}><Pencil size={15} /></button>
                    <button className="sm-icon-btn" onClick={() => setConfirmDel(s)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showForm && <StudentForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {confirmDel && (
        <Modal title="Remove student?" onClose={() => setConfirmDel(null)}>
          <p style={{ fontSize: 14, color: "var(--slate)" }}>This will remove <strong>{confirmDel.name}</strong> from your student list. Fee and result records already saved will remain but won't show a linked name.</p>
          <div className="sm-modal-actions">
            <button className="sm-btn sm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="sm-btn sm-btn-danger" onClick={() => remove(confirmDel.id)}><Trash2 size={15} /> Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
