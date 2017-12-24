const BPromise = require('bluebird');
const Faker = require('faker');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const config = require('config');
const knexLib = require('knex');
const knexCleaner = require('../lib/knex_cleaner');
const knexTables = require('../lib/knex_tables');

const knexMySQL = knexLib(config.get('mysql'));
const knexPG = knexLib(config.get('pg'));
const knexSqLite3 = knexLib(config.get('sqlite3'));

const { expect } = chai;
chai.should();
chai.use(chaiAsPromised);

describe('knex_cleaner', function() {
  const clients = [
    { client: 'mysql', knex: knexMySQL },
    { client: 'postgres', knex: knexPG },
    { client: 'sqllite', knex: knexSqLite3 },
  ];

  clients.forEach(function(dbTestValues) {
    const { knex, client } = dbTestValues;

    describe(dbTestValues.client, function() {
      beforeEach('start with empty db', async function () {
        const tableNames = await knexTables.getTableNames(knex);

        return Promise.all(
          tableNames.map(tableName => {
            if (tableName !== 'sqlite_sequence' || client !== 'sqllite') {
              return knex.schema.dropTable(tableName);
            }
          })
        );
      });

      after(function () {
        return dbTestValues.knex.destroy();
      });

      it('handles a database with no tables', function () {
        return knexCleaner.clean(knex);
      });

      describe('basic tests', function () {
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
            });
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

        describe('camel cased table names', function() {
          beforeEach(function() {
            return dbTestValues.knex.schema.createTableIfNotExists('dogBreeds', function (table) {
              table.increments();
              table.string('name');
              table.timestamps();
            }).then(function() {
              return dbTestValues.knex('dogBreeds').insert({
                name: 'corgi'
              });
            });
          });

          afterEach(function() {
            return knexTables.getDropTables(dbTestValues.knex, ['dogBreeds']);
          });

          it('clears the table with defaults', function() {
            return knexCleaner.clean(dbTestValues.knex)
              .then(function() {
                return knexTables.getTableRowCount(dbTestValues.knex, 'dogBreeds')
                  .should.eventually.equal(0);
              });
          });

          it('clears the table with delete', function() {
            return knexCleaner.clean(dbTestValues.knex, {
              mode: 'delete'
            }).then(function() {
              return knexTables.getTableRowCount(dbTestValues.knex, 'dogBreeds')
                .should.eventually.equal(0);
            });
          });
        });
      });
    });
  });
});
