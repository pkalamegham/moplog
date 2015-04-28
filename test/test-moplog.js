var assert = require('assert');
var Moplog = require('..');
var Timestamp = require('mongodb').Timestamp;

describe('Moplog constructor:', function () {
    var defaultConfig = {
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
    };

    var testConfig = {
        source : {
            host : 'mongodb://localhost:27017',
            db : 'local',
            collection : 'oplog.$main',
            user : '',
            pass : ''
        },
        collections : {
            'test.content' : 'testConsumer'
        },
        period : 5000
    };

    describe('Initialize with defaults', function () {
        it('should load default config and no consumers', function (done) {
            var moplog = new Moplog('./configDoesNotExist.json',
                './test/consumers');

            var config = moplog.getConfig();
            assert(config, 'No config returned');
            assert.deepEqual(config, defaultConfig,
                'Config differs from defaults' + JSON.stringify(config));

            done();
        });
    });

    describe('Initialize with test config', function () {
        it('should load test config and default consumer', function (done) {
            var moplog = new Moplog('./test/configTest.json',
                './test/consumers');

            var config = moplog.getConfig();
            assert(config, 'No config returned');
            // Since moplog writes lastTs back to the config, ignore this field
            delete config.lastTs;
            assert.deepEqual(config, testConfig,
                'Config differs from testConfig' + JSON.stringify(config));

            done();
        });
    });

});

describe('Moplog stream functions:', function () {
    var dataInsert = {
        ts : new Timestamp(2, 1429559473),
        op : 'i',
        ns : 'test.content',
        o : {
            _id : { _bsontype : 'ObjectID', id : '553558b1af52440d7f965dbb' },
            foo : 'bar'
        }
    };
    var dataUpdate = {
        ts : new Timestamp(1, 1430017181),
        op : 'u',
        ns : 'test.content',
        o2 : {
            _bsontype : 'ObjectID', _id : '5536fcd36effdf975a1fed9a'
        },
        o : {
            $set : {
                addition : 'abc'
            }
        }
    };
    var dataDelete = {
        ts : new Timestamp(1, 1429630991),
        op : 'd',
        ns : 'test.content',
        b : true,
        o : {
            _bsontype : 'ObjectID', _id : '553558b1af52440d7f965dbb'
        }
    };
    var dataCommand = {
        ts : new Timestamp(1, 1429559350),
        op : 'c',
        ns : 'test.content',
        o : {
            dropDatabase : 1
        }
    };

    var moplog = new Moplog('./test/configTest.json', './test/consumers');

    describe('onData insert', function () {
        it('should route op to consumer insert function', function (done) {
            moplog.onData(dataInsert);
            // consumer should set global variable insertTestResult
            assert(insertTestResult, 'Consumer insert function not called');
            assert.deepEqual(insertTestResult.raw, dataInsert,
                'Invalid raw argument');
            assert(typeof insertTestResult.date.getTime, 'function',
                'Invalid date argument');
            done();
        });
    });

    describe('onData update', function () {
        it('should route op to consumer update function', function (done) {
            moplog.onData(dataUpdate);
            // consumer should set global variable updateTestResult
            assert(updateTestResult, 'Consumer update function not called');
            assert.deepEqual(updateTestResult.raw, dataUpdate,
                'Invalid raw argument');
            assert(typeof updateTestResult.date.getTime, 'function',
                'Invalid date argument');
            assert(typeof updateTestResult.objectId.getId, 'function',
                'Invalid objectId argument');
            done();
        });
    });

    describe('onData delete', function () {
        it('should route op to consumer delete function', function (done) {
            moplog.onData(dataDelete);
            // consumer should set global variable deleteTestResult
            assert(deleteTestResult, 'Consumer delete function not called');
            assert.deepEqual(deleteTestResult.raw, dataDelete,
                'Invalid raw argument');
            assert(typeof deleteTestResult.date.getTime, 'function',
                'Invalid date argument');
            assert(typeof deleteTestResult.objectId.getId, 'function',
                'Invalid objectId argument');
            assert(typeof deleteTestResult.success, 'boolean',
                'Invalid objectId argument');
            done();
        });
    });

    describe('onData command', function () {
        it('should route op to consumer command function', function (done) {
            moplog.onData(dataCommand);
            // consumer should set global variable commandTestResult
            assert(commandTestResult, 'Consumer commandfunction not called');
            assert.deepEqual(commandTestResult.raw, dataCommand,
                'Invalid raw argument');
            assert(typeof commandTestResult.date.getTime, 'function',
                'Invalid date argument');
            done();
        });
    });
});