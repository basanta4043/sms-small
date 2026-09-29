from django.contrib.auth.views import LogoutView
from django.urls import path

from .views import SchoolLoginView, dashboard, gradesheet, register

urlpatterns = [
    path("", dashboard, name="home"),
    path("dashboard/", dashboard, name="dashboard"),
    path("login/", SchoolLoginView.as_view(), name="login"),
    path("register/", register, name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("gradesheets/<int:result_id>/", gradesheet, name="gradesheet"),
]
