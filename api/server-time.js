// api/server-time.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const now = Date.now();
  const serverTime = new Date(now);
  
  return res.json({
    success: true,
    serverTime: now,
    timestamp: serverTime.toISOString(),
    timezone: 'UTC',
    localTime: serverTime.toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      hour12: false 
    }),
    timezoneOffset: 8 // 东八区
  });
};