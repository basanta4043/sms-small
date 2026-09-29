from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Exam, FeeStructure, Result, School, Student


class DashboardFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", password="password123")
        self.client.login(username="owner", password="password123")

    def test_registration_creates_school_with_default_grade_scale(self):
        self.client.logout()
        response = self.client.post(
            reverse("register"),
            {"username": "new-owner", "school_name": "New School", "password1": "password12345", "password2": "password12345"},
        )
        self.assertRedirects(response, reverse("dashboard"))
        self.assertTrue(School.objects.get(owner__username="new-owner").grade_scale)

    def test_fee_and_exam_forms_round_trip_existing_json(self):
        fee = FeeStructure.objects.create(owner=self.user, class_name="Grade 5", items=[{"name": "Tuition", "amount": 1000}], total=1000)
        exam = Exam.objects.create(owner=self.user, name="Final", class_name="Grade 5", subjects=[{"name": "Math", "maxMarks": 100, "passMarks": 40}])
        self.assertIn("Tuition, 1000", self.client.get(reverse("dashboard"), {"tab": "fees", "edit_fee": fee.pk}).context["fee_form"].initial["items_text"])
        self.assertIn("Math, 100, 40", self.client.get(reverse("dashboard"), {"tab": "exams", "edit_exam": exam.pk}).context["exam_form"].initial["subjects_text"])

    def test_result_uses_selected_exam_subjects_and_gradesheet_renders(self):
        student = Student.objects.create(owner=self.user, name="Asha", class_name="Grade 5")
        exam = Exam.objects.create(owner=self.user, name="Final", class_name="Grade 5", subjects=[{"name": "Math", "maxMarks": 100, "passMarks": 40}])
        response = self.client.post(
            reverse("dashboard"),
            {"action": "result", "tab": "results", "exam_id": exam.pk, "student_id": student.pk, "mark": [85]},
        )
        self.assertRedirects(response, "/dashboard/?tab=results")
        result = Result.objects.get(exam=exam, student=student)
        self.assertEqual(result.marks[0]["subject"], "Math")
        gradesheet = self.client.get(reverse("gradesheet", args=[result.pk]))
        self.assertContains(gradesheet, "A")

    def test_payment_creates_invoice_and_payment(self):
        student = Student.objects.create(owner=self.user, name="Asha", class_name="Grade 5")
        response = self.client.post(
            reverse("dashboard"),
            {"action": "payment", "tab": "invoices", "student_id": student.pk, "amount": "1250", "method": "Cash", "date": date.today().isoformat()},
        )
        self.assertRedirects(response, "/dashboard/?tab=invoices")
        self.assertEqual(student.invoices.count(), 1)
        self.assertEqual(student.payments.count(), 1)
