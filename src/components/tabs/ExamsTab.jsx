import React, { useState } from "react";
import { Plus, X, Check, Trash2 } from "lucide-react";
import { Modal, Field, Empty } from "../Shared";
import { api } from "../../api/client";
import { camelizeKeys } from "../../utils/helpers";

function ExamForm({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [className, setClassName] = useState("");
  const [subjects, setSubjects] = useState([{ name: "", maxMarks: 100, passMarks: 33 }]);

  function updateSub(i, k, v) { setSubjects((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s))); }
  function addSub() { setSubjects((p) => [...p, { name: "", maxMarks: 100, passMarks: 33 }]); }
  function removeSub(i) { setSubjects((p) => p.filter((_, idx) => idx !== i)); }

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !className.trim()) return;
    const clean = subjects.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), maxMarks: Number(s.maxMarks) || 100, passMarks: Number(s.passMarks) || 33 }));
    if (clean.length === 0) return;
    onSave({ name: name.trim(), term: term.trim(), className: className.trim(), subjects: clean });
  }

  return (
    <Modal title="Create exam" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="sm-form-grid">
          <Field label="Exam name"><input className="sm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Final Term Exam" autoFocus /></Field>
          <Field label="Term / session"><input className="sm-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 2026 Term 2" /></Field>
          <Field label="Class / Grade" span2><input className="sm-input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 5" /></Field>
        </div>
        <div className="sm-divider" />
        <label className="sm-label">Subjects</label>
        {subjects.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="sm-input" placeholder="Subject name" value={s.name} onChange={(e) => updateSub(i, "name", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 110 }} type="number" placeholder="Max marks" value={s.maxMarks} onChange={(e) => updateSub(i, "maxMarks", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 110 }} type="number" placeholder="Pass marks" value={s.passMarks} onChange={(e) => updateSub(i, "passMarks", e.target.value)} />
            <button type="button" className="sm-icon-btn" onClick={() => removeSub(i)}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="sm-btn sm-btn-ghost" onClick={addSub}><Plus size={14} /> Add subject</button>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Create exam</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ExamsTab({ exams, setExams, token }) {
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");

  async function save(exam) {
    setErr("");
    try {
      const payload = { name: exam.name, term: exam.term || null, class_name: exam.className, subjects: exam.subjects };
      const data = await api("/exams", { method: "POST", body: payload, token });
      const saved = camelizeKeys(data.exam);
      setExams((p) => [...p, saved]);
      setShowForm(false);
    } catch (e) {
      setErr(e.message || "Unable to save exam.");
    }
  }

  async function remove(id) {
    setErr("");
    try {
      await api(`/exams/${id}`, { method: "DELETE", token });
      setExams((p) => p.filter((e) => String(e.id) !== String(id)));
    } catch (e) {
      setErr(e.message || "Unable to delete exam.");
    }
  }

  return (
    <div className="sm-panel">
      <div className="sm-panel-head">
        <span style={{ fontSize: 13, color: "var(--slate)" }}>Define exams and their subjects before entering results.</span>
        <button className="sm-btn sm-btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> Create exam</button>
      </div>
      {err && <div className="sm-error" style={{ margin: "0 18px 12px" }}>{err}</div>}
      {exams.length === 0 ? <Empty text="No exams yet." /> : (
        <table className="sm-table">
          <thead><tr><th>Exam</th><th>Term</th><th>Class</th><th>Subjects</th><th></th></tr></thead>
          <tbody>
            {exams.map((ex) => (
              <tr key={ex.id}>
                <td>{ex.name}</td>
                <td>{ex.term || "—"}</td>
                <td>{ex.className}</td>
                <td style={{ color: "var(--slate)" }}>{ex.subjects.map((s) => s.name).join(", ")}</td>
                <td><button className="sm-icon-btn" onClick={() => remove(ex.id)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && <ExamForm onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}
