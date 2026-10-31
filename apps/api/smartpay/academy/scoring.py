"""Formules de score Academy. Le client ne fournit jamais le résultat."""

from __future__ import annotations

from smartpay.academy.models import AnswerOption, Question


def compute_score_percent(correct: int, total: int) -> int:
    if total <= 0 or correct <= 0:
        return 0
    safe_correct = min(correct, total)
    return (100 * safe_correct) // total


def has_passed(score_percent: int, pass_score: int) -> bool:
    return score_percent >= pass_score


def correct_options_for(question: Question) -> list[AnswerOption]:
    return [option for option in question.options.all() if option.is_correct]


def assert_single_correct_questions(questions) -> None:
    """Limitation MVP : une seule bonne réponse par question."""
    from rest_framework.exceptions import ValidationError

    for question in questions:
        if len(correct_options_for(question)) != 1:
            raise ValidationError(
                {
                    "quiz": "Limitation MVP : chaque question doit avoir exactement une bonne réponse."
                }
            )


def canonicalize_answers(answers: list[dict]) -> list[dict]:
    items = []
    for row in answers:
        items.append(
            {
                "question_id": str(row.get("question_id") or ""),
                "option_id": str(row.get("option_id") or ""),
            }
        )
    return sorted(items, key=lambda item: (item["question_id"], item["option_id"]))


def grade_submission(*, questions, selected_by_question: dict[str, AnswerOption]) -> tuple[int, list[dict]]:
    """Calcule le score et fige un snapshot de correction."""
    ordered = list(questions)
    assert_single_correct_questions(ordered)
    correct_count = 0
    snapshot: list[dict] = []
    for question in ordered:
        selected = selected_by_question[str(question.id)]
        correct = correct_options_for(question)[0]
        is_correct = selected.id == correct.id
        if is_correct:
            correct_count += 1
        snapshot.append(
            {
                "question_id": str(question.id),
                "option_id": str(selected.id),
                "prompt": question.prompt,
                "selected_label": selected.label,
                "is_correct": is_correct,
                "correct_option_id": str(correct.id),
                "correct_label": correct.label,
                "explanation": question.explanation,
            }
        )
    return compute_score_percent(correct_count, len(ordered)), snapshot
