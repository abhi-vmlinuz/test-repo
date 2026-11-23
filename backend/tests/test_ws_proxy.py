"""Tests for the nexus terminal proxy (server.py).

The proxy exists for two reasons, and both are tested here:

1. A browser cannot put a bearer token on a WebSocket handshake, so the
   backend attaches the engine API key server-side. Nothing here asserts the
   header directly (that needs a real engine); ``_open_engine_terminal`` is
   replaced, and the key injection is covered by reading the code path.
2. The engine attaches anyone who knows a session id. Ownership is checked
   against the engine before a byte is proxied.

The real engine is replaced by a fake upstream, so these run without a cluster.
"""

import asyncio

import jwt
import pytest
from fastapi.testclient import TestClient

import server


class FakeUpstream:
    """Minimal stand-in for a websockets client connection."""

    def __init__(self):
        self.sent = []
        self.incoming = asyncio.Queue()
        self.closed = False

    async def send(self, data):
        self.sent.append(data)

    def __aiter__(self):
        return self

    async def __anext__(self):
        item = await self.incoming.get()
        if item is None:
            raise StopAsyncIteration
        return item

    async def close(self):
        self.closed = True


@pytest.fixture
def client():
    return TestClient(server.app)


@pytest.fixture
def token():
    return jwt.encode({"user_id": "user-1"}, server.JWT_SECRET, algorithm=server.JWT_ALGORITHM)


@pytest.fixture
def upstream(monkeypatch):
    fake = FakeUpstream()

    async def fake_open(session_id):
        return fake

    monkeypatch.setattr(server, "_open_engine_terminal", fake_open)
    return fake


def _set_owner(monkeypatch, status, owner):
    async def fake_owner(session_id):
        return status, owner

    monkeypatch.setattr(server, "_nexus_session_owner", fake_owner)


def test_rejects_missing_token(client, upstream):
    with pytest.raises(Exception) as exc:
        with client.websocket_connect("/api/nexus/sessions/abc/terminal") as ws:
            ws.receive_text()
    assert getattr(exc.value, "code", None) == server.NEXUS_WS_UNAUTHORIZED
    assert upstream.sent == []


def test_rejects_bad_token(client, upstream):
    with pytest.raises(Exception) as exc:
        with client.websocket_connect("/api/nexus/sessions/abc/terminal?token=nope") as ws:
            ws.receive_text()
    assert getattr(exc.value, "code", None) == server.NEXUS_WS_UNAUTHORIZED


def test_rejects_foreign_session(client, monkeypatch, token, upstream):
    _set_owner(monkeypatch, 200, "user-2")
    with pytest.raises(Exception) as exc:
        with client.websocket_connect(f"/api/nexus/sessions/abc/terminal?token={token}") as ws:
            ws.receive_text()
    assert getattr(exc.value, "code", None) == server.NEXUS_WS_FORBIDDEN
    assert upstream.sent == []


def test_rejects_unknown_session(client, monkeypatch, token, upstream):
    _set_owner(monkeypatch, 404, None)
    with pytest.raises(Exception) as exc:
        with client.websocket_connect(f"/api/nexus/sessions/abc/terminal?token={token}") as ws:
            ws.receive_text()
    assert getattr(exc.value, "code", None) == server.NEXUS_WS_NOT_FOUND


def _wait_for(predicate, timeout=3.0):
    """Poll until the proxy task has forwarded the message, or give up."""
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(0.01)
    return False


def test_forwards_both_directions(client, monkeypatch, token, upstream):
    _set_owner(monkeypatch, 200, "user-1")

    with client.websocket_connect(f"/api/nexus/sessions/abc/terminal?token={token}") as ws:
        ws.send_text("ls\n")
        upstream.incoming.put_nowait(b"file1  file2\n")
        assert ws.receive_bytes() == b"file1  file2\n"
        assert _wait_for(lambda: "ls\n" in upstream.sent)

        # Resize events are JSON text and must stay text on the upstream side.
        upstream.incoming.put_nowait('{"type":"resize","cols":100,"rows":40}')
        assert ws.receive_text() == '{"type":"resize","cols":100,"rows":40}'
        ws.send_text('{"type":"resize","cols":120,"rows":50}')
        assert _wait_for(lambda: '{"type":"resize","cols":120,"rows":50}' in upstream.sent)
