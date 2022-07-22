const app = require('./server');

const ServerlessHttp = require('serverless-http');

module.exports = app;

module.exports.handler = ServerlessHttp(app);
