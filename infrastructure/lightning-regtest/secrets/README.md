# Secrets LND locaux

Ce dossier est gitignoré (sauf ce README).

Après `.\scripts\lightning-lab.ps1 init`, les fichiers suivants sont copiés hors des volumes Docker :

- `alice/tls.cert`
- `alice/admin.macaroon`
- `bob/tls.cert`
- `bob/admin.macaroon`

Ils ne doivent jamais être envoyés au mobile, au navigateur ou à Git.
