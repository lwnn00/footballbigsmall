// api/detect-reset.js
const trialRecords = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { username, oldFingerprint, newFingerprint } = req.body;
    
    if (!username || !newFingerprint) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    // 查找该用户的所有记录
    const userRecords = [];
    for (const [key, value] of trialRecords.entries()) {
      if (value.username === username) {
        userRecords.push({
          fingerprint: value.fingerprint,
          count: value.count,
          firstUse: value.firstUse,
          lastUse: value.lastUse
        });
      }
    }
    
    // 计算总使用次数
    const totalUsed = userRecords.reduce((sum, record) => sum + record.count, 0);
    
    // 检查是否有旧指纹记录
    const hasOldRecord = userRecords.some(record => 
      record.fingerprint === oldFingerprint
    );
    
    if (hasOldRecord && oldFingerprint !== newFingerprint) {
      // 检测到重置行为
      console.warn(`检测到重置行为: ${username}, 指纹变更`);
      
      return res.json({
        success: true,
        resetDetected: true,
        message: '检测到浏览器数据清除行为',
        totalUsed,
        maxAllowed: 18,
        remaining: Math.max(0, 18 - totalUsed),
        recordCount: userRecords.length,
        penalty: totalUsed >= 18 // 如果总次数超过限制，施加惩罚
      });
    }
    
    return res.json({
      success: true,
      resetDetected: false,
      message: '正常使用',
      totalUsed,
      remaining: Math.max(0, 18 - totalUsed)
    });
    
  } catch (error) {
    console.error('重置检测错误:', error);
    return res.status(500).json({ 
      success: false, 
      error: '服务器错误' 
    });
  }
};