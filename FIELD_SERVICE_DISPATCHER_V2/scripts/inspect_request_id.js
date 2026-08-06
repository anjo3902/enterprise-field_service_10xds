(async ()=>{
  try {
    const base = 'http://127.0.0.1:8000'
    const id = process.argv[2]
    if (!id) { console.error('Usage: node inspect_request_id.js <requestId>'); process.exit(2) }
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e.admin@test.com', password: 'E2eTest9999' }),
    })
    const login = await loginRes.json()
    const token = login.token || login.access_token
    console.log('TOKEN', token)
    const reqRes = await fetch(`${base}/admin/service-requests/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    console.log('REQUEST STATUS', reqRes.status)
    const reqBody = await reqRes.json()
    console.log(JSON.stringify(reqBody, null, 2))
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
