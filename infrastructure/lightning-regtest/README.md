# Lightning Regtest (phase ultérieure)

Cette infrastructure (Bitcoin Core + LND en Regtest) n'est **pas** activée en P01.

- Aucun nœud Lightning n'est lancé par `compose.yaml` racine.
- L'adaptateur Python `LndRegtestPaymentProvider` lève `NotImplementedError`.
- Les paiements Mock ne doivent jamais être présentés comme des règlements Lightning.

Les chemins éventuels `LND_MACAROON_PATH` et `LND_TLS_CERT_PATH` pointent vers des **fichiers**, jamais vers le contenu d'un secret en base applicative.
