var tgSettings = require('../../settings')
  , ObjectID = require('mongodb').ObjectID
  , userSockets = {};

/**
 * format today date
 */
function formatToday() {
  var date = new Date();
  return new Date((date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear());
}

/**
 * format tomorrow date
 */
function formatTomorrow() {
  var date = new Date();
  return new Date((date.getMonth() + 1) + '/' + (date.getDate() + 1) + '/' + date.getFullYear());
}

/**
 * socket connection
 */
module.exports.connection = function(config) {
  var io = config.io,
  provider = config.provider,
  socket = config.socket;

  socket.on('disconnect', function() {
    delete userSockets[socket.user._id];
  });

  /**
   * set the socket username and type with the cookie data
   * if type is admin send all markers data
   */
  provider.users.findById(socket.cookie.id, function(doc) {
    if(!doc) {
      socket.disconnect();
      return;
    }
		socket.user = doc;

    var settings = {
      'name': socket.user.name,
      'email': socket.user.email,
      'type': socket.user.type,
      'id': socket.user._id.toString()
    };

    if(socket.user.type == 'admin' || socket.user.type == 'operator') {
      provider.subscriptions.findByCompany(socket.user.company, function(subscription) {
        if(!subscription) {
          socket.disconnect();
          return;
        }

        socket.user.account_type = subscription.type;
        settings.location = doc.location;

        var userType = false;

        provider.users.findByCompany(socket.user.company, userType, function(companyUsers) {
          settings.account_limit = (companyUsers.length >= tgSettings.plans[subscription.type].members);
          var userIDs = [];
          var users = [];
          for(var i=0;i<companyUsers.length;i++) {
            if(socket.user.type == 'admin' || companyUsers[i].type == 'mobile') {
              userIDs.push(companyUsers[i]._id.toString());
              users.push(companyUsers[i]);
            }
          }

          var date = new Date();
          date.setDate(date.getDate()-5);

          provider.tasks.findByConditions({
            'user': {'$in': userIDs},
            $or: [
              {'date': {'$gte': date}},
              {'status': 'todo'},
              {'status': 'pending'}
            ]}, function(tasks) {
              for(var i=0;i<users.length;i++) {
                if(users[i]._id.toString() == socket.user._id.toString()) {
                  users.splice(i, 1);
                }
              }
              var response = {
                 'tasks': tasks,
                 'users': users,
                 'settings': settings
              }
              socket.join(socket.user.company);
              socket.emit('init markers', response);
            });
          });
      });
    } else if(socket.user.type == 'mobile') {
      provider.tasks.findByConditions({
        'user': socket.user._id.toString(), 
        'date': { $gte: formatToday(), $lt: formatTomorrow() }}, 
        function(tasks) {
          var response = {
            'tasks': tasks,
            'settings': settings
          };
          socket.emit('init markers', response);
          userSockets[socket.user._id] = socket;
        });
      }
  });

  /********************
   ***** SETTINGS *****
   ********************/

  ////////////////////////////
  // on settings
  ////////////////////////////
  socket.on('settings', function(data) {
    var settings = {
      'name': data.name,
      'email': data.email,
      'type': socket.user.type
     };

     if(data.password !== undefined && data.password !== '') {
       settings.password = data.password
     }

     if(settings.type == 'admin' || settings.type == 'operator') {
       settings.location = {
         'country': data.country,
         'city': data.city
       }
     }

     provider.users.update({'_id': socket.user._id}, settings, function(doc) {
       if(doc.errors) {
         socket.emit('settings', {'error': doc.errors});
       } else {
         settings._id = socket.user._id.toString();
         delete settings.password;
         socket.emit('settings', settings);
         io.sockets.in(socket.user.company).emit('edit user', settings);
       }
     });
  });

  /*****************
   ***** USERS *****
   *****************/

  ////////////////////////////
  // add a new user
  ////////////////////////////
  socket.on('add user', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;
    if(socket.user.type == 'operator') {
      data.type = 'mobile';
    }

    provider.users.findByCompany(socket.user.company, false, function(users) {
      account_limit = (users.length >= tgSettings.plans[socket.user.account_type].members);

      if (account_limit) {
        socket.emit('add user', {'error': 'account limit'});
      } else {
        provider.users.add({
         'email': data.email,
         'password': data.password,
         'name': data.name,
         'type': data.type,
         'company': socket.user.company,
         'location': socket.user.location,
         'account_type': socket.user.account_type
        }, function(user) {
          if(user.errors) {
            socket.emit('add user', {'error': user.errors});
          } else {
            io.sockets.in(socket.user.company).emit('add user', {
              'user': user,
              'added_by': socket.user._id.toString(),
              'account_limit': ((users.length + 1) >= tgSettings.plans[socket.user.account_type].members)
            });
          }
        });
      }
    });
    
  });

  ////////////////////////////
  // edit a user
  ////////////////////////////
  socket.on('edit user', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;
    if(socket.user.type == 'operator') {
      data.type = 'mobile';
    }
    var settings = {
      'email' : data.email,
      'name': data.name,
      'type': data.type,
    };

    if(data.type == 'admin' || data.type == 'operator') {
      settings.location = socket.user.location;
    } else {
      settings.location = null;
    }

    if(data.password !== undefined && data.password !== '') {
      settings.password = data.password;
    }

    var conditions = {'_id': ObjectID(data.id), 'company': socket.user.company };
    if(socket.user.type == 'operator') {
      conditions.type = 'mobile';
    }
    provider.users.update(conditions, settings, function(doc) {
      if(doc.errors) {
        socket.emit('edit user', {'error': doc.errors});
      } else {
        settings.added_by = socket.user._id.toString();
        settings._id = data.id;
        if(settings.type !== undefined && settings.type != doc.type) {
          provider.tasks.delete({'user': data.id}, function(doc) {
            io.sockets.in(socket.user.company).emit('edit user', settings);
            if(userSockets[data.id]) {
              delete settings._id;
              delete settings.password;
              io.sockets.connected[userSockets[data.id].id].emit('settings', settings);
            }
          });
        } else {
          io.sockets.in(socket.user.company).emit('edit user', settings);
          if(userSockets[data.id]) {
            delete settings._id;
            delete settings.password;
            io.sockets.connected[userSockets[data.id].id].emit('settings', settings);
          }
        }
      }
    });
  });

  ////////////////////////////
  // delete user and all his tasks
  ////////////////////////////
  socket.on('delete user', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;
    provider.users.delete({
      'id': data.id,
      'company': socket.user.company
    }, function(docs) {
      io.sockets.in(socket.user.company).emit('delete user', data);
      if(userSockets[data._id]) {
        io.sockets.connected[userSockets[data._id].id].disconnect();
      }
    });
  });

  /*****************
   ***** TASKS *****
   *****************/

  ////////////////////////////
  // broadcast add task event
  ////////////////////////////
  socket.on('add task', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;

    data.name = data.name || data.address;
    data.company = socket.user.company;
    data.date = new Date(data.date);
    data.status = 'todo';
    provider.users.findByConditions({
        '_id': ObjectID(data.user),
        'company': socket.user.company
      }, function(doc) {
        if(!doc) {
          data.user = undefined;
        }
        provider.tasks.add(data, function(result) {
          if(result.errors) {
            socket.emit('add task', {'error': result.errors});
          } else {
            result[0].added_by = socket.user._id.toString();
            io.sockets.in(socket.user.company).emit('add task', result[0]);
            if(userSockets[data.user]) {
              var today = formatToday();
              var d = new Date(result[0].date);
              var taskDate = new Date((d.getMonth() + 1)
              + '/' + (d.getDate()) + '/' + d.getFullYear());
              if(taskDate.valueOf() == today.valueOf()) {
                io.sockets.connected[userSockets[data.user].id].emit('add task', result[0]);
              }
            }
          }
        });
      });
  });

  ////////////////////////////
  // edit a task
  ////////////////////////////
  socket.on('edit task', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;

    data.name = data.name || data.address;
    data.date = new Date(data.date);
    data.status = 'todo';
    provider.users.findByConditions({
      '_id': ObjectID(data.user),
      'company': socket.user.company
     }, function(doc) {
       if(!doc) {
           return socket.emit('add task', {'error': { 'user': 'User is not valid' }});
       }
       var id = data.id;
       delete data.id;
       provider.tasks.findByConditions({
         '_id': ObjectID(id),
         'company': socket.user.company,
         $or: [ {'status': 'todo' }, {'status': 'pending'}]
       }, function(result) {
         if(result.length == 0) {
             return socket.emit('add task', {'error': { '_id': 'Task id is not valid' }});
         }
         var task = result[0];
         provider.tasks.update({'_id': ObjectID(id), 'company': socket.user.company}, data, function(result) {
           if(result.errors) {
             socket.emit('edit task', {'error': result.errors});
           } else {
             data.added_by = socket.user._id.toString();
             data._id = id;
             io.sockets.in(socket.user.company).emit('edit task', data);
             var today = formatToday();
             var d = new Date(data.date);
             var taskDate = new Date((d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear());
             var updatedTaskDate = new Date((task.date.getMonth() + 1) + '/' 
               + task.date.getDate() + '/' + task.date.getFullYear());

              if(taskDate.valueOf() == today.valueOf()) {
                if(task.user == data.user) {
                  if(userSockets[data.user]) {
                    if(updatedTaskDate.valueOf() == today.valueOf()) {
                      io.sockets.connected[userSockets[data.user].id].emit('edit task', data);
                    } else {
                      io.sockets.connected[userSockets[data.user].id].emit('add task', data);
                    }
                  }
                } else  {
                  if(userSockets[task.user]) {
                    io.sockets.connected[userSockets[task.user].id].emit('delete task', data);
                  }
                  if(userSockets[data.user]) {
                    io.sockets.connected[userSockets[data.user].id].emit('add task', data);
                  }
                }
              } else {
                if(updatedTaskDate.valueOf() == today.valueOf() && userSockets[task.user]) {
                  io.sockets.connected[userSockets[task.user].id].emit('delete task', data);
                }
             }
           }
         });

       });
     });
  });

  ////////////////////////////
  // remove task
  ////////////////////////////
  socket.on('delete task', function(data) {
    if(socket.user.type != 'admin' && socket.user.type != 'operator') return;
    provider.tasks.delete({'_id': ObjectID(data._id), 'company': socket.user.company }, function(doc) {
      io.sockets.in(socket.user.company).emit('delete task', data);
      if(userSockets[data.user]) {
        io.sockets.connected[userSockets[data.user].id].emit('delete task', data);
      }
    });
  });

  ////////////////////////////
  // mark a task as done
  ////////////////////////////
  socket.on('task done', function(data) {
    var done_date = new Date();
    var update = {
      'status': 'done',
      'done_date': done_date
    };
     provider.tasks.update({'_id':ObjectID(data.id), 'user': socket.user._id.toString()}, update,
     function(result) {
       io.sockets.in(socket.user.company).emit('task done', {'id': data.id, 'done_date': done_date});
       socket.emit('task done', {'id': data.id, 'done_date': done_date});
     });
  });

  ////////////////////////////
  // mark a task as todo
  ////////////////////////////
  socket.on('task todo', function(data) {
    var update = {
      'status': 'todo',
      'done_date': null
    };
    provider.tasks.update({'_id':ObjectID(data.id), 'user': socket.user._id.toString()}, update,
    function(result) {
      io.sockets.in(socket.user.company).emit('task todo', {'id': data.id});
      socket.emit('task todo', {'id': data.id});
    });
  });

  ////////////////////////////
  // mark a task as pending
  ////////////////////////////
  socket.on('task pending', function(data) {
    var pending = {
      'message': data.msg,
      'date': new Date(),
      'user': socket.user.name
    };
    provider.tasks.addPending({'_id':ObjectID(data.id), 'user': socket.user._id.toString()}, 
    pending,
    function(result) {
      io.sockets.in(socket.user.company).emit('task pending', {'id': data.id, 'pending': pending});
      socket.emit('task pending', {'id': data.id, 'pending': pending});
    });
  });

}