
import json
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth


# ---------------------------------------------------------------------------
# Static grading scale used to render the "Grading / GPA System" reference
# table on the sheet. Override via data["grading_scale"] if a school uses a
# different scale.
# ---------------------------------------------------------------------------
DEFAULT_GRADING_SCALE = [
    ("90% to 100%", "4.0", "A+", "Outstanding"),
    ("80% to Below 90%", "3.6", "A", "Excellent"),
    ("70% to Below 80%", "3.2", "B+", "Very Good"),
    ("60% to Below 70%", "2.8", "B", "Good"),
    ("50% to Below 60%", "2.4", "C+", "Satisfactory"),
    ("40% to Below 50%", "2.0", "C", "Acceptable"),
    ("35% to Below 40%", "1.6", "D", "Basic"),
    ("Below 35%", "-", "NG", "Not Graded"),
]


def _f(x, default=0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def _compute_summary(subjects, summary):
    """Fill in gpa / total_marks / percentage if the caller didn't supply them."""
    summary = dict(summary or {})

    if "total_marks" not in summary:
        summary["total_marks"] = sum(_f(s.get("total_marks")) for s in subjects)

    if "highest_total" not in summary:
        summary["highest_total"] = sum(_f(s.get("highest_marks")) for s in subjects)

    if "percentage" not in summary and summary.get("highest_total"):
        summary["percentage"] = round(
            summary["total_marks"] / summary["highest_total"] * 100, 2
        )

    if "gpa" not in summary and subjects:
        points = [_f(s.get("grade_point")) for s in subjects if s.get("grade_point") is not None]
        if points:
            summary["gpa"] = round(sum(points) / len(points), 2)

    return summary


class GradesheetPDF:
    def __init__(self, c, data):
        self.c = c
        self.data = data
        self.page_w, self.page_h = A4
        self.margin = 15 * mm
        self.left = self.margin
        self.right = self.page_w - self.margin
        self.width = self.right - self.left

    # -- low level helpers ---------------------------------------------
    def text(self, x, y, s, font="Helvetica", size=10, color=colors.black,
              align="left"):
        c = self.c
        c.setFont(font, size)
        c.setFillColor(color)
        if align == "left":
            c.drawString(x, y, s)
        elif align == "center":
            c.drawCentredString(x, y, s)
        elif align == "right":
            c.drawRightString(x, y, s)

    def rect(self, x, y, w, h, stroke=1, fill=0, line_width=0.8):
        self.c.setLineWidth(line_width)
        self.c.setStrokeColor(colors.black)
        self.c.rect(x, y, w, h, stroke=stroke, fill=fill)

    def line(self, x1, y1, x2, y2, width=0.8):
        self.c.setLineWidth(width)
        self.c.setStrokeColor(colors.black)
        self.c.line(x1, y1, x2, y2)

    def wrap_text(self, text, font, size, max_width):
        """Very small greedy word-wrapper, returns list of lines."""
        words = str(text).split()
        lines, cur = [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if stringWidth(trial, font, size) <= max_width:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines or [""]

    # -- sections ---------------------------------------------------------
    def draw_header(self, y_top):
        school = self.data.get("school", {})
        c = self.c
        cx = (self.left + self.right) / 2

        # Logo (left)
        logo_path = school.get("logo_path")
        if logo_path:
            try:
                img = ImageReader(logo_path)
                iw, ih = img.getSize()
                size = 22 * mm
                h = size
                w = size * iw / ih
                c.drawImage(img, self.left, y_top - h, width=w, height=h,
                             preserveAspectRatio=True, mask='auto')
            except Exception:
                pass

        # Badge / award image (right)
        badge_path = school.get("badge_path")
        if badge_path:
            try:
                img = ImageReader(badge_path)
                iw, ih = img.getSize()
                h = 20 * mm
                w = h * iw / ih
                c.drawImage(img, self.right - w, y_top - h, width=w, height=h,
                             preserveAspectRatio=True, mask='auto')
            except Exception:
                pass

        # School name / address / contact / title (center)
        y = y_top - 6 * mm
        self.text(cx, y, school.get("name", "SCHOOL NAME"), "Helvetica-Bold", 18,
                   align="center")
        y -= 6 * mm
        if school.get("address"):
            self.text(cx, y, school["address"], "Helvetica", 12, align="center")
            y -= 5 * mm
        if school.get("contact"):
            self.text(cx, y, school["contact"], "Helvetica", 9.5, align="center")
            y -= 6.5 * mm

        self.text(cx, y, school.get("exam_title", "ANNUAL EXAMINATION"),
                   "Helvetica-Bold", 15, align="center")
        y -= 6 * mm
        if school.get("exam_year"):
            self.text(cx, y, str(school["exam_year"]), "Helvetica-Bold", 11,
                       align="center")
            y -= 7 * mm

        # "GRADE SHEET" boxed label
        label = "GRADE SHEET"
        box_w = stringWidth(label, "Helvetica-Bold", 11) + 10 * mm
        box_h = 6.5 * mm
        bx = cx - box_w / 2
        self.rect(bx, y - box_h + 2 * mm, box_w, box_h)
        self.text(cx, y - box_h + 2 * mm + 2, label, "Helvetica-Bold", 11,
                   align="center")
        y -= box_h + 3 * mm
        return y

    def draw_student_info(self, y):
        s = self.data.get("student", {})
        self.text(self.left, y, f"Name:  {s.get('name', '')}", "Helvetica-Bold", 11)
        y -= 8 * mm
        col2 = self.left + 0.42 * self.width
        col3 = self.left + 0.72 * self.width
        self.text(self.left, y, f"Class: {s.get('class', '')}", "Helvetica-Bold", 10.5)
        self.text(col2, y, f"Section : {s.get('section', '')}", "Helvetica-Bold", 10.5)
        self.text(col3, y, f"Roll No.: {s.get('roll_no', '')}", "Helvetica-Bold", 10.5)
        y -= 6 * mm
        return y

    def draw_subject_table(self, y_top, subjects, min_rows=7):
        """Draws the main subject grid; returns the y-coordinate of its bottom."""
        c = self.c
        # column widths (fractions of total width)
        cols = [
            ("S.N.", 0.045),
            ("Subject", 0.30),
            ("Credit\nHour", 0.075),
            ("Th.", 0.06),      # under "Obtained Grade"
            ("Pr.", 0.06),      # under "Obtained Grade"
            ("Final\nGrade", 0.08),
            ("Grade\nPoint", 0.075),
            ("Total\nMarks", 0.09),
            ("Highest\nMarks", 0.10),
        ]
        # normalize widths to self.width
        total_frac = sum(w for _, w in cols)
        widths = [self.width * (w / total_frac) for _, w in cols]
        x_positions = [self.left]
        for w in widths:
            x_positions.append(x_positions[-1] + w)

        header_h = 14 * mm
        row_h = 7.2 * mm
        n_rows = max(min_rows, len(subjects))
        table_h = header_h + row_h * n_rows
        y_bottom = y_top - table_h

        # outer box
        self.rect(self.left, y_bottom, self.width, table_h)

        # vertical lines (skip the split between Th/Pr merge under "Obtained Grade")
        for x in x_positions[1:-1]:
            self.line(x, y_bottom, x, y_top)

        # horizontal line under the top header row (splits "Obtained Grade" span)
        sub_header_y = y_top - 7 * mm
        self.line(self.left, sub_header_y, self.right, sub_header_y)
        # header/body divider
        self.line(self.left, y_top - header_h, self.right, y_top - header_h)

        # "Obtained Grade" spanning header over Th/Pr columns
        th_x0, th_x1 = x_positions[3], x_positions[5]
        self.text((th_x0 + th_x1) / 2, y_top - 5 * mm, "Obtained Grade",
                   "Helvetica-Bold", 9, align="center")

        # column headers
        for i, (label, _) in enumerate(cols):
            cx = (x_positions[i] + x_positions[i + 1]) / 2
            lines = label.split("\n")
            if label == "Th." or label == "Pr.":
                ty = sub_header_y - 5 * mm
                self.text(cx, ty, label, "Helvetica-Bold", 9, align="center")
                continue
            if label == "Subject" or label == "S.N.":
                ty = y_top - header_h + header_h / 2 - 1.5 * mm
                self.text(cx, ty, label, "Helvetica-Bold", 9, align="center")
                continue
            # multi-line headers centered vertically in the top area
            ty = y_top - 5 * mm
            for j, ln in enumerate(lines):
                self.text(cx, ty - j * 3.6 * mm, ln, "Helvetica-Bold", 9, align="center")

        # body rows
        row_top = y_top - header_h
        for r in range(n_rows):
            ry_top = row_top - r * row_h
            ry_bottom = ry_top - row_h
            if r > 0:
                self.line(self.left, ry_top, self.right, ry_top)
            if r < len(subjects):
                s = subjects[r]
                vals = [
                    str(r + 1),
                    str(s.get("name", "")),
                    str(s.get("credit_hour", "")),
                    str(s.get("th_grade", "")),
                    str(s.get("pr_grade", "")),
                    str(s.get("final_grade", "")),
                    str(s.get("grade_point", "")),
                    str(s.get("total_marks", "")),
                    str(s.get("highest_marks", "")),
                ]
                mid_y = ry_top - row_h / 2 - 1.4 * mm
                for i, val in enumerate(vals):
                    cx0 = x_positions[i]
                    cxw = widths[i]
                    if i == 1:  # subject name, left-aligned, may wrap
                        max_w = cxw - 3 * mm
                        lines = self.wrap_text(val, "Helvetica", 8.7, max_w)
                        if len(lines) == 1:
                            self.text(cx0 + 2 * mm, mid_y, lines[0], "Helvetica", 8.7)
                        else:
                            start_y = mid_y + 2.0 * mm
                            for j, ln in enumerate(lines[:2]):
                                self.text(cx0 + 2 * mm, start_y - j * 3.3 * mm, ln,
                                           "Helvetica", 8.2)
                    else:
                        cxc = cx0 + cxw / 2
                        self.text(cxc, mid_y, val, "Helvetica", 9, align="center")

        return y_bottom, x_positions

    def draw_totals(self, y_top, summary, x_positions):
        """GPA / Total marks rows spanning the same column grid as the subject table."""
        row_h = 7 * mm
        # Row 1: GPA
        y1_top = y_top
        y1_bot = y1_top - row_h
        self.rect(self.left, y1_bot, self.width, row_h)
        label_end = x_positions[6]  # up to "Grade Point" column boundary
        self.line(label_end, y1_bot, label_end, y1_top)
        self.line(x_positions[7], y1_bot, x_positions[7], y1_top)
        self.text(self.left + 2 * mm, y1_bot + 2.3 * mm,
                   "Grade Point Average (GPA):", "Helvetica-Bold", 9.5)
        gpa_val = summary.get("gpa", "")
        self.text((label_end + x_positions[7]) / 2, y1_bot + 2.3 * mm,
                   f"{gpa_val:.2f}" if isinstance(gpa_val, (int, float)) else str(gpa_val),
                   "Helvetica-Bold", 9.5, align="center")

        # Row 2: Total Marks
        y2_top = y1_bot
        y2_bot = y2_top - row_h
        self.rect(self.left, y2_bot, self.width, row_h)
        self.line(label_end, y2_bot, label_end, y2_top)
        self.line(x_positions[7], y2_bot, x_positions[7], y2_top)
        self.text(self.left + 2 * mm, y2_bot + 2.3 * mm, "Total Marks",
                   "Helvetica-Bold", 9.5)
        total_val = summary.get("total_marks", "")
        total_str = (f"{total_val:g}" if isinstance(total_val, (int, float))
                     else str(total_val))
        self.text((label_end + x_positions[7]) / 2, y2_bot + 2.3 * mm, total_str,
                   "Helvetica-Bold", 9.5, align="center")

        return y2_bot

    def draw_grading_scale(self, y_top, scale):
        col_w = self.width * 0.48
        headers = ["Interval", "Grade Point", "Grade", "Remarks"]
        col_fracs = [0.34, 0.24, 0.18, 0.24]
        widths = [col_w * f for f in col_fracs]
        x0 = self.left
        xs = [x0]
        for w in widths:
            xs.append(xs[-1] + w)

        title_h = 6 * mm
        header_h = 6 * mm
        row_h = 5.6 * mm
        table_h = title_h + header_h + row_h * len(scale)
        y_bottom = y_top - table_h

        self.rect(x0, y_bottom, col_w, table_h)
        # title bar
        self.line(x0, y_top - title_h, x0 + col_w, y_top - title_h)
        self.text(x0 + col_w / 2, y_top - title_h + 1.7 * mm,
                   "Grading/GPA System", "Helvetica-Bold", 9.5, align="center")
        # header row
        hy_top = y_top - title_h
        hy_bot = hy_top - header_h
        self.line(x0, hy_bot, x0 + col_w, hy_bot)
        for i, h in enumerate(headers):
            cx = (xs[i] + xs[i + 1]) / 2
            self.text(cx, hy_bot + 1.7 * mm, h, "Helvetica-Bold", 8.7, align="center")
        for x in xs[1:-1]:
            self.line(x, y_bottom, x, y_top - title_h)

        # body rows
        ry_top = hy_bot
        for row in scale:
            ry_bot = ry_top - row_h
            self.line(x0, ry_bot, x0 + col_w, ry_bot)
            mid_y = ry_bot + 1.6 * mm
            for i, val in enumerate(row):
                cx = (xs[i] + xs[i + 1]) / 2
                self.text(cx, mid_y, str(val), "Helvetica", 8.3, align="center")
            ry_top = ry_bot

        return y_bottom, col_w

    def draw_side_info(self, y_top, summary, col_w):
        """Right-hand column: percentage / attendance / rank boxes."""
        x0 = self.left + col_w + 6 * mm
        w = self.width - col_w - 6 * mm
        row_h = 9 * mm
        gap = 2.5 * mm

        def box(y, text_left, text_right=None, split=None):
            self.rect(x0, y - row_h, w, row_h)
            if split:
                self.line(x0 + split, y - row_h, x0 + split, y)
                self.text(x0 + 2 * mm, y - row_h + 3 * mm, text_left,
                           "Helvetica-Bold", 9.5)
                self.text(x0 + split + 2 * mm, y - row_h + 3 * mm, text_right,
                           "Helvetica-Bold", 9.5)
            else:
                self.text(x0 + 2 * mm, y - row_h + 3 * mm, text_left,
                           "Helvetica-Bold", 9.5)
            return y - row_h - gap

        pct = summary.get("percentage", "")
        pct_str = f"{pct:.2f}%" if isinstance(pct, (int, float)) else str(pct)
        y = box(y_top, f"Percentage: {pct_str}")
        y = box(y, f"Attendance: {summary.get('attendance', '')}")
        y = box(y, f"Rank: {summary.get('rank', '')}",
                f"Rank in Section: {summary.get('rank_section', '')}", split=w * 0.55)
        return y

    def draw_extracurricular(self, y_top, x_start, width, summary):
        h = 12 * mm
        y_bot = y_top - h
        label_w = width * 0.55
        self.rect(x_start, y_bot, width, h)
        self.line(x_start + label_w, y_bot, x_start + label_w, y_top)
        cell_w = (width - label_w) / 2
        self.line(x_start + label_w + cell_w, y_bot, x_start + label_w + cell_w, y_top)

        lines = self.wrap_text("EXTRACURRICULAR ACTIVITIES", "Helvetica-Bold", 8.5,
                                 label_w - 3 * mm)
        start_y = y_top - h / 2 + (len(lines) - 1) * 1.7 * mm
        for i, ln in enumerate(lines):
            self.text(x_start + 2 * mm, start_y - i * 3.4 * mm, ln,
                       "Helvetica-Bold", 8.5)
        self.text(x_start + label_w + cell_w / 2, y_top - h / 2 - 1.5 * mm,
                   str(summary.get("extracurricular_grade", "")), "Helvetica", 10,
                   align="center")
        return y_bot

    def draw_footer(self, y, footer):
        cx = (self.left + self.right) / 2
        if footer.get("result_issue_date"):
            self.text(cx, y, footer["result_issue_date"], "Helvetica", 9.5,
                       align="center")
        y -= 14 * mm
        labels = [
            ("Class Teacher", self.left + self.width * 0.08),
            (footer.get("result_issue_date") or "Date of Issue", cx),
            ("Principal", self.right - self.width * 0.04),
        ]
        for label, x in labels:
            self.line(x - 20 * mm, y, x + 20 * mm, y)
            self.text(x, y - 4.5 * mm, label, "Helvetica", 9, align="center")


def generate_gradesheet(data, output_path):
    """Render `data` (a dict following the schema in the module docstring)
    into a single-page PDF gradesheet at `output_path`."""
    c = canvas.Canvas(output_path, pagesize=A4)
    doc = GradesheetPDF(c, data)

    subjects = data.get("subjects", [])
    summary = _compute_summary(subjects, data.get("summary", {}))
    footer = data.get("footer", {})
    scale = data.get("grading_scale", DEFAULT_GRADING_SCALE)

    y = doc.page_h - 12 * mm
    y = doc.draw_header(y)
    y -= 2 * mm
    y = doc.draw_student_info(y)
    y -= 2 * mm

    y, x_positions = doc.draw_subject_table(y, subjects)
    y = doc.draw_totals(y, summary, x_positions)
    y -= 6 * mm

    scale_bottom, col_w = doc.draw_grading_scale(y, scale)
    tv_x = doc.left + col_w + 6 * mm
    tv_w = doc.width - col_w - 6 * mm
    side_y = doc.draw_side_info(y, summary, col_w)

    y2 = doc.draw_extracurricular(side_y, tv_x, tv_w, summary)

    footer_y = min(y2, scale_bottom) - 14 * mm
    doc.draw_footer(footer_y, footer)

    c.showPage()
    c.save()
    return output_path


def main():
    json_path, output_path = "sample_data.json", "output.pdf"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    generate_gradesheet(data, output_path)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
