const axios = require('axios');

async function test() {
  const api = axios.create({ baseURL: 'http://127.0.0.1:8000' });
  
  try {
    // 1. Login as technician
    const loginRes = await api.post('/auth/login', {
      email: 'tech1@example.com',
      password: 'password123'
    });
    
    const token = loginRes.data.access_token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Fetch technician jobs
    const jobsRes = await api.get('/technician/jobs');
    const jobs = jobsRes.data.jobs || jobsRes.data;
    
    console.log(`Found ${jobs.length} jobs.`);
    if (jobs.length > 0) {
      console.log('Sample Job Payload:');
      const job = jobs[0];
      // Pick keys containing 'image'
      const imageKeys = Object.keys(job).filter(k => k.toLowerCase().includes('image'));
      const relevantProps = {
        id: job.id,
        image_severity: job.image_severity,
        image_url: job.image_url,
        image_path: job.image_path,
        evidence_image: job.evidence_image,
        evidence: job.evidence
      };
      console.log(JSON.stringify(job, null, 2));
      console.log('\nKeys containing "image":', imageKeys);
    }
  } catch (err) {
    console.error(err?.response?.data || err.message);
  }
}

test();
