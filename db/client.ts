import { createPool } from '@vercel/postgres';

// The connection string is automatically injected by Vercel
export const db = createPool();

export const getLeads = async () => {
  const { rows } = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
  return rows;
};

export const updateLead = async (id: string, updates: any) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  
  return await db.query(
    `UPDATE leads SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
};