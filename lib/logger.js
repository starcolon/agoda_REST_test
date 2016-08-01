/**
 * Logger module which works for both console and physical log files
 * @author TaoPR
 */

var moment  = require('moment');
var winston = require('winston');
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');

var logger  = new (winston.Logger)({
  exitOnError: false,
  transports:[
    new (winston.transports.Console)({
      timestamp: () => moment().format('YYYY-MM-DD HH:mm'),
      json:false
    }),
    new (winston.transports.DailyRotateFile)({
      filename: 'agoda_test.log',
      timestamp: () => moment().format('YYYY-MM-DD HH:mm'),
      dirname: __dirname + '/../log/',
      json: false
    })
  ]
});

function msgFromArguments(args){
  var str = (w) => {
    if (typeof(w) == 'string') return w;
    else return JSON.stringify(w);
  }
  return Object.keys(args).map((a) => str(args[a])).join(' ')
}

module.exports = {
  log: function(){
    logger.info(msgFromArguments(arguments))
  },

  debug: function(){
    logger.debug(msgFromArguments(arguments))
  },

  error: function(){
    logger.error(msgFromArguments(arguments))
  }
};