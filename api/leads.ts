import { db } from '../db/client.ts';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }
  }

  if (req.method === 'POST') {
    const { full_name, linkedin_url, title, company, website, country, industry } = req.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO leads (full_name, linkedin_url, title, company, website, country, industry)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (linkedin_url) DO UPDATE SET status = 'new'
         RETURNING *`,
        [full_name, linkedin_url, title, company, website, country, industry]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  return res.status(405).end();
}