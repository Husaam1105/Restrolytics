import { migratedDb } from "./harness";

const db = await migratedDb();
const { rows } = await db.query<{ n: number }>(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
);
console.log(`All migrations applied. ${rows[0]?.n} public tables.`);
