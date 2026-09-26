// Vercel Serverless Entry Point - Smart Way Logistics API (v1.0.1)
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../server/.env') });

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.uvdhlerhureaqvzbpwwv:jnwOcqAgVLNcx0us@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-use-a-long-random-string";

const app = require('../server/src/index.js');

module.exports = app;
