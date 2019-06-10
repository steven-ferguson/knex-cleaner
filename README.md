# knex-cleaner
[![CircleCI](https://circleci.com/gh/steven-ferguson/knex-cleaner.svg?style=svg)](https://circleci.com/gh/steven-ferguson/knex-cleaner)

Helper library to clean a PostgreSQL, MySQL or SQLite3 database tables using Knex. Great for integration tests.

### Installation
```
npm install knex-cleaner
```

### Usage
```javascript
var knexCleaner = require('knex-cleaner');

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});

knexCleaner.clean(knex).then(function() {
  // your database is now clean
});

// You can also use this in BookshelfJS
var bookshelf = require('bookshelf')(knex);

knexCleaner.clean(bookshelf.knex).then(function() {

});

// You can also pass if it deletes the tables with delete instead of truncate
// as well as a list of tables to ignore.

var options = {
  mode: 'delete', // Valid options 'truncate', 'delete'
  restartIdentity: true, // Used to tell PostgresSQL to reset the ID counter
  ignoreTables: ['Dont_Del_1', 'Dont_Del_2']
}

knexCleaner.clean(knex, options).then(function() {
  // your database is now clean
});
```
The example above used MySQL but it has been tested on PostgreSQL and SQLite3.
