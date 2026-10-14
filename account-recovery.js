// Codes de secours à usage unique : ne jamais journaliser ni conserver en clair.
import crypto from 'node:crypto';
export function newRecoveryCode(){return crypto.randomBytes(24).toString('base64url');}
export function recoveryDigest(code){return crypto.createHash('sha256').update(code).digest('hex');}
export function validRecoveryCode(code){return typeof code==='string' && /^[A-Za-z0-9_-]{32}$/.test(code);}
export function verifyRecoveryCode(code,digest){
  if(!validRecoveryCode(code)||typeof digest!=='string'||!/^[0-9a-f]{64}$/.test(digest))return false;
  return crypto.timingSafeEqual(Buffer.from(recoveryDigest(code),'hex'),Buffer.from(digest,'hex'));
}