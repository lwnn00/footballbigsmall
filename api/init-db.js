import { db } from '@vercel/postgres://bc3e503e72741197a4cd4474d3bb362dd0c11096c4f797d32fe693eb4e5f73fe:sk__WkPDn34hIqBR0s7KCpNJ@db.prisma.io:5432/postgres?sslmode=require';

export default async function handler(req, res) {
  // 添加安全验证（可选）
  const { secret } = req.query;
  if (secret !== process.env.INIT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await db.connect();
    
    // 创建用户表
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL DEFAULT 'trial',
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        fingerprint_hash VARCHAR(100),
        trial_count INTEGER DEFAULT 0,
        trial_start_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    // 创建邀请码表
    await client.sql`
      CREATE TABLE IF NOT EXISTS invitation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_by INTEGER REFERENCES users(id),
        used_at TIMESTAMP,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP
      )
    `;

    // 创建记录表
    await client.sql`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        handicap_type VARCHAR(10) NOT NULL,
        match_name VARCHAR(200),
        initial_handicap DECIMAL(5,2),
        current_handicap DECIMAL(5,2),
        initial_water DECIMAL(5,2),
        current_water DECIMAL(5,2),
        historical_record VARCHAR(10),
        recommendation VARCHAR(50),
        actual_result VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_offline BOOLEAN DEFAULT FALSE
      )
    `;

    // 创建试用限制表
    await client.sql`
      CREATE TABLE IF NOT EXISTS trial_restrictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        restriction_type VARCHAR(50) NOT NULL,
        reason TEXT,
        restricted_until TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建指纹记录表
    await client.sql`
      CREATE TABLE IF NOT EXISTS fingerprints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        fingerprint_hash VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, fingerprint_hash)
      )
    `;

    // 创建离线队列表
    await client.sql`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP
      )
    `;

    // 创建索引
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id)
    `;
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC)
    `;
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code)
    `;
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_user_status ON offline_queue(user_id, status)
    `;

    await client.release();

    res.status(200).json({ 
      success: true, 
      message: 'Database tables created successfully' 
    });
    
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error 
    });
  }
}
