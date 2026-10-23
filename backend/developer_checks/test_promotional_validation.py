"""Developer-owned regression checks for promotional boundary fixes."""
from types import SimpleNamespace
from uuid import uuid4
from pathlib import Path
import sys

import pytest
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tests"))
from test_business_applications import clean_database, migrated_database, password_hash, world
from test_promotional_concepts import body, context, jobpath, request, start, success


def test_confirmation_requires_json_boolean_true():
    from app.promotional_concepts.schemas import CreatePromotionalConcept

    valid = body()
    for value in (1, "true", "True", False, None):
        with pytest.raises(Exception):
            CreatePromotionalConcept.model_validate({**valid, "dataSharingConfirmed": value})
    assert CreatePromotionalConcept.model_validate(valid).dataSharingConfirmed is True


def test_request_id_is_scoped_for_f09_and_legacy_replay_stays_deterministic(world, context):
    request_id = str(uuid4())
    preparation_path = f"/api/v1/business/participations/{context['participationId']}/preparation-drafts"
    preparation = {"requestId": request_id, "expectedPreparationRevision": 1,
        "expectedEventRevision": 1, "expectedSetupRevision": 1, "needs": "Synthetic materials",
        "selectedTaskIds": [], "selectedLineIds": [], "dataSharingConfirmed": True}
    legacy_first = success(request(world.x, "POST", preparation_path, json=preparation), 202)
    success(request(world.x, "POST", jobpath(legacy_first) + "/cancel"))

    promotional = start(world, context, body(requestId=request_id))
    assert promotional["id"] != legacy_first["id"]
    legacy_replay = success(request(world.x, "POST", preparation_path, json=preparation), 202)
    assert legacy_replay["id"] == legacy_first["id"]
    success(request(world.x, "POST", jobpath(promotional) + "/cancel"))

    # A historical global-ID rejection is retained when the F09 job was first.
    reverse_id = str(uuid4())
    reverse = start(world, context, body(requestId=reverse_id))
    legacy = {**preparation, "requestId": reverse_id}
    response = request(world.x, "POST", preparation_path, json=legacy)
    assert response.status_code == 409
    assert success(world.x.get(jobpath(reverse)))["id"] == reverse["id"]


def test_locked_source_read_refreshes_cached_setup_after_publication(world, context):
    from app.database import SessionLocal
    from app.promotional_concepts.service import _actor_and_participation
    from app.setup.models import ParticipationSetup
    from test_business_applications import submit

    submitted = submit(world, context)
    success(request(world.oa, "POST",
        f"/api/v1/organiser/events/{world.a}/applications/{context['id']}/decision",
        json={"expectedRevision": submitted["revision"], "outcome": "accepted", "reason": None}))
    path = f"/api/v1/organiser/events/{world.a}/participations/{context['participationId']}/setup"
    saved = success(request(world.oa, "PUT", path, json={"expectedRevision": 1,
        "boothLabel": "Old synthetic booth", "setupInstructions": "Old synthetic instructions"}))
    success(request(world.oa, "POST", path + "/publish", json={"expectedRevision": saved["revision"]}))

    actor = SimpleNamespace(id=world.xuser, role="business", mustChangePassword=False)
    with SessionLocal() as db:
        _, _, stale_setup = _actor_and_participation(db, actor, context["participationId"])
        assert stale_setup.published_booth_label == "Old synthetic booth"
        changed = success(request(world.oa, "PUT", path, json={"expectedRevision": saved["revision"],
            "boothLabel": "New synthetic booth", "setupInstructions": "New synthetic instructions"}))
        success(request(world.oa, "POST", path + "/publish", json={"expectedRevision": changed["revision"]}))

        _, _, refreshed_setup = _actor_and_participation(db, actor, context["participationId"], lock_sources=True)
        assert refreshed_setup is stale_setup
        assert refreshed_setup.published_booth_label == "New synthetic booth"
        assert refreshed_setup.published_setup_instructions == "New synthetic instructions"
