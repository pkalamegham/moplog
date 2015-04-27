require('../app/app').listen(8080);

// Initialize the test client
var client = restify.createJsonClient({
    version : '*',
    url : 'http://127.0.0.1:8080'
});

describe('web service: GET /config', function () {

  describe('200 response check', function () {
    it('should get a 200 response', function (done) {
      client.get(
        '/config',
        function (err, req, res, data) {
          if (err || res.statusCode !== 200) {
            throw new Error('Invalid response from /config: ' + res.statusCode);
          }
          assert(data, 'Invalid response: ', data);
          assert(data.source, 'Config response missing source: ' +
            JSON.stringify(data));
          assert(data.collections, 'Config response missing collections: ' +
            JSON.stringify(data));
          assert(data.period, 'Config response missing period: ' +
            JSON.stringify(data));
          assert(data.lastTs, 'Config response missing lastTs: ' +
            JSON.stringify(data));
          done();
        });
      });
    });

});

describe('web service: GET /lag', function () {
  describe('200 response check', function () {
    it('should get a 200 response', function (done) {
      client.get(
        '/lag',
        function (err, req, res, data) {
          if (err || res.statusCode !== 200) {
            throw new Error('Invalid response from /lag: ' + res.statusCode);
          }
          assert(data, 'Invalid response: ', data);
          assert(data.lagInMinutes, 'Lag response missing lagInMinutes: ' +
            JSON.stringify(data));
          done();
        });
      });
    });
});
