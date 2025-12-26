// api/verify-trial.js
const trialRecords = new Map();

module.exports = async (req, res) => {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { username, fingerprint, action = 'check' } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();

    console.log(`[${new Date().toISOString()}] 试用验证:`, { 
      username, 
      action,
      ip: ip.substring(0, 15) + '...' 
    });

    if (!username || !fingerprint) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }

    const userKey = `${username}_${fingerprint.substring(0, 16)}`;
    let userData = trialRecords.get(userKey);

    if (!userData) {
      // 新用户
      userData = {
        username,
        fingerprint,
        count: 0,
        maxCount: 18,
        firstUse: now,
        lastUse: now,
        ipHistory: [ip],
        createdAt: now,
        blocked: false,
        blockReason: null
      };
      trialRecords.set(userKey, userData);
      
      console.log(`新用户注册: ${username}, 指纹: ${fingerprint.substring(0, 8)}...`);
    }

    // 检查是否被封锁
    if (userData.blocked) {
      return res.json({ 
        success: false, 
        blocked: true,
        reason: userData.blockReason || '试用次数异常',
        unlockTime: userData.blockUntil || null
      });
    }

    // 检查IP频繁访问（24小时内超过20次不同请求）
    const recentIPs = userData.ipHistory.filter(timestamp => 
      now - timestamp < 24 * 60 * 60 * 1000
    );
    
    if (recentIPs.length > 20) {
      userData.blocked = true;
      userData.blockReason = 'IP请求过于频繁';
      userData.blockUntil = now + 24 * 60 * 60 * 1000; // 封锁24小时
      
      console.warn(`用户 ${username} 因频繁请求被封锁`);
      
      return res.json({ 
        success: false, 
        blocked: true,
        reason: '请求过于频繁，请24小时后重试'
      });
    }

    if (action === 'increment') {
      // 增加使用次数
      if (userData.count >= userData.maxCount) {
        return res.json({ 
          success: false, 
          exceed: true,
          message: '试用次数已用完',
          count: userData.count,
          remaining: 0
        });
      }
      
      userData.count++;
      userData.lastUse = now;
      userData.ipHistory.push(now);
      
      // 清理旧记录（只保留最近100条）
      if (userData.ipHistory.length > 100) {
        userData.ipHistory = userData.ipHistory.slice(-100);
      }
      
      console.log(`用户 ${username} 增加次数: ${userData.count}/18`);
    }

    // 定期清理过期数据（30天未使用）
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    for (const [key, data] of trialRecords.entries()) {
      if (data.lastUse < thirtyDaysAgo) {
        trialRecords.delete(key);
      }
    }

    return res.json({
      success: true,
      count: userData.count,
      remaining: userData.maxCount - userData.count,
      firstUse: userData.firstUse,
      lastUse: userData.lastUse,
      blocked: false
    });

  } catch (error) {
    console.error('试用验证错误:', error);
    return res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      message: error.message 
    });
  }
};