# moplog

moplog is a generic processor of a MongoDB oplog, routing registered transactions to the specified consumer. To configure a new consumer, add a key/value to the collections map in config.json:

```javascript
{
    ...
    collections : {
        "myDatabase.myCollection" : "myConsumer"
    },
    ...
}
```

New consumers should be added to the app/consumers subdirectory.  Refer to app/consumers/defaultConsumer as a reference.

## Running
To run the moplog processor, start the Restify service which will in turn kick off MongoDB oplog processing based on the config and consumers:

> grunt server

## APIs

### GET /config
Returns the active configuration. Example response payload:

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

### GET /lag

Returns the estimated lag in minutes of processed records based on timestamp of last processed operation.  Example response payload:

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

TODO: Add unit test that don't require a MongoDB instance running.