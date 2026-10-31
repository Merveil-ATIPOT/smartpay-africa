# API SmartPay Africa

Django 5.2 + Django REST Framework.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements\development.txt
$env:DJANGO_SETTINGS_MODULE = "config.settings.test"
.\.venv\Scripts\python.exe -m pytest

# Depuis le conteneur, forcer les settings de test (sinon l'env lnd_regtest est utilisée) :
docker exec -e DJANGO_SETTINGS_MODULE=config.settings.test smartpay-api python -m pytest
```

Paramètres :

- `config.settings.development`
- `config.settings.test`
- `config.settings.production` (préparé, non déployé)
