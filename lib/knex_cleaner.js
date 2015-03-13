'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

var knexTables = require('../lib/knex_tables');

var DefaultOptions = {
  mode: 'truncate',    // Can be ['truncate', 'delete']
  ignoreTables: []     // List of tables to not delete
}

function clean(knex, options) {
  options = _.defaults(typeof options !== 'undefined' ? options : {}, DefaultOptions);

  return knexTables.getTableNames(knex, options)
  .then(function(tables) {
    return Promise.all(
      _.forEach(tables, function(tableName) {
        if (options.mode === 'delete') {
          return cleanTableWithDeletion(knex, tableName, options);
        } else {
          return cleanTableWithTruncate(knex, tableName, options);
        }
      })
    );
  });

}

function cleanTableWithDeletion(knex, tableName, options) {
  return knex.select().from(tableName).del();
}

function cleanTableWithTruncate(knex, tableName, options) {
  return knex(tableName).truncate();
}

module.exports = {
  clean: function(knex, options) {
    return clean(knex, options)
  }
};
