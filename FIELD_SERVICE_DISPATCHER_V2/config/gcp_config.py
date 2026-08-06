import os
import json
import tempfile
from pathlib import Path
from vertexai import init
from vertexai.generative_models import GenerativeModel
from google.cloud import firestore
from dotenv import load_dotenv


# Load backend environment variables from project root .env (if present).
load_dotenv(Path(__file__).parent.parent / ".env")

# Get the service account key path
SERVICE_ACCOUNT_PATH = Path(__file__).parent.parent / "service-account.json"

# Support cloud deployment: if GOOGLE_APPLICATION_CREDENTIALS_JSON env var
# contains the full service-account JSON, write it to a temp file so that
# Google's ADC (Application Default Credentials) can discover it.
_cred_json_env = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
if _cred_json_env and not SERVICE_ACCOUNT_PATH.exists():
    _tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False
    )
    _tmp.write(_cred_json_env)
    _tmp.close()
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _tmp.name
elif SERVICE_ACCOUNT_PATH.exists():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(SERVICE_ACCOUNT_PATH)

def _get_project_from_service_account() -> str:
    """Read project_id from local service account file or env var."""
    # Try local file first
    if SERVICE_ACCOUNT_PATH.exists():
        try:
            with open(SERVICE_ACCOUNT_PATH, "r", encoding="utf-8") as fp:
                payload = json.load(fp)
            return str(payload.get("project_id", "")).strip()
        except Exception:
            return ""
    # Fall back to env var JSON
    cred_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if cred_json:
        try:
            payload = json.loads(cred_json)
            return str(payload.get("project_id", "")).strip()
        except Exception:
            return ""
    return ""


SERVICE_ACCOUNT_PROJECT_ID = _get_project_from_service_account()

# Centralized project/database config so infra teams can control setup through credentials + env vars.
PROJECT_ID = (
    os.getenv("GCP_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or SERVICE_ACCOUNT_PROJECT_ID
)
LOCATION = os.getenv("GCP_LOCATION", "us-central1")

VERTEX_PROJECT_ID = os.getenv("VERTEX_PROJECT_ID", PROJECT_ID)
VERTEX_MODEL_NAME = os.getenv("VERTEX_MODEL_NAME", "gemini-2.5-flash")

FIRESTORE_PROJECT_ID = os.getenv("FIRESTORE_PROJECT_ID", PROJECT_ID)
FIRESTORE_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "field-service-dispatcher")

# Initialize Vertex AI (non-blocking for Firestore-only scripts/tests)
gemini_model = None
GEMINI_INIT_ERROR = None

try:
    if VERTEX_PROJECT_ID:
        init(project=VERTEX_PROJECT_ID, location=LOCATION)
        gemini_model = GenerativeModel(VERTEX_MODEL_NAME)
    else:
        GEMINI_INIT_ERROR = RuntimeError(
            "No GCP project configured. Set GCP_PROJECT_ID or provide service-account.json with project_id."
        )
except Exception as exc:
    GEMINI_INIT_ERROR = exc

# Initialize Firestore
db = firestore.Client(project=FIRESTORE_PROJECT_ID, database=FIRESTORE_DATABASE_ID)