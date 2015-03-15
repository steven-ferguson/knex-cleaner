/****************************************************
 **                                                **
 ** Run this to create the MySQL Test Database for **
 ** Knex Cleaner Tests                             **
 **                                                **
 ****************************************************/
 
CREATE DATABASE IF NOT EXISTS knex_cleaner_test;

GRANT ALL PRIVILEGES ON knex_cleaner_test.* to 'knex_cleaner'@'localhost' identified by 'password';

FLUSH PRIVILEGES;
