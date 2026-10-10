"""Custom exception classes for CertiFlow."""

from typing import Any


class CertiFlowException(Exception):
    """Base exception for CertiFlow application errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        detail: Any | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class NotFoundError(CertiFlowException):
    def __init__(self, resource: str, identifier: Any = None):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(message=msg, error_code="NOT_FOUND", status_code=404)


class ValidationError(CertiFlowException):
    def __init__(self, message: str, detail: Any = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            detail=detail,
        )


class AuthenticationError(CertiFlowException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
        )


class AuthorizationError(CertiFlowException):
    def __init__(self, message: str = "You are not authorized to perform this action"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
        )


class ConflictError(CertiFlowException):
    def __init__(self, message: str, detail: Any = None):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            detail=detail,
        )


class ServiceUnavailableError(CertiFlowException):
    def __init__(self, service: str):
        super().__init__(
            message=f"{service} service is temporarily unavailable",
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
        )


class JobStateError(CertiFlowException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="JOB_STATE_ERROR",
            status_code=409,
        )
