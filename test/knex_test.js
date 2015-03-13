'use strint';

var knex = require('knex');
var testSettings = process.env.KNEX_CLEANER_TEST
  && require(process.env.KNEX_CLEANER_TEST)
  || require('./test_db_config.json');

module.exports = function(client) {
  return knex(testSettings[client]);
}
