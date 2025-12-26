import { hashFingerprint, generateToken, verifyPassword } from '../../lib/auth';
import * as db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password, fingerprint } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码必填' });
    }

    // 查找用户
    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 检查用户状态
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: '账号已被禁用' });
    }

    // 检查试用限制
    const restriction = await db.checkTrialRestriction(user.id);
    if (restriction) {
      return res.status(403).json({ 
        success: false, 
        error: `账号受限: ${restriction.reason}`,
        restriction: {
          reason: restriction.reason,
          restrictedUntil: restriction.restricted_until
        }
      });
    }

    // 记录指纹（可选）
    if (fingerprint) {
      const fingerprintHash = hashFingerprint(fingerprint);
      // 保存指纹到数据库...
    }

    // 更新最后登录时间
    const client = await db.getClient();
    await client.sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ${user.id}
    `;

    // 生成Token
    const token = generateToken(user);

    // 返回用户数据（排除密码）
    const userData = {
      id: user.id,
      username: user.username,
      userType: user.user_type,
      email: user.email,
      trialCount: user.trial_count,
      trialEndDate: user.trial_end_date,
      remainingTrialDays: getRemainingTrialDays(user)
    };

    res.status(200).json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}