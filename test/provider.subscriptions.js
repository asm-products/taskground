var provider = require('../lib/mongo_provider')
  , ObjectID = require('mongodb').ObjectID
  , should = require('should');

describe('Subscriptions Provider', function() {

	// ----------------------------------------------------------------------
  // set up connection and clear the collections before testing
	// ----------------------------------------------------------------------
  before(function(done) {
    provider.connect('mongodb://localhost:27017/test', function(err, db) {
      db.collection('subscriptions').remove(function(err, doc) { 
				done();
			});
    });
  });
	
	// ----------------------------------------------------------------------
	// test add a new subscription
	// ----------------------------------------------------------------------
	it('should add a subscription and return the object with an id', function(done) {
		provider.subscriptions.add({
	    'payerID': null,
	    'profileID': null,
	    'timestamp': new Date(),
	    'type': 'mini',
			'company': 'Test Company'
		}, function(doc) {
			doc.should.have.property('_id');
			doc.should.have.property('company_normalized', 'test company');
			done();
		});
	});

	// ----------------------------------------------------------------------
	// test find a company by name
	// ----------------------------------------------------------------------
	it('should return a subscription by company name', function(done) {
		provider.subscriptions.findByCompany('Test Company', function(subscription) {
			subscription.should.have.property('company', 'Test Company');
			done();
		});
	});

	// ----------------------------------------------------------------------
	// test find a company by name that doesn't exist
	// ----------------------------------------------------------------------
	it('should return null', function(done) {
		provider.subscriptions.findByCompany('Non-Existing Company', function(subscription) {
			should(subscription).be.null;
			done();
		});
	});

	// ----------------------------------------------------------------------
	// test update an existing subscription
	// ----------------------------------------------------------------------
	it('should update an existing subscription', function(done) {
		provider.subscriptions.findByCompany('Test Company', function(subscription) {
			provider.subscriptions.update({'_id': subscription._id}, {'type': 'regular'}, function(doc) {
				doc.should.have.property('type', 'mini');
				provider.subscriptions.findByCompany('Test Company', function(doc) {
					doc.should.have.property('type', 'regular');
					done();
				});
			});
		});
	});

	// ----------------------------------------------------------------------
	// test update an unexisting subscription
	// ----------------------------------------------------------------------
	it('should update an unexisting subscription', function(done) {
		provider.subscriptions.update({'_id': '1234567890'}, {'timestamp': new Date()}, function(doc) {
			should(doc).be.empty;
				done();
		});
	});

});