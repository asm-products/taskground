var db = null
  , ObjectID = require('mongodb').ObjectID
  , bcrypt = require('bcrypt')
  , Validator = require('validator').Validator
  , validator = new Validator();

  Validator.prototype.error = function (msg) {
    this._errorsDictionary = this._errorsDictionary || {};
    this._errorsDictionary[this.errorDictionary.param] = this.errorDictionary;
    return this;
  }

  Validator.prototype.getErrors = function () {
    return this._errorsDictionary;
  }

/**
 * validate tasks
 *
 * @param object task
 * @param boolean create - set to true for new tasks
 */
function validate(data, create) {
  validator._errorsDictionary = false;

  var location = data.location || {};

  if(data.address !== undefined || create) {
    validator.check(data.address, {
      'param': 'address',
      'msg': 'Please add a valid location'
    }).notEmpty();
  }

  if(location.lat !== undefined || create) {
    validator.check(location.lat, {
      'param': 'location',
      'msg': 'Please add a valid location'
    }).notEmpty();
  }

  if(location.lng !== undefined || create) {
    validator.check(location.lng, {
      'param': 'location',
      'msg': 'Please add a valid location'
    }).notEmpty();
  }

  if(data.description !== undefined || create) {
    validator.check(data.description, {
      'param': 'description',
      'msg': 'Please write a description'
    }).notEmpty();
  }

  if(data.user !== undefined || create) {
    validator.check(data.user, {
      'param': 'user',
      'msg': 'You need to select a valid user'
    }).notEmpty();
  }

  if(data.date !== undefined || create) {
    validator.check(data.date, {
      'param': 'date',
      'msg': 'Please select a date'
    }).isDate();
  }

  return validator.getErrors();
}
/**
 * config database
 */
module.exports.config = function(database) {
  db = database;
}

/**
 * count tasks
 *
 * @param function callback
 */
module.exports.count = function(callback) {
  db.collection('tasks').count({}, function(err, doc) {
    if (err) throw err;
    callback(doc);
  })
};

/**
 * find tasks by users ids
 *
 * @param array ids
 * @param function callback
 */
module.exports.findByIds = function(ids, callback) {
  db.collection('tasks').find({'user': { $in: ids }})
  .sort({'date':1})
  .toArray(function(err, tasks) {
    if(err) throw err;
    callback(tasks);
  });
}

/**
 * find tasks by user id
 *
 * @param string id
 * @param function callback
 */
module.exports.findById = function(id, callback) {
  db.collection('tasks').find({'user': id})
  .sort({'date':1})
  .toArray(function(err, tasks) {
    if(err) throw err;
    callback(tasks);
  });
}

/**
 * find by conditions
 *
 * @param object conditions
 * @param function callback
 */
module.exports.findByConditions = function(conditions, callback) {
  db.collection('tasks').find(conditions)
  .sort({'date': 1})
  .toArray(function(err, tasks) {
    if(err) throw err;
    callback(tasks);
  });
}

/**
 * add a task
 *
 * @param object data
 * @param function callback
 */
module.exports.add = function(data, callback) {
  var errors = validate(data, true);
  if(errors) {
    callback({'errors': errors});
  } else {
    db.collection('tasks').insert(data, function(err, result) {
      if(err) throw err;
      callback(result);
    });
  }
}

/**
 * update a task
 *
 * @param object task
 * @param object update
 * @param function callback
 */
module.exports.update = function(task, update, callback) {
  var errors = validate(update, false);
  if(errors) {
    callback({'errors': errors});
  } else {
    db.collection('tasks').update(task, {$set: update }, {upsert: true},
    function(err, result) {
      if(err) throw err;
      callback(result);
    });
  }
}

/**
 * delete a task
 *
 * @param object task
 * @param function callback
 */
module.exports.delete = function(task, callback) {
  db.collection('tasks').remove(task, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * add a pending task message
 *
 * @param object task
 * @param object pending
 * @param function callback
 */
module.exports.addPending = function(task, pending, callback) {
  db.collection('tasks').update(task, {$set: {'status': 'pending'}, $push: { 
    'pending': pending }},
  function(err, result) {
    if (err) throw err;
    callback(result);
  });
}
 