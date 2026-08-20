from .models import ActivityLog

def log_activity(user, event_name, details=None):
    if user and user.is_authenticated:
        ActivityLog.objects.create(
            user=user,
            event=event_name,
            details=details or {}
        )