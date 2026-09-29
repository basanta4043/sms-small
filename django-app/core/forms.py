from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import Exam, FeeStructure, School, Student


class RegisterForm(UserCreationForm):
    school_name = forms.CharField(max_length=200, required=False)

    class Meta:
        model = User
        fields = ("username", "school_name", "password1", "password2")


class SchoolForm(forms.ModelForm):
    class Meta:
        model = School
        exclude = ("owner", "grade_scale")


class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        exclude = ("owner", "created_at")
        widgets = {"address": forms.Textarea(attrs={"rows": 2})}


class FeeStructureForm(forms.ModelForm):
    items_text = forms.CharField(required=False, help_text="One item per line: Tuition, 1500")

    class Meta:
        model = FeeStructure
        fields = ("class_name", "items_text")

    def clean_items_text(self):
        items = []
        for line in self.cleaned_data["items_text"].splitlines():
            name, _, amount = line.partition(",")
            if name.strip():
                value = forms.DecimalField(min_value=0).clean(amount.strip() or 0)
                items.append({"name": name.strip(), "amount": float(value)})
        return items

    def save(self, commit=True):
        instance = super().save(commit=False)
        items = self.cleaned_data["items_text"]
        instance.items = items
        instance.total = sum(item["amount"] for item in items)
        if commit:
            instance.save()
        return instance

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and not self.is_bound:
            self.initial["items_text"] = "\n".join(
                f"{item.get('name', '')}, {item.get('amount', 0)}" for item in self.instance.items
            )


class ExamForm(forms.ModelForm):
    subjects_text = forms.CharField(required=False, help_text="One subject per line: Mathematics, 100, 40")

    class Meta:
        model = Exam
        fields = ("name", "term", "class_name", "subjects_text")

    def save(self, commit=True):
        instance = super().save(commit=False)
        subjects = []
        for line in self.cleaned_data["subjects_text"].splitlines():
            name, _, remainder = line.partition(",")
            max_marks, _, pass_marks = remainder.partition(",")
            if name.strip():
                subjects.append({"name": name.strip(), "maxMarks": float(max_marks.strip() or 100), "passMarks": float(pass_marks.strip() or 40)})
        instance.subjects = subjects
        if commit:
            instance.save()
        return instance

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and not self.is_bound:
            self.initial["subjects_text"] = "\n".join(
                f"{subject.get('name', '')}, {subject.get('maxMarks', 100)}, {subject.get('passMarks', 40)}"
                for subject in self.instance.subjects
            )
