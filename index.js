var Promise = require('bluebird');

module.exports = {
  clean: function(knexObject) {
    var _this = this;

    return knexObject.raw('show tables').then(function(tables) {
      var tableNamesToClean = _this._getTablesToClean(tables[0]);

      return Promise.map(tableNamesToClean, function(tableName) {
        return cleanTableWithDeletion(knexObject, tableName);
      });
    });
  },

  cleanTableWithDeletion: function(knex, tableName) {
    return knex.select().from(tableName).del();
  },

  _getTablesToClean: function(tables) {
    return tables.filter(function(table) {
      var tableName = table[Object.keys(table)[0]];
      return tableName !== 'DATABASECHANGELOG' && tableName !== 'DATABASECHANGELOGLOCK';
    });
  }
}
