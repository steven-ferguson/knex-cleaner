'use strict';

var BPromise = require('bluebird');
var Faker = require('faker');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiAsPromised);

var knexMySQL = require('./knex_test')('mysql');
var knexPG = require('./knex_test')('pg');
var knexSqLite3 = require('./knex_test')('pg');
var knexCleaner = require('../lib/knex_cleaner');
var knexTables = require('../lib/knex_tables');

describe('knex_cleaner', function() {

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
            table.integer('test_1_id').unsigned().references('test_1.id');
            table.timestamps();
          })
        ]).then(function() {
          return BPromise.all([
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()}),
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()}),
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()})
          ]).then(function() {
            return dbTestValues.knex('test_1').select().map(function(row) {
              return dbTestValues.knex('test_2').insert({
                name: Faker.company.companyName(),
                test_1_id: row[0]
              });
            });
          })
        });
      });

      afterEach(function() {
        return knexTables.getDropTables(dbTestValues.knex, ['test_1', 'test_2']);
      });

      it('can clear all tables with defaults', function() {
        return knexCleaner.clean(dbTestValues.knex)
        .then(function() {
          return BPromise.all([
            knexTables.getTableRowCount(dbTestValues.knex, 'test_1')
              .should.eventually.equal(0),
            knexTables.getTableRowCount(dbTestValues.knex, 'test_2')
              .should.eventually.equal(0)
          ]);
        });
      });

      it('can clear all tables with delete', function() {
        return knexCleaner.clean(dbTestValues.knex, {
          mode: 'delete'
        })
        .then(function() {
          return BPromise.all([
            knexTables.getTableRowCount(dbTestValues.knex, 'test_1')
            .should.eventually.equal(0),
            knexTables.getTableRowCount(dbTestValues.knex, 'test_2')
            .should.eventually.equal(0)
          ]);
        });
      });

      it('can clear all tables ignoring tables', function() {
        return knexCleaner.clean(dbTestValues.knex, {
          ignoreTables: ['test_1']
        })
        .then(function() {
          return BPromise.all([
            knexTables.getTableRowCount(dbTestValues.knex, 'test_1')
            .should.eventually.equal(3),
            knexTables.getTableRowCount(dbTestValues.knex, 'test_2')
            .should.eventually.equal(0)
          ]);
        });
      });

    });

  });

});
