import { verifyToken } from '../../lib/auth';
import * as db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: '未授权访问' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Token无效或已过期' });
  }

  try {
    // 获取用户信息
    const user = await db.findUserByUsername(decoded.username);
    
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 检查限制
    const restriction = await db.checkTrialRestriction(user.id);
    
    // 计算剩余天数
    const trialEnd = new Date(user.trial_end_date);
    const now = new Date();
    const remainingDays = user.user_type === 'trial' 
      ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
      : 999;

    res.status(200).json({
      success: true,
      trialInfo: {
        userId: user.id,
        userType: user.user_type,
        trialCount: user.trial_count,
        trialLimit: 18,
        remainingCount: 18 - user.trial_count,
        trialStartDate: user.trial_start_date,
        trialEndDate: user.trial_end_date,
        remainingDays: Math.max(0, remainingDays),
        isExpired: now > trialEnd,
        restriction: restriction ? {
          reason: restriction.reason,
          restrictedUntil: restriction.restricted_until,
          hoursLeft: Math.ceil((new Date(restriction.restricted_until) - now) / (1000 * 60 * 60))
        } : null
      }
    });

  } catch (error) {
    console.error('获取试用信息错误:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}