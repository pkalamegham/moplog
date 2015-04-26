var nconf = require('nconf');
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
    logger.info('Config', JSON.stringify(this.getConfig()));

    // Load consumers
    this.consumers = {};
    var consumerNames = _.uniq(_.values(nconf.get('collections')));
    _.each(consumerNames, _.bind(function (name) {
        logger.info('Loading consumer: ' + name);
        this.consumers[name] = require(consumerDir + '/' + name);
    }, this));

    this.lastTs = convertDateToTs(nconf.get('lastTs') || 0);
    this.connect();
};

/**
 *  Sets up a stream to read and process the oplog from lastTs (global variable)
 *  to the end of the stream.  It automatically reschedules the next reading
 *  based on the period specified in the config file.
 */
Moplog.prototype.processOplogStream = function () {
    var tsQuery = this.lastTs ? { ts : { $gt : this.lastTs } } : {};
    var period = nconf.get('period');
    var collections = nconf.get('collections');
    var mongoStream = this.oplogCol.find(
        tsQuery,
        {
            tailable : true,
            awaitdata : true,
            oplogReplay : true,
            numberOfRetries : -1
        }
    ).stream();


    mongoStream.on('data', _.bind(function (data) {
        if (data.op === 'n') {
            // skip noops
        } else {
            this.lastTs = data.ts;
            var date = convertTsToDate(this.lastTs);
            var consumer = this.consumers[collections[data.ns]];

            // check for consumer for collection and operation
            if (consumer && consumer[data.op]) {
                switch (data.op) {
                    case 'i':
                        consumer.i(date, data.ns, data.o);
                        break;
                    case 'u':
                        consumer.u(date, data.ns, new ObjectId(data.o2._id),
                            data.o);
                        break;
                    case 'd':
                        consumer.d(date, data.ns, new ObjectId(data.o._id),
                            data.b);
                        break;
                    case 'c':
                        consumer.c(date, data.ns);
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
    }, this));

    mongoStream.on('end', _.bind(function () {
        // Schedule next check
        logger.info('Scheduling next oplog retrieval from ' +
            convertTsToDate(this.lastTs));
        setTimeout(_.bind(function () {
            this.processOplogStream();
        }, this), period);
    }, this));

    mongoStream.on('error', function (err) {
        if (err.message === 'No more documents in tailed cursor') {
            // normal behavior, don't log
        } else {
            logger.error(err);
            process.exit(1);
        }
    });
};

Moplog.prototype.connect = function connect () {
    var source = nconf.get('source');
    var dblink = (source.user && source.pass) ?
        source.user + ':' + source.pass + '@' + source.host + '/' + source.db :
        source.host + '/' + source.db;

    logger.info('Connecting to ' + dblink);

    MongoClient.connect(dblink, _.bind(function (err, db) {
        if (err) {
            logger.error('Error processing oplog: ', err);
        }

        process.on('exit', function () {
            logger.info('Closing database connection');
            db.close();
        });

        logger.info('Tailing oplog from ' + convertTsToDate(this.lastTs));

        this.oplogCol = db.collection(source.collection);

        // Begin processing oplog, this automatically reschedules itself
        this.processOplogStream();
    }, this));
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