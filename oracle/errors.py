"""Structured errors. Every failure the harness reports carries a category and a retryable flag."""

CATEGORIES = {
    "invalid_arguments": False,
    "setup_required": False,
    "hash_mismatch": False,
    "docker_unavailable": False,
    "session_not_found": False,
    "session_limit": True,
    "timeout": True,
    "input_ignored": True,
    "unsupported_key": False,
    "emulator_failed": True,
    "profile_invalid": False,
    "golden_check_failed": False,
    "rebuild_failed": False,
    "internal": False,
}


class OracleError(Exception):
    def __init__(self, category, message, detail=None):
        if category not in CATEGORIES:
            raise ValueError("unknown error category: %s" % category)
        super().__init__(message)
        self.category = category
        self.message = message
        self.detail = detail or {}

    @property
    def retryable(self):
        return CATEGORIES[self.category]

    def to_dict(self):
        return {"error": {"category": self.category, "message": self.message,
                          "retryable": self.retryable, "detail": self.detail}}
