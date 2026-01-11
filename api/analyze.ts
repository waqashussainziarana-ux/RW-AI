import { db } from '../db/client.ts';
import { analyzeWebsite, generateSalesMessage } from '../services/geminiService.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id } = req.body;
  
  try {
    // 1. Fetch Lead
    const { rows } = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    const lead = rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // 2. Run AI Audit
    const audit = await analyzeWebsite(lead);
    
    // 3. Generate Message
    const ai_message = await generateSalesMessage(lead, audit);

    // 4. Update Database
    const updated = await db.query(
      `UPDATE leads SET 
        status = 'analyzed', 
        pain_points = $2, 
        ai_message = $3,
        severity = $4
       WHERE id = $1 RETURNING *`,
      [id, audit.pain_points.join(', '), ai_message, audit.severity]
    );

    return res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'AI Analysis failed' });
  }
}