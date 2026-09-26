const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const app = require('../server/src/index.js');

module.exports = app;
