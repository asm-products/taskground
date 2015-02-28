// ----------------------------------------------------------------------
// APPLICATION SETTINGS FILE
// ----------------------------------------------------------------------	

var fs = require('fs');

/**
 * subscription plans
 */
var plans =  {
    'mini': {
      'type': 'mini',
      'amount': 0,
      'description': 'Taskground free account',
      'members': 3
    },
    'small': 	{
      'type': 'small',
      'amount': 59,
      'description': 'Taskground subscription for small teams',
      'members': 10
    },
    'regular': {
      'type': 'regular',
      'amount': 139,
      'description': 'Taskground subscription for regular teams',
      'members': 25
    }
  };

/**
 * Mandrill settings
 */

var mandrillSettings = {
  'username': '',
  'password': ''
}

/**
 * development settings
 */
var developmentSettings = {
  'systemEmail': 'noreply@taskground.com',
  'paypalUsername': 'username',
  'paypalPassword': 'password',
  'paypalSignature': 'signature',
  'paypalEnvironment': 'environment',
  'paypalReturnURL': 'http://192.168.1.10:3100/success',
  'paypalCancelURL': 'http://192.168.1.10:3100',
  'plans': plans,
  'Mandrill': mandrillSettings
};

/**
 * production settings
 */
var productionSettings = {
  'systemEmail': 'noreply@taskground.com',
  'paypalUsername': 'username',
  'paypalPassword': 'password',
  'paypalSignature': 'signature',
  'paypalEnvironment': 'production',
  'paypalReturnURL': 'http://taskground.com/success',
  'paypalCancelURL': 'http://taskground.com',
  'paypalIPNUrl': 'http://taskground.com/paypal/ipn',
  'plans': plans,
  'Mandrill': mandrillSettings
};

// export settings
// if development.lock file exists return the development settings
var settings = developmentSettings;
if (!fs.existsSync('./development.lock')) {
  settings = productionSettings;
}
module.exports = settings;
