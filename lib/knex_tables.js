'use strict';

var BPromise = require('bluebird');
var _ = require('lodash');

var DefaultOptions = {
  ignoreTables: []     // List of tables to not filter out
};

function getTablesNameSql(knex) {
  var client = knex.client.dialect;
  var databaseName = knex.client.databaseName ||
  knex.client.connectionSettings.database;
  var pgSchema = getPgSchema(knex).replace(/"/g, "'");

  switch(client) {
    case 'mysql':
      return "SELECT TABLE_NAME FROM information_schema.tables " +
      "WHERE TABLE_SCHEMA = '" + databaseName + "' " +
      "AND TABLE_TYPE = 'BASE TABLE'";
    case 'postgresql':
      return "SELECT tablename FROM pg_catalog.pg_tables" +
      " WHERE schemaname=" + pgSchema + ";";
    case 'sqlite3':
      return "SELECT name FROM sqlite_master WHERE type='table';";
    default:
      throw new Error('Could not get the sql to select table names from client: ' +
      client);
  }
}

function getSqlRows(knex, resp) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return resp[0];
    case 'postgresql':
      return resp.rows;
    case 'sqlite3':
      return resp;
    default:
      throw new Error('Could not get the sql response from client: ' + client);
  }
}

function getDropTables(knex, tables) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex.transaction(function(trx) {
        return knex.raw('SET FOREIGN_KEY_CHECKS=0').transacting(trx)
        .then(function() {
          return BPromise.map(tables, function(tableName) {
            return knex.schema.dropTable(tableName).transacting(trx);
          });
        })
        .then(function() {
          return knex.raw('SET FOREIGN_KEY_CHECKS=1').transacting(trx);
        })
        .then(trx.commit);
      });
    case 'postgresql':
      return knex.raw('DROP TABLE IF EXISTS ' + tables.join(",") + ' CASCADE');
    case 'sqlite3':
      return BPromise.map(tables, function(tableName) {
        return knex.schema.dropTable(tableName);
      });
    default:
      throw new Error('Could not drop tables for the client: ' + client);
  }
}

function getTableNames(knex, options) {
  options = _.defaults(typeof options !== 'undefined' ? options : {}, DefaultOptions);

  return knex.raw(getTablesNameSql(knex))
    .then(function(resp) {
      return getSqlRows(knex, resp)
        .map(function(table) {
          return table[Object.keys(table)[0]];
        })
        .filter(function(tableName) {
          return !_.includes(options.ignoreTables, tableName);
        });
    });
}

function getTableRowCount(knex, tableName) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex(tableName).count().then(function(resp) {
        return Number(resp[0]['count(*)']);
      });
    case 'postgresql':
      var pgSchema = knex.client.searchPath || 'public';
      return knex(tableName).withSchema(pgSchema).count().then(function(resp) {
        return Number(resp[0].count);
      });
    case 'sqlite3':
      return knex(tableName).count().then(function(resp) {
        return Number(resp[0]['count(*)']);
      });
    default:
      throw new Error('Could not get the table row count from client: ' + client);
  }
}

function getPgSchema(knex) {
  var pgSchema = knex.client.searchPath || 'public';
  if (_.isString(pgSchema)) {
    pgSchema = [pgSchema];
  }
  return pgSchema.map(function(schema) {
    return '\"' + schema + '\"';
  }).join('.');
}

module.exports = {
  getTableNames: function(knex, options) {
    return getTableNames(knex, options);
  },
  getTableRowCount: function(knex, tableName) {
    return getTableRowCount(knex, tableName);
  },
  getDropTables: function(knex, tables) {
    return getDropTables(knex, tables);
  },
  getPgSchema: function(knex) {
    return getPgSchema(knex);
  },
};
