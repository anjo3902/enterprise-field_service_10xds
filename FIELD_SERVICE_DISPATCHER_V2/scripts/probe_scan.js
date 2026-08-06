(async()=>{
  const base=process.env.E2E_API_BASE || 'http://127.0.0.1:8000'
  const admin={email:'e2e.admin@test.com',password:'E2eTest9999'}
  const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(admin)})
  const token=(await login.json()).token
  const testRunId=`probe-${Date.now()}`
  const techRes=await fetch(`${base}/admin/test/create-technician`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({test_run_id:testRunId,name:'Probe Tech'})})
  const techJson=await techRes.json()
  const reqRes=await fetch(`${base}/admin/test/create-request`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({test_run_id:testRunId,assigned_technician:techJson.technician_id,status:'assigned'})})
  const reqJson=await reqRes.json()
  console.log('created', testRunId, techJson, reqJson)
  const scan=await fetch(`${base}/admin/test/scan?test_run_id=${encodeURIComponent(testRunId)}`,{headers:{Authorization:`Bearer ${token}`}})
  console.log('scan status', scan.status)
  console.log(await scan.text())
})().catch(e=>{console.error(e);process.exit(1)})
