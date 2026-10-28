import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal, Empty } from "../Shared";
import { Field } from "../Shared";
import { api } from "../../api/client";
import { gradeFor } from "../../utils/helpers";

function computeReport(exam, student, result, gradeScale) {
  const rows = exam.subjects.map((sub) => {
    const m = (result?.marks || []).find((mk) => mk.subject === sub.name);
    const thMaxMarks = Number(sub.thMaxMarks ?? sub.maxMarks) || 0;
    const prMaxMarks = sub.hasPractical ? Number(sub.prMaxMarks) || 0 : 0;
    const thObtained = Number(m?.thObtained ?? m?.th_obtained ?? m?.obtained) || 0;
    const prObtained = sub.hasPractical ? Number(m?.prObtained ?? m?.pr_obtained) || 0 : 0;
    const maxMarks = thMaxMarks + prMaxMarks;
    const obtained = thObtained + prObtained;
    const pct = maxMarks ? (obtained / maxMarks) * 100 : 0;
    const thGrade = thMaxMarks ? gradeFor((thObtained / thMaxMarks) * 100, gradeScale).grade : "";
    const prGrade = prMaxMarks ? gradeFor((prObtained / prMaxMarks) * 100, gradeScale).grade : "";
    const g = gradeFor(pct, gradeScale);
    return { subject: sub.name, maxMarks, thMaxMarks, prMaxMarks, thObtained, prObtained, obtained, pct, thGrade, prGrade, grade: g.grade, pass: obtained >= sub.passMarks };
  });
  const totalMax = rows.reduce((s, row) => s + row.maxMarks, 0);
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

function attendanceDetails(value) {
  const match = String(value || "").match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) return { working: value || "", attended: "", absent: "" };
  const attended = Number(match[1]);
  const working = Number(match[2]);
  return {
    working,
    attended,
    absent: Math.max(0, working - attended),
  };
}

function classRankForStudent(exam, classStudents, results, examId, studentId, gradeScale) {
  const classScores = classStudents.flatMap((classStudent) => {
    const result = results.find((item) =>
      String(item.examId ?? item.exam_id) === String(examId)
      && String(item.studentId ?? item.student_id) === String(classStudent.id)
    );
    if (!result) return [];
    const report = computeReport(exam, classStudent, result, gradeScale);
    return [{ studentId: String(classStudent.id), gpa: gradePointForGrade(report.overall.grade) }];
  });
  const current = classScores.find((item) => item.studentId === String(studentId));
  if (!current) return "—";
  return classScores.filter((item) => item.gpa > current.gpa).length + 1;
}

function buildSheetData(exam, student, report, school) {
  const subjectRows = (report?.rows || []).map((row, idx) => ({
    name: row.subject || `Subject ${idx + 1}`,
    credit_hour: 1,
    th_grade: row.thGrade || row.grade,
    pr_grade: row.prGrade || "",
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
      logo_url: school?.logo_url || "",
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
    },
    footer: {
      result_issue_date: "",
      class_teacher: "",
      principal: "",
    },
  };
}

function GradesheetDoc({ exam, student, report, school, sheet, gradeScale, rank, onClose }) {
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
  const attendance = attendanceDetails(sheetData.summary.attendance);
  const minimumRows = Math.max(7, sheetData.subjects.length);

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
              padding: 10mm 12mm 10mm;
              font-family: Arial, Helvetica, sans-serif;
            }
            .gradesheet-header { position: relative; text-align: center; margin-bottom: 4mm; min-height: 31mm; }
            .gradesheet-logo { position: absolute; left: 0; top: 0; width: 23mm; height: 23mm; object-fit: contain; }
            .gradesheet-school-name { font-size: 17px; font-weight: 700; margin-bottom: 1mm; }
            .gradesheet-school-meta { font-size: 10px; color: #334155; margin-bottom: 1mm; }
            .gradesheet-school-address { font-size: 11px; }
            .gradesheet-label { margin-top: 2mm; font-size: 17px; font-weight: 700; font-style: italic; }
            .gradesheet-exam-title { font-size: 12px; font-weight: 700; margin-top: 1mm; }
            .gradesheet-exam-year { font-size: 10px; font-weight: 700; margin-top: 1mm; }
            .gradesheet-student-info { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 2mm; font-size: 10px; font-weight: 700; margin: 3mm 0 2mm; }
            .gradesheet-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
            .gradesheet-table th, .gradesheet-table td { border: 1px solid #000; padding: 1.05mm .8mm; text-align: center; vertical-align: middle; }
            .gradesheet-table th { background: #f8fafc; font-weight: 700; }
            .gradesheet-table .subject-name { text-align: left; padding-left: 2mm; }
            .gradesheet-table thead tr:first-child th:nth-child(3) { border-bottom: none; }
            .gradesheet-summary-row td { font-weight: 700; }
            .gradesheet-gpa { border: 1px solid #000; border-top: none; text-align: center; padding: 2mm; font-size: 10px; font-weight: 700; }
            .gradesheet-gpa strong { margin-left: 4mm; }
            .gradesheet-flex { display: flex; gap: 0; margin-top: 4mm; align-items: stretch; }
            .gradesheet-left { flex: 1.55; }
            .gradesheet-right { flex: .8; }
            .gradesheet-scale-table, .gradesheet-attendance-table { width: 100%; height: 100%; border-collapse: collapse; font-size: 8px; }
            .gradesheet-scale-table th, .gradesheet-scale-table td, .gradesheet-attendance-table th, .gradesheet-attendance-table td { border: 1px solid #000; padding: 1.05mm .8mm; text-align: center; }
            .gradesheet-scale-title, .gradesheet-attendance-title { font-weight: 700; font-size: 9px; }
            .gradesheet-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 12mm; font-size: 9px; }
            .gradesheet-seal-wrap { display: flex; flex-direction: column; align-items: center; gap: 1.5mm; font-size: 7px; font-weight: 700; }
            .gradesheet-seal { width: 22mm; height: 22mm; border: 1px solid #555; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 7px; font-weight: 700; text-align: center; }
            .gradesheet-seal img { width: 100%; height: 100%; object-fit: contain; }
            .gradesheet-signatures { display: flex; flex: 1; justify-content: space-around; gap: 7mm; margin-left: 8mm; }
            .gradesheet-sign { width: 28%; text-align: center; }
            .gradesheet-sign-line { border-top: 1px solid #000; height: 1px; margin-bottom: 2mm; }
            @media print { .sm-no-print { display: none !important; } .gradesheet-page { border: none; padding: 8mm 10mm; } }
          `}</style>
          <div className="gradesheet-page">
            <div className="gradesheet-header">
              {sheetData.school.logo_url && <img className="gradesheet-logo" src={sheetData.school.logo_url} alt="School logo" />}
              <div className="gradesheet-school-name">{sheetData.school.name || "SCHOOL NAME"}</div>
              <div className="gradesheet-school-meta gradesheet-school-address">{sheetData.school.address || ""}</div>
              <div className="gradesheet-school-meta">{sheetData.school.contact || ""}</div>
              <div className="gradesheet-label">GRADE SHEET</div>
              <div className="gradesheet-exam-title">{sheetData.school.exam_title || "ANNUAL EXAMINATION"}{sheetData.school.exam_year ? ` — ${sheetData.school.exam_year}` : ""}</div>
            </div>
            <div className="gradesheet-student-info">
              <span>Name: {sheetData.student.name}</span>
              <span>Class: {sheetData.student.class}</span>
              <span>Roll No.: {sheetData.student.roll_no} &nbsp; Class Rank: {rank}</span>
            </div>
            <table className="gradesheet-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Subject</th>
                  <th colSpan="2">Obtained Grade</th>
                  <th>Final Grade</th>
                  <th>Grade Point</th>
                  <th rowSpan="2">Remarks</th>
                </tr>
                <tr>
                  <th></th><th></th><th>Th.</th><th>Pr.</th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: minimumRows }, (_, idx) => {
                  const subject = sheetData.subjects[idx];
                  return (
                  <tr key={`${subject?.name || "blank"}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td className="subject-name">{subject?.name || ""}</td>
                    <td>{subject?.th_grade || ""}</td>
                    <td>{subject?.pr_grade || ""}</td>
                    <td>{subject?.final_grade || ""}</td>
                    <td>{subject?.grade_point ?? ""}</td>
                    <td></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="gradesheet-gpa">Grade Point Average (GPA): <strong>{sheetData.summary.gpa}</strong></div>
            <div className="gradesheet-flex">
              <div className="gradesheet-left">
                <table className="gradesheet-scale-table">
                  <thead>
                    <tr><th colSpan="4" className="gradesheet-scale-title">Letter Grading Is Assign As:</th></tr>
                    <tr><th>Interval in %</th><th>Grade</th><th>Description</th><th>Grade Point</th></tr>
                  </thead>
                  <tbody>
                    {scaleRows.map((row) => (
                      <tr key={`${row.grade}-${row.interval}`}>
                        <td>{row.interval}</td><td>{row.grade}</td><td>{row.remark}</td><td>{row.point}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="gradesheet-right">
                <table className="gradesheet-attendance-table">
                  <thead><tr><th colSpan="2" className="gradesheet-attendance-title">Attendance</th></tr></thead>
                  <tbody>
                    <tr><th>Working Days</th><td>{attendance.working}</td></tr>
                    <tr><th>Attend Days</th><td>{attendance.attended}</td></tr>
                    <tr><th>Absent Days</th><td>{attendance.absent}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="gradesheet-footer">
              <div className="gradesheet-seal-wrap">
                <div className="gradesheet-seal">{sheetData.school.logo_url ? <img src={sheetData.school.logo_url} alt="School logo" /> : "SCHOOL LOGO"}</div>
                <span>SCHOOL SEAL</span>
              </div>
              <div className="gradesheet-signatures">
                <div className="gradesheet-sign"><div className="gradesheet-sign-line"></div>Class Teacher</div>
                <div className="gradesheet-sign"><div className="gradesheet-sign-line"></div>Issue Date</div>
                <div className="gradesheet-sign"><div className="gradesheet-sign-line"></div>Principal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function GradesheetsTab({ exams, students, results, gradeScale, school, token }) {
  const [examId, setExamId] = useState(exams[0]?.id != null ? String(exams[0].id) : "");
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");
  const exam = exams.find((e) => String(e.id) === String(examId));
  const classStudents = exam ? students.filter((s) => String(s.className || "").trim().toLowerCase() === String(exam.className || "").trim().toLowerCase()) : [];

  useEffect(() => { setExamId(exams[0]?.id != null ? String(exams[0].id) : ""); }, [exams.length]);

  async function view(sId) {
    setErr("");
    try {
      const student = classStudents.find((s) => String(s.id) === String(sId));
      const data = await api(`/gradesheets/${examId}/${sId}`, { token });
      const report = data.report || computeReport(exam, student, null, gradeScale);
      const rank = classRankForStudent(exam, classStudents, results, examId, sId, gradeScale);
      setDoc({ student, report, sheet: data.sheet, gradeScale, rank });
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
      {doc && <GradesheetDoc exam={exam} student={doc.student} report={doc.report} school={school} sheet={doc.sheet} gradeScale={doc.gradeScale} rank={doc.rank} onClose={() => setDoc(null)} />}
    </div>
  );
}
