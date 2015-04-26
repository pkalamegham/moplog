var nconf = require('nconf');
var MongoClient = require('mongodb').MongoClient;
var Timestamp = require('mongodb').Timestamp;
var ObjectId = require('mongodb').ObjectId;
var logger = require('./logger');
var _ = require('lodash');

nconf.file('config.json');
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

var consumers = {};

/**
 *  Load consumer classes to process the different collections based on config.
 */
function init() {
    var consumerNames = _.uniq(_.values(nconf.get('collections')));
    _.each(consumerNames, function (name) {
        logger.info('Loading consumer: ' + name);
        consumers[name] = require('./consumers/' + name);
    });
}

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

/**
 *  Sets up a stream to read and process the oplog from lastTs (global variable)
 *  to the end of the stream.  It automatically reschedules the next reading
 *  based on the period specified in the config file.
 */
function processOplogStream(oplogCol, lastTs) {
    var tsQuery = lastTs ? { ts : { $gt : lastTs } } : {};
    var period = nconf.get('period');
    var collections = nconf.get('collections');
    var mongoStream = oplogCol.find(
        tsQuery,
        {
            tailable : true,
            awaitdata : true,
            oplogReplay : true,
            numberOfRetries : -1
        }
    ).stream();


    mongoStream.on('data', function (data) {
        if (data.op === 'n') {
            // skip noops
        } else {
            lastTs = data.ts;
            var date = convertTsToDate(lastTs);
            var consumer = consumers[collections[data.ns]];

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
    });

    mongoStream.on('end', function () {
        // Schedule next check
        logger.info('Scheduling next oplog retrieval from ' +
            convertTsToDate(lastTs));
        setTimeout(function () {
            processOplogStream(oplogCol, lastTs);
        }, period);
    });

    mongoStream.on('error', function (err) {
        if (err.message === 'No more documents in tailed cursor') {
            // normal behavior, don't log
        } else {
            logger.error(err);
            process.exit(1);
        }
    });
}


function connect() {
    var source = nconf.get('source');
    var lastTs = convertDateToTs(nconf.get('lastTs') || 0);
    var dblink = (source.user && source.pass) ?
        source.user + ':' + source.pass + '@' + source.host + '/' + source.db :
        source.host + '/' + source.db;

    logger.info('Connecting to ' + dblink);

    MongoClient.connect(dblink, function (err, db) {
        if (err) {
            logger.error('Error processing oplog: ', err);
        }

        process.on('exit', function () {
            logger.info('Closing database connection');
            db.close();
        });

        logger.info('Tailing oplog from ' + convertTsToDate(lastTs));

        var oplogCol = db.collection(source.collection);

        // Begin processing oplog, this automatically reschedules itself
        processOplogStream(oplogCol, lastTs);
    });
}

init();
connect();