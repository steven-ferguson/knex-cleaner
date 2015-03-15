'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

var knexTables = require('../lib/knex_tables');

var DefaultOptions = {
  mode: 'truncate',    // Can be ['truncate', 'delete']
  ignoreTables: []     // List of tables to not delete
}

function clean(knex, passedInOptions) {
  var options = _.defaults({}, passedInOptions, DefaultOptions);

  return knexTables.getTableNames(knex, options)
  .then(function(tables) {
    return Promise.map(tables, function(tableName) {
      if (options.mode === 'delete') {
        return cleanTableWithDeletion(knex, tableName, options);
      } else {
        return cleanTableWithTruncate(knex, tableName, options);
      }
    });
  });

}

function cleanTableWithDeletion(knex, tableName, options) {
  return knex.select().from(tableName).del();
}

function cleanTableWithTruncate(knex, tableName, options) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex.transaction(function(trx) {
          knex.raw('SET FOREIGN_KEY_CHECKS=0').transacting(trx)
          .then(function() {
            return knex(tableName).truncate().transacting(trx);
          })
          .then(trx.commit)
          .then(function() {
            return knex.raw('SET FOREIGN_KEY_CHECKS=1').transacting(trx);
          });
        });
      break;
    case 'postgresql':
      return knex.raw('TRUNCATE ' + tableName + ' CASCADE');
      break;
    case 'sqlite3':
      return knex(tableName).truncate();
      break;
    default:
      throw new Error('Could not get the sql to select table names from client: ' + client);
      break;
  }
  return
}

module.exports = {
  clean: function(knex, options) {
    return clean(knex, options)
  }
};
