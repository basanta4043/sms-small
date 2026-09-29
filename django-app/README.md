# School Manager Django monolith

Server-rendered Django MVC application for the school manager. The `core` app contains the models, forms, views, URLs, admin registration, and templates for authentication, students, fees, payments/invoices, exams, results, settings, and printable gradesheets.

## Run locally

```bash
cd django-app
../.venv/bin/pip install -r requirements.txt
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver
```

Open `http://127.0.0.1:8000/register/` to create the first account.

## PostgreSQL

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to use PostgreSQL. Without `DB_HOST`, development uses SQLite in `db.sqlite3`.
