'use strict';

var Promise = require('bluebird');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiAsPromised);

var knexMySQL = require('./knex_test')('mysql');
var knexPG = require('./knex_test')('pg');
var knexSqLite3 = require('./knex_test')('pg');
var knexCleaner = require('../lib/knex_cleaner');

describe('knex_cleaner', function() {

  [{ client: 'mysql', knex: knexMySQL }, { client: 'postgresql', knex: knexPG },
  { client: 'sqlite3', knex: knexSqLite3}]
  .forEach(function(dbTestValues) {

    describe(dbTestValues.client, function() {

      beforeEach(function() {
        return Promise.all([
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
        ]);
      });

      afterEach(function() {
        return Promise.all([
          dbTestValues.knex.schema.dropTable('test_1'),
          dbTestValues.knex.schema.dropTable('test_2')
        ]);
      });

      it('can clear all tables with defaults', function(done) {
        return knexCleaner.clean(dbTestValues.knex);
      });
      /*
      it('can clear all tables with delete', function(done) {
        return knexCleaner.clean(dbTestValues.knex, {
          mode: 'delete'
        });
      });

      it('can clear all tables ignoring tables', function(done) {
        return knexCleaner.clean(dbTestValues.knex, {
          ignoreTables: ['test_1']
        });
      });
      */
    });

  });

});
