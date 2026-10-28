import React, { useState } from "react";
import { Plus, X, Check, Trash2, Pencil } from "lucide-react";
import { Modal, Field, Empty } from "../Shared";
import { api } from "../../api/client";
import { camelizeKeys } from "../../utils/helpers";

function ExamForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [term, setTerm] = useState(initial?.term || "");
  const [className, setClassName] = useState(initial?.className || "");
  const [subjects, setSubjects] = useState(initial?.subjects?.length
    ? initial.subjects.map((subject) => ({
      ...subject,
      hasPractical: Boolean(subject.hasPractical),
      thMaxMarks: subject.thMaxMarks ?? subject.maxMarks ?? 100,
      prMaxMarks: subject.prMaxMarks ?? 0,
    }))
    : [{ name: "", hasPractical: false, thMaxMarks: 100, prMaxMarks: 0, passMarks: 33 }]);

  function updateSub(i, k, v) { setSubjects((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s))); }
  function addSub() { setSubjects((p) => [...p, { name: "", hasPractical: false, thMaxMarks: 100, prMaxMarks: 0, passMarks: 33 }]); }
  function removeSub(i) { setSubjects((p) => p.filter((_, idx) => idx !== i)); }

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !className.trim()) return;
    const clean = subjects.filter((s) => s.name.trim()).map((s) => {
      const thMaxMarks = Number(s.thMaxMarks) || 100;
      const prMaxMarks = s.hasPractical ? Number(s.prMaxMarks) || 50 : 0;
      return {
        name: s.name.trim(),
        hasPractical: Boolean(s.hasPractical),
        thMaxMarks,
        prMaxMarks,
        maxMarks: thMaxMarks + prMaxMarks,
        passMarks: Number(s.passMarks) || 33,
      };
    });
    if (clean.length === 0) return;
    onSave({ id: initial?.id, name: name.trim(), term: term.trim(), className: className.trim(), subjects: clean });
  }

  return (
    <Modal title={initial ? "Edit exam" : "Create exam"} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="sm-form-grid">
          <Field label="Exam name"><input className="sm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Final Term Exam" autoFocus /></Field>
          <Field label="Term / session"><input className="sm-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 2026 Term 2" /></Field>
          <Field label="Class / Grade" span2><input className="sm-input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 5" /></Field>
        </div>
        <div className="sm-divider" />
        <label className="sm-label">Subjects</label>
        {subjects.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1fr) 100px 100px 100px auto auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input className="sm-input" placeholder="Subject name" value={s.name} onChange={(e) => updateSub(i, "name", e.target.value)} />
            <input className="sm-input" type="number" min="1" placeholder="TH full marks" aria-label={`${s.name || "Subject"} theory full marks`} value={s.thMaxMarks} onChange={(e) => updateSub(i, "thMaxMarks", e.target.value)} />
            {s.hasPractical
              ? <input className="sm-input" type="number" min="1" placeholder="PR full marks" aria-label={`${s.name || "Subject"} practical full marks`} value={s.prMaxMarks || 50} onChange={(e) => updateSub(i, "prMaxMarks", e.target.value)} />
              : <span />}
            <input className="sm-input" type="number" min="0" placeholder="Pass marks" aria-label={`${s.name || "Subject"} pass marks`} value={s.passMarks} onChange={(e) => updateSub(i, "passMarks", e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={s.hasPractical} onChange={(e) => updateSub(i, "hasPractical", e.target.checked)} /> Has practical
            </label>
            <button type="button" className="sm-icon-btn" aria-label={`Remove ${s.name || "subject"}`} onClick={() => removeSub(i)}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="sm-btn sm-btn-ghost" onClick={addSub}><Plus size={14} /> Add subject</button>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> {initial ? "Save changes" : "Create exam"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ExamsTab({ exams, setExams, token }) {
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [err, setErr] = useState("");

  async function save(exam) {
    setErr("");
    try {
      const payload = { name: exam.name, term: exam.term || null, class_name: exam.className, subjects: exam.subjects };
      const data = await api(exam.id ? `/exams/${exam.id}` : "/exams", { method: exam.id ? "PUT" : "POST", body: payload, token });
      const saved = camelizeKeys(data.exam);
      setExams((p) => exam.id ? p.map((item) => String(item.id) === String(saved.id) ? saved : item) : [...p, saved]);
      setShowForm(false);
      setEditingExam(null);
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
        <button className="sm-btn sm-btn-gold" onClick={() => { setEditingExam(null); setShowForm(true); }}><Plus size={16} /> Create exam</button>
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
                <td>
                  <button className="sm-icon-btn" aria-label={`Edit ${ex.name}`} onClick={() => { setEditingExam(ex); setShowForm(true); }}><Pencil size={15} /></button>
                  <button className="sm-icon-btn" aria-label={`Delete ${ex.name}`} onClick={() => remove(ex.id)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && <ExamForm initial={editingExam} onSave={save} onClose={() => { setShowForm(false); setEditingExam(null); }} />}
    </div>
  );
}
