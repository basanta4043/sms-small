import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal, Empty } from "../Shared";
import { Field } from "../Shared";
import { api } from "../../api/client";
import { gradeFor } from "../../utils/helpers";

function computeReport(exam, student, result, gradeScale) {
  const rows = exam.subjects.map((sub) => {
    const m = result?.marks.find((mk) => mk.subject === sub.name);
    const obtained = m ? m.obtained : 0;
    const pct = sub.maxMarks ? (obtained / sub.maxMarks) * 100 : 0;
    const g = gradeFor(pct, gradeScale);
    return { subject: sub.name, maxMarks: sub.maxMarks, obtained, pct, grade: g.grade, pass: obtained >= sub.passMarks };
  });
  const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
  const totalObtained = rows.reduce((s, r) => s + r.obtained, 0);
  const overallPct = totalMax ? (totalObtained / totalMax) * 100 : 0;
  const overall = gradeFor(overallPct, gradeScale);
  const allPass = rows.every((r) => r.pass);
  return { rows, totalMax, totalObtained, overallPct, overall, allPass };
}

function GradesheetDoc({ exam, student, report, school, onClose }) {
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
              <div style={{ fontSize: 12, color: "var(--slate)" }}>Grade Sheet — {exam.name}{exam.term ? ` (${exam.term})` : ""}</div>
            </div>
            <div className="sm-print-seal">{(school.name || "S").trim()[0]?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Student</div>
              <div style={{ fontWeight: 700 }}>{student.name}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{student.className}{student.rollNo ? ` · Roll ${student.rollNo}` : ""}</div>
            </div>
          </div>
          <table className="sm-table" style={{ marginBottom: 14 }}>
            <thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>%</th><th>Grade</th></tr></thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.subject}>
                  <td>{r.subject}</td>
                  <td className="sm-mono">{r.maxMarks}</td>
                  <td className="sm-mono">{r.obtained}</td>
                  <td className="sm-mono">{r.pct.toFixed(1)}%</td>
                  <td><span className={"sm-pill " + (r.pass ? "sm-pill-sage" : "sm-pill-rust")}>{r.grade}</span></td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.totalMax}</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.totalObtained}</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.overallPct.toFixed(1)}%</td>
                <td><span className={"sm-pill " + (report.allPass ? "sm-pill-sage" : "sm-pill-rust")}>{report.overall.grade}</span></td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={"sm-stamp" + (report.allPass ? "" : " sm-stamp-due")}>{report.allPass ? "PASS" : "NEEDS ATTENTION"}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{report.overall.remark}</div>
              <div className="sm-display" style={{ fontSize: 22 }}>{report.overall.grade}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function GradesheetsTab({ exams, students, results, gradeScale, school, token }) {
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const [studentId, setStudentId] = useState("");
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");
  const exam = exams.find((e) => e.id === examId);
  const classStudents = exam ? students.filter((s) => String(s.className || "").trim().toLowerCase() === String(exam.className || "").trim().toLowerCase()) : [];

  useEffect(() => { setExamId(exams[0]?.id || ""); }, [exams.length]);
  useEffect(() => { setStudentId(""); }, [examId]);

  async function view(sId) {
    setErr("");
    try {
      const student = classStudents.find((s) => s.id === sId);
      const data = await api(`/gradesheets/${examId}/${sId}`, { token });
      const report = data.report || computeReport(exam, student, null, gradeScale);
      setDoc({ student, report });
    } catch (e) {
      setErr(e.message || "Unable to load gradesheet.");
    }
  }

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
        <div className="sm-panel">
          {classStudents.length === 0 ? <Empty text="No students in this class." /> : (
            <table className="sm-table">
              <thead><tr><th>Student</th><th>Result status</th><th></th></tr></thead>
              <tbody>
                {classStudents.map((s) => {
                  const has = results.some((r) => String(r.examId) === String(examId) && String(r.studentId) === String(s.id));
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{has ? <span className="sm-pill sm-pill-sage">Marks entered</span> : <span className="sm-pill sm-pill-gold">No marks yet</span>}</td>
                      <td><button className="sm-btn sm-btn-ghost" style={{ padding: "5px 12px", fontSize: 12.5 }} onClick={() => view(s.id)}><Printer size={13} /> Gradesheet</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {doc && <GradesheetDoc exam={exam} student={doc.student} report={doc.report} school={school} onClose={() => setDoc(null)} />}
    </div>
  );
}
