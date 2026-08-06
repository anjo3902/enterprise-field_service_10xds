const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bifsitgftauzvaetpfdj.supabase.co',
  'sb_publishable_qdzaM8q5E1GzmYoDz3gceA_nd0fq5o5'
);

async function test() {
  console.log("Testing assets table...");
  const { data: assets, error: assetsErr } = await supabase.from('assets').select('*');
  if (assetsErr) console.error("Assets Error:", assetsErr);
  else console.log("Assets count:", assets?.length);

  console.log("Testing healthscores table...");
  const { data: health, error: healthErr } = await supabase.from('healthscores').select('*');
  if (healthErr) console.error("Healthscores Error:", healthErr);
  else console.log("Healthscores count:", health?.length);
}

test();
