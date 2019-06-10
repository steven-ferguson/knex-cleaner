ALTER USER 'knex_cleaner'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
GRANT ALL PRIVILEGES ON *.* TO 'knex_cleaner'@'%';
