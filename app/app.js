/*
 * Main service which kicks off the MongoDB oplog processor and provides
 * endpoints to provide info on config and processing lag.
 */

var restify = require('restify');
var logger = require('./logger');
var Moplog = require('./moplog');

// Initialize and start Moplog processor
var moplog = new Moplog('./config.json', './consumers');

// Initialize Restify server
var server = restify.createServer({
  name : 'moplog'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.throttle({
  rate : 1,
  burst : 15,
  ip : true
}));

// log all incoming requests with response code
server.on('after', function (req, res, route, err) {
  if (err) {
    logger.info('REQ/RES: %s %s [%d]', req.method, req.url, err.status);
  }
  else {
    logger.info('REQ/RES: %s %s [%d]', req.method, req.url, res.statusCode);
  }
});

server.get('/config', function (req, res, next) {
  res.json(200, moplog.getConfig());
  next();
});

server.get('/lag', function (req, res, next) {
  res.json(200, moplog.getLag());
  next();
});

module.exports = server;
