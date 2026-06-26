import { sql } from 'drizzle-orm';
import { db, universitiesTable, majorsTable } from '../../../lib/db/src/index.ts';

const [universityCount] = await db.select({ count: sql`count(*)` }).from(universitiesTable);
const [majorCount] = await db.select({ count: sql`count(*)` }).from(majorsTable);

console.log(JSON.stringify({
  universities: Number(universityCount.count),
  majors: Number(majorCount.count),
}));
