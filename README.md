# moplog [![Build Status](https://travis-ci.org/pkalamegham/moplog.svg?branch=master)](https://travis-ci.org/pkalamegham/moplog) [![Coverage Status](https://coveralls.io/repos/pkalamegham/moplog/badge.svg?branch=master)](https://coveralls.io/r/pkalamegham/moplog?branch=master)

A generic processor of a MongoDB oplog, routing registered transactions to the specified consumer. It handles operations of type insert, update, delete, and command.

## Usage

```javascript
var Moplog = require ('moplog');

// Initialize with the location of the nconf config file to use and the 
// directory to the consumers.
var moplog = new Moplog('./config.json', './consumers');

// Assuming that your config has valid MongoDB connection details as well as
// valid consumers configured, this will kick off the processing.
moplog.connect();
```

## Configuration

Configure moplog through a configuration file which you pass in as the first argument.  Here is an example:

```javascript
{
    "source": {
        "host": "mongodb://localhost:27017",
        "db": "local",
        "collection": "oplog.$main",
        "user": "",
        "pass": ""
    },
    "collections": {
        "myDatabase.myCollection": "myConsumer"
    }, 
    "period": 5000,
    "lastTs": 1429559350001
}
```

- `source` : MongoDB server with oplog to process 
  - `host` : server hostname with mongodb:// prepended protocol
  - `db` : database name containing the oplog
  - `collection` : oplog collection name
  - `user` : specify when server uses authentication, user must have access to oplog
  - `pass` : specify when server uses authentication, user must have access to oplog
- `collections` : map of database.collection to consumer to route operations to
- `period` : how frequently to query for new oplog entries
- `lastTs` : timestamp of last processed oplog document with ms resolution. This is updated after each additional document is processed.

New consumers should be added to the app/consumers subdirectory.  Refer to test/consumers/testConsumer as a reference of how to implement.

## API

### Moplog(configFile, consumerDir)

Constructor which takes two arguments to specify the config file and the base directory of the consumers.  Return a moplog instance.

### Moplog.getConfig()
Returns the active configuration. Example response:

```javascript
{
  "source": {
    "host": "mongodb://localhost:27017",
    "db": "local",
    "collection": "oplog.$main",
    "user": "",
    "pass": ""
  },
  "collections": {
    "source.content": "defaultConsumer"
  },
  "period": 5000,
  "lastTs": 1430017964001
}
```

### Moplog.getLag()

Returns the estimated lag in minutes of processed records based on timestamp of last processed operation.  Example response:

```javascript
{
  "lagInMinutes": 1230
}
```

## Testing
All linting are configured in Gruntfile.js using both jshint and jscs.

> grunt lint

All mocha unit tests are included in the test/ directory.  These are run through the test grunt task:

> grunt unit

To determine unit test coverage, run the coverage grunt task.  An HTML output will give percentages and highlight lines not covered by any test:

> grunt coverage

