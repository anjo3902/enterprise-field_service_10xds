(async ()=>{
  try {
    const base = 'http://127.0.0.1:8000'
    const adminCreds = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }
    const custCreds = { email: 'e2e.customer@test.com', password: 'E2eTest9999' }
    // login admin
    const l = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(adminCreds) })
    const lj = await l.json(); const token = lj.token||lj.access_token
    console.log('admin token', !!token)
    // login customer to get id
    const lc = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(custCreds) })
    const lcj = await lc.json(); const cust = lcj.user
    console.log('customer id', cust && cust.id)

    const testRunId = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    console.log('testRunId', testRunId)

    // create test technician
    const techRes = await fetch(`${base}/admin/test/create-technician`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ test_run_id: testRunId, name: 'E2E-Tech-Run' }) })
    const tech = await techRes.json(); console.log('create tech status', techRes.status, tech)
    const techId = tech.technician_id

    // seed
    const seedRes = await fetch(`${base}/admin/test/seed`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ pending_count:1, technician_id: techId, customer_id: String(cust.id), customer_email: cust.email, customer_name: cust.name, test_run_id: testRunId }) })
    const seedJson = await seedRes.json(); console.log('seed status', seedRes.status, JSON.stringify(seedJson,null,2))

    // attempt to GET the assigned doc by deterministic id
    const assignedId = seedJson.assigned_job_id || `e2e-${testRunId}-assigned-1`
    console.log('assignedId', assignedId)
    const getRes = await fetch(`${base}/admin/service-requests/${assignedId}`, { headers: { Authorization: `Bearer ${token}` } })
    console.log('get assigned status', getRes.status)
    try { const getJ = await getRes.json(); console.log(JSON.stringify(getJ,null,2)) } catch(e){ console.log('no json') }
  } catch(e){ console.error(e); process.exit(1) }
})()
