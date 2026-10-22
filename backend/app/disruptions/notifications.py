"""F02's real accepted-itinerary producer must register before delivery is enabled."""
from app.programme.problems import ProgrammeProblem
from app.settings import Settings


accepted_itinerary_provider = None


def unavailable():
    return ProgrammeProblem(503, "f02_integration_pending", "Accepted itinerary integration is not available.")


def recipients(db, event_id, item_id):
    # Caller holds the Event lock, shared with the future real F02 acceptance writer.
    if not Settings().f02_planning_enabled:
        return None
    if accepted_itinerary_provider is None:
        raise unavailable()
    return accepted_itinerary_provider.snapshots(db, event_id, item_id)


def require_ready():
    if not Settings().f02_planning_enabled or accepted_itinerary_provider is None:
        raise unavailable()
