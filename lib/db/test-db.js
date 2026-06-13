import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.wduponxvtqsgvfauhmbo:WaiGyi125663%23@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':***@'));

const client = new Client({
  connectionString: connectionString,
});

try {
  await client.connect();
  console.log('Successfully connected!');
  const res = await client.query('SELECT NOW()');
  console.log('Result:', res.rows[0]);
  await client.end();
} catch (err) {
  console.error('Connection failed:', err);
  process.exit(1);
}
