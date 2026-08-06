(async ()=>{
  try {
    const base = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'
    const admin = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }
    const loginRes = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(admin) })
    const login = await loginRes.json(); const token = login.token||login.access_token
    const testRunId = process.argv[2] || '1779091524564'
    console.log('using testRunId', testRunId)
    const res = await fetch(`${base}/admin/test/cleanup`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ test_run_id: testRunId, dry_run:false, confirm_delete: 'YES_DELETE_E2E_DATA' }) })
    console.log('STATUS', res.status)
    const body = await res.text()
    console.log('BODY', body)
  } catch(e){ console.error(e); process.exit(1) }
})()
