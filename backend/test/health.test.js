const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-test-secret-please-change-1234567890';
process.env.NODE_ENV = 'test';
const { app } = require('../app');
const http = require('node:http');
function request(path){return new Promise((resolve,reject)=>{const s=http.createServer(app).listen(0,()=>{const port=s.address().port;http.get(`http://127.0.0.1:${port}${path}`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{s.close();resolve({status:r.statusCode,body:d})})}).on('error',e=>{s.close();reject(e)})})})}
test('health endpoint returns version 4',async()=>{const r=await request('/api/health');assert.equal(r.status,200);assert.equal(JSON.parse(r.body).version,'4.2.6-premium-hardening')});
test('unknown API route returns JSON 404',async()=>{const r=await request('/api/does-not-exist');assert.equal(r.status,404);assert.equal(JSON.parse(r.body).error,'Route not found.')});
