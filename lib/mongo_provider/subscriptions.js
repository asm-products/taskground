var db = null
  , ObjectID = require('mongodb').ObjectID;

function normalizeCompanyName(company) {
  return company.toLowerCase();
}

/**
 * config database
 */
module.exports.config = function(database) {
  db = database;
}

/**
 * add a new subscription
 *
 * @param object user
 * @param function callback
 */
module.exports.add = function(data, callback) {
  var subscription = {
    'payerID': data.payerID,
    'profileID': data.profileID,
    'timestamp': data.timestamp,
    'type': data.type,
    'company': data.company,
    'company_normalized': normalizeCompanyName(data.company)
  };

  db.collection('subscriptions').insert(subscription, function(err, result) {
    if(err) throw err;
    subscription._id = result[0]._id;
    callback(subscription);
  });
}

/**
 * find all subscriptions and return them as array
 * @param function callback
 */
module.exports.findAll = function(callback) {
  db.collection('subscriptions').find().toArray(function(err, docs) {
    if(err) throw err;
    callback(docs);
  });
}

/**
 * find subscription by id
 * @param int id
 * @param function callback
 */
module.exports.findById = function(id, callback) {
  db.collection('subscriptions').findOne({'_id': ObjectID(id)}, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * find subscriptions by company
 *
 * @param string company
 * @param function callback
 */
module.exports.findByCompany = function(company, callback) {
  var normalizedCompanyName = normalizeCompanyName(company);
  db.collection('subscriptions').findOne({'company_normalized': normalizedCompanyName},
    function(err, doc) {
      if(err) throw err;
      callback(doc);
  });
}

/**
 * update a subscription
 *
 * @param object subscription
 * @param object update
 * @param function callback
 */
module.exports.update = function(subscription, update, callback) {
  db.collection('subscriptions').findAndModify(subscription, [['_id',1]], {$set: update}, 
    function(err, doc) {
      if(err) throw err;
      var doc = doc || {};
      callback(doc);
    });
}
