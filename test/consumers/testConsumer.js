var testConsumer = {
    i : function (raw, date, collection, object) {
        insertTestResult = {
            raw : raw,
            date : date,
            collection : collection,
            object : object
        };
    },
    u : function (raw, date, collection, objectId, update) {
        updateTestResult = {
            raw : raw,
            date : date,
            collection : collection,
            objectId : objectId,
            update : update
        };
    },
    d : function (raw, date, collection, objectId, success) {
        deleteTestResult = {
            raw : raw,
            date : date,
            collection : collection,
            objectId : objectId,
            success : success
        };
    },
    c : function (raw, date, collection) {
        commandTestResult = {
            raw : raw,
            date : date,
            collection : collection
        };
    }
};

module.exports = testConsumer;