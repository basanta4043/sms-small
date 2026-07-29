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

function gradePointForGrade(grade) {
  const mapping = {
    "A+": 4.0,
    A: 3.6,
    "B+": 3.2,
    B: 2.8,
    "C+": 2.4,
    C: 2.0,
    D: 1.6,
    F: 0.0,
  };
  return mapping[String(grade || "").trim()] ?? 0.0;
}

function buildSheetData(exam, student, report, school) {
  const subjectRows = (report?.rows || []).map((row, idx) => ({
    name: row.subject || `Subject ${idx + 1}`,
    credit_hour: 1,
    th_grade: row.grade,
    pr_grade: row.grade,
    final_grade: row.grade,
    grade_point: Number(gradePointForGrade(row.grade).toFixed(2)),
    total_marks: row.obtained,
    highest_marks: row.maxMarks,
  }));

  const overallGrade = report?.overall?.grade || "";
  return {
    school: {
      name: school?.name || "Your School",
      address: school?.address || "",
      contact: school?.phone || school?.email || "",
      exam_title: exam?.name || "ANNUAL EXAMINATION",
      exam_year: exam?.term || "",
    },
    student: {
      name: student?.name || "",
      class: student?.className || student?.class || "",
      section: student?.section || "",
      roll_no: student?.rollNo || student?.roll_no || "",
    },
    subjects: subjectRows,
    summary: {
      gpa: Number(gradePointForGrade(overallGrade).toFixed(2)),
      total_marks: report?.totalObtained || 0,
      highest_total: report?.totalMax || 0,
      percentage: report?.overallPct || 0,
      attendance: "",
      rank: "",
      rank_section: "",
      extracurricular_grade: overallGrade,
      teacher_views: `${report?.overall?.remark || ""} — ${report?.allPass ? "PASS" : "NEEDS ATTENTION"}`,
    },
    footer: {
      result_issue_date: "",
      class_teacher: "",
      exam_controller: "",
      principal: "",
    },
  };
}

function GradesheetDoc({ exam, student, report, school, sheet, gradeScale, onClose }) {
  const sheetData = sheet || buildSheetData(exam, student, report, school);
  const scaleRows = (gradeScale || []).map((row, idx) => {
    const next = gradeScale[idx + 1];
    const min = row.min;
    const upper = next ? next.min - 1 : 100;
    const interval = min >= 90 ? `${min}% to 100%` : `${min}% to Below ${upper}%`;
    return {
      interval,
      point: Number(row.min ? (row.min / 25).toFixed(1) : 0).toString(),
      grade: row.grade,
      remark: row.remark,
    };
  });

  return (
    <Modal title="" onClose={onClose} wide>
      <div className="sm-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <button className="sm-btn sm-btn-gold" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </div>
      <div className="sm-print-area">
        <div className="sm-print-doc" style={{ padding: 0 }}>
          <style>{`
            .gradesheet-page {
              width: 100%;
              background: #fff;
              color: #111;
              border: 1px solid #e2e8f0;
              box-sizing: border-box;
              padding: 12mm 15mm 14mm;
              font-family: Arial, Helvetica, sans-serif;
            }
            .gradesheet-header { text-align: center; margin-bottom: 6mm; }
            .gradesheet-school-name { font-size: 20px; font-weight: 700; margin-bottom: 1mm; }
            .gradesheet-school-meta { font-size: 10px; color: #334155; margin-bottom: 1mm; }
            .gradesheet-exam-title { font-size: 15px; font-weight: 700; margin-top: 3mm; }
            .gradesheet-exam-year { font-size: 11px; font-weight: 700; margin-top: 1mm; }
            .gradesheet-label { display: inline-block; margin-top: 4mm; padding: 2mm 8mm; border: 1px solid #000; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; }
            .gradesheet-student-info { font-size: 11px; font-weight: 700; margin: 6mm 0 3mm; }
            .gradesheet-student-info span { display: inline-block; margin-right: 10mm; }
            .gradesheet-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
            .gradesheet-table th, .gradesheet-table td { border: 1px solid #000; padding: 1.2mm 1mm; text-align: center; vertical-align: middle; }
            .gradesheet-table th { background: #f8fafc; font-weight: 700; }
            .gradesheet-table .subject-name { text-align: left; padding-left: 2mm; }
            .gradesheet-summary-row td { font-weight: 700; }
            .gradesheet-flex { display: flex; gap: 4mm; margin-top: 4mm; align-items: flex-start; }
            .gradesheet-left { flex: 1.1; }
            .gradesheet-right { flex: 0.9; }
            .gradesheet-card { border: 1px solid #000; box-sizing: border-box; }
            .gradesheet-card-title { padding: 2mm 3mm; font-size: 9px; font-weight: 700; border-bottom: 1px solid #000; }
            .gradesheet-card-body { padding: 2mm 3mm; font-size: 9px; }
            .gradesheet-scale-table { font-size: 8px; }
            .gradesheet-scale-table th, .gradesheet-scale-table td { padding: 1.2mm; }
            .gradesheet-box-list { margin: 0; padding: 0; list-style: none; }
            .gradesheet-box-list li { border: 1px solid #000; padding: 2.2mm 3mm; margin-bottom: 2mm; font-size: 9px; font-weight: 700; }
            .gradesheet-extra { display: flex; margin-top: 3mm; }
            .gradesheet-extra-left { flex: 0.6; border: 1px solid #000; padding: 3mm; font-size: 8.7px; font-weight: 700; }
            .gradesheet-extra-right { flex: 0.4; border: 1px solid #000; border-left: none; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; }
            .gradesheet-teacher { margin-top: 3mm; border: 1px solid #000; padding: 3mm; min-height: 26mm; }
            .gradesheet-teacher-title { font-size: 9px; font-weight: 700; margin-bottom: 2mm; }
            .gradesheet-teacher-body { font-size: 9px; }
            @media print { .sm-no-print { display: none !important; } .gradesheet-page { border: none; padding: 10mm 12mm 12mm; } }
          `}</style>
          <div className="gradesheet-page">
            <div className="gradesheet-header">
              <div className="gradesheet-school-name">{sheetData.school.name || "SCHOOL NAME"}</div>
              <div className="gradesheet-school-meta">{sheetData.school.address || ""}</div>
              <div className="gradesheet-school-meta">{sheetData.school.contact || ""}</div>
              <div className="gradesheet-exam-title">{sheetData.school.exam_title || "ANNUAL EXAMINATION"}</div>
              <div className="gradesheet-exam-year">{sheetData.school.exam_year || ""}</div>
              <div className="gradesheet-label">GRADE SHEET</div>
            </div>
            <div className="gradesheet-student-info">
              <span>Name: {sheetData.student.name}</span>
              <span>Class: {sheetData.student.class}</span>
              <span>Section: {sheetData.student.section}</span>
              <span>Roll No.: {sheetData.student.roll_no}</span>
            </div>
            <table className="gradesheet-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Subject</th>
                  <th>Credit Hour</th>
                  <th>Th.</th>
                  <th>Pr.</th>
                  <th>Final Grade</th>
                  <th>Grade Point</th>
                  <th>Total Marks</th>
                  <th>Highest Marks</th>
                </tr>
              </thead>
              <tbody>
                {sheetData.subjects.map((subject, idx) => (
                  <tr key={`${subject.name}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td className="subject-name">{subject.name}</td>
                    <td>{subject.credit_hour}</td>
                    <td>{subject.th_grade}</td>
                    <td>{subject.pr_grade}</td>
                    <td>{subject.final_grade}</td>
                    <td>{subject.grade_point}</td>
                    <td>{subject.total_marks}</td>
                    <td>{subject.highest_marks}</td>
                  </tr>
                ))}
                <tr className="gradesheet-summary-row">
                  <td colSpan="6">Grade Point Average (GPA):</td>
                  <td>{sheetData.summary.gpa}</td>
                  <td colSpan="2"></td>
                </tr>
                <tr className="gradesheet-summary-row">
                  <td colSpan="6">Total Marks:</td>
                  <td colSpan="1"></td>
                  <td>{sheetData.summary.total_marks}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="gradesheet-flex">
              <div className="gradesheet-left">
                <div className="gradesheet-card">
                  <div className="gradesheet-card-title">Grading / GPA System</div>
                  <div className="gradesheet-card-body">
                    <table className="gradesheet-scale-table">
                      <thead>
                        <tr><th>Interval</th><th>Grade Point</th><th>Grade</th><th>Remarks</th></tr>
                      </thead>
                      <tbody>
                        {scaleRows.map((row) => (
                          <tr key={`${row.grade}-${row.interval}`}>
                            <td>{row.interval}</td>
                            <td>{row.point}</td>
                            <td>{row.grade}</td>
                            <td>{row.remark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="gradesheet-right">
                <ul className="gradesheet-box-list">
                  <li>Percentage: {sheetData.summary.percentage}%</li>
                  <li>Attendance: {sheetData.summary.attendance}</li>
                  <li>Rank: {sheetData.summary.rank} / Section Rank: {sheetData.summary.rank_section}</li>
                </ul>
                <div className="gradesheet-extra">
                  <div className="gradesheet-extra-left">EXTRACURRICULAR ACTIVITIES</div>
                  <div className="gradesheet-extra-right">{sheetData.summary.extracurricular_grade}</div>
                </div>
                <div className="gradesheet-teacher">
                  <div className="gradesheet-teacher-title">Teacher Views:</div>
                  <div className="gradesheet-teacher-body">{sheetData.summary.teacher_views}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function GradesheetsTab({ exams, students, results, gradeScale, school, token }) {
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");
  const exam = exams.find((e) => e.id === examId);
  const classStudents = exam ? students.filter((s) => String(s.className || "").trim().toLowerCase() === String(exam.className || "").trim().toLowerCase()) : [];

  useEffect(() => { setExamId(exams[0]?.id || ""); }, [exams.length]);

  async function view(sId) {
    setErr("");
    try {
      const student = classStudents.find((s) => s.id === sId);
      const data = await api(`/gradesheets/${examId}/${sId}`, { token });
      const report = data.report || computeReport(exam, student, null, gradeScale);
      setDoc({ student, report, sheet: data.sheet, gradeScale });
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
      {doc && <GradesheetDoc exam={exam} student={doc.student} report={doc.report} school={school} sheet={doc.sheet} gradeScale={doc.gradeScale} onClose={() => setDoc(null)} />}
    </div>
  );
}
