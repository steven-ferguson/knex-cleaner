'use strict';

var BPromise = require('bluebird');
var _ = require('lodash');

var knexTables = require('../lib/knex_tables');

var DefaultOptions = {
  mode: 'truncate',    // Can be ['truncate', 'delete']
  ignoreTables: []     // List of tables to not delete
};

function clean(knex, passedInOptions) {
  var options = _.defaults({}, passedInOptions, DefaultOptions);

  return knexTables.getTableNames(knex, options)
  .then(function(tables) {
    if (options.mode === 'delete') {
      return cleanTablesWithDeletion(knex, tables, options);
    } else {
      return cleanTablesWithTruncate(knex, tables, options);
    }
  });

}

function cleanTablesWithDeletion(knex, tableNames, options) {
  return BPromise.map(tableNames, function(tableName) {
    return knex.select().from(tableName).del();
  });
}

function cleanTablesWithTruncate(knex, tableNames, options) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex.transaction(function(trx) {
        knex.raw('SET FOREIGN_KEY_CHECKS=0').transacting(trx)
        .then(function() {
          return BPromise.map(tableNames, function(tableName) {
            return knex(tableName).truncate().transacting(trx);
          });
        })
        .then(function() {
          return knex.raw('SET FOREIGN_KEY_CHECKS=1').transacting(trx);
        })
        .then(trx.commit);
      });
    case 'postgresql':
      if (_.has(tableNames, '[0]')) {
        var quotedTableNames = tableNames.map(function(tableName) {
          return '\"' + tableName + '\"';
        });
        return knex.raw('TRUNCATE ' + quotedTableNames.join() + ' CASCADE');
      }
      return;
    case 'sqlite3':
      return BPromise.map(tableNames, function(tableName) {
        return knex(tableName).truncate();
      });
    default:
      throw new Error('Could not get the sql to select table names from client: ' + client);
  }
}

module.exports = {
  clean: function(knex, options) {
    return clean(knex, options);
  }
};
