# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from fastapi.testclient import TestClient

from server_api import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
