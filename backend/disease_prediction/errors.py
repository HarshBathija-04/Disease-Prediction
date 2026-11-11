"""Consistent JSON errors: {"error": {"code", "message", "details"?}}."""

import logging

from django.http import JsonResponse
from rest_framework import exceptions, status
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def error_body(code, message, details=None):
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        response = JsonResponse(error_body("server_error", "Something went wrong. Please try again."), status=500)
        return response

    if isinstance(exc, exceptions.ValidationError):
        response.data = error_body("validation_error", "Some fields are invalid.", response.data)
    else:
        detail = response.data.get("detail", "Request failed.") if isinstance(response.data, dict) else response.data
        code = getattr(exc, "default_code", "error")
        if isinstance(exc, exceptions.APIException) and hasattr(exc.detail, "code"):
            code = exc.detail.code
        response.data = error_body(code, str(detail))
    return response


def not_found(request, exception=None):
    return JsonResponse(error_body("not_found", "Not found."), status=status.HTTP_404_NOT_FOUND)


def server_error(request):
    return JsonResponse(error_body("server_error", "Something went wrong."), status=500)
