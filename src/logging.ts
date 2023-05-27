import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import PrettyStream from 'bunyan-prettystream';
var RotatingFileStream = require('bunyan-rotating-file-stream');

const  logging :any = {};

if (!logging.log) {
  logging.logger = createLogger({dir: 'logs'});
}
delete logging.logger.level;
delete logging.logger.fields.pid;

export default logging;
/*
 * configure and start logging
 * @param {Object} settings The configuration object for defining dir: log
 * directory, level: loglevel
 * @return the created logger instance
 */
function createLogger(settings) {

  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  // let hours = date_ob.getHours();
  // let minutes = date_ob.getMinutes();
  // let seconds = date_ob.getSeconds();
  
    var appName = "debug-log-" +date+ "-" + month +"-" + year,  
    logDir = path.join(`${process.cwd()}`,settings.dir),
    logFile = path.join(logDir, appName + '-.json'),
    
    logErrorFile = path.join(logDir, appName + '-errors.json'),
    logLevel = settings.level || 'debug' || 'info' || 'error';

  // Create log directory if it doesnt exist
  // let fileName=logDir.('log.json');

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  var prettyStdOut = new PrettyStream();  
  prettyStdOut.pipe(process.stdout);

  // Log to console and log file

  var log = bunyan.createLogger({
    name: "VCDMS-log",
    streams: [{
        stream: new RotatingFileStream({
            path: logFile,
            period: '1d',          // daily rotation
            totalFiles: 5,        // keep up to 10 back copies
            rotateExisting: true,  // Give ourselves a clean file when we start up, based on period
            threshold: '200m',      // Rotate log files larger than 10 megabytes
            // totalSize: '10m',      // Don't keep more than 20mb of archived log files
            gzip: true             // Compress the archive log files to save space
        })
    }]
});
  // var log = bunyan.createLogger({
  //   name: appName,
  //   streams: [{
  //       stream: prettyStdOut,
  //       type: 'raw',
  //       level: 'debug'
  //     },
  //     {
  //       stream:prettyStdOut,
  //       type: 'raw',
  //       level: 'info'
  //     },
  //     {
  //       level: 'debug',
  //       type: 'raw',
  //       stream: prettyStdOut
  //     },
  //     {
  //       src: true,
  //       path: logFile,
  //       type: 'rotating-file',
  //       period: '1d',
  //       rotateExisting: true,
  //       totalSize: '4m',
  //       threshold: '1m', 
  //       count: 4,
  //       maxFiles:'3d'
  //     },
  //   ],
  //   serializers: bunyan.stdSerializers
  // });
  
  
  // log.info('Starting ' + appName);
  // log.info('Environment set to ' + process.env.NODE_ENV);
  
  return log;
}