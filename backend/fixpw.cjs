const b=require('bcrypt');
const {execSync}=require('child_process');
const fs=require('fs');
(async()=>{
 const h=await b.hash('Whk125663',12);
 fs.writeFileSync('/tmp/hash.txt',h);
 execSync(`PGPASSWORD='WaiGyi125663#' psql "postgresql://postgres.wduponxvtqsgvfauhmbo@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres" -c "UPDATE users SET password_hash='${h}' WHERE id=46;"`, {stdio:'inherit'});
 console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
