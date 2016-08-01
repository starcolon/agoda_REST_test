/**
 * BDD test suite for end-to-end verifications
 * @author TaoPR
 */

var assert = require('assert');
var chai   = require('chai');
var expect = chai.expect;
var supertest = require('supertest');
chai.should();
chai.use(require('chai-things'));
chai.config.includeStack = true;

var Promise = require('bluebird');
var config  = require('../package.json');
var mongo   = require('mongoskin');
var db      = mongo.db('mongodb://localhost/' + config['mongodb-mock']);

// Endpoint
var server = supertest.agent(`http://localhost:${config.port}`);

describe('Rules tests', () => {

  // Setup with initial mock data
  before((done) => {
    console.log('Initialising mock data');
    var collectionRules     = db.collection('rules');
    var collectionShortlist = db.collection('shortlist');

    var options = {}
    var clearRules = new Promise((done,reject) =>
      collectionRules.remove({},() => done())
    );
    var clearShortlists = new Promise((done,reject) => 
      collectionShortlist.remove({},() => done())
    );
    var insertRule = (n) => new Promise((done,reject) => 
      collectionRules.insert(n, options, () => done())
    );
    var insertShortlist = (n) => new Promise((done,reject) => 
      collectionShortlist.insert(n, options, () => done())
    );

    Promise.all([clearRules, clearShortlists])
      .then(() => insertRule({'scoreHotel':5, 'active':true}))
      .then(() => insertRule({'scoreCountry':3, 'active':true}))
      .then(() => insertShortlist({'type':'hotel','id':1001}))
      .then(() => insertShortlist({'type':'hotel','id':1002}))
      .then(() => insertShortlist({'type':'hotel','id':1003}))
      .then(() => insertShortlist({'type':'hotel','id':1004}))
      .then(() => insertShortlist({'type':'country','id':16100}))
      .then(() => insertShortlist({'type':'country','id':16200}))
      .then(() => insertShortlist({'type':'country','id':16300}))
      .then(() => done());
  })

  describe('Fundamental rule tests', () => {

    it('should list rules',(done) => {
      server
        .get('/rules.json')
        .expect(200)
        .end((err,resp) => {

          var rules = [
            {scoreHotel: 5,active: true},
            {scoreCountry: 3,active: true}
          ]

          assert.deepEqual(resp.body,rules);
          done();
        })
    })

    it('should get shortlisted hotel score',(done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 1001, countryId: 20000}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 1001, score: 5})
          done();
        })
    })

    it('should get shortlisted country score',(done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 520, countryId: 16100}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 520, score: 3})
          done();
        })
    })

    it('should get only a maximum score it could make',(done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 1002, countryId: 16100}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 1002, score: 5})
          done();
        })
    })

    it('should get scores for multiple hotels',(done) => {
      server
        .post('/hotels/score.json')
        .send([
          {hotelId: 1006, countryId: 16000},
          {hotelId: 1005, countryId: 16100},
          {hotelId: 1004, countryId: 16200},
          {hotelId: 1003, countryId: 16300},
          {hotelId: 1002, countryId: 16400}
        ])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(5);
          assert.deepEqual(resp.body,[
            {hotelId: 1006, score: 0},
            {hotelId: 1005, score: 3},
            {hotelId: 1004, score: 5},
            {hotelId: 1003, score: 5},
            {hotelId: 1002, score: 5}
          ])
          done();
        })
    })

    it('should update new hotel scores',(done) => {
      server
        .post('/rules/hotel/score?value=7')
        .expect(200)
        .end((err,resp) => {
          server
            .get('/rules.json')
            .expect(200)
            .end((err,resp) => {
              var rules = [
                {scoreHotel: 7,active: true},
                {scoreCountry: 3,active: true}
              ]

              assert.deepEqual(resp.body,rules);
              done();
            })
        })
    })

    it('should update new country scores',(done) => {
      server
        .post('/rules/country/score?value=8')
        .expect(200)
        .end((err,resp) => {
          server
            .get('/rules.json')
            .expect(200)
            .end((err,resp) => {
              var rules = [
                {scoreHotel: 7,active: true},
                {scoreCountry: 8,active: true}
              ]

              assert.deepEqual(resp.body,rules);
              done();
            })
        })
    })

    it('should calculate hotel score with new country score', (done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 520, countryId: 16100}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 520, score: 8})
          done();
        })
    })

    it('should turn off the country rule',(done) => {
      server
        .post('/rules/country/score?turn=off')
        .expect(200)
        .end((err,resp) => {
          server
            .get('/rules.json')
            .expect(200)
            .end((err,resp) => {
              var rules = [
                {scoreHotel: 7,active: true}
              ]

              assert.deepEqual(resp.body,rules);
              done();
            })
        })
    })

    it('should not associate country score when turned off',(done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 1001, countryId: 16100}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 1001, score: 7})
          done();
        })
    })

    it('should turn off the hotel rule',(done) => {
      server
        .post('/rules/hotel/score?turn=off')
        .expect(200)
        .end((err,resp) => {
          server
            .get('/rules.json')
            .expect(200)
            .end((err,resp) => {
              var rules = []

              assert.deepEqual(resp.body,rules);
              done();
            })
        })
    })

    it('should not associate hotel score when turned off',(done) => {
      server
        .post('/hotels/score.json')
        .send([{hotelId: 1001, countryId: 16100}])
        .expect(200)
        .end((err, resp) => {
          resp.body.should.have.length(1);
          assert.deepEqual(resp.body[0], {hotelId: 1001, score: 0})
          done();
        })
    })

    it('should turn the rule back on',(done) => {
      server
        .post('/rules/hotel/score?turn=on')
        .expect(200)
        .end((err,resp) => {

          server
            .post('/rules/country/score?turn=on')
            .expect(200)
            .end((err,resp) => {

              server
                .get('/rules.json')
                .expect(200)
                .end((err,resp) => {
                  var rules = [
                    {scoreHotel: 7,active: true},
                    {scoreCountry: 8,active: true}
                  ]
                  assert.deepEqual(resp.body,rules);
                  done();
                })
            })
        })
    })
  })

  describe('HTTP error scenarios tests', () => {
    it('should fail to get scores if request invalid hotel list',(done) => {
      server
        .post('/hotels/score.json')
        .send({foo: 'bar'})
        .expect(500)
        .end((err, resp) => {
          resp.text.should.equal('Invalid hotel list');
          done();
        })
    })

    it('should fail to configure unknown rule',(done) => {
      server
        .post('/rules/city/score?turn=on')
        .expect(500)
        .end((err, resp) => {
          resp.text.should.equal('Unknown rule item');
          done();
        })
    })

    it('should fail to configure a rule if no parameter is supplied',(done) => {
      server
        .post('/rules/country/score?')
        .expect(500)
        .end((err, resp) => {
          resp.text.should.equal('Missing required parameters');
          done();
        })
    })
  })

  // Tear down all allocated test resources
  after((done) => {
    console.log('Purging mock rules...');
    db.dropCollection('rules',() => {
      db.dropCollection('shortlist',() => {
        done();
      })
    })
  })
})
