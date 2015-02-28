const SECRET = 'TASKGROUND_SECRET';

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , fs = require('fs')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , cookieSession = require('cookie-session')
  , io = require('socket.io').listen(server,{ log: false })
  , swig = require('swig')
  , compression = require('compression')
  , provider = require('./lib/mongo_provider')
  , websockets = require('./lib/websockets')
  , Cookies = require('cookie-session/node_modules/cookies')
  , routes = require('./lib/routes').create({provider: provider});

// if development.lock doesn't exist enable production mode
if (!fs.existsSync('./development.lock')) {
  app.settings.env = 'production';
}

// global view variables
app.set('appName', 'Taskground');
app.set('appMode', app.settings.env);

/**
 * app configuration
 */
app.set('port', process.env.PORT || 3100);

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
swig.setDefaults({ cache: false });

app.use(compression());
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
app.use(cookieParser());
app.use(cookieSession({ 'key': 'express.sid', 'secret' : SECRET }));

/**
 * connect data provider
 */
provider.connect('mongodb://localhost:27017/taskground', function(err, db) {

  if (err) throw err;

  /******************
   ***** routes *****
   ******************/

  app.get('/', routes.noAuthMiddleware, routes.getHome);
  app.get('/pricing', routes.noAuthMiddleware, routes.getPricing);
  app.get('/support', routes.noAuthMiddleware, routes.getSupport);
  app.route('/login').all(routes.noAuthMiddleware)
    .get(routes.getLogin)
    .post(routes.postLogin);
  app.route('/signup').all(routes.noAuthMiddleware)
    .get(routes.getSignup)
    .post(routes.postSignup);
  app.route('/recovery').all(routes.noAuthMiddleware)
    .get(routes.getRecovery)
    .post(routes.postRecovery);
  app.get('/recovery/:token', routes.noAuthMiddleware, routes.getRecoveryLogin);
  app.get('/logout', routes.getLogout);

  // HTML client
  app.get('/operator', routes.operatorOnly, routes.getOperator);
  app.get('/mobile', routes.mobileOnly, routes.getMobile);

  // paypal subscription
  app.get('/subscribe/:type', routes.noAuthMiddleware, routes.subscribe);
  app.get('/success', routes.noAuthMiddleware, routes.subscribeSuccess);
  app.get('/paypal/ipn', routes.ipnNotification);

  // 404 page not found handler
  app.use(function(req, res, next) {
    res.status(404);
    res.render('404');
  });

  /**********************
   ***** websockets *****
   **********************/

  /**
   * check session cookie to authorize the socket and accept the connection
   */
  io.use(function(socket, next){
    var cookies = new Cookies(socket.request, null, [SECRET]);
    var session = cookies.get('express.sid', { 'key': 'express.sid', 'secret' : SECRET });
    if (session) {
      var session = new Buffer(session, 'base64');
      socket.cookie = JSON.parse(session.toString());
      next();
    } else {
      next(new Error('Authentication error'));
    }
  });

  /**
   * socket connection
   */
  io.sockets.on('connection', function (socket) {
    websockets.connection({
      'socket': socket,
      'io': io,
      'provider': provider
    });
  });

  /**
   * start server
   */
  server.listen(app.get('port'));
  console.log('Server listening on port ' + app.get('port'));

});
