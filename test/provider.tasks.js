var provider = require('../lib/mongo_provider')
  , ObjectID = require('mongodb').ObjectID
  , should = require('should');

describe('Tasks Provider', function() {

  var userId, taskId;

	// ----------------------------------------------------------------------
  // set up connection and clear the collections before testing
	// ----------------------------------------------------------------------
  before(function(done) {
    provider.connect('mongodb://localhost:27017/test', function(err, db) {
      db.collection('users').remove(function(err, doc) {
        db.collection('tasks').remove(function(err, doc) {
          provider.users.add({
            'email': 'user@example.com',
            'password': '123',
            'name': 'John Doe',
            'company': 'Test Company',
            'type' : 'admin'
          }, function(user) {
            user.should.have.property('_id');
            userId = user._id;
            done();
          });
        });
      });
    });
  });

	// ----------------------------------------------------------------------
  // test add task should return a task with an _id property set by mongo
	// ----------------------------------------------------------------------
  describe('provider.tasks.add()', function() {
    it('should add task and return them with the _id proeprty', function(done) {
      provider.tasks.add({
        'address': 'Sample Address',
        'date': new Date(),
        'location': {
          'lat': '41.00',
          'lng': '10.99',
        },
        'description': 'Sample description',
        'user': userId.toString()
      }, function(result) {
        result[0].should.have.property('_id');
        taskId = result[0]._id;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // add task with errors
	// ----------------------------------------------------------------------
  describe('provider.tasks.add() with errors', function() {
    it('should return errors', function(done) {
      provider.tasks.add({
        'address': '',
        'location': '',
        'description': '',
        'user': '',
      }, function(result) {
        result.should.have.property('errors');
        result.errors.should.have.property('address');
        result.errors.should.have.property('location');
        result.errors.should.have.property('description');
        result.errors.should.have.property('user');
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // test find by user id
	// ----------------------------------------------------------------------
  describe('provider.tasks.findById()', function() {
    it('should return an array of tasks by user id', function(done) {
      provider.tasks.findById(userId.toString(), function(result) {
        should(result[0]._id.toString()).equal(taskId.toString());
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // test find by user id using a wrong user id it should return an
	// empty array
	// ----------------------------------------------------------------------
  describe('provider.tasks.findById()', function() {
    it('should return an array of tasks by user id', function(done) {
      provider.tasks.findById('012345678901234567891234', function(result) {
        should(result).be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // test find by user ids array using wrong ids
	// ----------------------------------------------------------------------
  describe('provider.tasks.findByIds()', function() {
    it('should return an empty array', function(done) {
      provider.tasks.findByIds(['012345678901567891234', '098765432109876543210987'], function(result) {
        result.should.be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // test find by user ids array
	// ----------------------------------------------------------------------
  describe('provider.tasks.findByIds()', function() {
    it('should return an array of tasks by the users ids', function(done) {
      provider.tasks.findByIds([userId.toString()], function(result) {
        should(result[0]._id.toString()).equal(taskId.toString());
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // find by conditions
	// ----------------------------------------------------------------------
  describe('provider.tasks.findByConditions()', function() {
    it('should return an array of tasks', function(done) {
      provider.tasks.findByConditions({'address': 'Sample Address'}, function(result) {
        result.should.not.be.empty;
        should(result[0]).have.property('address', 'Sample Address');
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
   // find by conditions with wrong conditions
   	// ----------------------------------------------------------------------
  describe('provider.tasks.findByConditions()', function() {
    it('should return an array of tasks', function(done) {
      provider.tasks.findByConditions({'address': 'Some Address'}, function(result) {
        result.should.be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
  // test update task
	// ----------------------------------------------------------------------
  describe('provider.tasks.update()', function() {
    it('should return 1 and the task should have been updated', function(done) {
      provider.tasks.update({'_id': taskId}, {'address': 'UPDATED'}, function(result) {
        should(result).be.equal(1);
        provider.tasks.findById(userId.toString(), function(result) {
          should(result[0].address).be.equal('UPDATED');
          done();
        });
      });
    });
  });

	// ----------------------------------------------------------------------
  // test update with errors should return errors
	// ----------------------------------------------------------------------
  describe('provider.tasks.update() with errors', function() {
     it('should return errors', function(done) {
       provider.tasks.update({'_id': taskId}, {
         'address': '',
         'location': {
           'lat': '',
           'lng': '',
         },
         'description': '',
         'user': ''
       }, function(result) {
         result.should.have.property('errors');
         result.errors.should.have.property('address');
         result.errors.should.have.property('location');
         result.errors.should.have.property('description');
         result.errors.should.have.property('user');
         done();
       });
     });
   });

	// ----------------------------------------------------------------------
	// test update task with a wrong task it should return 0
	// ----------------------------------------------------------------------
  describe('provider.tasks.update() with wrong task', function() {
    it('should return 1 and the task should have been updated', function(done) {
      provider.tasks.update({'_id': '012345678901234567891234'}, {'address': 'UPDATED'}, function(result) {
        should(result).be.empty;
        done();
      });
    });
  });

	// ----------------------------------------------------------------------
	// test set pending task
	// ----------------------------------------------------------------------
  describe('provider.tasks.addPending()', function() {
    it('should return 1 and the task should have been updated', function(done) {
      var msg = 'pending message';
      var user = 'John Doe';
      provider.tasks.addPending({'_id': taskId}, {
        'date': new Date,
        'message': msg,
        'user': user}, function(result) {
	        provider.tasks.findById(userId.toString(), function(result) {
	          result[0].pending[0].message.should.be.equal(msg);
	          result[0].pending[0].user.should.be.equal(user);
	          result[0].status.should.be.equal('pending');
	          done();
	        });
      });
    });
  });

	// ----------------------------------------------------------------------
	// test set pending task on an unexisting task
	// ----------------------------------------------------------------------
  describe('provider.tasks.addPending() on an unexisting task', function() {
    it('it should return empty', function(done) {
      var msg = 'pending message';
      var user = 'John Doe';
      provider.tasks.addPending({'_id': 'non-existing-id'}, {
        'date': new Date,
        'message': msg,
        'user': user }, function(result) {
					should(result).be.equal(0);
        	provider.tasks.findById(userId.toString(), function(result) {
						should(result[0].pending.length).be.equal(1);
						done();
        	});
				});
    });
  });

	// ----------------------------------------------------------------------
	// test delete task
	// ----------------------------------------------------------------------
  describe('provider.tasks.delete()', function() {
    it('should delete a task and return 1', function(done) {
      provider.tasks.delete({'_id': taskId}, function(result) {
        should(result).be.equal(1);
        done();
      });
    });
  });

});