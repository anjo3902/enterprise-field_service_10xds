const axios = require('axios');
const API_URL = 'http://localhost:8000'; // Assuming local backend

async function test() {
  try {
    const response = await axios.post(
      `${API_URL}/reports/previsit`,
      { job_id: 1 },
      { timeout: 60000 }
    );
    console.log("Success:", response.data);
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

test();
