#!/usr/bin/env python3
"""Render a gradesheet as HTML and optionally export it to PDF for printing."""

import argparse
import json
import html
import os
from pathlib import Path
from typing import Any

from weasyprint import HTML


DEFAULT_GRADING_SCALE = [
    ("90% to 100%", "4.0", "A+", "Outstanding"),
    ("80% to Below 90%", "3.6", "A", "Excellent"),
    ("70% to Below 80%", "3.2", "B+", "Very Good"),
    ("60% to Below 70%", "2.8", "B", "Good"),
    ("50% to Below 60%", "2.4", "C+", "Satisfactory"),
    ("40% to Below 50%", "2.0", "C", "Acceptable"),
    ("35% to Below 40%", "1.6", "D", "Basic"),
    ("Below 35%", "-", "NG", "Non Graded"),
]


def _f(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _compute_summary(subjects: list[dict[str, Any]], summary: dict[str, Any] | None) -> dict[str, Any]:
    summary = dict(summary or {})
    if "total_marks" not in summary:
        summary["total_marks"] = sum(_f(s.get("total_marks")) for s in subjects)
    if "highest_total" not in summary:
        summary["highest_total"] = sum(_f(s.get("highest_marks")) for s in subjects)
    if "percentage" not in summary and summary.get("highest_total"):
        summary["percentage"] = round(summary["total_marks"] / summary["highest_total"] * 100, 2)
    if "gpa" not in summary and subjects:
        points = [_f(s.get("grade_point")) for s in subjects if s.get("grade_point") is not None]
        if points:
            summary["gpa"] = round(sum(points) / len(points), 2)
    return summary


def _format_value(value: Any) -> str:
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    return str(value or "")


def render_gradesheet_html(data: dict[str, Any]) -> str:
    subjects = data.get("subjects", [])
    summary = _compute_summary(subjects, data.get("summary", {}))
    footer = data.get("footer", {})
    school = data.get("school", {})
    student = data.get("student", {})
    grading_scale = data.get("grading_scale", DEFAULT_GRADING_SCALE)

    subject_rows = []
    for idx, subject in enumerate(subjects, start=1):
        subject_rows.append(
            f"""
            <tr>
                <td>{idx}</td>
                <td>{html.escape(str(subject.get('name', '')))}</td>
                <td>{html.escape(_format_value(subject.get('credit_hour', '')))}</td>
                <td>{html.escape(_format_value(subject.get('th_grade', '')))}</td>
                <td>{html.escape(_format_value(subject.get('pr_grade', '')))}</td>
                <td>{html.escape(_format_value(subject.get('final_grade', '')))}</td>
                <td>{html.escape(_format_value(subject.get('grade_point', '')))}</td>
                <td>{html.escape(_format_value(subject.get('total_marks', '')))}</td>
                <td>{html.escape(_format_value(subject.get('highest_marks', '')))}</td>
            </tr>
            """
        )

    scale_rows = []
    for interval, point, grade, remark in grading_scale:
        scale_rows.append(
            f"<tr><td>{html.escape(str(interval))}</td><td>{html.escape(str(point))}</td><td>{html.escape(str(grade))}</td><td>{html.escape(str(remark))}</td></tr>"
        )

    pct = summary.get("percentage", "")
    pct_str = f"{pct:.2f}%" if isinstance(pct, (int, float)) else str(pct)

    school_name = html.escape(str(school.get("name", "SCHOOL NAME")))
    school_address = html.escape(str(school.get("address", "")))
    school_contact = html.escape(str(school.get("contact", "")))
    exam_title = html.escape(str(school.get("exam_title", "ANNUAL EXAMINATION")))
    exam_year = html.escape(str(school.get("exam_year", "")))
    student_name = html.escape(str(student.get("name", "")))
    student_class = html.escape(str(student.get("class", "")))
    student_section = html.escape(str(student.get("section", "")))
    student_roll = html.escape(str(student.get("roll_no", "")))

    return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Gradesheet</title>
  <style>
    @page {{ size: A4; margin: 0; }}
    body {{
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f2f2f2;
      color: #111;
      line-height: 1.2;
    }}
    .page {{
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      box-sizing: border-box;
      padding: 12mm 15mm 14mm;
      box-shadow: 0 0 8px rgba(0,0,0,0.15);
    }}
    .header {{ text-align: center; margin-bottom: 6mm; }}
    .school-name {{ font-size: 20px; font-weight: 700; margin-bottom: 1mm; }}
    .school-meta {{ font-size: 10px; color: #333; margin-bottom: 1mm; }}
    .school-address {{ font-size: 12px; }}
    .exam-title {{ font-size: 15px; font-weight: 700; margin-top: 3mm; }}
    .exam-year {{ font-size: 11px; font-weight: 700; margin-top: 1mm; }}
    .sheet-label {{
      display: inline-block;
      margin-top: 4mm;
      padding: 2mm 8mm;
      border: 1px solid #000;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
    }}
    .student-info {{ font-size: 11px; font-weight: 700; margin: 6mm 0 3mm; }}
    .student-info span {{ display: inline-block; margin-right: 10mm; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }}
    th, td {{ border: 1px solid #000; padding: 1.2mm 1mm; text-align: center; vertical-align: middle; }}
    th {{ background: #f7f7f7; font-weight: 700; }}
    .subject-name {{ text-align: left; padding-left: 2mm; }}
    .summary-row td {{ font-weight: 700; }}
    .flex-row {{ display: flex; gap: 4mm; margin-top: 4mm; align-items: flex-start; }}
    .left-panel {{ flex: 1.1; }}
    .right-panel {{ flex: 0.9; }}
    .card {{ border: 1px solid #000; box-sizing: border-box; }}
    .card-title {{ padding: 2mm 3mm; font-size: 9px; font-weight: 700; border-bottom: 1px solid #000; }}
    .card-body {{ padding: 2mm 3mm; font-size: 9px; }}
    .scale-table {{ font-size: 8px; }}
    .scale-table th, .scale-table td {{ padding: 1.2mm; }}
    .box-list {{ margin: 0; padding: 0; list-style: none; }}
    .box-list li {{ border: 1px solid #000; padding: 2.2mm 3mm; margin-bottom: 2mm; font-size: 9px; font-weight: 700; }}
    .extra {{ display: flex; margin-top: 3mm; }}
    .extra .left {{ flex: 0.6; border: 1px solid #000; padding: 3mm; font-size: 8.7px; font-weight: 700; }}
    .extra .right {{ flex: 0.4; border: 1px solid #000; border-left: none; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; }}
    .footer {{ margin-top: 10mm; text-align: center; font-size: 8.5px; }}
    .footer-line {{ border-top: 1px solid #000; width: 70%; margin: 8mm auto 2mm; }}
    .signatures {{ display: flex; justify-content: space-between; font-size: 9px; margin-top: 8mm; }}
    .sign {{ width: 23%; text-align: center; }}
    .sign .line {{ border-top: 1px solid #000; margin-top: 10mm; }}
    .print-actions {{ margin-bottom: 4mm; text-align: right; }}
    .print-actions button {{ padding: 2mm 4mm; font-size: 9px; cursor: pointer; }}
    @media print {{
      body {{ background: white; }}
      .page {{ box-shadow: none; width: 100%; min-height: auto; padding: 10mm 12mm 12mm; }}
      .print-actions {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class=\"page\">
    <div class=\"print-actions\">
      <button onclick=\"window.print()\">Print</button>
    </div>
    <div class=\"header\">
      <div class=\"school-name\">{school_name}</div>
      <div class=\"school-meta school-address\">{school_address}</div>
      <div class=\"school-meta\">{school_contact}</div>
      <div class=\"exam-title\">{exam_title}</div>
      <div class=\"exam-year\">{exam_year}</div>
      <div class=\"sheet-label\">GRADE SHEET</div>
    </div>

    <div class=\"student-info\">
      <span>Name: {student_name}</span>
      <span>Class: {student_class}</span>
      <span>Section: {student_section}</span>
      <span>Roll No.: {student_roll}</span>
    </div>

    <table>
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
        {''.join(subject_rows)}
        <tr class=\"summary-row\">
          <td colspan=\"6\">Grade Point Average (GPA):</td>
          <td>{html.escape(_format_value(summary.get('gpa', '')))}</td>
          <td colspan=\"2\"></td>
        </tr>
        <tr class=\"summary-row\">
          <td colspan=\"6\">Total Marks:</td>
          <td colspan=\"1\"></td>
          <td>{html.escape(_format_value(summary.get('total_marks', '')))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class=\"flex-row\">
      <div class=\"left-panel\">
        <div class=\"card\">
          <div class=\"card-title\">Grading / GPA System</div>
          <div class=\"card-body\">
            <table class=\"scale-table\">
              <thead>
                <tr><th>Interval</th><th>Grade Point</th><th>Grade</th><th>Remarks</th></tr>
              </thead>
              <tbody>{''.join(scale_rows)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class=\"right-panel\">
        <ul class=\"box-list\">
          <li>Percentage: {pct_str}</li>
          <li>Attendance: {html.escape(str(summary.get('attendance', '')))}</li>
          <li>Rank: {html.escape(_format_value(summary.get('rank', '')))} / Section Rank: {html.escape(_format_value(summary.get('rank_section', '')))}</li>
        </ul>
        <div class=\"extra\">
          <div class=\"left\">EXTRACURRICULAR ACTIVITIES</div>
          <div class=\"right\">{html.escape(str(summary.get('extracurricular_grade', '')))}</div>
        </div>
      </div>
    </div>

    <div class=\"footer\">
      <div>{html.escape(str(footer.get('result_issue_date', '')))}</div>
      <div class=\"footer-line\"></div>
      <div class=\"signatures\">
        <div class=\"sign\">Class Teacher<div class=\"line\"></div></div>
        <div class=\"sign\">Result Issue Date<div class=\"line\"></div></div>
        <div class=\"sign\">Principal<div class=\"line\"></div></div>
      </div>
    </div>
  </div>
</body>
</html>"""


def write_html(input_path: Path, output_html: Path) -> None:
    with input_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    html_content = render_gradesheet_html(data)
    output_html.write_text(html_content, encoding="utf-8")


def export_pdf(html_path: Path, output_pdf: Path) -> None:
    HTML(filename=str(html_path)).write_pdf(str(output_pdf))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an HTML gradesheet and optionally export it to PDF")
    parser.add_argument("input_json", nargs="?", default="sample_data.json", help="Path to the JSON data file")
    parser.add_argument("output_html", nargs="?", default="output.html", help="Path to write the generated HTML")
    parser.add_argument("--pdf", dest="output_pdf", help="Optional path to write a printable PDF")
    parser.add_argument("--print", action="store_true", help="Generate the PDF as well as the HTML")
    args = parser.parse_args()

    input_path = Path(args.input_json)
    output_html = Path(args.output_html)

    write_html(input_path, output_html)
    print(f"Saved HTML: {output_html}")

    if args.print or args.output_pdf:
        pdf_path = Path(args.output_pdf) if args.output_pdf else output_html.with_suffix(".pdf")
        export_pdf(output_html, pdf_path)
        print(f"Saved PDF: {pdf_path}")


if __name__ == "__main__":
    main()
