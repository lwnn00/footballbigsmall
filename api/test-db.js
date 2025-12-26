import { db } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const client = await db.connect();
    
    // 测试查询
    const result = await client.sql`SELECT version()`;
    
    // 检查表是否存在
    const tables = await client.sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    await client.release();
    
    res.status(200).json({
      success: true,
      postgresVersion: result.rows[0].version,
      tables: tables.rows.map(row => row.table_name),
      message: 'Database connection successful'
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database connection failed'
    });
  }
}
