FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package.json ./
COPY vite.config.js ./
COPY index.html ./
COPY src ./src

RUN npm install
RUN npm run build

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000
CMD ["sh", "-c", "cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
