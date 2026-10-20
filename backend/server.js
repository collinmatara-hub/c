require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { init, db, dataDir } = require('./db');

// Make sure the database file + tables exist before anything else runs
init();

const app = express();
const rateLimit = require('./middleware/rateLimit');
app.use(rateLimit({windowMs:60000,max:Number(process.env.RATE_LIMIT_MAX||300)}));

const allowedOrigins = String(process.env.CORS_ORIGIN || '').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.run.app') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('google.com')) {
      return cb(null, true);
    }
    return cb(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy',"camera=(self), microphone=(self), display-capture=(self), geolocation=()");
  if(req.secure || req.headers['x-forwarded-proto']==='https') res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', institution: 'Matara University', version: '4.2.6-premium-hardening', time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/lms', require('./routes/lms'));
app.use('/api/lms', require('./routes/lmsLiveClasses'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/students', require('./routes/students'));
app.use('/api/student-cards', require('./routes/studentCards'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/timetable-management', require('./routes/timetableManagement'));
app.use('/api/timetable-maker', require('./routes/timetableMaker'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/academics', require('./routes/academics'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/admin-control', require('./routes/adminControl'));
app.use('/api/creatives', require('./routes/creatives'));
app.use('/api/online-exams', require('./routes/onlineExams'));
app.use('/api/erp', require('./routes/erp'));
app.use('/api/university', require('./routes/university'));
app.use('/api/security', require('./routes/security'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/v3', require('./routes/v3'));
app.use('/api/university-experience', require('./routes/universityExperience'));
app.use('/api/role-ops', require('./routes/roleOps'));


app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server-error]', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const autoBackupHours=Number(process.env.AUTO_BACKUP_HOURS||0);
if(autoBackupHours>0 && process.env.NODE_ENV !== 'test'){
  const { createVerifiedBackup } = require('./lib/backup');
  const runBackup=async()=>{try{const source=path.join(dataDir,'matara.db');if(!fs.existsSync(source))return;const dir=path.join(dataDir,'backups');fs.mkdirSync(dir,{recursive:true});const name=`scheduled-${new Date().toISOString().replace(/[:.]/g,'-')}.db`;const out=path.join(dir,name);const result=await createVerifiedBackup(db,out);db.prepare('INSERT INTO backup_history(filename,size_bytes,verified) VALUES(?,?,?)').run(name,result.size,1);console.log(`[backup] verified ${name} sha256=${result.sha256}`)}catch(e){console.error('[backup] scheduled backup failed',e.message)}};
  setTimeout(runBackup,10000).unref();
  setInterval(runBackup,autoBackupHours*60*60*1000).unref();
}

const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required and must be at least 32 characters. Copy backend/.env.example to backend/.env and set it before starting the server.');
if (require.main === module) app.listen(PORT, () => {
  console.log('');
  console.log('  🎓  Matara University ERP API');
  console.log(`  ➜  Running at http://localhost:${PORT}`);
  console.log('  ➜  Health check: /api/health');
  console.log('');
});

module.exports = { app };
