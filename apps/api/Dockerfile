FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings.production
RUN DJANGO_SETTINGS_MODULE=config.settings.development DJANGO_SECRET_KEY=build-only-not-for-runtime python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["python", "entrypoint.py"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
