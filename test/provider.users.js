var provider = require('../lib/mongo_provider')
  , should = require('should');

describe('Users Provider', function(){

  var userId;
	var token = 'token123';
	var existingEmail = 'exists@example.com';

	// ----------------------------------------------------------------------
	// set up connection and remove all users before running the tests
	// ----------------------------------------------------------------------
  before(function(done) {
    provider.connect('mongodb://localhost:27017/test', function(err, db) {
      db.collection('users').remove(function(err, doc) {
				db.collection('users').insert({
	        'email': existingEmail,
	        'password': '123',
	        'name': 'Jane Doe',
	        'company': 'Existing Company',
	        'type' : 'admin',
					'token': token
      	}, function(err, doc) {
      		done();
      	});
      });
    });
  });

	// ----------------------------------------------------------------------
	// it should add a new user and return it with the _id property added
	// by mongo
	// ----------------------------------------------------------------------
  describe('users.add()', function() {
    it('should return the new user with an _id field', function(done){
      provider.users.add({
        'email': 'user@example.com',
        'password': '123',
        'name': 'John Doe',
        'company': 'Test Company',
        'type' : 'admin'
      }, function(user) {
        user.should.have.property('_id');
        user.should.not.have.property('errors');
        user.password.should.not.equal('123');
        userId = user._id;
	      done();
			});
    });
  });

	// ----------------------------------------------------------------------
	// test users.add() method with wrong data
	// ----------------------------------------------------------------------
  describe('users.add() with wrong data', function() {
     it('should return errors', function(done) {
       provider.users.add({
         'email': 'wrong email',
         'password': '',
         'name': '',
         'company': '',
         'type': ''
       }, function(result) {
         result.should.have.property('errors');
         result.errors.should.have.property('email');
         result.errors.should.have.property('password');
         result.errors.should.have.property('name');
         result.errors.should.have.property('company');
         result.errors.should.have.property('type');
         done();
       })
     });
  });

	// ----------------------------------------------------------------------
	// test users.add() method with wrong data
	// ----------------------------------------------------------------------
	describe('add user with an existing email', function() {
		it('should return null', function(done) {
      provider.users.add({
        'email': existingEmail,
        'password': '1234',
        'name': 'Foo',
        'company': 'Bar',
        'type': 'admin'
      }, function(result) {
        result.should.have.property('errors');
				result.errors.should.have.property('email');
				done();
			});
		});
	});
		
	// ----------------------------------------------------------------------
	// test user authentication it should authenticate a user
	// ----------------------------------------------------------------------
	describe('users.auth() authentication', function() {
    it('should authenticate a user', function(done) {
      provider.users.auth({
        'email': 'user@example.com',
        'password': '123'
      }, function(user) {
        user.should.have.property('_id');
        user.should.have.property('email', 'user@example.com');
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test user authentication it shouldn't authenticate a user with the
	// wrong password
	// ----------------------------------------------------------------------
  describe('users.auth() not autenticattion', function() {
    it('should not authenticate a user with the wrong password', function(done) {
      provider.users.auth({
        'email': 'user@example.com',
        'password': '321'
      }, function(user) {
        user.should.be.false;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test find user by id it should return a user based on the id
	// ----------------------------------------------------------------------
  describe('users.findById()', function() {
    it('should return a userbased on the id', function(done) {
      provider.users.findById(userId.toString(), function(user) {
        should(user._id.toString()).be.equal(userId.toString());
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test fund by user id with wrong id it shouldn't return any user
	// ----------------------------------------------------------------------
  describe('users.findById() with wrong id', function() {
    it('should not return any user', function(done) {
      provider.users.findById('012345678901234567891234', function(user) {
        should(user).be.equal(null);
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test findByEmail method should return a user based on the email
	// ----------------------------------------------------------------------
  describe('users.findByEmail()', function() {
    it('should return a user', function(done) {
      provider.users.findByEmail('user@example.com', function(user) {
        user.should.have.property('_id');
        user.should.have.property('email', 'user@example.com');
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test findByEmail method should return a user based on the email
	// ----------------------------------------------------------------------
  describe('users.findByEmail() with wrong email', function() {
    it('should not return a user', function(done) {
      provider.users.findByEmail('wrong@email.com', function(user) {
        should(user).equal(null);
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test find by company should return an array of users in the company
	// ----------------------------------------------------------------------
  describe('users.findByCompany()', function() {
    it('should return an array of users', function(done) {
      provider.users.findByCompany('Test Company', false, function(users) {
        users.should.have.length(1);
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test find by company with wrong company name should return an empty
	// array
	// ----------------------------------------------------------------------
  describe('users.findByCompany()', function() {
    it('should return an empty array', function(done) {
      provider.users.findByCompany('Wrong Compnay Name', false, function(users) {
        users.should.be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test findByConditions should return a user based on the conditions
	// ----------------------------------------------------------------------
  describe('users.findByConditions()', function() {
    it('should return a user', function(done) {
      provider.users.findByConditions({
        'name': 'John Doe',
        'type': 'admin'
      }, function(user) {
        user.should.have.property('_id');
        user.should.have.property('name', 'John Doe');
        user.should.have.property('type', 'admin');
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// should not find a use by conditions
	// ----------------------------------------------------------------------
  describe('users.findByConditions() wrong conditions', function() {
    it('should not return a user', function(done) {
      provider.users.findByConditions({
        'name': 'John Doe',
        'type': 'mobile'
      }, function(user) {
        should(user).equal(null);
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test find user by token should return doc with the specified token
	// ----------------------------------------------------------------------
	describe('find user by token', function() {

		it('should return user', function(done) {
			provider.users.findByToken(token, function(doc) {
				should(doc).have.property('token', token);
				done();
			});
		});

		it('should return null', function(done) {
			provider.users.findByToken('', function(doc) {
				should(doc).equal(null);
				done();
			});
		});
			
	});

	// ----------------------------------------------------------------------
	// test update user it should return the original doc
	// ----------------------------------------------------------------------
  describe('users.update()', function() {
    it('should return 1', function(done) {
      provider.users.update({'_id': userId}, {'type': 'mobile'}, function(result) {
        result.should.have.property('type', 'admin');
        provider.users.findById(userId.toString(), function(user) {
          user.should.have.property('type', 'mobile');
          done();
        });
      });
    });
  });

	// ----------------------------------------------------------------------
	// update with wrong data should return errors
	// ----------------------------------------------------------------------
  describe('users.update() with errors', function() {
    it('should return errors', function(done) {
      provider.users.update({'_id': userId}, {
        'name': '',
        'email': 'wrong email',
        'type': '',
        'company': ''
      }, function(result) {
        result.should.have.property('errors');
        result.errors.should.have.property('name');
        result.errors.should.have.property('email');
        result.errors.should.have.property('type');
        result.errors.should.have.property('company');
        done();
      })
    });
  });

	// ----------------------------------------------------------------------
	// update non existing user it should return null
	// ----------------------------------------------------------------------
  describe('users.update() non existing user', function() {
    it('should return 0', function(done) {
      provider.users.update({'_id': '012345678901234567891234'}, {'type': 'mobile'}, function(result) {
        should(result).be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// update with an existing email it should return null
	// ----------------------------------------------------------------------
	describe('update with an existing email', function() {
		it('should return null', function(done) {
      provider.users.update({'_id': userId}, {'email': existingEmail}, function(result) {
        result.should.have.property('errors');
				result.errors.should.have.property('email');
				done();
			});
		});
	});

	// ----------------------------------------------------------------------
	// test delete user it should return null
	// ----------------------------------------------------------------------
  describe('users.delete()', function() {
    it('should return 1', function(done) {
      provider.users.delete({'id': userId.toString(), 'company': 'Test Company'}, function() {
        provider.users.findById(userId.toString(), function(user) {
          should(user).be.equal(null);
          done();
        });
      });
    });
  });

});