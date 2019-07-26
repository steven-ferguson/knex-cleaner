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
        beforeEach(async function() {

          await dbTestValues.knex.schema.createTable('test_1', function (table) {
            table.increments();
            table.string('name');
            table.timestamps();
          });

          await dbTestValues.knex.schema.createTable('test_2', function (table) {
            table.increments();
            table.string('name');
            table.integer('test_1_id').unsigned().references('test_1.id');
            table.timestamps();
          });

          await BPromise.all([
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()}),
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()}),
            dbTestValues.knex('test_1').insert({name: Faker.company.companyName()})
          ]);

          await dbTestValues.knex('test_1').select().map(function(row) {
            return dbTestValues.knex('test_2').insert({
              name: Faker.company.companyName(),
              test_1_id: row[0]
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

        if (client === 'postgres') {
          it('can clear all tables with non public schema', async function() {
            await dbTestValues.knex.raw(`
              DROP SCHEMA IF EXISTS test CASCADE;
              CREATE SCHEMA test;
              ALTER TABLE test_1 SET SCHEMA test;
              ALTER TABLE test_2 SET SCHEMA test;
            `);

            dbTestValues.knex.client.searchPath = 'test';
            await knexCleaner.clean(dbTestValues.knex);

            await BPromise.all([
              knexTables.getTableRowCount(dbTestValues.knex, 'test_1')
              .should.eventually.equal(0),
              knexTables.getTableRowCount(dbTestValues.knex, 'test_2')
              .should.eventually.equal(0)
            ]);

            await dbTestValues.knex.raw(`
              ALTER TABLE "test"."test_1" SET SCHEMA public;
              ALTER TABLE "test"."test_2" SET SCHEMA public;
              DROP SCHEMA test CASCADE;
            `);

            delete dbTestValues.knex.client.searchPath;
          });
        }

        describe('camel cased table names', function() {
          beforeEach(function() {
            return dbTestValues.knex.schema.createTable('dogBreeds', function (table) {
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

          if (client === 'postgres') {
            it('clears the table with truncate and restarts identity disabled', async function() {
              await dbTestValues.knex('dogBreeds').insert({ name: 'Zbruchle' });
              await knexCleaner.clean(dbTestValues.knex, {
                mode: 'truncate',
                restartIdentity: false
              });
              const res = parseInt(await knexTables.getTableRowCount(dbTestValues.knex, 'dogBreeds'), 10);
              res.should.equal(0);

              const sequenceVal = parseInt((await dbTestValues.knex.schema.raw(`SELECT last_value FROM "dogBreeds_id_seq";`)).rows[0].last_value, 10);
              sequenceVal.should.equal(2);
            });

            it('clears the table with truncate and restarts identity enabled', async function() {
              await dbTestValues.knex('dogBreeds').insert({ name: 'Zbruchle' });
              await knexCleaner.clean(dbTestValues.knex, {
                mode: 'truncate',
                restartIdentity: true
              });
              const res = parseInt(await knexTables.getTableRowCount(dbTestValues.knex, 'dogBreeds'), 10);
              res.should.equal(0);

              const sequenceVal = parseInt((await dbTestValues.knex.schema.raw(`SELECT last_value FROM "dogBreeds_id_seq";`)).rows[0].last_value, 10);
              sequenceVal.should.equal(1);
            });

            it('clears the table with truncate and default restarts identity', async function() {
              await dbTestValues.knex('dogBreeds').insert({ name: 'Zbruchle' });
              await knexCleaner.clean(dbTestValues.knex, {
                mode: 'truncate',
              });
              const res = parseInt(await knexTables.getTableRowCount(dbTestValues.knex, 'dogBreeds'), 10);
              res.should.equal(0);

              const sequenceVal = parseInt((await dbTestValues.knex.schema.raw(`SELECT last_value FROM "dogBreeds_id_seq";`)).rows[0].last_value, 10);
              sequenceVal.should.equal(1);
            });
          }

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
