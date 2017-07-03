"use strict";

var BPromise = require("bluebird");
var _ = require("lodash");

var knexTables = require("../lib/knex_tables");
var fs = require("fs");
var path = require("path");
var NODE_ENV = process.env.NODE_ENV || "development";

var DefaultOptions = {
  mode: "truncate", // Can be ['truncate', 'delete']
  ignoreTables: [] // List of tables to not delete
};

function clean(knex, passedInOptions) {
  var knexConfigPath = passedInOptions.knexConfigPath
    ? passedInOptions.knexConfigPath
    : path.resolve(process.cwd(), "knexfile.js");

  if (!fs.existsSync(knexConfigPath)) {
    throw `Unable to locate knex config at ${knexConfigPath}`;
  }

  var knexConfig = require(knexConfigPath);
  var knexMigrationsTable =
    knexConfig[NODE_ENV] &&
    knexConfig[NODE_ENV].migrations &&
    knexConfig[NODE_ENV].migrations.tableName
      ? knexConfig[NODE_ENV].migrations.tableName
      : knexConfig.migrations && knexConfig.migrations.tableName
        ? knexConfig.migrations.tableName
        : "knex_migrations";

  DefaultOptions.ignoreTables.push(knexMigrationsTable);
  DefaultOptions.ignoreTables.push(`${knexMigrationsTable}_lock`);

  var options = _.defaults({}, passedInOptions, DefaultOptions);

  return knexTables.getTableNames(knex, options).then(function(tables) {
    if (options.mode === "delete") {
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

  switch (client) {
    case "mysql":
      return knex.transaction(function(trx) {
        knex
          .raw("SET FOREIGN_KEY_CHECKS=0")
          .transacting(trx)
          .then(function() {
            return BPromise.map(tableNames, function(tableName) {
              return knex(tableName).truncate().transacting(trx);
            });
          })
          .then(function() {
            return knex.raw("SET FOREIGN_KEY_CHECKS=1").transacting(trx);
          })
          .then(trx.commit);
      });
    case "postgresql":
      var quotedTableNames = tableNames.map(function(tableName) {
        return '"' + tableName + '"';
      });
      return knex.raw("TRUNCATE " + quotedTableNames.join() + " CASCADE");
    case "sqlite3":
      return BPromise.map(tableNames, function(tableName) {
        return knex(tableName).truncate();
      });
    default:
      throw new Error(
        "Could not get the sql to select table names from client: " + client
      );
  }
}

module.exports = {
  clean: function(knex, options) {
    return clean(knex, options);
  }
};
