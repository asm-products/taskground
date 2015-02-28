// init socket
var socket = io.connect('',{'max reconnection attempts' : Infinity});

// initialize map
Map.init();

// current user settings
var settings = {};

// tasks array
var tasks = [];

// users array
var users = [];

// current task
var task = null;

// current status
var status = 'todo';

// users dictionary
var usersMap = {};

// ui interface elements
var ui = {
  'map': $("#map"),
  'panels': $('.panel'),
  'lat': $('#lat'),
  'lng': $('#lng')
};

/**
 * default options for the datepickers
 */
var datepicker_options = {
  dateFormat:'dd/mm/yy',
  minDate: 0,
  firstDay: 1,
  prevText: '<',
  nextText: '>'
};

/**
 * datepicker settings
 */
$("#datepicker").datepicker(datepicker_options);

/**
 * overload mapClick event
 */
Map.mapClick = function(event) {
  Map.showPivot(event.latLng.lat(), event.latLng.lng());
};

/**
 * callback for marker position changed
 */
Map.positionChanged = function(event) {
  ui.lat.val(Map.pivot.position.lat());
  ui.lng.val(Map.pivot.position.lng());
}

/*********************
 ***** TEMPLATES *****
 *********************/

/**
 * return the rendered task index template
 */
function taskIndexTemplate(data) {
  data.classNames = '';

  if (data.status == 'done') {
    data.classNames += ' task-done';
  } else if (data.status == 'pending') {
    data.classNames += ' task-pending';
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var taskDay = new Date(data.date);
  taskDay.setHours(0, 0, 0, 0);

  if (taskDay < today && data.status !== 'done') {
    data.classNames += ' task-alert';
  }
  return templateEngine.render($('#task-index-template').html(), data);
}

/**
 * return the rendered task view template
 */
function taskViewTemplate(data) {
  if(data.done_date) {
    var time = new Date(data.done_date);
    data.done_date = $.datepicker.formatDate('dd/mm/yy', new Date(data.done_date))
    + ' ' + time.getHours() + ':' + time.getMinutes();
  }

  if(data.pending) {
    var time = new Date(data.pending_date);
    data.pending_date = $.datepicker.formatDate('dd/mm/yy', new Date(data.pending_date))
    + ' ' + time.getHours() + ':' + time.getMinutes();
  }

  return templateEngine.render($('#task-view-template').html(), data);
}

/**
 * return the rendered user index template
 */
function userIndexTemplate(data) {
  return templateEngine.render($('#user-index-template').html(), data);
}

/**
 * return the rendered user view template
 */
function userViewTemplate(data) {
  return templateEngine.render($('#user-view-template').html(), data);
}

/*****************
 ***** UTILS *****
 *****************/

/**
 * format task date
 */
function formatDate(date) {
  return $.datepicker.formatDate('dd/mm/yy', date);
}

/**
 * format time
 */
function formatTime(date) {
  var hours = ((date.getHours() + '').length == 2)? date.getHours(): '0' + date.getHours();
  var minutes = ((date.getMinutes() + '').length == 2)? date.getMinutes(): '0' + date.getMinutes();
  return hours + ':' + minutes;
}

/**
 * sort tasks by date
 *
 * @param tasks array
 */
function sortTasks(tasksArray) {
  tasksArray.sort(function(a, b) {
    var dateA = new Date(a.date),
        dateB = new Date(b.date);

    if((dateA > dateB)) {
      return 1;
    } else if(dateA < dateB) {
      return -1;
    } else {
      return 0;
    }
  });
}

/**
 * render tasks
 */
function renderTasks() {
  tasksHtml = '';
  $.each(tasks, function(index, val) {
    if(val) {
      if(status == val.status || ((!val.status || val.status == 'pending') && status == 'todo')) {
        tasksHtml += taskIndexTemplate({
          'id': val._id, 
          'index': index, 
          'name': val.name, 
          'date': val.date,
          'formated_date': val.formated_date,
          'time': val.time,
          'status': val.status,
          'user': users[usersMap[val.user].index].name
        });
        Map.markers[val.marker].setMap(Map.map);
				Map.markers[val.marker].setAnimation(google.maps.Animation.DROP);
      } else {
        Map.markers[val.marker].setMap(null);
      }
    }
  });
  if(tasksHtml == '') {
    tasksHtml = '<i class="empty-msg">' +   $('#tasks-container').data('empty') + '</i>';
  }
  $('#tasks-container').html(tasksHtml);
}

/**
 * sort users by name
 *
 * @param array arrayObject
 */
function sortUsers(arrayObject){
  arrayObject.sort(function(a, b){
    var nameA=a.name.toLowerCase();
    var nameB=b.name.toLowerCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0; //default return value (no sorting)
  });
}

/**
 * render the users list
 */
function renderUsers(){
  var usersHtml = '';
  var usersOptions = '';

  $.each(users, function(index, val) {
    if(val){
      if(val.type == 'mobile') {
        usersOptions += '<option value="' + val._id +'">' + val.name + '</option>';
      }
      if(val._id != settings.id) {
        usersMap[val._id] = {
          'index': index
        };
        usersHtml += userIndexTemplate({
          'id': val._id,
          'index': (index - 1),
          'email': val.email,
          'name': val.name,
          'type': val.type
        });
      }
    }
  });

	if(usersHtml == '') {
		usersHtml = '<i class="empty-msg">' + $('#users-container').data('empty') + '</i>';
	}

  $('#users-select').empty().html(usersOptions);
  $('#users-container').empty().html(usersHtml);
}

/**
 * hide the menu when a menu link is clicked
 */

var menuMove = false;

$('#header-menu')
	.on('touchstart', 'a', function(e) {
		menuMove = false;
	})
	.on('touchmove', 'a', function(e) {
		menuMove = true;
	})
	.on('touchend click', 'a', function(e) {
		if (menuMove) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		var elementId = $(this).attr('id');
		if (elementId != 'logout') {
			e.preventDefault();
			e.stopPropagation();
			ui.panels.hide();
			if (elementId == 'tasks-button') {
			  ui.map.appendTo('#tasks-index-map-container');
			  $('#tasks-block').show();
			  Map.hidePivot();
			  Map.fitMarkers();
			} else if (elementId == 'users-button') {
			  $('#users-block').show();
			} else if (elementId == 'settings-button') {
			  $('#settings-form').each(function() {
			    this.reset();
			  });
			  $('#user-password-error').hide();
			  $('#user-email-error').hide();
			  $('#user-name-error').hide();
			  $('#userName').val(settings.name);
			  $('#userEmail').val(settings.email);
			  $('#country').val(settings.location.country);
			  $('#city').val(settings.location.city);
			  $('#settings-block').show();
			}
		  if($('#mobile-menu-button').is(':visible')) $('#header-menu').hide();
			window.scrollTo(0, 0);
		  Map.hidePivot();
		} else {
			e.preventDefault();
			e.stopPropagation();
			window.location = this.getAttribute('href');
		}
	});

/**
 * on click logo
 */
$('#logo').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
	ui.panels.hide();
  ui.map.appendTo('#tasks-index-map-container');
  $('#tasks-block').show();
  Map.hidePivot();
  Map.fitMarkers();
});

/*****************
 ***** USERS *****
 *****************/

/**
 * on user form submit emit the socket add user event to add a new user
 */
$('#add-user-form').on('submit', function(e) {
  e.preventDefault();
  var signal = 'add user';
  var data = {
    'name': $('#name').val(),
    'email': $('#email').val(),
    'password': $('#password').val(),
  };
  if($('#type').length) {
    data.type = $('#type option:selected').val();
  }
  if($('#id').val() != '') {
    data.id = $('#id').val();
    signal = 'edit user';
  }
  socket.emit(signal, data);
});

/**
 * add user button on click event shows add user panel
 */
$('#add-user-button').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  $('#id').val('');
  $('#name').val('');
  $('#email').val('');
  $('#password').val('');
  $('#type').val('');
	$('.error-msg').text('').hide();
  ui.panels.hide();
  $('#add-user-block').show();
  $('#name').focus();
  window.scrollTo(0, 0);
});

/**
 * on cancel add user form hide user panel and show main controls
 */
$('#add-user-cancel').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  $('#password-error').hide();
  $('#email-error').hide();
  ui.panels.hide();
  $('#users-block').show();
  window.scrollTo(0, 0);
});

/**
 * on tasks click show the task's details
 */
var usersMove = false;

$('#users-block')
	.on('touchstart', '.user', function(e) {
		usersMove = false;
	})
	.on('touchmove', '.user', function(e) {
		usersMove = true;
	})
	.on('touchend click', '.user', function(e) {
	  e.preventDefault();
		e.stopPropagation();
		if(usersMove) return;
	  var user = users[$(this).data('id')+1];
	  var str = userViewTemplate({
	    'name': user.name,
	    'email': user.email,
	    'type': user.type
	  });

	  $('#user-view').data('id', user._id).html(str);
	  ui.panels.hide();
	  $('#user-view-block').show();
	  window.scrollTo(0, 0);
	});

/**
 * cancel user details
 */
$('#user-view-cancel').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  ui.panels.hide();
  $('#users-block').show();
  window.scrollTo(0, 0);
});

/**
 * show the user edit form
 */
$('#user-view-edit').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  var user = users[usersMap[$('#user-view').data('id')].index];
  $('#id').val(user._id);
  $('#name').val(user.name);
  $('#email').val(user.email);
  $('#password').val('');
  $('#type').val(user.type);
	$('.error-msg').text('').hide();
  ui.panels.hide();
  $('#add-user-block').show();
  window.scrollTo(0, 0);
});

/**
 * delete the user
 */
$('#user-view-delete').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  socket.emit('delete user', { 'id': $('#user-view').data('id') });
});

/*****************
 ***** TASKS *****
 *****************/

/**
 * on marker form submit emit the socket add marker event to save a new marker
 */
$('#add-task-form').on('submit', function(e) {
  e.preventDefault();
  var signal = 'add task';
  var taskDate = $("#datepicker").datepicker("getDate");
  taskDate.setHours($('#hours').find('option:selected').val());
  taskDate.setMinutes($('#minutes').find('option:selected').val());

  var data = {
    'address': $('#address').val(),
    'user': $('#users-select').find('option:selected').val(),
    'description': $('#description').val(),
    'date': taskDate,
    'location': {
      'lat': ui.lat.val(),
      'lng': ui.lng.val()
    }
  };
  if($('#task-id').val() != '') {
    data.id = $('#task-id').val();
    signal = 'edit task';
  }

  if (ui.lat.val() == '' && ui.lng.val() == '' && $('#address').val() != '') {
    Map.getAddress(getFormAddress(), function(location) {
      data.location.lat = location.lat;
      data.location.lng = location.lng;
      socket.emit(signal, data);
    });
  } else {
      socket.emit(signal, data);
  }
});

/**
 * on add marker button click hide controls, make map editable and show marker form
 */
$('#add-task-button').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
	if ($('#users-select option').length == 0) {
		  $('#tasks-container').html('<i class="empty-msg">' + $(this).data('empty') + '</i>');
			return;
	}
  Map.allowEdit = true;
  $('#add-task-form').each(function() {
    this.reset();
  });
  $('#task-id').val('');
  ui.lat.val('');
  ui.lng.val('');
  var date = new Date();
  var hours = date.getHours();
  hours++;
  if(hours > 23) hours = '00';
  if((hours + '').length != 2) hours = '0' + hours;
  $('#hours').val(hours);
  $('#minutes').val('00');
	$('.error-msg').text('').hide();
  ui.panels.hide();
  ui.map.appendTo('#tasks-edit-map-container');
  $('#add-task-block').show();
  $('#address').focus();
});

/**
 * cancel marker form and show main controls
 */
$('#add-task-cancel').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  $('#add-task-block .block-title h3').text($('#add-task-block .block-title').data('add'));
  Map.allowEdit = false;
  $('#location-error').hide();
  $('#description-error').hide();
  ui.panels.hide();
  ui.map.appendTo('#tasks-index-map-container');
  $('#tasks-block').show();
  if($('#task-id').val() != '') {
    Map.markers[task.marker].setMap(Map.map);
    $('#task-id').val('');
  }
  Map.hidePivot();
  Map.fitMarkers();
  window.scrollTo(0, 0);
});

function getFormAddress() {
  if(settings.location) {
    return $('#address').val() + ', ' + settings.location.city + ', ' + settings.location.country;
  } else {
    return $('#address').val();
  }
}

/**
 * on search address show the addres in the map.
*/
$('#find-address').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  Map.showAddress(getFormAddress());
});

/**
 * on tasks click show the task's details
 */
var tasksMove = false;

$('#tasks-container')
	.on('touchstart', '.task', function(e) {
		tasksMove = false;
	})
	.on('touchmove', '.task', function(e) {
		tasksMove = true;
	})
	.on('touchend click', '.task', function(e) {
	  e.preventDefault();
		e.stopPropagation();
		if (tasksMove) return;
	  task = tasks[$(this).data('id')];
	  var str = '';
	  task.username = users[usersMap[task.user].index].name;
	  str = taskViewTemplate(task);
	  $('#task-view').html(str);
	  ui.map.appendTo('#tasks-view-map-container');
	  ui.panels.hide();
	  if(task.status == 'done') {
	    $('#task-view-edit').hide();
	  } else {
	    $('#task-view-edit').show();
	  }
	  $('#task-view-block').data('id', task._id).show();
	  Map.map.panTo(new google.maps.LatLng(task.location.lat, task.location.lng));
	  Map.map.setZoom(15);
	  window.scrollTo(0, 0);
	});

/**
 * cancel task details
 */
$('#task-view-cancel').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  ui.panels.hide();
  ui.map.appendTo('#tasks-index-map-container');
  $('#tasks-block').show();
  Map.map.setZoom(12);
  window.scrollTo(0, 0);
});

/**
 * show task edit view
 */
$('#task-view-edit').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  $('#task-id').val(task._id);
  $('#add-task-block .block-title h3').text($('#add-task-block .block-title').data('edit'));
  $('#users-select').val(task.user);
  ui.lat.val(task.location.lat);
  ui.lng.val(task.location.lng);
  $('#address').val(task.name);
  $('#description').val(task.description);
  Map.markers[task.marker].setMap(null);
  Map.showPivot(task.location.lat, task.location.lng);
  Map.allowEdit = true;
	$('.error-msg').text('').hide();
  ui.panels.hide();
  ui.map.appendTo('#tasks-edit-map-container');
  var date = new Date(task.date);
  $('#datepicker').datepicker('setDate', date);
  var hours = date.getHours();
  var minutes = date.getMinutes();
  if((hours + '').length != 2) hours = '0' + hours;
  if((minutes + '').length != 2) minutes = '0' + minutes;
  $('#hours').val(hours);
  $('#minutes').val(minutes);
  $('#add-task-block').show();
  window.scrollTo(0, 0);
});

/**
 * show task edit view
 */
$('#task-view-delete').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  socket.emit('delete task', { '_id': $('#task-view-block').data('id'), 'user': task.user });
});

/********************
 ***** SETTINGS *****
 ********************/

/**
 * submit the settings form
 */
$('#settings-form').on('submit', function(e) {
  e.preventDefault();
	e.stopPropagation();
  socket.emit('settings', {
    'name': $('#userName').val(),
    'email': $('#userEmail').val(),
    'password': $('#userPassword').val(),
    'repeatPassword': $('#userRepeatPassword').val(),
    'country': $('#country').val(),
    'city': $('#city').val()
  });
});

/**
 * go back to main screen when settings cancel button is clicked
 */
$('#settings-cancel').on('touchstart click', function(e) {
  e.preventDefault();
	e.stopPropagation();
  ui.panels.hide();
  ui.map.appendTo('#tasks-index-map-container');
  $('#tasks-block').show();
  window.scrollTo(0, 0);
});

/**
 * mobile button to show / hide the navigation menu
 */
$('#mobile-menu-button').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  $('#header-menu').toggle();
});

/**
 * click on the done button
 */
$('#done').on('touchstart click', function(e) {
  e.preventDefault();
  status = 'done';
  renderTasks();
});

/**
 * click on the todo button
 */
$('#todo').on('touchstart click', function(e) {
  e.preventDefault();
  status = 'todo';
  renderTasks();
});

/*******************
 ***** SOCKETS *****
 *******************/

/**
 * on disconnect try to open a new connection
 */
socket.on('disconnect', function() {
  $('#loading-cover').show();
});

/**
* load all markers
*/
socket.on('init markers', function(data) {
  task = null;
  usersMap = {};
  var tasksHtml = '';
  settings = data.settings;
  tasks = data.tasks;
  users = data.users;
  if(settings.type != 'admin') {
    $('#user-type-block').remove();
  }

  if (settings.account_limit == true) {
    $('#add-user-button').hide();
    $('#max-users-limit').show();
  }

  sortUsers(users);
  renderUsers();

  sortTasks(tasks);
  $.each(tasks, function(index, val) {
    tasks[index].marker = Map.addMarker(val._id, val.location.lat, val.location.lng, val.description);
    if(tasks[index].status == 'done') {
      Map.markers[tasks[index].marker].setIcon(Map.doneMarkerImage);
    }
    tasks[index].date = new Date(tasks[index].date);
    tasks[index].formated_date = formatDate(tasks[index].date);
    tasks[index].time = formatTime(tasks[index].date);
    if(tasks[index].done_date) {
      tasks[index].done_date = new Date(tasks[index].done_date);
      tasks[index].formated_done_date = formatTime(tasks[index].done_date);
    }

    if(tasks[index].pending) {
      $.each(tasks[index].pending, function(i, val) {
        tasks[index].pending[i].date = new Date(tasks[index].pending[i].date);
        tasks[index].pending[i].formated_date = formatDate(tasks[index].pending[i].date) + ' ' + formatTime(tasks[index].pending[i].date);
      });
    }
  });

  Map.fitMarkers();
  renderTasks();
  $('#loading-cover').hide();
});

/*****************
 ***** TASKS *****
 *****************/

/**
 * socket on add task event (after server has saved marker position on mongodb)
 */
socket.on('add task', function(data) {
  if(data.error) {
    if(data.error.location) {
      $('#location-error').text(data.error.location.msg).show();
    } else {
      $('#location-error').hide();
    }

    if(data.error.description) {
      $('#description-error').text(data.error.description.msg).show();
    } else {
      $('#description-error').hide();
    }

    if(data.error.user) {
      $('#task-user-error').text(data.error.user.msg).show();
    } else {
      $('#task-user-error').hide();
    }

  } else {
    data.marker = Map.addMarker(data._id, data.location.lat, data.location.lng, data.description);
    data.date = new Date(data.date);
    data.formated_date = formatDate(data.date);
    data.time = formatTime(data.date);
    tasks.push(data);
    sortTasks(tasks);
    renderTasks();
		if (data.added_by == settings.id) {
	    $('#add-task-form').each(function() {
	      this.reset();
	    });

	    $('#add-task-cancel').click();			
		}
  }
});

/**
 * socket on edit task update tasks list
 */
socket.on('edit task', function(data) {
  if(data.error) {
    if(data.error.location) {
      $('#location-error').text(data.error.location.msg).show();
    } else {
      $('#location-error').hide();
    }

    if(data.error.description) {
      $('#description-error').text(data.error.description.msg).show();
    } else {
      $('#description-error').hide();
    }

  } else {
    var tasksHtml = '';
    $.each(tasks, function(index, val) {
      if(val) {
        if( val._id == data._id) {
          data.date = new Date(data.date);
          data.formated_date = formatDate(data.date);
          data.time = formatTime(data.date);
          data.marker = tasks[index].marker;
          data.pending = tasks[index].pending;
          data.pending_date = tasks[index].pending_date;
          tasks[index] = data;
          val = data;
          if($('#task-view-block').data('id') == data._id && $('#task-view-block').is(':visible')) {
            tasks[index].username = users[usersMap[data.user].index].name;
            str = taskViewTemplate(tasks[index]);
            $('#task-view').html(str);
            Map.map.panTo(new google.maps.LatLng(tasks[index].location.lat, tasks[index].location.lng));
            Map.map.setZoom(15);
          }
        }
      }
    });
    sortTasks(tasks);
    if(status == data.status || (!data.status || data.status == 'pending') && status == 'todo') {
      renderTasks();
    }

    Map.hidePivot();
    Map.updateMarker(data.marker, data.location.lat, data.location.lng, data.description);
    Map.markers[data.marker].setMap(Map.map);
    Map.allowEdit = false;
		if (data.added_by == settings.id) {		
	    if(!$('#task-view-block').is(':visible')) {
	      $('#add-task-cancel').click();
	    }
		}
  }
});

/**
 * mobile user marks task as todo
 */
socket.on('task todo', function(data) {
  $.each(tasks, function(index, val) {
    if(val && val._id == data.id) {
      tasks[index].status = 'todo';
      tasks[index].done_date = null;
      Map.markers[tasks[index].marker].setIcon('/img/todo.png');
      if($('#task-view-block').data('id') == data.id && $('#task-view-block').is(':visible')) {
        tasks[index].username = users[usersMap[tasks[index].user].index].name;
        str = taskViewTemplate(tasks[index]);
        $('#task-view').html(str);
      }
    }
  });
  if(status == 'done') {
    $('#' + data.id).remove();
		$.each(tasks, function(index, val) {
			if(val._id == data.id) {
				Map.markers[val.marker].setMap(null);
			}
		});
  } else {
    renderTasks();
  }
  if($('#tasks-container').html().trim() == '' ) {
    $('#tasks-container').html('<i class="empty-msg">' 
    +   $('#tasks-container').data('empty') + '</i>');
  }
});

/**
 * mobile user marks task as todo
 */
socket.on('task pending', function(data) {
  $.each(tasks, function(index, val) {
    if(val && val._id == data.id) {
      tasks[index].status = 'pending';
      tasks[index].done_date = null;
      if(!tasks[index].pending) {
        tasks[index].pending = [];
      }
      data.pending.date = new Date(data.pending.date);
      data.pending.formated_date = formatDate(data.pending.date) + ' ' + formatTime(data.pending.date);

      tasks[index].pending.push(data.pending);
      Map.markers[tasks[index].marker].setIcon('/img/todo.png');
      if($('#task-view-block').data('id') == data.id && $('#task-view-block').is(':visible')) {
        tasks[index].username = users[usersMap[tasks[index].user].index].name;
        str = taskViewTemplate(tasks[index]);
        $('#task-view').html(str);
      }
    }
  });
  if(status == 'todo') {
    if($('#' + data.id).length == 0) {
      renderTasks();
    } else {
      $('#' + data.id).addClass('task-pending');
    }
  } else {
    $('#' + data.id).remove();
  }
  if($('#tasks-container').html().trim() == '' ) {
    $('#tasks-container').html('<i class="empty-msg">' 
    +   $('#tasks-container').data('empty') + '</i>');
  }
});

/**
 * mobile user marks task as todo
 */
socket.on('task done', function(data) {
  $.each(tasks, function(index, val) {
    if(val && val._id == data.id) {
      tasks[index].status = 'done';
      tasks[index].done_date = new Date(data.done_date);
      tasks[index].formated_done_date = formatTime(tasks[index].done_date);
      Map.markers[tasks[index].marker].setIcon(Map.doneMarkerImage);
      if($('#task-view-block').data('id') == data.id && $('#task-view-block').is(':visible')) {
        tasks[index].username = users[usersMap[tasks[index].user].index].name;
        str = taskViewTemplate(tasks[index]);
        $('#task-view').html(str);
      }
    }
  });
  if(status == 'todo') {
    $('#' + data.id).remove();
		$.each(tasks, function(index, val) {
			if(val._id == data.id) {
				Map.markers[val.marker].setMap(null);
			}
		});
  } else {
    renderTasks();
  }
  if($('#tasks-container').html().trim() == '' ) {
    $('#tasks-container').html('<i class="empty-msg">' 
    +   $('#tasks-container').data('empty') + '</i>');
  }
});

/**
 * socket on delete task
 */
socket.on('delete task', function(data) {
  $.each(tasks, function(index, val) {
    if(val) {
      if(val._id == data._id) {
        Map.removeMarker(val.marker);
        delete tasks[index];
      }
    }
  });

  $('#' + data._id).remove();
  if($('#tasks-container').html().trim() == '' ) {
    $('#tasks-container').html('<i class="empty-msg">' 
    +   $('#tasks-container').data('empty') + '</i>');
  }
  if($('#task-view-block').data('id') == data._id ) {
    $('#task-view-cancel').click();
    Map.fitMarkers();
  }
});

/*****************
 ***** USERS *****
 *****************/

/**
 * when a new user is added check if there're errors in the form
 */
socket.on('add user', function(data) {
  if(data.error) {
    if(data.error.name) {
      $('#name-error').text(data.error.name.msg).show();
    } else {
      $('#name-error').hide();
    }

    if(data.error.email) {
      $('#email-error').text(data.error.email.msg).show();
    } else {
      $('#email-error').hide();
    }

    if(data.error.password) {
      $('#password-error').text(data.error.password.msg).show();
    } else {
      $('#password-error').hide();
    }

  } else {
    if(data.user.type == 'mobile' || settings.type != 'operator') {
      users.push(data.user);
      sortUsers(users);
      renderUsers();
      settings.account_limit = data.account_limit;
      if (settings.account_limit == true) {
        $('#add-user-button').hide();
        $('#max-users-limit').show();
      }

			if(data.user.type == 'mobile' && $('#tasks-container').html() == ('<i class="empty-msg">' + $('#add-task-button').data('empty') + '</i>').toString()) {
				$('#tasks-container').html('<i class="empty-msg">' + $('#tasks-container').data('empty') + '</i>');
			}

    }
		if(data.added_by == settings.id) {
	    $('#add-user-form').each(function() {
	      this.reset();
	    });
	    $('#add-user-cancel').click();
		}
  }
});

/**
 * reset users options and list after user is delete
 */
socket.on('delete user', function(data) {

  delete users[usersMap[data.id].index];

  settings.account_limit = false;
  $('#add-user-button').show();
  $('#max-users-limit').hide();

  sortUsers(users);
  renderUsers();

  var tasksHtml = '';
  $.each(tasks, function(index, val) {
    if(val) {
      if(val.user == data.id) {
        Map.removeMarker(val.marker);
        delete tasks[index];
      } else {
        tasksHtml +=taskIndexTemplate({'id': val._id, 'index': index, 'name': val.name, 'status': val.status, 'date': val.date, 'formated_date': val.formated_date, 'time': val.time, 'user': users[usersMap[val.user].index].name });
      }
    }
  });
  if(tasksHtml == '' ) {
		tasksHtml = '<i class="empty-msg">' + $('#tasks-container').data('empty') + '</i>';
  }
  $('#tasks-container').empty().append(tasksHtml);
  $('#user-view-cancel').click();
});

/**
 * when a new user is added check if there're errors in the form
 */
socket.on('edit user', function(data) {
  if(data.error) {
    if(data.error.email) {
      $('#email-error').text(data.error.email.msg).show();
    } else {
      $('#email-error').hide();
    }
    if(data.error.name) {
      $('#name-error').text(data.error.name.msg).show();
    } else {
      $('#name-error').hide();
    }
  } else {
		if (settings.id == data._id) return;

		// user already exists and user type is changed
    if(usersMap[data._id]) {
    	
      users[usersMap[data._id].index].name = data.name;
      users[usersMap[data._id].index].email = data.email;
      users[usersMap[data._id].index].type = data.type;

			// delete all user tasks
			if (data.type == 'admin' || data.type == 'operator') {
	      $.each(tasks, function(index, val) {
	        if(val) {
	          if(val.user == data._id) {
	            Map.removeMarker(val.marker);
	            delete tasks[index];
	          }
	        }
	      });

				// if current user is operator remove edited user as it's not allowed
				// to handle non-mobile users
	      if(settings.type == 'operator') {
	        delete users[usersMap[data._id].index];
	      }
    }	
		} else {
    	if(settings.type == 'admin' || (settings.type == 'operator' && data.type == 'mobile')) {
        users.push(data);
    }
		}

	  sortUsers(users);
		renderUsers();

		if($('#user-view').data('id') == data._id && $('#user-view').is(':visible')) {
	    var str = userViewTemplate({
	      'name': data.name,
	      'email': data.email,
	      'type': data.type
	    });

	    $('#user-view').html(str);
	  }

		renderTasks();
		if(data.added_by == settings.id) {
		  if($('#add-user-block').is(':visible')) {
		    $('#add-user-cancel').click();
		  }
		}
  }
});

/********************
 ***** SETTINGS *****
 ********************/

/**
 * when the current user settings are changed check if there were errors in the form
 */
socket.on('settings', function(data) {
  if(!data.error) {
    if(data.email) {
      $('#userEmail').val(data.email);
    }
    if(data.name) {
      $('#userName').val(data.name);
    }

    settings.email = $('#userEmail').val();
    settings.name = $('#userName').val();
    settings.location.city = $('#city').val();
    settings.location.country = $('#country').val();
    $('#settings-cancel').click();
  } else {
    if(data.error.name) {
      $('#user-name-error').text(data.error.name.msg).show();
    } else {
      $('#user-name-error').hide();
    }

    if(data.error.email) {
      $('#user-email-error').text(data.error.email.msg).show();
    } else {
      $('#user-email-error').hide();
    }

    if(data.error.password) {
      $('#user-password-error').text(data.error.password.msg).show();
    } else {
      $('#user-password-error').hide();
    }

  }
});