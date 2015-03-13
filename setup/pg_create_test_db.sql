/******************************************************
**                                                   **
** Run this to create the Postgres Test Database for **
** Knex Cleaner Tests                                **
**                                                   **
*******************************************************/

CREATE DATABASE knex_cleaner_test;

CREATE USER knex_cleaner WITH PASSWORD 'password';

GRANT ALL PRIVILEGES ON DATABASE knex_cleaner_test to knex_cleaner;
