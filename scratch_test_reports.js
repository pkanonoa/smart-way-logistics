require('dotenv').config({ path: './server/.env' });
const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 'test-admin', role: 'admin', name: 'Admin Test' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

http.get({
  hostname: 'localhost',
  port: 3001,
  path: '/api/reports/summary',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Reports Summary HTTP Status:', res.statusCode);
    console.log('Reports Summary Response Length:', data.length);
    if (res.statusCode === 200) {
      console.log('Report Stats Keys:', Object.keys(JSON.parse(data).stats));
    } else {
      console.log('Error output:', data);
    }
  });
});
