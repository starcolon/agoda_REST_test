/**
 * Hotel scoring rules
 * @author TaoPR
 */

var Rules   = {}
var config  = require('../package.json');
var _       = require('underscore');
var colors  = require('colors');
var Promise = require('bluebird');
var mongo   = require('mongoskin');

var isMock  = !!~process.argv.indexOf('--mock');

const SERVER_ADDR          = 'mongodb://localhost';
const DB_NAME              = isMock ? config['mongodb-mock'] : config.mongodb;
const COLLECTION_RULES     = 'rules';
const COLLECTION_SHORTLIST = 'shortlist';

const mapItems = {
  'country': 'scoreCountry',
  'hotel': 'scoreHotel'
}

// Initialise references to particular MongoDB collections
var db = mongo.db(SERVER_ADDR + '/' + DB_NAME);
Rules._datasource = {
  'rules':     db.collection(COLLECTION_RULES),
  'shortlist': db.collection(COLLECTION_SHORTLIST)
}

/**
 * Initialise a new rule set if no rule collections exist in MongoDB.
 */
Rules.init = function(logger){
  // Check if collections exist
  return new Promise((done,reject) => {
    db.collectionNames(COLLECTION_RULES, (err,names) => {
      if (err) return reject(err);

      if (names.length==0){
        
        if (isMock) logger.log('[Mock rules]'.yellow);
        logger.log('Initialising default rules.'.cyan);

        // Initialise rules with default set
        var options = {}
        var cb = (err,n) => {
          if (err) logger.error(err);
        }
        Rules._datasource['rules'].insert({'scoreHotel':5, 'active':true}, options, cb);
        Rules._datasource['rules'].insert({'scoreCountry':3, 'active':true}, options, cb);

        // Initialise the shortlist with default set
        Rules._datasource['shortlist'].insert({'type':'hotel','id':1001}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'hotel','id':1002}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'hotel','id':1003}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'hotel','id':1004}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'country','id':16100}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'country','id':16200}, options, cb);
        Rules._datasource['shortlist'].insert({'type':'country','id':16300}, options, cb);
      }
    })
  })
}

/**
 * Get the currently active scoring rules
 * @return {Promise} which holds scoring rules for shortlisted hotels / countries
 */
Rules.getScores = function(){
  return new Promise((done,reject) => {
    Rules._datasource['rules'].find({'active':true}).toArray((err,list) => {
      if (err) return reject(err);
      return done(list)
    })
  })
}

/**
 * Get the shortlist status of a specified hotel
 * @param {Object} hotel object in a form of {hotelId:__, countryId:__}
 * @return {Promise} which holds the status object like so:
 *         {shortlistedById: true/false, shortlistedByCountry: true,false}
 */
Rules.getShortlistStatus = function(hotel){
  return new Promise((done,reject) => {
    var condition = {'$or':[
      {'type':'hotel', 'id': hotel.hotelId},
      {'type':'country', 'id': hotel.countryId}
    ]}
    Rules._datasource['shortlist'].find(condition).toArray((err,match) => {
      if (err) return reject(err);
      
      var asHotel = (m) => m.type == 'hotel';
      var asCountry = (m) => m.type == 'country';

      var status = {
        shortlistedById: match.filter(asHotel).length>0,
        shortlistedByCountry: match.filter(asCountry).length>0
      }
      return done(status);
    })
  })
}

/**
 * Get the hotel shortlist
 * @return {Promise} which holds a list of hotel IDs
 */
Rules.getShortlistedHotels = function(){
  return new Promise((done,reject) => {
    Rules._datasource['shortlist'].find({'type':'hotel'}).toArray((err,list) => {
      if (err) return reject(err);
      return done(_.map(list, (item) => _.omit(item,'_id')));
    })
  })
}

/**
 * Get the country shortlist
 * @return {Promise} which holds a list of country IDs
 */
Rules.getShortlistedCountries = function(){
  return new Promise((done,reject) => {
    Rules._datasource['shortlist'].find({'type':'country'}).toArray((err,list) => {
      if (err) return reject(err);
      return done(_.map(list, (item) => _.omit(item,'_id')));
    })
  })
}

/**
 * Update the existing rule with new status
 * @param {String} either one of ['hotel','country']
 * @param {Boolean} status to set
 */
Rules.setScoreStatus = function(item,active){
  return new Promise((done,reject) => {
    var options = {};

    // Make up a Mongo condition
    var condition = {}
    condition[mapItems[item]] = {'$exists':true}

    var expr = {'$set':{'active':active}};

    Rules._datasource['rules'].update(condition,expr,options,(err,n) => {
      if (err) return reject(err);
      else return done(n>0);
    })
  })
}

Rules.setScoreValue = function(item,value){
  return new Promise((done,reject) => {
    var options = {};

    // Make up a Mongo condition
    var condition = {}
    condition[mapItems[item]] = {'$exists':true}

    // Make up updating expression
    var expr = {}
    expr[mapItems[item]] = value;

    Rules._datasource['rules'].update(condition,{'$set':expr},options,(err,n) => {
      if (err) return reject(err);
      else return done(n>0);
    })
  })
}

module.exports = Rules;