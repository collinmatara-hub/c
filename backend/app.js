process.env.NODE_ENV = process.env.NODE_ENV || 'test'; require('dotenv').config(); const { app } = require('./server'); module.exports = { app };
