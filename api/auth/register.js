import { hashPassword, hashFingerprint, generateToken } from '../../lib/auth';
import * as db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password, email, invitationCode, fingerprint } = req.body;

    // 验证输入
    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, error: '用户名至少需要3个字符' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少需要6个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = await db.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    let userType = 'trial';
    
    // 验证邀请码
    if (invitationCode) {
      const validCode = await db.validateInvitationCode(invitationCode);
      if (!validCode) {
        return res.status(400).json({ success: false, error: '无效或已使用的邀请码' });
      }
      userType = 'registered';
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const userData = {
      username,
      passwordHash,
      userType,
      email: email || null
    };

    const newUser = await db.createUser(userData);

    // 如果使用了邀请码，标记为已使用
    if (invitationCode) {
      const validCode = await db.validateInvitationCode(invitationCode);
      if (validCode) {
        await db.useInvitationCode(validCode.id, newUser.id);
      }
    }

    // 记录指纹
    if (fingerprint) {
      const fingerprintHash = hashFingerprint(fingerprint);
      // 保存到指纹表...
    }

    // 生成Token
    const token = generateToken(newUser);

    // 返回用户数据
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      userType: newUser.user_type,
      email: newUser.email,
      trialCount: 0,
      trialEndDate: newUser.trial_end_date,
      remainingTrialDays: userType === 'trial' ? 7 : null
    };

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}