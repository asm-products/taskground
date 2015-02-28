var routes = require('../lib/routes')
  , should = require('should')
	, settings = require('../settings')
	, provider = require('../lib/mongo_provider')
	, request = { }
	, response = {
	    viewName: ''
	    , data : { }
			, redirectUrl: ''
	    , render: function(view, viewData) {
	        this.viewName = view;
	        this.data = viewData;
	    }
			, redirect: function(url) {
				this.redirectUrl = url;
			}
	};

describe('Routes test', function(){

	// ----------------------------------------------------------------------
	// set up connection and remove all users before running the tests
	// ----------------------------------------------------------------------
  before(function(done) {
    provider.connect('mongodb://localhost:27017/test', function(err, db) {
			routes.create({'provider': provider});
      db.collection('users').remove(function(err, doc) {
				db.collection('users').insert({
	        'email': 'user@example.com',
	        'password': '$2a$10$LaIlT9UPtf/MBY6UoBX8EO.D/CJI4HE5UuAeqTWCL4pHhAwWjx9dW',
	        'name': 'Jane Doe',
	        'company': 'Existing Company',
	        'type' : 'admin',
					'token': 'token123'
      	}, function(err, doc) {
      		done();
      	});
      });
    });
  });

	describe('Routes middleware test', function() {

		// ----------------------------------------------------------------------
		// test authMiddleware with not authenticated user
		// ----------------------------------------------------------------------
		it("should redirect user to homepage", function(done) {
			request.session = {};
			routes.authMiddleware(request, response, function() {});
			response.redirectUrl.should.equal('/');
			delete request.session;
			done();
		});

		// ----------------------------------------------------------------------
		// test authMiddleware with authenticated user
		// ----------------------------------------------------------------------
		it("should redirect user to homepage", function(done) {
			request.session = {"id": "user-id"};
			routes.authMiddleware(request, response, function() {
				delete request.session;
				done();
			});
		});

		// ----------------------------------------------------------------------
		// test noAuthMiddleware with authenticated user
		// ----------------------------------------------------------------------
		it("should redirect authenticated user to client page", function(done) {
			request.session = {
				"id": "user-id",
				"type": "mobile"
			};
			routes.noAuthMiddleware(request, response, function() {});
			response.redirectUrl.should.equal('/mobile');
			delete request.session;
			done();
		});

		// ----------------------------------------------------------------------
		// test noAuthMiddleware with an unauthenticated user
		// ----------------------------------------------------------------------
		it("should not redirect the user to client page", function(done) {
			request.session = { };
			routes.noAuthMiddleware(request, response, function() {
				delete request.session;
				done();
			});
		});
	
		// ----------------------------------------------------------------------
		// test operatorOnly with an operator user
		// ----------------------------------------------------------------------
		it("should not redirect the user if it is operator or admin", function(done) {
			request.session = { 
				'id': 'some-id',
				'type': 'operator'
			};
			routes.operatorOnly(request, response, function() {
				delete request.session;
				done();
			});
		});

		// ----------------------------------------------------------------------
		// test operatorOnly with an mobile user
		// ----------------------------------------------------------------------
		it("should redirect the user to the mobile page", function(done) {
			request.session = { 
				'id': 'some-id',
				'type': 'mobile'
			};
			routes.operatorOnly(request, response, function() { });
			response.redirectUrl.should.equal('/mobile');
			delete request.session;
			done();
		});

		// ----------------------------------------------------------------------
		// test mobileOnly with a mobile user
		// ----------------------------------------------------------------------
		it("should not redirect the user if it is mobile", function(done) {
			request.session = { 
				'id': 'some-id',
				'type': 'mobile'
			};
			routes.mobileOnly(request, response, function() {
				delete request.session;
				done();
			});
		});

		// ----------------------------------------------------------------------
		// test mobileOnly with an mobile user
		// ----------------------------------------------------------------------
		it("should redirect the user to the operator page", function(done) {
			request.session = { 
				'id': 'some-id',
				'type': 'operator'
			};
			routes.mobileOnly(request, response, function() { });
			response.redirectUrl.should.equal('/operator');
			delete request.session;
			done();
		});

	});

	// ----------------------------------------------------------------------
	// test render the home page
	// ----------------------------------------------------------------------
  it("should render the home view", function(done) {
    routes.getHome(request, response);
    response.viewName.should.equal("home");
		done();
  });

	// ----------------------------------------------------------------------
	// test render the pricing page with the plans data
	// ----------------------------------------------------------------------
	it("should render the pricing view with the plans data", function(done) {
		routes.getPricing(request, response);
		response.viewName.should.equal("pricing");
		should(response.data).be.an.object;
		response.data.should.matchEach(settings.plans);
		done();
	});

	// ----------------------------------------------------------------------
	// test render the home page
	// ----------------------------------------------------------------------
  it("should render the support view", function(done) {
    routes.getSupport(request, response);
    response.viewName.should.equal("support");
		done();
  });

	// ----------------------------------------------------------------------
	// test render the login page
	// ----------------------------------------------------------------------
  it("should render the login view", function(done) {
    routes.getLogin(request, response);
    response.viewName.should.equal("login");
		done();
  });

	// ----------------------------------------------------------------------
	// test redirect to homepage
	// ----------------------------------------------------------------------
  it("should logout the user", function(done) {
    routes.getLogout(request, response);
		response.redirectUrl.should.equal('/');
		should(request.session).be.null;
		delete request.session;
		done();
  });

	// ----------------------------------------------------------------------
	// test render the login page
	// ----------------------------------------------------------------------
  it("should render the signup view", function(done) {
		request.session = {
			payerID: null,
			plan: null
		};
    routes.getSignup(request, response);
    response.viewName.should.equal("signup");
		delete request.session;
		done();
  });

	// ----------------------------------------------------------------------
	// test render the recovery page
	// ----------------------------------------------------------------------
  it("should render the recovery view", function(done) {
    routes.getRecovery(request, response);
    response.viewName.should.equal("recovery");
		done();
  });

	// ----------------------------------------------------------------------
	// test render the operator page
	// ----------------------------------------------------------------------
  it("should render the operator view", function(done) {
    routes.getOperator(request, response);
    response.viewName.should.equal("operator");
		done();
  });

	// ----------------------------------------------------------------------
	// test login with existing user
	// ----------------------------------------------------------------------
  it("should login the user", function(done) {
		request.body = {
			'email': 'user@example.com',
			'password': '123'
		};
		request.session = { };
		var res = {
			redirect: function(url) {
				url.should.equal('/operator');
				request.session.type.should.equal('admin');
				done();
			}
		}
    routes.postLogin(request, res);
  });

	// ----------------------------------------------------------------------
	// test login with wrong user password
	// ----------------------------------------------------------------------
  it("should not login the user", function(done) {
		request.body = {
			'email': 'user@example.com',
			'password': 'wrong-password'
		};
		request.session = { };
		var res = {
			render: function(view, data) {
				view.should.equal('login');
				data.should.have.property('errors');
				done();
			}
		}
    routes.postLogin(request, res);
  });
	
	// ----------------------------------------------------------------------
	// test get recovery login with wrong token
	// ----------------------------------------------------------------------
  it("should render the recovery view with error message", function(done) {
		request.params = {
			token: '1234567890'
		};
		var res = {
			render: function(view, data) {
				view.should.equal('recovery');
				data.should.have.property('message');
				done();
			}
		}
    routes.getRecoveryLogin(request, res);
  });

	// ----------------------------------------------------------------------
	// test get recovery login with correct token
	// ----------------------------------------------------------------------
  it("should render the recovery view with error message", function(done) {
		request.params = {
			token: 'token123',
		};
		request.session = { };
		var res = {
			redirect: function(url) {
				url.should.be.equal('/operator');
				request.session.type.should.equal('admin');
				done();
			}
		}
    routes.getRecoveryLogin(request, res);
  });

});
