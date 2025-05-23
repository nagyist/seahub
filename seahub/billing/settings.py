from django.conf import settings

ENABLE_EXTERNAL_BILLING_SERVICE = getattr(settings, 'ENABLE_EXTERNAL_BILLING_SERVICE', False)

BILLING_SERVICE_URL = getattr(settings, 'BILLING_SERVICE_URL', '')
BILLING_SERVICE_JWT_AUTH_URL = getattr(settings, 'BILLING_SERVICE_JWT_AUTH_URL', '')
BILLING_SERVICE_JWT_SECRET_KEY = getattr(settings, 'BILLING_SERVICE_JWT_SECRET_KEY', '')
BILLING_SERVICE_JWT_ALGORITHM = getattr(settings, 'BILLING_SERVICE_JWT_ALGORITHM', 'HS256')
BILLING_SERVICE_JWT_EXPIRATION = getattr(settings, 'BILLING_SERVICE_JWT_EXPIRATION', 5*60)  # in seconds
