'use strint';

var knex = require('knex');
var testSettings = require('./test_db_config.json');

module.exports = function(client) {
  return knex(testSettings[client]);
}
