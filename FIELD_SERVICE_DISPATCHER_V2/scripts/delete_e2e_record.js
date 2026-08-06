const fetch = require('node-fetch');

const API_BASE = 'http://127.0.0.1:8000';
const ADMIN = { email: 'e2e.admin@test.com', password: 'E2eTest9999' };
const TARGET_ID = '88';

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const json = await res.json();
  return json.token || json.access_token;
}

async function getRequest(token, id) {
  const res = await fetch(`${API_BASE}/admin/service-requests/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET request failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function deleteRequest(token, id) {
  console.log(`DELETING ID: ${id}`);
  console.log('REASON: confirmed E2E test data');
  const res = await fetch(`${API_BASE}/admin/service-requests/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

(async () => {
  try {
    const token = await login();
    const job = await getRequest(token, TARGET_ID);
    console.log('Found record:', JSON.stringify(job, null, 2));
    const isTest = !!job?.is_test_data;
    const reviewNotes = String(job?.review_notes || '').toLowerCase();

    if (!isTest && !reviewNotes.includes('e2e')) {
      console.error('Refusing to delete: record is not marked as test data and review_notes does not contain E2E');
      process.exit(1);
    }

    // Proceed to delete
    const del = await deleteRequest(token, TARGET_ID);
    console.log('Delete response:', del);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
