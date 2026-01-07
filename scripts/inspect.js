import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function inspectTable() {
    const sql = neon(process.env.NEON_DATABASE_URL);

    try {
        const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'candidates';
    `;
        console.table(columns);
    } catch (err) {
        console.error(err);
    }
}

inspectTable();
