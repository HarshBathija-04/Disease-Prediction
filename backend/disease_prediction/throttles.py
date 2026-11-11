from rest_framework.throttling import UserRateThrottle


class AuthThrottle(UserRateThrottle):
    scope = "auth"


class AIThrottle(UserRateThrottle):
    scope = "ai"
