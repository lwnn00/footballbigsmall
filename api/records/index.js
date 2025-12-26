import * as db from '../../lib/db';
import { verifyToken, canSaveTrialRecord } from '../../lib/auth';

// GET - 获取用户记录
// POST - 创建新记录
export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: '未授权访问' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Token无效或已过期' });
  }

  const userId = decoded.userId;

  if (req.method === 'GET') {
    try {
      // 获取记录
      const records = await db.getRecordsByUserId(userId, 100);
      
      res.status(200).json({
        success: true,
        records: records.map(record => ({
          id: record.id,
          handicapType: record.handicap_type,
          matchName: record.match_name,
          initialHandicap: record.initial_handicap,
          currentHandicap: record.current_handicap,
          initialWater: record.initial_water,
          currentWater: record.current_water,
          historicalRecord: record.historical_record,
          recommendation: record.recommendation,
          actualResult: record.actual_result,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        }))
      });
    } catch (error) {
      console.error('获取记录错误:', error);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        handicapType,
        matchName,
        initialHandicap,
        currentHandicap,
        initialWater,
        currentWater,
        historicalRecord,
        recommendation
      } = req.body;

      // 验证输入
      if (!handicapType || !matchName || !recommendation) {
        return res.status(400).json({ success: false, error: '缺少必填字段' });
      }

      // 获取用户信息
      const user = await db.findUserByUsername(decoded.username);
      
      // 检查试用用户限制
      if (user.user_type === 'trial') {
        if (!canSaveTrialRecord(user)) {
          return res.status(403).json({ 
            success: false, 
            error: '试用次数已达上限或试用期已过期',
            trialInfo: {
              count: user.trial_count,
              limit: 18,
              expired: checkTrialExpiry(user)
            }
          });
        }

        // 增加试用计数
        await db.updateUserTrialCount(user.id, user.trial_count + 1);
      }

      // 创建记录
      const recordData = {
        userId,
        handicapType,
        matchName,
        initialHandicap: parseFloat(initialHandicap),
        currentHandicap: parseFloat(currentHandicap),
        initialWater: parseFloat(initialWater),
        currentWater: parseFloat(currentWater),
        historicalRecord,
        recommendation
      };

      const newRecord = await db.createRecord(recordData);

      res.status(201).json({
        success: true,
        record: newRecord,
        trialInfo: user.user_type === 'trial' ? {
          count: user.trial_count + 1,
          limit: 18,
          remaining: 18 - (user.trial_count + 1)
        } : null
      });

    } catch (error) {
      console.error('创建记录错误:', error);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}