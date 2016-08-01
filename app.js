/**
 * Hotel score enquiry service
 * @author TaoPR
 */
var conf       = require('./package.json');
var _          = require('underscore');
var express    = require('express');
var app        = express();
var Rules      = require('./lib/rules.js');
var Logger     = require('./lib/logger.js');
var Promise    = require('bluebird');
var colors     = require('colors');
var bodyParser = require('body-parser');

(function serverLoop(config){

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // Initialise the database with default rules
  // if it has not existed before
  Rules.init(Logger);

  configRoutes(app);

  var server    = app.listen(config.port, function(){
    var appName = config.name;
    var host    = server.address().address;
    var port    = server.address().port;

    Logger.log('***********************'.cyan);
    Logger.log(' Server starting...'.green);
    Logger.log(` Service available at: ${host}:${port}`.green)
    Logger.log('***********************'.cyan);
  });
})(conf);

function configRoutes(app){

  // Allow cross-origin XHR accesses for local test
  app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Map RESTful parameters
  var params = ['item']
  params.forEach((p) => {
    app.param(p,function(req,resp,next,v){
      req[p] = v;
      return next();
    })
  })

  // Register RESTful routes
  app.post('/hotels/score.json', httpEnquireHotelScore);
  app.get('/rules.json', httpViewRules);
  app.post('/rules/:item/score/', httpConfigureScore);
}

/**
 * Get the hotel scores
 */
function httpEnquireHotelScore(req,resp,next){
  var hotelList = req.body;
  Logger.log('POST /hotels/score.json :'.green, hotelList);

  var invalidHotelObj = function(hotel){
    return Object.keys(hotel).length != 2 ||
      !hotel.hasOwnProperty('hotelId') ||
      !hotel.hasOwnProperty('countryId')
  }

  // Validate arguments
  if (!_.isArray(hotelList) || (hotelList.length>0 && _.some(hotelList,invalidHotelObj))){
    // Respond with some server ERROR message
    // when the request message is not in a valid format.
    Logger.error('Supplied hotel list is invalid.'.yellow);
    resp.status(500).send('Invalid hotel list');
    next();
  }
  else{
    // Get the current scoring rules
    // and do some calculations for given hotel list.
    Rules
      .getScores()
      .then((rules) => {
        if (rules.length==0){
          // No active rules, no scores
          var setZeroScore = (h) => {
            return { hotelId: h.hotelId, score: 0 }
          }
          var response = _.map(hotelList, setZeroScore);
          Logger.log(response);
          return resp.send(response);
        }

        var scoreByHotel = rules.filter((r) => r.scoreHotel>0);
        var scoreByCountry = rules.filter((r) => r.scoreCountry>0);
        scoreByHotel = scoreByHotel.length>0 ? scoreByHotel[0].scoreHotel : 0;
        scoreByCountry = scoreByCountry.length>0 ? scoreByCountry[0].scoreCountry : 0;

        // Determine scores of the hotel
        // by its ID and country ID
        var applyScore = (h) => {
          return Rules
            .getShortlistStatus(h)
            .then((status) => {
              var score = 0;

              if (status.shortlistedById)
                score = scoreByHotel;
              if (status.shortlistedByCountry)
                score = Math.max(score, scoreByCountry)

              return { hotelId: h.hotelId, score: score }
            })
          
        }

        // Apply the scores to the hotel list as requested
        var hotelScores = _.map(hotelList, applyScore); 
        return Promise.all(hotelScores).then((data) => {
          Logger.log(data);
          resp.send(data);
        })
      })
  }
}

/**
 * Get the current active scoring rules
 * EX RESP: [{"scoreHotel":5, "active": true},{"scoreCountry":3, "active": false}]
 */
function httpViewRules(req,resp,next){
  Logger.log('GET /rules.json'.green);

  Rules.getScores()
    .then((rules) => {
      // Strip out the unneeded MongoDB _id field
      resp.send(_.map(rules, (r) => _.omit(r,'_id')));
      next();
    })
}

/**
 * Set or update the scoring
 */
function httpConfigureScore(req,resp,next){
  Logger.log(`POST /rules/${req.item}/score : `.green);
  Logger.log('   turn  : '.cyan + req.query.turn);
  Logger.log('   value : '.cyan + req.query.value);

  if (!~['hotel','country'].indexOf(req.item)){
    resp.status(500).send('Unknown rule item');
    return next();
  }
  else if (typeof(req.query.turn) === 'undefined' &&
    typeof(req.query.value) === 'undefined'){

    // No required parameters are supplied
    resp.status(500).send('Missing required parameters');
    return next();
  }
  else{
    // Update the rule elements
    var jobs = [];
    if (!!~['on','off'].indexOf(req.query.turn)){
      Logger.log(`Turn ${req.item} ${req.query.turn}`);
      jobs.push(Rules.setScoreStatus(req.item, req.query.turn=='on'));
    }
    if (!isNaN(Number(req.query.value))){
      Logger.log(`Set ${req.item} with value of ${req.query.value}`);
      jobs.push(Rules.setScoreValue(req.item, Number(req.query.value)));
    }

    // Execute update job(s)
    Promise.all(jobs)
      .then((results) => {
        resp.send({success: true});
        next();
      })
      .catch((e) => {
        resp.status(500).send(e);
        next();
      })
  }
}
