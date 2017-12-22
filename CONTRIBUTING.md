## How to contribute to Knex-cleaner

* Before sending a pull request for a feature or bug fix, be sure to have tests and all the tests pass.
* Use the same coding style as the rest of the codebase.
* All pull requests should be made to the `master` branch.

## Integration Tests

### The Easy Way

By default, Knex-Cleaner runs tests against MySQL, Postgres, and SQLite. The easiest way to run the tests is by creating the database using Docker. Just run `docker-compose up -d` from the project root.

### The Hard Way

You need to setup a MySQL and Postgres database with this user having full access:

* Database: knex_cleaner_test
* User: knex_cleaner
* Password: password
* Port:
    MYSQL: 8081
    POSTGRES: 8082

No setup is required for SQLite.

### Running Tests

```bash
$ npm test
```

### Custom Configuration
If you'd like to override the test database configuration (to use a different db, for example), you can override the default test configuration (test/test_db_config.json) using the `KNEX_CLEANER_TEST` environment variable.

```bash
$ KNEX_CLEANER_TEST='./path/to/my/config.json' npm test
```
