import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'prj_t39Ie4BdGPE0BYKg1Tee7qxzHbOh';
const JWT_EXPIRES_IN = '7d';

// 密码哈希
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// JWT Token
export function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    userType: user.user_type
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 指纹哈希
export function hashFingerprint(fingerprint) {
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

// 试用期检查
export function checkTrialExpiry(user) {
  if (user.user_type !== 'trial') return false;
  
  const trialEnd = new Date(user.trial_end_date);
  const now = new Date();
  
  return now > trialEnd;
}

export function getRemainingTrialDays(user) {
  if (user.user_type !== 'trial') return 999;
  
  const trialEnd = new Date(user.trial_end_date);
  const now = new Date();
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

// 试用次数检查
export function canSaveTrialRecord(user) {
  if (user.user_type !== 'trial') return true;
  
  // 检查试用期
  if (checkTrialExpiry(user)) return false;
  
  // 检查试用次数（最多18次）
  if (user.trial_count >= 18) return false;
  
  return true;
}

// 限制检查
export async function checkUserRestrictions(userId, db) {
  const restriction = await db.checkTrialRestriction(userId);
  if (restriction) {
    return {
      restricted: true,
      reason: restriction.reason,
      restrictedUntil: restriction.restricted_until,
      hoursLeft: Math.ceil((new Date(restriction.restricted_until) - new Date()) / (1000 * 60 * 60))
    };
  }
  
  return { restricted: false };
}