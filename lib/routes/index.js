var settings = require('../../settings')
  , provider = null
  , nodemailer = require('nodemailer')
  , Paypal = require('paypal-recurring') 
  , paypal = new Paypal({
      username:  settings.paypalUsername,
      password:  settings.paypalPassword,
      signature: settings.paypalSignature,
    }, settings.paypalEnvironment)

/**
 * redirect a user depending on its type
 * @param object res
 * @param string type - user type
 */
redirectUser = function(res, type) {
  if(type == 'admin' || type == 'operator') {
    res.redirect('/operator');
  } else if(type == 'mobile') {
    res.redirect('/mobile');
  } else {
    res.redirect('/logout');
  }
};

/**
 * create the application routes
 */
module.exports.create = function(config) {
  provider = config.provider;
  return this;
}

/**********************
 ***** MIDDLEWARE *****
 **********************/
 
/** 
 * authorization middleware
 */
module.exports.authMiddleware = function(req, res, next) {
  if(!req.session.id) {
    res.redirect('/');
  } else {
    next();
  }
}

/**
 * if user has session redirect to 
 * the operator or mobile page
 */
module.exports.noAuthMiddleware = function(req, res, next) {
  if(req.session.id) {
    redirectUser(res, req.session.type);
  } else {
    next();
  }
}

/**
 * check if user is admin or operator
 */
module.exports.operatorOnly = function(req, res, next) {
  if(req.session.id && (req.session.type == 'admin' || req.session.type == 'operator')) {
   next();
  } else {
    redirectUser(res, req.session.type);
  }
}

/**
 * check if user is mobile
 */
module.exports.mobileOnly = function(req, res, next) {
  if(req.session.id && req.session.type == 'mobile') {
   next();
  } else {
    redirectUser(res, req.session.type);
  }
}

/******************
 ***** ROUTES *****
 ******************/

/**
 * get homepage
 */
module.exports.getHome = function(req, res) {
  res.render('home');
};

/**
 * get pricing page
 */
module.exports.getPricing = function(req, res) {
  res.render('pricing', { 'plans': settings.plans });
};

/**
 * get support page
 */
module.exports.getSupport = function(req, res) {
  res.render('support');
};

/**
 * get login page
 */
module.exports.getLogin = function(req, res) {
  res.render('login');
};

/**
 * signup page
 */
module.exports.getSignup = function(req, res) {
  res.render('signup', {
    'payerID': req.session.payerID,
    'plan': req.session.plan
  });
};

/**
 * show recovery form
 */
module.exports.getRecovery =  function(req, res) {
  res.render('recovery');
};

/**
 * client
 */
module.exports.getOperator = function(req, res) {
  res.render('operator');
};

/**
 * mobile html client
 */
module.exports.getMobile =  function(req, res) {
  res.render('mobile');
};

/**
 * validate login form and redirect to client
 */
module.exports.postLogin = function(req, res) {
  provider.users.auth({
    'email': req.body.email,
    'password': req.body.password
  }, function(user) {
    if(user) {
      req.session.id = user._id;
      req.session.type = user.type;
      req.session.company = user.company;
      redirectUser(res, user.type);
    } else {
      res.render('login', { 
        'errors': {
          'login': { 
            'msg': 'Incorrect Login'
          }
        },
        'values': req.body 
      });
    }
  });
};

/**
 * signup a new company with a user of type 'admin'
 */
module.exports.postSignup = function(req, res) {
  var payerID = req.session.payerID;
  var profileID = req.session.profileID;
  provider.subscriptions.findByCompany(req.body.company, function(company){
    if(!company) {
      provider.users.add({
        'email': req.body.email,
        'password': req.body.password,
        'name': req.body.name,
        'company': req.body.company,
        'type' : 'admin',
        'location': {
          'city': '',
          'country': ''
        }
      }, function(user) {
        if(user.errors) {
          res.render('signup', {'errors': user.errors, 'values': req.body});
        } else {
          req.session.id = user._id;
          req.session.email = user.email;
          req.session.type = 'admin';
          req.session.company = user.company;
          var subscriptionType = 'mini';
          if (req.session.payerID) {
            subscriptionType = req.session.plan.type;
          }
          provider.subscriptions.add({
            'payerID' : payerID,
            'profileID': profileID,
            'timestamp': new Date(),
            'created': new Date(),
            'type': subscriptionType,
            'company': user.company
          }, function(err, result) {
            if (err) {
              res.render('signup');
            }
            res.redirect('/operator');
          });
        }
      });
    } else {
      var errors = {
        'company' : {
          'param': 'company',
          'msg': 'This company already exists. Please, use another company name.',
          'value' : req.body.company
        }
      };
      res.render('signup', {'errors': errors, 'values': req.body} );
    }
  });
};

/**
 * send recovery email
 */
module.exports.postRecovery =  function(req, res) {
  var email = req.body.email;
  var now = new Date();
  var token = Math.floor(Math.random() * 10) + parseInt(now.getTime()).toString(36);
  provider.users.update({'email': email}, {'token': token}, function(doc) {
    if(Object.getOwnPropertyNames(doc).length > 0) {
      var url = req.protocol + '://' + req.get('Host') + '/recovery/' + token;
      var smtpTransport = nodemailer.createTransport({
        'service': 'Mandrill',
        'auth': {
          'user': settings.Mandrill.username,
          'pass': settings.Mandrill.password
        }
      });
      var mailOptions = {
        from: settings.systemEmail,
        to: email,
        subject: 'Password Recovery',
        text: 'Please follow this link to reset your password:' + " \r\n \r\n" + url,
        html: "<p>" + "Please follow this link to reset your password" + "</p><p><a href=\"" 
        + url + "\">" + url + "</a></p>"
      };

      smtpTransport.sendMail(mailOptions, function(error, response) {
        if(error) {
        	console.log(error)
        }
      });
      res.render('recovery', {
        'message': 'We sent you an email to help you reset your password.'
      });
    } else {
      res.render('recovery', {
        'message': 'This email address does not belong to any user.'
      });
    }
  });
};

/**
 * login with token
 */
module.exports.getRecoveryLogin = function(req, res) {
  var token = req.params.token;
  provider.users.findByToken(req.params.token, function(doc) {
    if(doc) {
      req.session.id = doc._id;
      req.session.type = doc.type;
      provider.users.update({'_id': doc._id}, {'token':null}, function(doc) {
        redirectUser(res, req.session.type);
      });
    } else {
      res.render('recovery', {'message': 'The token has already expired'});
    }
  });
};

/**
 * destroy session and redirect to homepage
 */
module.exports.getLogout =  function(req, res) {
  req.session = null;
  res.redirect('/');
};

/**
 * subscribe a user
 */
module.exports.subscribe = function(req, res) {
  var type = req.param('type');
  var plan = null;
  plan = settings.plans[type];
  if (!plan) {
    res.redirect(302, paypalCancelURL);
  }

  req.session.plan = plan;

  paypal.authenticate({
    RETURNURL: settings.paypalReturnURL,
    CANCELURL: settings.paypalCancelURL,
    PAYMENTREQUEST_0_AMT: plan.amount,
    L_BILLINGAGREEMENTDESCRIPTION0: plan.description,
    PAYMENTREQUEST_0_NOTIFYURL: settings.paypalIPNUrl,
    PAGESTYLE : 'Taskground'
  }, function(err, data, url) {
    if (!err) { res.redirect(302, url); }
    else { 
      console.log('Error paypal.authenticate:');
      console.log(err);
    }
  });
};

/**
 * subscribe user success
 */
module.exports.subscribeSuccess = function(req, res) {
  var token = req.query.token;
  var payerID = req.query.PayerID;
  var plan = req.session.plan;
  if (!plan) {
    res.redirect(302, paypalCancelURL);
  }
  paypal.createSubscription(token, payerID, {
    AMT: plan.amount,
    DESC: plan.description,
    BILLINGPERIOD: "Month",
    BILLINGFREQUENCY: 1,
  }, function(err, data) {
    if (!err) {
      req.session.payerID = payerID;
      req.session.profileID = data.PROFILEID;
      res.redirect(302, '/signup');
    } else {
      console.log('Error paypal.createSubscription:');
      console.log(err);
    }
  });
};

/**
 * ipn notification
 */
module.exports.ipnNotification = function(req, res) {
  var payerID = req.body.payer_id;
  var profileID = req.body.recurring_payment_id;

  if(!payerID || !profileID) {
    return;
  }

  provider.subscriptions.update({
    'payerID' : payerID,
    'profileID': profileID
  }, { 'timestamp': new Date() }, function (doc) {
    console.log('Subscription updated:');
    console.log(doc);
  });
}