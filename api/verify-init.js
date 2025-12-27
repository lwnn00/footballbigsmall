export default async function handler(req, res) {
  // 安全措施：不直接暴露环境变量值
  const isInitSecretSet = !!process.env.INIT_SECRET;
  const initSecretLength = process.env.INIT_SECRET ? process.env.INIT_SECRET.length : 0;
  
  // 验证传入的密码
  const { testSecret } = req.query;
  const isMatch = testSecret === process.env.INIT_SECRET;
  
  res.status(200).json({
    success: true,
    message: '环境变量验证结果',
    environment: {
      hasInitSecret: isInitSecretSet,
      initSecretLength: initSecretLength,
      testResult: testSecret ? (isMatch ? '密码正确' : '密码错误') : '未测试'
    },
    timestamp: new Date().toISOString(),
    note: '此端点仅用于测试，生产环境请删除'
  });
}
