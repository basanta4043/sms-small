import React, { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Field, Empty } from "../Shared";
import { api } from "../../api/client";
import { camelizeKeys } from "../../utils/helpers";

export default function ResultsTab({ exams, students, results, setResults, token }) {
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const exam = exams.find((e) => e.id === examId);
  const classStudents = exam ? students.filter((s) => String(s.className || "").trim().toLowerCase() === String(exam.className || "").trim().toLowerCase()) : [];
  const [studentId, setStudentId] = useState("");
  const [marks, setMarks] = useState({});
  const [err, setErr] = useState("");

  useEffect(() => { setExamId(exams[0]?.id || ""); }, [exams.length]);
  useEffect(() => { setStudentId(""); setMarks({}); }, [examId]);

  function openEntry(sId) {
    setStudentId(sId);
    const existing = results.find((r) => String(r.examId) === String(examId) && String(r.studentId) === String(sId));
    if (existing) {
      const m = {};
      existing.marks.forEach((mk) => { m[mk.subject] = mk.obtained; });
      setMarks(m);
    } else {
      setMarks({});
    }
  }

  async function saveMarks() {
    if (!exam || !studentId) return;
    setErr("");
    try {
      const markRows = exam.subjects.map((sub) => ({ subject: sub.name, obtained: Number(marks[sub.name]) || 0, maxMarks: sub.maxMarks }));
      const data = await api("/results", {
        method: "POST",
        body: { exam_id: Number(examId), student_id: Number(studentId), marks: markRows },
        token,
      });
      const saved = camelizeKeys(data.result);
      setResults((prev) => {
        const filtered = prev.filter((r) => !(String(r.examId) === String(saved.examId) && String(r.studentId) === String(saved.studentId)));
        return [...filtered, saved];
      });
      setStudentId(""); setMarks({});
    } catch (e) {
      setErr(e.message || "Unable to save marks.");
    }
  }

  const existingResultIds = new Set(results.filter((r) => String(r.examId) === String(examId)).map((r) => String(r.studentId)));

  return (
    <div>
      <div className="sm-panel" style={{ marginBottom: 16 }}>
        <div className="sm-panel-head">
          <Field label="Exam">
            <select className="sm-select" value={examId} onChange={(e) => setExamId(e.target.value)} style={{ minWidth: 240 }}>
              {exams.length === 0 && <option value="">Create an exam first</option>}
              {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} — {ex.className}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {err && <div className="sm-error" style={{ margin: "0 18px 12px" }}>{err}</div>}
      {exam && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <div className="sm-panel">
            <div className="sm-panel-head"><span style={{ fontSize: 13, fontWeight: 700 }}>{exam.className} students</span></div>
            {classStudents.length === 0 ? <Empty text="No students in this class." /> : (
              <div>
                {classStudents.map((s) => (
                  <button key={s.id} onClick={() => openEntry(s.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                      padding: "10px 18px", border: "none", borderBottom: "1px solid var(--line)", background: studentId === s.id ? "var(--paper)" : "#fff",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, textAlign: "left"
                    }}>
                    <span>{s.name}</span>
                    {existingResultIds.has(s.id) ? <span className="sm-pill sm-pill-sage">Entered</span> : <ChevronRight size={14} color="var(--slate)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sm-panel">
            <div className="sm-panel-head"><span style={{ fontSize: 13, fontWeight: 700 }}>{studentId ? `Marks for ${classStudents.find((s) => s.id === studentId)?.name}` : "Select a student"}</span></div>
            {studentId ? (
              <div style={{ padding: 18 }}>
                {exam.subjects.map((sub) => (
                  <Field key={sub.name} label={`${sub.name} (out of ${sub.maxMarks})`}>
                    <input className="sm-input" type="number" min="0" max={sub.maxMarks} value={marks[sub.name] ?? ""} onChange={(e) => setMarks((p) => ({ ...p, [sub.name]: e.target.value }))} />
                  </Field>
                ))}
                <button className="sm-btn sm-btn-primary" onClick={saveMarks}><Check size={16} /> Save marks</button>
              </div>
            ) : <Empty text="Choose a student on the left to enter or edit marks." />}
          </div>
        </div>
      )}
    </div>
  );
}
