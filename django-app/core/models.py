from django.conf import settings
from django.db import models


class School(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="school")
    name = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default="Rs.")
    logo_url = models.URLField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    grade_scale = models.JSONField(default=list)

    def __str__(self):
        return self.name or f"{self.owner.username}'s school"


class Student(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="students")
    roll_no = models.CharField(max_length=40, blank=True)
    name = models.CharField(max_length=200)
    class_name = models.CharField(max_length=80, blank=True)
    section = models.CharField(max_length=40, blank=True)
    gender = models.CharField(max_length=30, blank=True)
    dob = models.CharField(max_length=30, blank=True)
    guardian_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    admission_date = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=30, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["class_name", "roll_no", "name"]


class FeeStructure(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fee_structures")
    class_name = models.CharField(max_length=80)
    items = models.JSONField(default=list)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class Invoice(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invoices")
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="invoices")
    invoice_no = models.CharField(max_length=40, unique=True)
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=40, default="Cash")
    note = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="Paid")
    fee_months = models.PositiveIntegerField(default=1)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    items = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class Payment(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments")
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="payments")
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="payment")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=40)
    note = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)


class Exam(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exams")
    name = models.CharField(max_length=200)
    term = models.CharField(max_length=100, blank=True)
    class_name = models.CharField(max_length=80, blank=True)
    subjects = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class Result(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="results")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="results")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="results")
    marks = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "exam", "student"], name="unique_student_exam_result")]
