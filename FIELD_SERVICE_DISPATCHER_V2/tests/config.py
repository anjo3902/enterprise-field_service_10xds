import os
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
SAMPLE_DATA_DIR = TESTS_DIR / 'sample_data'

API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:8000').rstrip('/')
REQUEST_TIMEOUT = int(os.getenv('TEST_REQUEST_TIMEOUT', '30'))

TEST_TECHNICIAN_ID = int(os.getenv('TEST_TECHNICIAN_ID', '413'))
TEST_IMAGE_PATH = Path(os.getenv('TEST_IMAGE_PATH', str(SAMPLE_DATA_DIR / 'sample_fault_image.jpg')))
SAMPLE_REQUEST_JSON = SAMPLE_DATA_DIR / 'sample_request.json'

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '5432'))
DB_NAME = os.getenv('DB_NAME', 'dispatch_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'root123')


def db_connect_kwargs() -> dict:
    return {
        'host': DB_HOST,
        'port': DB_PORT,
        'dbname': DB_NAME,
        'user': DB_USER,
        'password': DB_PASSWORD,
    }
