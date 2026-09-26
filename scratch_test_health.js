const http = require('http');

http.get('http://localhost:3001/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Health status:', res.statusCode, data));
}).on('error', err => console.error('Health check failed:', err.message));
