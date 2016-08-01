# Hotel Score Enquiry

The RESTful services which provide predetermined scores 
of the specified hotels to the clients.

---
> As a part of recruitment process of Agoda Services.
---

## Prerequisites

The services require the following software packages to run.

- [x] [Node.js v.6.x with NPM](https://nodejs.org/en/)
- [x] [MongoDB](https://www.mongodb.com/)

>There is no need to manually create an initial database. The services 
will take care upon its first start up.

## Up and Running

Install all Node.js packages required by the project:

```bash
$ cd agoda_test/
$ npm install
```

Run the RESTful services.

```bash
$ npm start
```

## Service Endpoints

The following figure shows the list of RESTful endpoints of the services.

Service                        | HTTP                    | REQUEST PARAMS |
-------------------------------|-------------------------|----------------|
[a] Get scores of hotel(s)     | POST hotels/score.json  | JSON           |
[b] Get current rule set       | GET  rules.json         | n/a            |
[c] Update listed hotels rule  | POST rules/hotel/score  | Query params   |
[d] Update listed country rule | POST rules/country/score| Query params   |

### [a] Get scores of hotel(s)

Returns a list of scores of the list of the hotels.

*Example request JSON format:*

```
[
  { "hotelId": 1000, "countryId": 13000},
  { "hotelId": 1005, "countryId": 13001}
]
```

Single or multiple hotel objects are acceptable.

*Example JSON response format:*

```
[
  { "hotelId": 1000, "score": 0},
  { "hotelId": 1005, "score": 5}
]
```


### [b] Get the current rule set

Returns a list of current rules.

*Example of JSON response format:*

```
[
  {
    "scoreHotel": 5,
    "active": true
  },
  {
    "scoreCountry": 3,
    "active": true
  }
]
```

The `active` attribute denotes whether the rule item is effective.


### [c] Update the listed hotels scoring rule

The endpoint expects a few query parameters. 

```
POST rules/hotel/score?turn={status}&value={score}
```

  - [status] : `on` or `off`. When set to off, the rule will no longer be effective.
  - [score]  : The value of score to be assigned to the shortlisted hotels.


*Example request to turn the rule off and on, respectively*

```
POST rule/hotel/score?turn=off

POST rule/hotel/score?turn=on
```

*Example request to turn on the rule and re-assign a new score*

```
POST rule/hotel/score?turn=on&value=10
```

### [d] Update the listed country scoring rule

Similar to [c] but works on shortlisted country. 
The endpoint accepts a few query parameters as follows:

```
POST rules/country/score?turn={status}&value={score}
```

  - [status] : `on` or `off`. When set to off, the rule will no longer be effective.
  - [score]  : The value of score to be assigned to the shortlisted countries.


*Example request to turn off the rule*

```
POST rule/country/score?turn=off
```

*Example request to turn on the rule and re-assign a new score*

```
POST rule/country/score?turn=on&value=2


## Tests

To run a test, the application needs to run in `mock` mode 
so it potentially refers to the mock database. 
To do so, execute the application script directly with `--mock`.

```bash
$ node app.js --mock
```

Then execute a test suite in the another tab:

```bash
$ npm test
```

> NOTE: The test with `npm test` may be run multiple times 
as long as `node app.js --mock` is running without a need to restart.

The valid tests should exhibit the following results.

```text

> hotelscore@0.0.1 test /agoda_test
> mocha

js-bson: Failed to load c++ bson extension, using pure JS version


  Rules tests
Initialising mock data
    Fundamental rule tests
      ✓ should list rules
      ✓ should get shortlisted hotel score
      ✓ should get shortlisted country score
      ✓ should get only a maximum score it could make
      ✓ should get scores for multiple hotels
      ✓ should update new hotel scores
      ✓ should update new country scores
      ✓ should calculate hotel score with new country score
      ✓ should turn off the country rule
      ✓ should not associate country score when turned off
      ✓ should turn off the hotel rule
      ✓ should not associate hotel score when turned off
      ✓ should turn the rule back on
    HTTP error scenarios tests
      ✓ should fail to get scores if request invalid hotel list
      ✓ should fail to configure unknown rule
      ✓ should fail to configure a rule if no parameter is supplied
Purging mock rules...


  16 passing (304ms)

```


