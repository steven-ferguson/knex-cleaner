# knex-cleaner
Helper function to clean a MySQL database with knex

###Usage
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

// OR WITH A BOOKSHELF instance
var bookshelf = require('bookshelf')(knex);

knexCleaner.clean(bookshelf.knex).then(function() {

});
```
