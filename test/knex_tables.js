'use strict';

var BPromise = require('bluebird');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiAsPromised);

var knexMySQL = require('./knex_test')('mysql');
var knexPG = require('./knex_test')('pg');
var knexSqLite3 = require('./knex_test')('pg');
var knexTables = require('../lib/knex_tables');

describe('knex_tables', function() {

  [{ client: 'mysql', knex: knexMySQL }, { client: 'postgresql', knex: knexPG },
    { client: 'sqlite3', knex: knexSqLite3}]
  .forEach(function(dbTestValues) {

    describe(dbTestValues.client, function() {

      beforeEach(function() {
        return BPromise.all([
          dbTestValues.knex.schema.createTable('test_1', function (table) {
            table.increments();
            table.string('name');
            table.timestamps();
          }),
          dbTestValues.knex.schema.createTable('test_2', function (table) {
            table.increments();
            table.string('name');
            table.timestamps();
          })
        ]).then(function() {
          return dbTestValues.knex
          .raw('CREATE VIEW test_view AS SELECT * FROM test_1')
        });
      });

      afterEach(function() {
        return dbTestValues.knex.raw('DROP VIEW test_view').then(function() {
          return knexTables.getDropTables(dbTestValues.knex, ['test_1', 'test_2']);
        });
      });

      it('can get all tables', function() {
        return knexTables.getTableNames(dbTestValues.knex)
        .then(function(tables) {
          tables.should.include('test_1');
          tables.should.include('test_2');
        });
      });

      it('can get all tables filtering by ignoreTables option', function() {
        return knexTables.getTableNames(dbTestValues.knex, {
            ignoreTables: ['test_1']
        }).then(function(tables) {
          tables.should.not.include('test_1');
          tables.should.include('test_2');
        });
      });

      it('views should not be in the list of tables', function() {
        return knexTables.getTableNames(dbTestValues.knex)
        .then(function(tables) {
          tables.should.not.include('test_view');
        });
      });

    });

  });

});
