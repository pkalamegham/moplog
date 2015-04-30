var winston = require('winston');
require('winston-loggly');

winston.emitErrs = true;

if (process.env.LOGGLY_SUBDOMAIN &&
    process.env.LOGGLY_AUTH &&
    process.env.LOGGLY_INPUT_NAME &&
    process.env.LOGGLY_INPUT_TOKEN) {

  winston.add(winston.transports.Loggly, {
    level : 'INFO',
    subdomain : process.env.LOGGLY_SUBDOMAIN,
    auth : process.env.LOGGLY_AUTH,
    inputName : process.env.LOGGLY_INPUT_NAME,
    inputToken : process.env.LOGGLY_INPUT_TOKEN,
    json : true,
    stripColors : true
  });
}

var logger = new winston.Logger({
    transports : [
        new winston.transports.File({
            level : 'info',
            filename : process.cwd() + 'moplog.log',
            timestamp : true,
            handleExceptions : true,
            json : true,
            maxsize : 20971520,
            maxFiles : 5,
            colorize : false
        })
        /*
        new winston.transports.Console({
            level : 'debug',
            timestamp : true,
            handleExceptions : true,
            json : false,
            colorize : true,
            prettyPrint : true
        })
        */
    ],
    exitOnError : false
});

logger.stream = {
    write : function (message) {
        logger.info(message);
    }
};

module.exports = logger;
