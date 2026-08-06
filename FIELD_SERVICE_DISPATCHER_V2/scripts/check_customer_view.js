(async ()=>{
  try {
    const base = 'http://127.0.0.1:8000'
    const adminCreds = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }
    const techCreds = { email: 'e2e.tech@test.com', password: 'E2eTest9999' }
    const custCreds = { email: 'e2e.customer@test.com', password: 'E2eTest9999' }
    // login admin
    const l = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(adminCreds) })
    const lj = await l.json(); const adminToken = lj.token||lj.access_token
    // login tech for link-profile and start
    const lt = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(techCreds) })
    const ltj = await lt.json(); const techToken = ltj.token||ltj.access_token
    // login cust to get id
    const lc = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(custCreds) })
    const lcj = await lc.json(); const cust = lcj.user

    const testRunId = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    console.log('testRunId', testRunId)

    // create test technician
    const techRes = await fetch(`${base}/admin/test/create-technician`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ test_run_id: testRunId, name: 'E2E-Tech-Run' }) })
    const tech = await techRes.json(); const techId = tech.technician_id; console.log('techId', techId)

    // link-profile (simulate what test does)
    const linkRes = await fetch(`${base}/technician/link-profile`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${techToken}`}, body: JSON.stringify({ technician_code: `E2E-${testRunId}-${techId}` }) })
    console.log('link profile status', linkRes.status)

    // seed A
    const seedARes = await fetch(`${base}/admin/test/seed`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ pending_count:1, technician_id: techId, customer_id: String(cust.id), customer_email: cust.email, customer_name: cust.name, test_run_id: testRunId })})
    const seedA = await seedARes.json(); console.log('seedA', seedARes.status, JSON.stringify(seedA,null,2))
    const jobA = seedA.assigned_job_id

    // seed B
    const uniq = `e2e.customer.b+${Date.now()}@test.com`
    const signup = await fetch(`${base}/auth/signup`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:'Etwo Customer B', email: uniq, password: custCreds.password, phone:'9000000022', role:'customer' }) })
    const signupJ = await signup.json(); console.log('signup', signup.status, signupJ.user && signupJ.user.id)
    const loginB = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: uniq, password: custCreds.password }) })
    const loginBJ = await loginB.json(); const custB = loginBJ.user
    const seedBRes = await fetch(`${base}/admin/test/seed`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ pending_count:1, technician_id: techId, customer_id: String(custB.id), customer_email: custB.email, customer_name: custB.name, test_run_id: testRunId })})
    const seedB = await seedBRes.json(); console.log('seedB', seedBRes.status, JSON.stringify(seedB,null,2))
    const jobB = seedB.assigned_job_id

    // start jobA
    const startRes = await fetch(`${base}/technician/jobs/${jobA}/start`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${techToken}`}, body: JSON.stringify({}) })
    console.log('start job status', startRes.status)

    // now call customer/my-requests as cust A
    const custLogin = await fetch(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(custCreds) })
    const custLoginJ = await custLogin.json(); const custToken = custLoginJ.token||custLoginJ.access_token
    const myReqs = await fetch(`${base}/customer/my-requests`, { headers: { Authorization: `Bearer ${custToken}` } })
    console.log('customer my-requests status', myReqs.status)
    const myReqsJ = await myReqs.json(); console.log('my requests size', myReqsJ.length)
    console.log(JSON.stringify(myReqsJ.slice(0,10), null, 2))

  } catch(e){ console.error(e); process.exit(1) }
})()
