import pytest
from fastapi.testclient import TestClient
from app.ai.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_chat_endpoint_mock():
    payload = {
        "session_id": "test-123",
        "message": "Create a new ticket",
        "auth_context": {
            "user_id": "user-1",
            "role": "system_admin",
            "org_id": "org-1",
            "jwt_token": "mock-token"
        }
    }
    
    response = client.post("/agents/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["delegated_to"] == "ticket_agent"
