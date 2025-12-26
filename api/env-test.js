export default function handler(req, res) {
  // 注意：不要在生产环境暴露所有环境变量！
  // 这个端点仅用于测试，生产环境应该移除或保护
  
  const envVars = {
    // 检查是否存在
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasInitSecret: !!process.env.INIT_SECRET,
    
    // 显示部分信息（不显示完整值）
    postgresUrlLength: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    initSecretLength: process.env.INIT_SECRET ? process.env.INIT_SECRET.length : 0,
    
    // 显示主机名（如果存在）
    postgresHost: process.env.POSTGRES_URL ? 
      process.env.POSTGRES_URL.split('@')[1]?.split('/')[0] : null,
    
    // Node 环境
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };
  
  res.status(200).json({
    success: true,
    message: '环境变量测试',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
}