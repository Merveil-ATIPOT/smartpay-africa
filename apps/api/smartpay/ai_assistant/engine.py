"""Moteur pédagogique déterministe, remplaçable plus tard par un LLM."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol

UNSUPPORTED_REPLY = (
    "Je ne dispose pas encore d'une réponse fiable à cette question. "
    "Vous pouvez me demander des explications sur Bitcoin, Lightning, "
    "les frais, les transferts simulés ou la sécurité."
)

MAX_ANSWER_LENGTH = 1200
MARKET_TERMS = ("cours", "prix", "bourse", "taux de change", "aujourd hui")


@dataclass(frozen=True)
class EngineAnswer:
    content: str
    response_type: str
    topic: str | None = None


class AnswerEngine(Protocol):
    def answer(self, question: str) -> EngineAnswer:
        """Produit une réponse pédagogique. N'accède à aucune donnée métier."""


@dataclass(frozen=True)
class FaqEntry:
    topic: str
    terms: tuple[str, ...]
    answer: str


def normalize_question(text: str) -> str:
    folded = unicodedata.normalize("NFD", text.casefold())
    stripped = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", stripped).strip()


FAQ_CATALOG: tuple[FaqEntry, ...] = (
    FaqEntry(
        topic="bitcoin",
        terms=("bitcoin", "btc", "cest quoi bitcoin", "qu est ce que bitcoin"),
        answer=(
            "Bitcoin est un réseau de paiement pair-à-pair et une unité de compte numérique. "
            "Les transactions sont enregistrées dans une chaîne de blocs publique. "
            "SmartPay Africa s'en sert en démonstration sur Bitcoin Regtest, pas sur le réseau principal."
        ),
    ),
    FaqEntry(
        topic="satoshi",
        terms=("satoshi", "sats", "un sat "),
        answer=(
            "Un satoshi, souvent abrégé « sat », est la plus petite unité de Bitcoin : "
            "100 millions de sats valent 1 bitcoin. SmartPay affiche les montants en sats "
            "lorsqu'ils sont connus en base. Ce n'est pas un cours de change."
        ),
    ),
    FaqEntry(
        topic="wallet",
        terms=("portefeuille", "wallet"),
        answer=(
            "Un portefeuille conserve les clés qui autorisent à dépenser des bitcoins. "
            "Dans cette démo, le solde affiché est celui du nœud Lightning de laboratoire, "
            "pas un portefeuille personnel. Ne confondez pas un identifiant public avec une seed."
        ),
    ),
    FaqEntry(
        topic="lightning",
        terms=("lightning", "reseau eclair"),
        answer=(
            "Le Lightning Network permet d'échanger des bitcoins via des canaux de paiement, "
            "sans enregistrer chaque paiement dans un bloc. Cela peut être plus rapide qu'une "
            "transaction on-chain, mais la durée n'est jamais garantie. "
            "SmartPay n'invente pas de temps de règlement."
        ),
    ),
    FaqEntry(
        topic="channel",
        terms=("canal", "canaux"),
        answer=(
            "Un canal Lightning est une capacité partagée entre deux nœuds. "
            "Les paiements se font en mettant à jour l'état du canal, puis peuvent être "
            "soldés on-chain plus tard. Dans le laboratoire SmartPay, les nœuds s'appellent "
            "Alice et Bob, en Regtest."
        ),
    ),
    FaqEntry(
        topic="bolt11",
        terms=("bolt11", "facture", "invoice"),
        answer=(
            "Une facture BOLT11 est une demande de paiement Lightning encodée. "
            "Elle peut contenir un montant, une description et une date d'expiration. "
            "Scanner un QR n'est pas un paiement : seul un envoi confirmé par le serveur "
            "peut régler une facture."
        ),
    ),
    FaqEntry(
        topic="failure",
        terms=("echouer", "echec", "en attente", "non confirme", "pas confirme"),
        answer=(
            "Un paiement Lightning peut rester en attente ou échouer si la facture expire, "
            "si le chemin n'a pas assez de liquidité, ou si le nœud destinataire est injoignable. "
            "Le statut fiable est celui renvoyé par l'API SmartPay. "
            "Un écran qui charge n'est pas une preuve de règlement."
        ),
    ),
    FaqEntry(
        topic="fees",
        terms=("frais", "frais lightning", "cout", "couts"),
        answer=(
            "Les frais Lightning dépendent du chemin et des politiques des nœuds. "
            "Ils ne sont ni fixes ni garantis. SmartPay n'affiche un frais que s'il est "
            "réellement connu en base. Un exemple marketing comme « 1 sat » n'est pas une promesse."
        ),
    ),
    FaqEntry(
        topic="bank",
        terms=("virement", "bancaire", "banque"),
        answer=(
            "Un virement bancaire passe par des intermédiaires et des délais de compensation. "
            "Lightning règle entre nœuds, souvent plus vite, mais ce n'est pas un virement, "
            "ni irrévocable au même titre juridique, et la vitesse n'est pas garantie. "
            "Les deux ne sont pas comparables par un pourcentage d'économie inventé."
        ),
    ),
    FaqEntry(
        topic="smartpay",
        terms=("smartpay",),
        answer=(
            "SmartPay Africa est une démonstration de paiements Bitcoin Lightning et de "
            "transferts préparés, destinée au Dakar Bitcoin Hack. "
            "L'assistant explique le fonctionnement. Il ne paie pas, ne confirme pas et "
            "ne crée pas de facture."
        ),
    ),
    FaqEntry(
        topic="regtest",
        terms=("regtest", "mainnet"),
        answer=(
            "Regtest est un réseau Bitcoin de laboratoire. Les bitcoins n'ont aucune valeur "
            "de marché. Mainnet est le réseau réel. SmartPay tourne en Regtest : "
            "aucun paiement Mainnet n'est possible depuis cette application."
        ),
    ),
    FaqEntry(
        topic="mobile_money",
        terms=("mobile money", "simule", "simulation", "credit mobile"),
        answer=(
            "Les crédits Mobile Money de SmartPay sont simulés. Aucun opérateur réel "
            "(Wave, Orange Money, MTN ou autre) n'est contacté. "
            "Un statut « crédit simulé » n'est pas un dépôt reçu sur un téléphone."
        ),
    ),
    FaqEntry(
        topic="prepared",
        terms=("prepare", "regle", "pas necessairement"),
        answer=(
            "Préparer un transfert (catalogue, devis, écran de revue) n'envoie aucun sat. "
            "Un règlement Lightning n'existe que si le serveur a confirmé un paiement LND. "
            "Un HTTP 200 ou un brouillon enregistré ne prouve pas un règlement."
        ),
    ),
    FaqEntry(
        topic="protect",
        terms=("proteger", "proteger son portefeuille", "securite"),
        answer=(
            "Protégez votre portefeuille en ne partageant jamais la seed, le mot de passe "
            "ou le code PIN. SmartPay ne vous les demandera pas dans une conversation. "
            "En démonstration, vous n'avez pas de seed utilisateur : le nœud de labo est partagé."
        ),
    ),
    FaqEntry(
        topic="secrets",
        terms=("seed", "mot de passe", "pin", "macaroon", "cle privee"),
        answer=(
            "Ne partagez jamais une seed, un mot de passe, un PIN, un macaroon ou une clé privée. "
            "L'assistant n'en a pas besoin pour expliquer Bitcoin. "
            "Si vous les envoyez par erreur, considérez-les comme compromis et ne les réutilisez pas."
        ),
    ),
    FaqEntry(
        topic="send_sats",
        terms=("envoyer des sats", "envoyer des sat"),
        answer=(
            "Pour envoyer des sats dans SmartPay, on scanne ou colle une facture Lightning, "
            "puis on confirme explicitement. Tant que vous n'avez pas confirmé, rien n'est envoyé. "
            "L'assistant ne peut pas déclencher cet envoi."
        ),
    ),
    FaqEntry(
        topic="status",
        terms=("statut", "lire le statut"),
        answer=(
            "Le statut d'un paiement SmartPay vient de l'historique du compte "
            "(créé, en attente, confirmé métier, échoué, expiré). "
            "« Confirmé » en mode Mock n'est pas un règlement Lightning. "
            "Seuls les champs renvoyés par l'API font foi."
        ),
    ),
    FaqEntry(
        topic="regtest_vs_mm",
        terms=("regtest et un credit", "lightning regtest", "difference entre un paiement lightning"),
        answer=(
            "Un paiement Lightning Regtest, une fois réglé côté LND, déplace des sats de laboratoire. "
            "Un crédit Mobile Money SmartPay est une écriture simulée : aucun opérateur n'est payé. "
            "Les deux peuvent coexister sur un transfert de démo, mais ce n'est pas la même chose."
        ),
    ),
)


class FaqEngine:
    """Moteur FAQ par mots-clés. Aucun appel réseau, aucun outil métier."""

    def answer(self, question: str) -> EngineAnswer:
        normalized = normalize_question(question)
        if not normalized:
            return EngineAnswer(content=UNSUPPORTED_REPLY, response_type="unsupported")
        if any(term in normalized for term in MARKET_TERMS):
            return EngineAnswer(content=UNSUPPORTED_REPLY, response_type="unsupported")

        best: tuple[int, FaqEntry] | None = None
        for entry in FAQ_CATALOG:
            score = _score(normalized, entry.terms)
            if score <= 0:
                continue
            if best is None or score > best[0]:
                best = (score, entry)

        if best is None:
            return EngineAnswer(content=UNSUPPORTED_REPLY, response_type="unsupported")

        content = best[1].answer[:MAX_ANSWER_LENGTH]
        return EngineAnswer(content=content, response_type="faq", topic=best[1].topic)


def _score(normalized: str, terms: tuple[str, ...]) -> int:
    padded = f" {normalized} "
    score = 0
    for term in terms:
        needle = normalize_question(term)
        if not needle:
            continue
        if f" {needle} " in padded or needle in normalized:
            score += max(1, len(needle.split()))
    return score


def get_default_engine() -> AnswerEngine:
    return FaqEngine()
