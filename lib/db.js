import { db } from '@vercel/postgres://bc3e503e72741197a4cd4474d3bb362dd0c11096c4f797d32fe693eb4e5f73fe:sk__WkPDn34hIqBR0s7KCpNJ@db.prisma.io:5432/postgres?sslmode=require';

export async function getClient() {
  const client = await db.connect();
  return client;
}

// 初始化数据库
export async function initDB() {
  try {
    const client = await getClient();
    
    // 执行建表语句（上面提供的SQL）
    await client.sql`CREATE TABLE IF NOT EXISTS users (...)`;
    // ... 其他建表语句
    
    console.log('数据库初始化成功');
    return { success: true };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return { success: false, error: error.message };
  }
}

// 用户相关
export async function createUser(userData) {
  const client = await getClient();
  const { username, passwordHash, userType, email } = userData;
  
  const result = await client.sql`
    INSERT INTO users (username, password_hash, user_type, email, trial_start_date, trial_end_date)
    VALUES (${username}, ${passwordHash}, ${userType}, ${email}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days')
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function findUserByUsername(username) {
  const client = await getClient();
  const result = await client.sql`
    SELECT * FROM users WHERE username = ${username}
  `;
  return result.rows[0];
}

export async function updateUserTrialCount(userId, newCount) {
  const client = await getClient();
  const result = await client.sql`
    UPDATE users 
    SET trial_count = ${newCount}
    WHERE id = ${userId}
    RETURNING *
  `;
  return result.rows[0];
}

// 记录相关
export async function createRecord(recordData) {
  const client = await getClient();
  const { userId, handicapType, matchName, initialHandicap, currentHandicap, initialWater, currentWater, historicalRecord, recommendation } = recordData;
  
  const result = await client.sql`
    INSERT INTO records (
      user_id, handicap_type, match_name, initial_handicap, current_handicap, 
      initial_water, current_water, historical_record, recommendation
    )
    VALUES (
      ${userId}, ${handicapType}, ${matchName}, ${initialHandicap}, ${currentHandicap},
      ${initialWater}, ${currentWater}, ${historicalRecord}, ${recommendation}
    )
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function getRecordsByUserId(userId, limit = 100) {
  const client = await getClient();
  const result = await client.sql`
    SELECT * FROM records 
    WHERE user_id = ${userId} 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows;
}

// 邀请码相关
export async function createInvitationCode(codeData) {
  const client = await getClient();
  const { code, createdBy } = codeData;
  
  const result = await client.sql`
    INSERT INTO invitation_codes (code, created_by, expires_at)
    VALUES (${code}, ${createdBy}, CURRENT_TIMESTAMP + INTERVAL '30 days')
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function validateInvitationCode(code) {
  const client = await getClient();
  const result = await client.sql`
    SELECT * FROM invitation_codes 
    WHERE code = ${code} 
      AND is_used = FALSE 
      AND expires_at > CURRENT_TIMESTAMP
  `;
  
  return result.rows[0];
}

export async function useInvitationCode(codeId, userId) {
  const client = await getClient();
  const result = await client.sql`
    UPDATE invitation_codes 
    SET used_by = ${userId}, used_at = CURRENT_TIMESTAMP, is_used = TRUE
    WHERE id = ${codeId}
    RETURNING *
  `;
  
  return result.rows[0];
}

// 试用限制相关
export async function checkTrialRestriction(userId) {
  const client = await getClient();
  const result = await client.sql`
    SELECT * FROM trial_restrictions 
    WHERE user_id = ${userId} 
      AND restricted_until > CURRENT_TIMESTAMP
    ORDER BY restricted_until DESC 
    LIMIT 1
  `;
  
  return result.rows[0];
}

export async function addTrialRestriction(userId, restrictionType, reason, hours = 24) {
  const client = await getClient();
  const result = await client.sql`
    INSERT INTO trial_restrictions (user_id, restriction_type, reason, restricted_until)
    VALUES (${userId}, ${restrictionType}, ${reason}, CURRENT_TIMESTAMP + INTERVAL '${hours} hours')
    RETURNING *
  `;
  
  return result.rows[0];
}