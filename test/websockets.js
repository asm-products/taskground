var provider = require('../lib/mongo_provider')
  , should = require('should')
  , express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server,{ log: false })
  , websockets = require('../lib/websockets');
  var io_client = require('socket.io-client');

  var socketURL = 'http://localhost:8888';

  var options ={
    transports: ['websocket'],
    'force new connection': true
  };

  server.listen('8888');
  var id = null;
  var client_id1 = null;
  var client_id2 = null;
  var client_id3 = null;
  var client_id4 = null;
  var task_id = null;

describe('Websockets', function(){

  var userId;

  /**
   * set up connection and remove all users before running the tests
   * create two new users and connect the wwebsockets server
   */
  before(function(done) {
    provider.connect('mongodb://localhost:27017/test', function(err, db) {
			db.collection('subscriptions').remove(function(err, doc) {
				provider.subscriptions.add({
	    'payerID': null,
	    'profileID': null,
	    'timestamp': new Date(),
	    'type': 'mini',
			'company': 'Test Company'
		}, function(doc) {
			
			
      db.collection('users').remove(function(err, doc) {
        provider.users.add({
          'email': 'user@example.com',
          'password': '123',
          'name': 'John Doe',
          'company': 'Test Company',
          'type' : 'admin'
        }, function(user) {
          client_id1 = user._id.toString();
          id = client_id1;
          provider.users.add({
            'email': 'mobile@example.com',
            'password': '123',
            'name': 'Mobile Doe',
            'company': 'Test Company',
            'type' : 'mobile'
          }, function(user) {
            client_id2 = user._id.toString();
            provider.users.add({
              'email': 'admin@example.com',
              'password': '123',
              'name': 'Admin Doe',
              'company': 'Test Company',
              'type' : 'admin'
            }, function(user) {
              client_id3 = user._id.toString();

              provider.users.add({
                'email': 'mobile2@example.com',
                'password': '123',
                'name': 'Mobile2 Doe',
                'company': 'Test Company',
                'type' : 'mobile'
              }, function(user) {
                client_id4 = user._id.toString();

						  io.use(function(socket, next){
						      socket.cookie = {};
									socket.cookie.id = id;
						      next();
						  });

              io.sockets.on('connection', function (socket) {
                websockets.connection({
                  'socket': socket,
                  'io': io,
                  'provider': provider
                });
              });
              done();
            });
            });
          });
        });
      });
			});	
		});
			
			
			

    });
  });

  /**
   * test client connect
   */
  it('Should init markers for admin user',function(done){
      var client = io_client.connect(socketURL, options);
      client.on('init markers', function(data) {
        data.should.have.property('tasks');
        data.should.have.property('users');
        data.should.have.property('settings');
        data.tasks.should.be.empty;
        data.users.should.have.lengthOf(3);
        data.settings.id.should.equal(id);
        done();
      })
  });

  /**
   * admin adds a new task and mobile users should be notified
   */
  it('Should broadcast new task', function(done) {
    var checkpoint = 0;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);

      client2.on('init markers', function(data) {

        client2.on('add task', function(data) {
          data.user.should.equal(client_id2);
					data.should.have.property('added_by', client_id1);
          task_id = data._id;
          checkpoint++;
          if(checkpoint == 2) {
            done();
          }
        });

        id = client_id3;
        var client3 = io_client.connect(socketURL, options);
        client3.on('init markers', function(data) {

          client3.on('add task', function(data) {
            data.user.should.equal(client_id2);
						data.should.have.property('added_by', client_id1);
            task_id = data._id;
            checkpoint++;
            if(checkpoint == 2) {
              done();
            }
          });

          client.emit('add task', {
            'address': 'Sample Address',
            'date': new Date(),
            'location': {
              'lat': '41.00',
              'lng': '10.99',
            },
            'description': 'Sample description',
            'user': client_id2
          });

        });
      });
    });
  });

  /**
   * mobile user marks task as done
   */
  it('Should mark task as done', function(done) {
    id = client_id1;
    var checkpoint = 0;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      client.on('task done', function(data) {
        data.should.have.property('id', task_id);
        checkpoint++;
        if(checkpoint == 2) {
          done();
        }
      });

      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {

        id = client_id3;
        var client3 = io_client.connect(socketURL, options);
        client3.on('init markers', function(data) {
          client3.on('task done', function(data) {
            data.should.have.property('id', task_id);
            checkpoint++;
            if(checkpoint == 2) {
              done();
            }
          });
          client2.emit('task done', { 'id': task_id});
        });
      });
    });
  });

  /**
   * mobile user marks task as todo
   */
  it('Should mark task as todo', function(done) {
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      client.on('task todo', function(data) {
        data.should.have.property('id', task_id);
        done();
      });

      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {
        client2.emit('task todo', { 'id': task_id});
      });
    });
  });

  /**
   * admin edits task
   */
  it('Should edit a task', function(done) {
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      /*
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      */
      client.on('edit task', function(data) {
        data.should.have.property('_id', task_id);
        data.should.have.property('address', 'EDITED');
				data.should.have.property('added_by', client_id1);
        client.disconnect();
        done();
      });
      var today = new Date();

      client.emit('edit task', {'id': task_id, 'user': client_id2, 'date': today, 'address': 'EDITED'});
    });
  });

  /**
   * admin changes date on task
   */
  it('mobile should delete an edited task', function(done) {
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {
        client2.on('delete task', function(data) {
          data.should.have.property('_id', task_id);
          client.disconnect();
          client2.disconnect();
          done();
        });
        var actualDate = new Date();
        var newDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate()+1);

        client.emit('edit task', {'id': task_id, 'user': client_id2, 'date': newDate, 'address': 'EDITED' });
      });
    });
  });

  /**
   * admin assigns task to a different user
   */
  it('task is assigned to a different user', function(done) {
    var checkpoint = 0;
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {
        client2.on('delete task', function(data) {
          data.should.have.property('_id', task_id);
          checkpoint++;
          if(checkpoint == 2) {
            client.disconnect();
            client2.disconnect();
            done();
          }
        });

        id = client_id4;
        var client4 = io_client.connect(socketURL, options);
        client4.on('init markers', function(data) {
          client4.on('add task', function(data) {
            data.should.have.property('_id', task_id);
            checkpoint++;
            if(checkpoint == 2) {
              client.disconnect();
              client2.disconnect();
              done();
            }
          });

          client.emit('edit task', {'id': task_id, 'user': client_id4, 'date': new Date(), 'address': 'EDITED' });
        });

      });
    });
  });

  /**
   * admin deletes task
   */
  it('Should delete a task', function(done) {
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {
        client2.on('delete task', function(data) {
          data.should.have.property('_id', task_id);
          done();
        });
        client.emit('delete task', {'_id': task_id, 'user': client_id2});
      });
    });
  });

  /**
   * admin edits user
   */
  it('Should edit a user', function(done) {
    id = client_id1;
    var client = io_client.connect(socketURL, options);
    client.on('init markers', function(data) {
      id = client_id2;
      var client2 = io_client.connect(socketURL, options);
      client2.on('init markers', function(data) {
        client2.on('settings', function(data) {
          data.should.have.property('name', 'EDITED');
					data.should.have.property('added_by', client_id1);
          done();
        });
        client.emit('edit user', {'id': client_id2, 'name': 'EDITED', 'type': 'mobile'});
      });
      });
    });

    /**
     * mobile edits settings
     */
    it('Should edit settings', function(done) {
      id = client_id1;
      var client = io_client.connect(socketURL, options);
      client.on('init markers', function(data) {

        var checkpoint = 0;

        client.on('edit user', function(data) {
          data.should.have.property('name', 'EDITED2');
          checkpoint++;
          if(checkpoint == 2) {
            done();
          }
        });

        id = client_id2;
        var client2 = io_client.connect(socketURL, options);
        client2.on('init markers', function(data) {
          client2.emit('settings', {'email': 'edited@example.com', 'name': 'EDITED2'});
        });

        client2.on('settings', function(data) {
          data.should.have.property('name', 'EDITED2');
          checkpoint++;
          if(checkpoint == 2) {
            done();
          }
        });

      });
    });

});

