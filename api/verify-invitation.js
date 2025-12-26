// api/verify-invitation.js
// 这里可以使用环境变量存储邀请码，更安全
const INVITATION_CODES = process.env.INVITATION_CODES 
  ? JSON.parse(process.env.INVITATION_CODES)
  : ['VIP2024', 'FOOTBALL888', 'SPECIAL123', 'TESTCODE123'];

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
    const { code, username } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: '请提供邀请码' 
      });
    }
    
    const upperCode = code.toUpperCase().trim();
    const isValid = INVITATION_CODES.includes(upperCode);
    
    console.log(`邀请码验证: ${upperCode}, 用户: ${username}, 结果: ${isValid}`);
    
    if (isValid) {
      return res.json({
        success: true,
        valid: true,
        message: '邀请码有效',
        userType: 'registered',
        code: upperCode
      });
    } else {
      return res.json({
        success: true,
        valid: false,
        message: '邀请码无效或已过期'
      });
    }
    
  } catch (error) {
    console.error('邀请码验证错误:', error);
    return res.status(500).json({ 
      success: false, 
      error: '服务器错误' 
    });
  }
};