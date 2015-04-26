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

## APIs

TODO: Add API endpoint to retrieve active configuration of an active processor. 

TODO: Add API endpoint to retrieve lag based on timestamp of last processed operation.

## Testing

All mocha unit tests are included in the test/ directory.  These are run through the test grunt task:

> grunt test

To determine unit test coverage, run the coverage grunt task.  An HTML output will give percentages and highlight lines not covered by any test:

> grunt coverage

TODO: Add unit test that don't require a MongoDB instance running.
