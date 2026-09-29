from django.contrib import admin

from .models import Exam, FeeStructure, Invoice, Payment, Result, School, Student

admin.site.register([School, Student, FeeStructure, Invoice, Payment, Exam, Result])
