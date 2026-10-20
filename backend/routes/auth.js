const express = require('express');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required and must be at least 32 characters.');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getRole } = require('../lib/roles');

const router = express.Router();
const loginBuckets = new Map();
function loginRateLimit(req,res,next){
  const key = `${req.ip||req.socket.remoteAddress||'unknown'}:${String(req.body?.email||'').toLowerCase().trim()}`;
  const now=Date.now(); let b=loginBuckets.get(key);
  if(!b || now-b.started>15*60*1000) b={started:now,count:0};
  b.count++; loginBuckets.set(key,b);
  if(b.count>12) return res.status(429).json({error:'Too many login attempts. Try again in 15 minutes.'});
  next();
}


const profileUploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
fs.mkdirSync(profileUploadDir, { recursive: true });
const profileStorage = multer.diskStorage({
  destination: profileUploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  },
});
const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

function audit(userId, action, entityId, details) {
  db.prepare('INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(userId || null, action, 'user', entityId || null, details || '');
}
function passwordOk(p) { return typeof p === 'string' && p.length >= 8; }
function genericResetMessage() { return 'If the account exists and the recovery details are valid, a reset can be completed.'; }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function makeRecoveryCode() { return Array.from({length: 3}, () => crypto.randomBytes(3).toString('hex').toUpperCase()).join('-'); }
function base32Encode(buf){ const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0,value=0,out=''; for(const b of buf){ value=(value<<8)|b; bits+=8; while(bits>=5){ out+=alphabet[(value>>>(bits-5))&31]; bits-=5; } } if(bits>0) out+=alphabet[(value<<(5-bits))&31]; return out; }
function base32Decode(input){ const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0,value=0,out=[]; for(const ch of String(input||'').replace(/=+$/,'').toUpperCase()){ const v=alphabet.indexOf(ch); if(v<0) continue; value=(value<<5)|v; bits+=5; if(bits>=8){ out.push((value>>>(bits-8))&255); bits-=8; } } return Buffer.from(out); }
function totp(secret, counter=Math.floor(Date.now()/1000/30)){ const key=base32Decode(secret); const msg=Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter)); const h=crypto.createHmac('sha1',key).update(msg).digest(); const off=h[h.length-1]&15; const code=((h.readUInt32BE(off)&0x7fffffff)%1000000).toString().padStart(6,'0'); return code; }
function verifyTotp(secret, code){ const c=String(code||'').replace(/\s+/g,''); const n=Math.floor(Date.now()/1000/30); return [n-1,n,n+1].some(x=>totp(secret,x)===c); }
function makeBackupCodes(){ return Array.from({length:8},()=>crypto.randomBytes(4).toString('hex').toUpperCase()); }
function hashBackupCodes(codes){ return JSON.stringify(codes.map(c=>crypto.createHash('sha256').update(c).digest('hex'))); }
function consumeBackup(hashJson, code){ let hashes=[]; try{hashes=JSON.parse(hashJson||'[]')}catch{} const h=crypto.createHash('sha256').update(String(code||'').toUpperCase()).digest('hex'); const i=hashes.indexOf(h); if(i<0)return false; hashes.splice(i,1); return JSON.stringify(hashes); }
function setSessionCookie(res,token){ res.setHeader('Set-Cookie',`matara_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=43200`); }
function clearSessionCookie(res){ res.setHeader('Set-Cookie',`matara_session=; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=0`); }
function issueToken(user){ return jwt.sign({ id:user.id,name:user.name,email:user.email,role:user.role,sessionVersion:user.session_version||1 }, JWT_SECRET,{expiresIn:'12h'}); }


router.post('/login', loginRateLimit, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const normalizedEmail=email.toLowerCase().trim();
  const ip=req.ip||req.socket.remoteAddress||''; const ua=req.get('user-agent')||'';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) { db.prepare('INSERT INTO login_attempts(email,success,ip,user_agent) VALUES(?,?,?,?)').run(normalizedEmail,0,ip,ua); return res.status(401).json({ error: 'No account found with that email.' }); }
  if (user.locked_until && new Date(user.locked_until).getTime()>Date.now()) return res.status(423).json({error:'Account temporarily locked after repeated failed logins. Try again later or contact the school administrator.'});
  if (user.active === 0) return res.status(403).json({ error: 'This account has been deactivated. Please contact the school office.' });
  // University policy: legacy parent portal accounts are not supported in v4.
  // Emergency-contact records remain available to authorized university staff.
  if (String(user.role || '').toLowerCase() === 'parent') return res.status(403).json({ error: 'Parent portal accounts are not supported by Matara University. Please contact the university office if you believe this is an error.' });
  if (getRole(user.role)?.api_only) return res.status(403).json({ error: 'This is a machine account. It signs in with its API key, not a password.' });
  if (user.access_expires_at) {
    const end = String(user.access_expires_at);
    if (new Date(end.length <= 10 ? end + 'T23:59:59' : end).getTime() < Date.now()) return res.status(403).json({ error: 'Your temporary access has ended. Please contact the university office.' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    const failed=Number(user.failed_login_count||0)+1; const lock=failed>=5?new Date(Date.now()+15*60000).toISOString():null;
    db.prepare('UPDATE users SET failed_login_count=?,locked_until=? WHERE id=?').run(failed,lock,user.id);
    db.prepare('INSERT INTO login_attempts(email,success,ip,user_agent) VALUES(?,?,?,?)').run(normalizedEmail,0,ip,ua);
    audit(user.id,'failed_login',user.id,`Failed login attempt ${failed}`);
    return res.status(lock?423:401).json({ error: lock?'Account temporarily locked after repeated failed logins. Try again in 15 minutes.':'Incorrect password.' });
  }
  db.prepare('UPDATE users SET failed_login_count=0,locked_until=NULL WHERE id=?').run(user.id);
  db.prepare('INSERT INTO login_attempts(email,success,ip,user_agent) VALUES(?,?,?,?)').run(normalizedEmail,1,ip,ua);
  if (user.two_factor_enabled) {
    const challenge = jwt.sign({ id:user.id, purpose:'2fa', sessionVersion:user.session_version||1 }, JWT_SECRET, {expiresIn:'5m'});
    audit(user.id, 'login_2fa_challenge', user.id, 'Password accepted; two-factor verification required');
    return res.json({ requires2fa:true, challenge, user:{id:user.id,name:user.name,email:user.email,role:user.role,profile_image_url:user.profile_image_url||null} });
  }
  const token = issueToken(user);
  audit(user.id, 'login', user.id, 'Successful login');
  setSessionCookie(res, token);
  res.json({ token, user:{id:user.id,name:user.name,email:user.email,role:user.role,profile_image_url:user.profile_image_url||null} });
});

router.post('/logout', requireAuth, (req,res)=>{ clearSessionCookie(res); audit(req.user.id,'logout',req.user.id,'User signed out'); res.json({success:true}); });

router.post('/2fa/verify-login',(req,res)=>{
  try{
    const payload=jwt.verify(String(req.body.challenge||''),JWT_SECRET);
    if(payload.purpose!=='2fa') return res.status(401).json({error:'Invalid two-factor challenge.'});
    const user=db.prepare('SELECT id,name,email,role,active,session_version,two_factor_enabled,two_factor_secret,two_factor_backup_hashes FROM users WHERE id=?').get(payload.id);
    if(!user||!user.active||!user.two_factor_enabled||payload.sessionVersion!==(user.session_version||1)) return res.status(401).json({error:'Two-factor challenge expired. Please sign in again.'});
    let backupHash=user.two_factor_backup_hashes;
    const code=String(req.body.code||'').trim();
    let valid=verifyTotp(user.two_factor_secret,code);
    if(!valid && backupHash){ const next=consumeBackup(backupHash,code); if(next!==false){ valid=true; backupHash=next; db.prepare('UPDATE users SET two_factor_backup_hashes=? WHERE id=?').run(next,user.id); } }
    if(!valid){ audit(user.id,'failed_2fa',user.id,'Invalid two-factor code'); return res.status(401).json({error:'Invalid verification code.'}); }
    const token=issueToken(user); setSessionCookie(res, token); audit(user.id,'login',user.id,'Successful login with two-factor authentication'); res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role,profile_image_url:user.profile_image_url||null}});
  }catch(e){ return res.status(401).json({error:'Invalid or expired two-factor challenge.'}); }
});

router.get('/2fa/status',requireAuth,(req,res)=>{ const u=db.prepare('SELECT two_factor_enabled FROM users WHERE id=?').get(req.user.id); res.json({enabled:!!u?.two_factor_enabled}); });
router.post('/2fa/setup',requireAuth,(req,res)=>{ const u=db.prepare('SELECT id,name,email,password FROM users WHERE id=?').get(req.user.id); if(!u)return res.status(404).json({error:'Account not found.'}); if(u.two_factor_enabled)return res.status(400).json({error:'Two-factor authentication is already enabled.'}); const secret=base32Encode(crypto.randomBytes(20)); const issuer='Matara University'; const label=encodeURIComponent(`${issuer}:${u.email}`); const uri=`otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`; db.prepare('UPDATE users SET two_factor_secret=? WHERE id=?').run(secret,u.id); res.json({secret,otpauth_url:uri,message:'Scan the QR code or enter the secret into an authenticator app, then verify the code.'}); });
router.post('/2fa/enable',requireAuth,(req,res)=>{ const u=db.prepare('SELECT id,two_factor_secret,password FROM users WHERE id=?').get(req.user.id); if(!u?.two_factor_secret)return res.status(400).json({error:'Start two-factor setup first.'}); if(!bcrypt.compareSync(String(req.body.current_password||''),u.password))return res.status(403).json({error:'Current password is incorrect.'}); if(!verifyTotp(u.two_factor_secret,req.body.code))return res.status(400).json({error:'Invalid authenticator code.'}); const codes=makeBackupCodes(); db.prepare('UPDATE users SET two_factor_enabled=1,two_factor_backup_hashes=? WHERE id=?').run(hashBackupCodes(codes),u.id); audit(u.id,'enable_2fa',u.id,'Two-factor authentication enabled'); res.json({enabled:true,backup_codes:codes,note:'Save these backup codes. Each can be used once if the authenticator is unavailable.'}); });
router.post('/2fa/disable',requireAuth,(req,res)=>{ const u=db.prepare('SELECT id,password FROM users WHERE id=?').get(req.user.id); if(!bcrypt.compareSync(String(req.body.current_password||''),u.password))return res.status(403).json({error:'Current password is incorrect.'}); db.prepare('UPDATE users SET two_factor_enabled=0,two_factor_secret=NULL,two_factor_backup_hashes=NULL WHERE id=?').run(u.id); audit(u.id,'disable_2fa',u.id,'Two-factor authentication disabled'); res.json({enabled:false}); });

// Self-service forgot password. The user proves ownership with the recovery code
// they previously configured while signed in. No administrator is required.
const resetLimiter = require('../middleware/rateLimit')({ windowMs: 15 * 60 * 1000, max: Number(process.env.RESET_RATE_LIMIT_MAX || 10) });
router.post('/forgot-password', resetLimiter, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const recoveryCode = String(req.body.recovery_code || '').trim();
  const next = String(req.body.new_password || '');
  const confirm = String(req.body.confirm_password || '');
  if (!email || !recoveryCode || !next || !confirm) return res.status(400).json({ error: 'Email, recovery code, new password and confirmation are required.' });
  if (!passwordOk(next)) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (next !== confirm) return res.status(400).json({ error: 'The new passwords do not match.' });

  const user = db.prepare('SELECT id, email, name, password, active, session_version FROM users WHERE email = ?').get(email);
  if (!user || user.active === 0) return res.status(400).json({ error: genericResetMessage() });
  const recovery = db.prepare('SELECT recovery_code_hash FROM account_recovery WHERE user_id = ?').get(user.id);
  if (!recovery || !bcrypt.compareSync(recoveryCode.replace(/\s+/g,''), recovery.recovery_code_hash)) {
    audit(null, 'failed_password_reset', user.id, 'Invalid recovery code');
    return res.status(400).json({ error: genericResetMessage() });
  }
  if (bcrypt.compareSync(next, user.password)) return res.status(400).json({ error: 'Choose a password different from the previous password.' });

  db.prepare('UPDATE users SET password=?, session_version=session_version+1, password_changed_at=datetime(\'now\') WHERE id=?')
    .run(bcrypt.hashSync(next,12), user.id);
  db.prepare('INSERT INTO password_history (user_id, action, changed_by, reason) VALUES (?, ?, ?, ?)')
    .run(user.id, 'self_service_reset', user.id, 'Forgot-password recovery');
  db.prepare('UPDATE password_reset_tokens SET used_at=datetime(\'now\') WHERE user_id=? AND used_at IS NULL').run(user.id);
  audit(user.id, 'reset_password', user.id, 'Self-service forgot-password reset');
  res.json({ success:true, message:'Password reset successfully. Please sign in with your new password.' });
});

router.put('/password', requireAuth, (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  const confirm = String(req.body.confirm_password || '');
  if (!current || !next || !confirm) return res.status(400).json({ error:'Current password, new password and confirmation are required.' });
  if (!passwordOk(next)) return res.status(400).json({ error:'Your new password must be at least 8 characters.' });
  if (next !== confirm) return res.status(400).json({ error:'The new passwords do not match.' });
  const user = db.prepare('SELECT id,password FROM users WHERE id=?').get(req.user.id);
  if (!user || !bcrypt.compareSync(current,user.password)) return res.status(400).json({error:'The current password is incorrect.'});
  if (current === next || bcrypt.compareSync(next,user.password)) return res.status(400).json({error:'Choose a password different from your current password.'});
  db.prepare("UPDATE users SET password=?, session_version=session_version+1, password_changed_at=datetime('now') WHERE id=?").run(bcrypt.hashSync(next,12),user.id);
  db.prepare('INSERT INTO password_history (user_id, action, changed_by, reason) VALUES (?,?,?,?)').run(user.id,'self_service_change',user.id,'User changed own password');
  audit(user.id,'change_password',user.id,'User changed own password');
  res.json({success:true,message:'Password changed successfully. Please sign in again.'});
});

router.post('/recovery-code', requireAuth, (req,res) => {
  const current = String(req.body.current_password || '');
  const user = db.prepare('SELECT id,password FROM users WHERE id=?').get(req.user.id);
  if (!user || !bcrypt.compareSync(current,user.password)) return res.status(403).json({error:'Enter your current password to create a recovery code.'});
  const code = makeRecoveryCode();
  db.prepare(`INSERT INTO account_recovery(user_id,recovery_code_hash,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET recovery_code_hash=excluded.recovery_code_hash, updated_at=datetime('now')`).run(user.id,bcrypt.hashSync(code,12));
  audit(user.id,'update_recovery_code',user.id,'Recovery code regenerated');
  res.json({recovery_code:code,message:'Save this recovery code somewhere secure. It will not be shown again.'});
});

router.get('/security', requireAuth, (req,res) => {
  const row = db.prepare('SELECT password_changed_at, created_at FROM users WHERE id=?').get(req.user.id);
  const recovery = db.prepare('SELECT updated_at FROM account_recovery WHERE user_id=?').get(req.user.id);
  const twofa = db.prepare('SELECT two_factor_enabled FROM users WHERE id=?').get(req.user.id);
  res.json({...row,recovery_configured:!!recovery,recovery_updated_at:recovery?.updated_at||null,two_factor_enabled:!!twofa?.two_factor_enabled});
});

// "role" is the real account type (for example helpdesk_l1); "effective_role" is the older
// role whose permissions it inherits.
router.get('/me', requireAuth, (req,res) => res.json({user:{ ...req.user, role:req.user.actual_role, effective_role:req.user.role }}));
router.get('/profile', requireAuth, (req,res) => {
  const profile=db.prepare(`SELECT s.employee_no,s.position,s.phone,s.employment_date,d.name AS department_name FROM staff s LEFT JOIN departments d ON d.id=s.department_id WHERE s.user_id=?`).get(req.user.id);
  const account=db.prepare('SELECT id,name,email,role,active,profile_image_url FROM users WHERE id=?').get(req.user.id);
  res.json({profile:profile||null, account});
});

router.post('/profile/photo', requireAuth, profileUpload.single('photo'), (req,res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose a JPG, PNG or WEBP image up to 3 MB.' });
  const publicPath = `/uploads/profiles/${req.file.filename}`;
  const previous = db.prepare('SELECT profile_image_url FROM users WHERE id=?').get(req.user.id)?.profile_image_url;
  db.prepare('UPDATE users SET profile_image_url=? WHERE id=?').run(publicPath, req.user.id);
  if (previous && previous.startsWith('/uploads/profiles/')) {
    const oldPath = path.join(__dirname, '..', previous.replace(/^\//, ''));
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
  }
  audit(req.user.id, 'UPDATE_PROFILE_PHOTO', req.user.id, `Profile photo updated by ${req.user.email}`);
  res.json({ success: true, profile_image_url: publicPath });
});

router.delete('/profile/photo', requireAuth, (req,res) => {
  const previous = db.prepare('SELECT profile_image_url FROM users WHERE id=?').get(req.user.id)?.profile_image_url;
  db.prepare('UPDATE users SET profile_image_url=NULL WHERE id=?').run(req.user.id);
  if (previous && previous.startsWith('/uploads/profiles/')) {
    const oldPath = path.join(__dirname, '..', previous.replace(/^\//, ''));
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
  }
  audit(req.user.id, 'REMOVE_PROFILE_PHOTO', req.user.id, 'Profile photo removed');
  res.json({ success: true });
});
module.exports = router;
