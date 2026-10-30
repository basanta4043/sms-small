import csv
import io
from datetime import date
from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ExamForm, FeeStructureForm, RegisterForm, SchoolForm, StudentForm
from .models import Exam, FeeStructure, Invoice, Payment, Result, School, Student

DEFAULT_GRADE_SCALE = [
    {"min": 90, "grade": "A+", "remark": "Outstanding"},
    {"min": 80, "grade": "A", "remark": "Excellent"},
    {"min": 70, "grade": "B+", "remark": "Very Good"},
    {"min": 60, "grade": "B", "remark": "Good"},
    {"min": 50, "grade": "C+", "remark": "Satisfactory"},
    {"min": 40, "grade": "C", "remark": "Fair"},
    {"min": 33, "grade": "D", "remark": "Needs Improvement"},
    {"min": 0, "grade": "NG", "remark": "Not Graded"},
]


def _normalize_grade_scale(scale):
    normalized = []
    for row in scale or DEFAULT_GRADE_SCALE:
        item = dict(row)
        if item.get("grade") == "F":
            item["grade"] = "NG"
            if item.get("remark") == "Fail":
                item["remark"] = "Not Graded"
        normalized.append(item)
    return normalized

class SchoolLoginView(LoginView):
    template_name = "registration/login.html"
    redirect_authenticated_user = True


def register(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            School.objects.create(owner=user, name=form.cleaned_data["school_name"], grade_scale=DEFAULT_GRADE_SCALE)
            login(request, user)
            return redirect("dashboard")
    else:
        form = RegisterForm()
    return render(request, "registration/register.html", {"form": form})


def _grade(pct):
    for threshold, grade in ((90, "A+"), (80, "A"), (70, "B+"), (60, "B"), (50, "C+"), (40, "C"), (33, "D")):
        if pct >= threshold:
            return grade
    return "NG"


def _grade_from_scale(pct, scale):
    for row in sorted(_normalize_grade_scale(scale), key=lambda item: item.get("min", 0), reverse=True):
        if pct >= float(row.get("min", 0)):
            return row.get("grade", "NG")
    return "NG"


@login_required
def dashboard(request):
    user = request.user
    school, created = School.objects.get_or_create(owner=user, defaults={"name": "", "grade_scale": DEFAULT_GRADE_SCALE})
    if created:
        school.grade_scale = DEFAULT_GRADE_SCALE
    school.grade_scale = _normalize_grade_scale(school.grade_scale)
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "school":
            form = SchoolForm(request.POST, instance=school)
            if form.is_valid():
                form.save()
                scale = []
                for minimum, grade, remark in zip(request.POST.getlist("grade_min"), request.POST.getlist("grade"), request.POST.getlist("grade_remark")):
                    if grade.strip():
                        scale.append({"min": float(minimum or 0), "grade": grade.strip(), "remark": remark.strip()})
                if scale:
                    school.grade_scale = scale
                    school.save(update_fields=["grade_scale"])
                messages.success(request, "School settings saved.")
        elif action == "student":
            student_id = request.POST.get("student_id")
            instance = get_object_or_404(Student, owner=user, pk=student_id) if student_id else None
            form = StudentForm(request.POST, instance=instance)
            if form.is_valid():
                student = form.save(commit=False)
                student.owner = user
                student.save()
                messages.success(request, "Student saved.")
        elif action == "delete_student":
            get_object_or_404(Student, owner=user, pk=request.POST["student_id"]).delete()
        elif action == "fee":
            fee_id = request.POST.get("fee_id")
            instance = get_object_or_404(FeeStructure, owner=user, pk=fee_id) if fee_id else None
            form = FeeStructureForm(request.POST, instance=instance)
            if form.is_valid():
                fee = form.save(commit=False)
                fee.owner = user
                fee.save()
                messages.success(request, "Fee structure saved.")
        elif action == "delete_fee":
            get_object_or_404(FeeStructure, owner=user, pk=request.POST["fee_id"]).delete()
        elif action == "payment":
            student = get_object_or_404(Student, owner=user, pk=request.POST["student_id"])
            amount = Decimal(request.POST.get("amount", "0") or 0)
            invoice = Invoice.objects.create(owner=user, student=student, invoice_no=f"INV-{Invoice.objects.filter(owner=user).count() + 1:05d}", date=request.POST.get("date") or date.today(), amount=amount, method=request.POST.get("method", "Cash"), note=request.POST.get("note", ""))
            Payment.objects.create(owner=user, student=student, invoice=invoice, amount=amount, method=invoice.method, note=invoice.note, date=invoice.date)
            messages.success(request, f"Payment recorded as {invoice.invoice_no}.")
        elif action == "exam":
            exam_id = request.POST.get("exam_id")
            instance = get_object_or_404(Exam, owner=user, pk=exam_id) if exam_id else None
            form = ExamForm(request.POST, instance=instance)
            if form.is_valid():
                exam = form.save(commit=False)
                exam.owner = user
                exam.save()
                messages.success(request, "Exam saved.")
        elif action == "delete_exam":
            get_object_or_404(Exam, owner=user, pk=request.POST["exam_id"]).delete()
        elif action == "result":
            exam = get_object_or_404(Exam, owner=user, pk=request.POST["exam_id"])
            student = get_object_or_404(Student, owner=user, pk=request.POST["student_id"])
            marks = []
            posted_marks = request.POST.getlist("mark")
            for subject, value in zip(exam.subjects, posted_marks):
                obtained = max(0, min(float(value or 0), float(subject.get("maxMarks", 0))))
                marks.append({"subject": subject.get("name", ""), "obtained": obtained, "maxMarks": float(subject.get("maxMarks", 0))})
            Result.objects.update_or_create(owner=user, exam=exam, student=student, defaults={"marks": marks})
            messages.success(request, "Result saved.")
        elif action == "import_students" and request.FILES.get("file"):
            rows = csv.DictReader(io.TextIOWrapper(request.FILES["file"].file, encoding="utf-8-sig"))
            created = 0
            for row in rows:
                name = (row.get("name") or row.get("Name") or "").strip()
                if name:
                    Student.objects.create(owner=user, name=name, roll_no=row.get("roll_no") or row.get("Roll No") or "", class_name=row.get("class_name") or row.get("Class") or "", section=row.get("section") or "")
                    created += 1
            messages.success(request, f"Imported {created} students.")
        return redirect(f"/dashboard/?tab={request.POST.get('tab', 'dashboard')}")

    exams = Exam.objects.filter(owner=user).prefetch_related("results")
    results = Result.objects.filter(owner=user).select_related("exam", "student")
    for result in results:
        maximum = sum(float(subject.get("maxMarks", 0)) for subject in result.exam.subjects)
        obtained = sum(float(mark.get("obtained", 0)) for mark in result.marks)
        result.percentage = round(obtained / maximum * 100, 1) if maximum else 0
        result.grade = _grade_from_scale(result.percentage, school.grade_scale)
    edit_student = get_object_or_404(Student, owner=user, pk=request.GET["edit_student"]) if request.GET.get("edit_student") else None
    edit_fee = get_object_or_404(FeeStructure, owner=user, pk=request.GET["edit_fee"]) if request.GET.get("edit_fee") else None
    edit_exam = get_object_or_404(Exam, owner=user, pk=request.GET["edit_exam"]) if request.GET.get("edit_exam") else None
    context = {
        "school": school, "grade_scale": school.grade_scale, "students": Student.objects.filter(owner=user), "fees": FeeStructure.objects.filter(owner=user),
        "invoices": Invoice.objects.filter(owner=user).select_related("student").order_by("-date", "-id"), "payments_total": Payment.objects.filter(owner=user).aggregate(total=Sum("amount"))["total"] or 0,
        "exams": exams, "results": results, "student_form": StudentForm(instance=edit_student), "fee_form": FeeStructureForm(instance=edit_fee), "exam_form": ExamForm(instance=edit_exam), "school_form": SchoolForm(instance=school),
        "nav_tabs": [("dashboard", "Overview"), ("students", "Students"), ("fees", "Fees"), ("invoices", "Invoices"), ("exams", "Exams"), ("results", "Results"), ("settings", "Settings")],
    }
    return render(request, "dashboard.html", context)


@login_required
def gradesheet(request, result_id):
    result = get_object_or_404(Result, owner=request.user, pk=result_id)
    school, _ = School.objects.get_or_create(owner=request.user, defaults={"grade_scale": DEFAULT_GRADE_SCALE})
    school.grade_scale = _normalize_grade_scale(school.grade_scale)
    rows = []
    subjects = {str(subject.get("name", "")).lower(): subject for subject in result.exam.subjects}
    for mark in result.marks:
        subject = subjects.get(str(mark.get("subject", "")).lower(), {})
        maximum = float(subject.get("maxMarks", 0) or 0)
        obtained = float(mark.get("obtained", 0) or 0)
        rows.append({"subject": mark.get("subject"), "max": maximum, "obtained": obtained, "percentage": round(obtained / maximum * 100, 1) if maximum else 0, "grade": _grade_from_scale(obtained / maximum * 100 if maximum else 0, school.grade_scale)})
    return render(request, "gradesheet.html", {"result": result, "rows": rows})
