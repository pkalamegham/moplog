var logger = require('../logger');

var defaultConsumer = {
    i : function (date, collection, object) {
        logger.info('Inserted document into ' + collection + ' at ' + date +
            ': ', JSON.stringify(object));
    },
    u : function (date, collection, objectId, update) {
        logger.info('Updated document ' + objectId + ' in collection ' +
            collection + ': ', JSON.stringify(update));
    },
    d : function (date, collection, objectId, success) {
        if (success) {
            logger.info('Deleted document ' + objectId + ' in collection ' +
                collection);
        } else {
            logger.info('Failed to delete document ' + objectId +
                ' in collection ' + collection);
        }
    },
    c : function (date, collection) {
        logger.info('Ignoring command in ' + collection);
    }
};

module.exports = defaultConsumer;