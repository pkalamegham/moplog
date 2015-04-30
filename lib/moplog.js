var assert = require('assert');
var nconf = require('nconf');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var Timestamp = require('mongodb').Timestamp;
var ObjectId = require('mongodb').ObjectId;
var logger = require('./logger');
var _ = require('lodash');

/**
 *  Save nconf config to file.  Used to save new lastTs after each op processed
 *  for proper recovery upon restart.  We need to be sure we don't reprocess
 *  ops since consumers are not necessarily performing idempotent actions.
 */
function saveConfig() {
    nconf.save(function (err) {
        if (err) {
            logger.error('Error saving updated config');
        }
    });
}

function convertDateToTs(date) {
    return new Timestamp(date % 1000, Math.floor(date / 1000));
}

function convertTsToDate(ts) {
    return new Date(ts.getHighBits() * 1000 + ts.getLowBits());
}

var Moplog = function (configFile, consumerDir) {
    assert(configFile, 'Moplog constructor requires a config file');
    assert(consumerDir, 'Moplog constructor requires a consumer directory');

    if (!path.isAbsolute(configFile)) {
        configFile = path.resolve(process.cwd(), configFile);
    }

    if (!path.isAbsolute(consumerDir)) {
        consumerDir = path.resolve(process.cwd(), consumerDir);
    }

    var self = this;
    // Load config using defaults as needed
    nconf.file(configFile);
    nconf.defaults({
        source : {
            host : 'mongodb://localhost:27017',
            db : 'local',
            collection : 'oplog.$main',
            user : '',
            pass : ''
        },
        lastTs : 0,
        collections : {},
        period : 5000
    });
    logger.info('Config', JSON.stringify(self.getConfig()));

    // Load consumers
    self.consumers = {};
    var consumerNames = _.uniq(_.values(nconf.get('collections')));
    _.each(consumerNames, function (name) {
        logger.info('Loading consumer: ' + name);
        self.consumers[name] = require(consumerDir + '/' + name);
    });

    self.lastTs = convertDateToTs(nconf.get('lastTs') || 0);
};

/**
 *  Callback for oplog stream for the 'data' event.  Routes operations to
 *  appropriate consumer as registered in the config.collections map.
 */
Moplog.prototype.onData = function (data) {
    if (data.op === 'n') {
        // skip noops
    } else {
        var collections = nconf.get('collections');

        // update lastTs
        this.lastTs = data.ts;
        var date = convertTsToDate(this.lastTs);
        var consumerName = collections[data.ns];
        var consumer;
        if (consumerName) {
            consumer = this.consumers[consumerName];
            // If we can't locate a consumer configured, exit because we
            // don't want to misprocess operations.
            if (!consumer) {
                logger.error('Unable to locate consumer ' + consumerName +
                    ' referenced by config');
                process.exit(1);
            }
        }

        // check for consumer for collection and operation
        if (consumer && consumer[data.op]) {
            switch (data.op) {
                case 'i':
                    consumer.i(data, date, data.ns, data.o);
                    break;
                case 'u':
                    consumer.u(data, date, data.ns, new ObjectId(data.o2._id),
                        data.o);
                    break;
                case 'd':
                    consumer.d(data, date, data.ns, new ObjectId(data.o._id),
                        data.b);
                    break;
                case 'c':
                    consumer.c(data, date, data.ns);
                    break;
                default:
                    logger.warn('Unsupported operation type: ' + data.op);
                    break;
            }
        }
        // update lastTs once the current op is processed
        nconf.set('lastTs', date.getTime());
        saveConfig();
    }
};

/**
 *  Callback for oplog stream for the 'end' event.  Reschedules the
 *  processOplogStream.
 */
Moplog.prototype.onEnd = function () {
    // Schedule next check
    var period = nconf.get('period');
    logger.info('Scheduling next oplog retrieval from ' +
        convertTsToDate(this.lastTs));
    setTimeout(this.processOplogStream.bind(this), period);
};

/**
 *  Callback for oplog stream for the 'error' event.  Since consumer functions
 *  are not necessarily idempotent, we exit on error to prevent reprocessing.
 */
Moplog.prototype.onError = function (err) {
    if (err.message === 'No more documents in tailed cursor') {
        // normal behavior, don't log
    } else {
        logger.error(err);
        process.exit(1);
    }
};

/**
 *  Sets up a stream to read and process the oplog from lastTs (global variable)
 *  to the end of the stream.  It automatically reschedules the next reading
 *  based on the period specified in the config file.
 */
Moplog.prototype.processOplogStream = function () {
    var tsQuery = this.lastTs ? { ts : { $gt : this.lastTs } } : {};
    this.mongoStream = this.oplogCol.find(
        tsQuery,
        {
            tailable : true,
            awaitdata : true,
            oplogReplay : true,
            numberOfRetries : -1
        }
    ).stream();

    this.mongoStream.on('data', _.bind(this.onData, this));

    this.mongoStream.on('end', _.bind(this.onEnd, this));

    this.mongoStream.on('error', _.bind(this.onError, this));
};

Moplog.prototype.connect = function connect () {
    var self = this;
    var source = nconf.get('source');
    var dblink = (source.user && source.pass) ?
        source.user + ':' + source.pass + '@' + source.host + '/' + source.db :
        source.host + '/' + source.db;

    logger.info('Connecting to ' + dblink);

    MongoClient.connect(dblink, function (err, db) {
        if (err) {
            logger.error('Error connecing to DB: ', err);
            process.exit(1);
        }

        // External exit condition handling
        _.each(['SIGTERM', 'SIGINT'], function (ev) {
            process.on(ev, function () {
                // before closing, pause the stream events to avoid exceptions
                self.mongoStream.pause();
                logger.info('Closing database connection');
                db.close();
                process.exit(0);
            });
        });

        logger.info('Tailing oplog from ' + convertTsToDate(self.lastTs));

        self.oplogCol = db.collection(source.collection);

        // Begin processing oplog, this automatically reschedules itself
        self.processOplogStream();
    });
};

/**
 *  Returns the difference in minutes between the time now and the timestamp
 *  of the last operation processed.
 */
Moplog.prototype.getLag = function getLag () {
    var dateNow = new Date().getTime();
    var dateLast = convertTsToDate(this.lastTs).getTime();
    return {
        lagInMinutes : Math.floor((dateNow - dateLast) / 60000)
    };
};

/**
 *  Return the config object in use.
 */
Moplog.prototype.getConfig = function getConfig () {
    var config = {
        source : nconf.get('source'),
        collections : nconf.get('collections'),
        period : nconf.get('period'),
        lastTs : nconf.get('lastTs')
    };
    return config;
};

module.exports = Moplog;