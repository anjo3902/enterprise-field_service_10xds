(async ()=>{
  try {
    const base = 'http://127.0.0.1:8000'
    const adminCreds = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }
    const techCreds = { email: 'e2e.tech@test.com', password: 'E2eTest9999' }
    const custCreds = { email: 'e2e.customer@test.com', password: 'E2eTest9999' }
    const l = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(adminCreds) })
    const lj = await l.json(); const adminToken = lj.token||lj.access_token
    const lt = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(techCreds) })
    const ltj = await lt.json(); const techToken = ltj.token||ltj.access_token
    const lc = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(custCreds) })
    const lcj = await lc.json(); const cust = lcj.user
    const testRunId = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const techRes = await fetch(`${base}/admin/test/create-technician`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ test_run_id: testRunId, name: 'E2E-Tech-Run' }) })
    const tech = await techRes.json(); const techId = tech.technician_id
    const seedRes = await fetch(`${base}/admin/test/seed`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ pending_count:1, technician_id: techId, customer_id: String(cust.id), customer_email: cust.email, customer_name: cust.name, test_run_id: testRunId })})
    const seedJson = await seedRes.json(); const jobA = seedJson.assigned_job_id
    console.log('seeded job', jobA)
    // start job
    const startRes = await fetch(`${base}/technician/jobs/${jobA}/start`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${techToken}`}, body: JSON.stringify({}) })
    console.log('start', startRes.status)
    // post live location
    const liveRes = await fetch(`${base}/technician/jobs/${jobA}/live-location`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${techToken}`}, body: JSON.stringify({ latitude:13.0831, longitude:80.2714, accuracy_m:5, heading:0, timestamp: new Date().toISOString() }) })
    console.log('live post', liveRes.status)
    // poll request
    for (let i=0;i<10;i++){
      const getRes = await fetch(`${base}/admin/service-requests/${jobA}`, { headers:{Authorization:`Bearer ${adminToken}`} })
      const body = await getRes.json()
      console.log('poll', i, 'status', getRes.status, 'live_tracking_updated_at', body.live_tracking_updated_at)
      if (body && body.live_tracking_updated_at) break
      await new Promise(r=>setTimeout(r,1000))
    }
  } catch(e){ console.error(e); process.exit(1) }
})()
