"""Plain-language explanations of a prediction via Groq. Called only from the backend."""

import logging

import groq
from django.conf import settings
from rest_framework.exceptions import APIException

from main_app.ml import label

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a careful health educator inside a symptom-checker app. A statistical model has suggested a "
    "possible condition from the user's symptoms. Explain it in plain, calm language for a non-medical reader. "
    "Use these markdown sections exactly: '### What this condition is', '### Why your symptoms may fit', "
    "'### Self-care while you wait', '### Get urgent help if'. Keep it under 250 words, use short bullet points, "
    "do not invent test results, do not prescribe medication doses, and never claim a diagnosis. "
    "Mention the suggested specialist once."
)


class AIUnavailable(APIException):
    status_code = 503
    default_code = "ai_unavailable"
    default_detail = "AI explanations are not available right now. Please try again later."


class AIRateLimited(APIException):
    status_code = 429
    default_code = "ai_rate_limited"
    default_detail = "The AI service is busy. Please try again in a minute."


def explain_prediction(record):
    if not settings.GROQ_API_KEY:
        raise AIUnavailable()
    client = groq.Groq(api_key=settings.GROQ_API_KEY, timeout=30, max_retries=1)
    symptoms = ", ".join(label(s) for s in record.symptoms)
    user_prompt = (
        f"Possible condition: {record.disease_name} (model confidence {record.confidence}%).\n"
        f"Reported symptoms: {symptoms}.\n"
        f"Suggested specialist: {record.specialization or 'General Physician'}."
    )
    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_TEXT_MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
            max_completion_tokens=1200,
            reasoning_effort="low",
        )
    except groq.RateLimitError as exc:
        raise AIRateLimited() from exc
    except groq.APIError as exc:
        logger.warning("Groq request failed: %s", type(exc).__name__)
        raise AIUnavailable() from exc
    text = (completion.choices[0].message.content or "").strip()
    if not text:
        raise AIUnavailable()
    return text
