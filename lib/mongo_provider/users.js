var db = null
  , ObjectID = require('mongodb').ObjectID
  , bcrypt = require('bcrypt')
  , tasks = require('./tasks')
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

validator.getErrors();

/**
 * validate users
 *
 * @param object user
 */
function validate(user, create) {
  validator._errorsDictionary = false;

  if(user.email !== undefined || create) {
    validator.check(user.email, {
      'param': 'email',
      'msg': 'Please enter a valid email address'
    }).isEmail();
  }

  if(user.password !== undefined || create) {
    validator.check(user.password, {
      'param': 'password',
      'msg': 'Please enter a password'
    }).notEmpty();
  }

  if(user.company !== undefined || create) {
    validator.check(user.company, {
      'param': 'company',
      'msg': 'Please enter a company name'
    }).notEmpty();
  }

  if(user.name !== undefined || create) {
    validator.check(user.name, {
      'param': 'name',
      'msg': 'Please enter the name'
    }).notEmpty();
  }

  if(user.type !== undefined || create) {
    validator.check(user.type, {
      'param': 'type',
      'msg': 'Please set a user type'
    }).notEmpty();
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
 * authenticate a user
 *
 * @param object user
 * @param function callback
 */
module.exports.auth = function(user, callback) {
  db.collection('users').findOne({'email': user.email}, function(err, doc) {
    if(err) throw err;
    if(doc) {
      bcrypt.compare(user.password, doc.password, function(err, match) {
        if(match) {
          callback(doc);
        } else {
          callback(false);
        }
      });
    } else {
      callback(false);
    }
  });
}

/**
 * add a new user
 *
 * @param object user
 * @param function callback
 */
module.exports.add = function(data, callback) {

  var user = {
    'name': data.name,
    'password': data.password,
    'email': data.email.toLowerCase(),
    'type': data.type,
    'company': data.company
  };

  if((data.type == 'admin' || data.type == 'operator') && data.location !== undefined) {
    user.location = data.location;
  }

  var errors = validate(user, true);

  if(errors) {
    callback({ 'errors': errors});
  } else {
    db.collection('users').findOne({'email': user.email}, function(err, doc) {
      if(!doc) {
        bcrypt.hash(user.password, 10, function(err, hash) {
          user.password = hash;
          db.collection('users').insert(user, function(err, result) {
            if(err) throw err;
            user._id = result[0]._id;
            callback(user);
          });
        });
      } else {
        callback({'errors': {'email': {'param': 'email', 'msg': 'This email address is already in use'}}});
      }
    });
  }
}

/**
 * count all users
 *
 * @param function callback
 */
module.exports.count = function(callback) {
  db.collection('users').count({}, function(err, doc) {
    if (err) throw err;
    callback(doc);
  });
};

/**
 * find user by id
 *
 * @param string id
 * @param function callback
 */
module.exports.findById = function(id, callback) {
  db.collection('users').findOne({'_id': ObjectID(id)}, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * find user by email
 *
 * @param string email
 * @param function callback
 */
module.exports.findByEmail = function(email, callback) {
  db.collection('users').findOne({'email': email.toLowerCase()}, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * find user by token
 *
 * @param string token
 * @param function callback
 */
module.exports.findByToken = function(token, callback) {
  db.collection('users').findOne({'token':token}, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * find users by company
 *
 * @param string company
 * @param function callback
 */
module.exports.findByCompany = function(company, userType, callback) {
  var conditions = {
    'company': company
  };

  if(userType) {
    conditions.type = userType;
  }

  db.collection('users').find(conditions).toArray(function(err, docs) {
    if(err) throw err;
    callback(docs);
  });
}

/**
 * find user by conditions
 *
 * @param object conditions
 * @param function callback
 */
module.exports.findByConditions = function(conditions, callback) {
  db.collection('users').findOne(conditions, function(err, doc) {
    if(err) throw err;
    callback(doc);
  });
}

/**
 * update a user
 *
 * @param object user
 * @param object update
 * @param function callback
 */
module.exports.update = function(user, update, callback) {
  var errors = validate(update, false);

  if(errors) {
    callback({'errors': errors});
  } else {
    db.collection('users').findOne({'email': update.email}, function(err, doc) {
      if(doc && doc._id.toString() != user._id.toString()) {
        callback({'errors': {'email': {'param': 'email', 'msg': 'This email address is already in use'}}});
        return;
      }

      if(update.password) {
        bcrypt.hash(update.password, 10, function(err, hash) {
          update.password = hash
          db.collection('users').findAndModify(user, [['_id',1]], {$set: update}, function(err, doc) {
            if(err) throw err;
            callback(doc);
          });
        });
      } else {
        delete update.password;
        db.collection('users').findAndModify(user, [['_id',1]], {$set: update}, function(err, doc) {
          if(err) throw err;
          var doc = doc || {};
          callback(doc);
        });
      }
    });
  }
}

/**
 * delete a user by id
 *
 * @param object user
 * @param function callback
 */
module.exports.delete = function(user, callback) {
  db.collection('users').remove({'_id': ObjectID(user.id), 'company': user.company }, function(err, doc) {
    if(err) throw err;
    tasks.delete({'user': user.id}, function(doc) {
      callback(doc);
    });
  });
}