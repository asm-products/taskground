var MongoClient = require('mongodb').MongoClient
  , users = require('./users')
  , tasks = require('./tasks')
  , subscriptions = require('./subscriptions');

/**
 * connect mongo database
 *
 * @param object config
 * @param function callback
 */
module.exports.connect = function(config, callback) {
  MongoClient.connect(config, function(err, db) {
    users.config(db);
    tasks.config(db);
    subscriptions.config(db);
    module.exports.users = users;
    module.exports.tasks = tasks;
    module.exports.subscriptions = subscriptions;
    callback(err, db);
  });
}