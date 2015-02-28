// init socket
var socket = io.connect('',{'max reconnection attempts' : Infinity});

// initialize map
Map.init(Map.elementId, true);

// current user settings
var settings = {};

// ui cache
var ui = {
  'blocks': $('.block'),
  'mainBlock': $('#main-block'),
  'detailsBlock': $('#details-block'),
  'backButtons': $('#back, #logo, #settings-cancel'),
  'taskPendingMessageTemplate': $('#task-pending-message').html(),
  'doneButton': $('#done'),
  'todoButton': $('#todo'),
  'statusField': $('#status'),
  'taskDetails': $('#details'),
  'taskName': $('#task-name'),
  'taskInfo': $('#task-info'),
  'doneFilter': $('#done-filter'),
  'todoFilter': $('#todo-filter'),
  'subcontrols': $('#details-subcontrols'),
  'pendingMessages': $('#pending-messages')
};

// tasks
var tasksObj = new Tasks({
  'taskIndexTemplate': $('#task-index-template').html(),
  'el': document.getElementById('tasks-list'),
  'templateEngine': templateEngine
});

/**
 * on click logo
 */
$('#logo').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  ui.mainBlock.show();
});

/**
 * click logout link
 */
$('#logout').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
	window.location = this.getAttribute('href');
});
/********************
 ***** SETTINGS *****
 ********************/

/**
 * show settings panel
 */
$('#settings-button').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  $('#settings-form').each(function() {
    this.reset();
  });
  $('#user-name-error').hide();
  $('#user-password-error').hide();
  $('#user-email-error').hide();
  $('#userEmail').val(settings.email);
  $('#userName').val(settings.name);
  ui.blocks.hide();
  $('#settings-block').show();
});

/**
 * submit the settings form
 */
$('#settings-form').on('submit', function(e) {
	e.preventDefault();
	e.stopPropagation();
  socket.emit('settings', {
    'name': $('#userName').val(),
    'email': $('#userEmail').val(),
    'password': $('#userPassword').val()
  });
});

/*****************
 ***** TASKS *****
 *****************/

// detect if its swipe or touch
var tasksMove = false;

/**
 * click on tasks
 */
$(tasksObj.el)
	.on('touchstart', '.task', function(e) {
		tasksMove = false;
	})
	.on('touchmove', '.task', function(e) {
		tasksMove = true;
	})
	.on('touchend click', '.task', function(e) {
		if (tasksMove) return;
		e.preventDefault();
		e.stopPropagation();
	  var task = tasksObj.getTask($(this).attr('id'));
	  if (task.status == 'done') {
	    ui.doneButton.hide();
	    ui.todoButton.show();
	    ui.statusField.addClass('done').text(ui.statusField.data('done') + ' ' + task.formated_done_date);
	  } else {
	    ui.doneButton.show();
	    ui.todoButton.hide();
	    ui.statusField.removeClass('done').text('');
	  }

	  ui.pendingMessages.html(templateEngine.render(ui.taskPendingMessageTemplate, task));

	  ui.taskDetails.html(task.description.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2'));
	  ui.taskName.html(task.name);
	  ui.taskInfo.html(task.time);
	  ui.mainBlock.hide();
	  ui.subcontrols.hide();
	  ui.detailsBlock.data('id', task._id).show();
	});

/**
 * on click back button go back to tasks list
 */
ui.backButtons.on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  ui.mainBlock.show();
});

/**
 * on click done button socket emit to makr the task as done
 */
ui.doneButton.on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  socket.emit('task done', { 'id': ui.detailsBlock.data('id') });
});

/**
 * on click todo button reopen the task
 */
ui.todoButton.on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  socket.emit('task todo', { 'id': ui.detailsBlock.data('id') });
});

/**
 * on click todo button reopen the task
 */
$('#pending').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  $('#pending-msg').val('');
  $('#pending-block').show();
  $('#pending-msg').focus();
});

/**
 * submit pending form
 */
$('#pending-form').on('submit', function(e) {
	e.preventDefault();
	e.stopPropagation();
  socket.emit('task pending', { 'id': ui.detailsBlock.data('id'), 'msg': $('#pending-msg').val() });
  ui.subcontrols.hide();
  ui.blocks.hide();
  ui.detailsBlock.show();
});

/**
 * click pending form cancel button
 */
$('#pending-cancel').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  ui.detailsBlock.show();
  ui.subcontrols.hide();
});

/***************
 ***** Map *****
 ***************/

/**
 * on click map button show map panel
 */
$('#map-button').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  $('#header').hide();
  $('#map-block').show();
  var task = tasksObj.getTask(ui.detailsBlock.data('id'));
  if (task != null) {
    google.maps.event.trigger(map, 'resize');
    Map.showMarker(task.location.lat, task.location.lng, task.description);
    Map.map.panTo(new google.maps.LatLng(task.location.lat, task.location.lng));
    Map.map.setZoom(16);
  }
});

/**
 * on click close map button
 */
$('#close-map').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.blocks.hide();
  $('#header').show();
  ui.detailsBlock.show();
  ui.subcontrols.hide();
});

/***********************
 ***** Subcontrols *****
 ***********************/

/**
 * on subcontrols click show subcontrols menu
 */
$('#subcontrols').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.subcontrols.show();
});

/**
 * on click subcontrols cancel button
 */
$('#subcontrols-cancel').on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.subcontrols.hide();
});

/************************
 ***** TASK FILTERS *****
 ************************/

/**
 * filter done tasks
 */
ui.doneFilter.on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.todoFilter.removeClass('active');
  $(this).addClass('active');
  tasksObj.setStatus('done');
});

/**
 * filter todo tasks
 */
ui.todoFilter.on('touchstart click', function(e) {
	e.preventDefault();
	e.stopPropagation();
  ui.doneFilter.removeClass('active');
  $(this).addClass('active');
  tasksObj.setStatus('todo');
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
 * Markers socket signals
 */
socket.on('init markers', function(data) {
 settings = data.settings;
 tasksObj.init(data.tasks);
 $('#loading-cover').hide();
});

socket.on('add task', function(data) {
  tasksObj.addTask(data);
});

socket.on('task done', function(data) {
  tasksObj.taskDone(data);
  ui.detailsBlock.hide();
  ui.mainBlock.show();
});

socket.on('task todo', function(data) {
  tasksObj.taskTodo(data);
  ui.detailsBlock.hide();
  ui.mainBlock.show();
});

socket.on('task pending', function(data) {
  tasksObj.taskPending(data);
  ui.detailsBlock.hide();
  ui.mainBlock.show();
});

socket.on('delete task', function(data) {
  tasksObj.delete(data);
  if (ui.detailsBlock.data('id') == data._id && ui.detailsBlock.is(':visible')) {
    ui.backButtons[0].click()
  }
});

socket.on('edit task', function(data) {
  tasksObj.edit(data);

  if (ui.detailsBlock.data('id') == data._id && ui.detailsBlock.is(':visible')) {
    ui.taskDetails.html(data.description);
    ui.taskName.html(data.name);
    ui.taskInfo.html(data.time);
  } else if (ui.detailsBlock.data('id') == data._id && $('#map-block').is(':visible')) {
    google.maps.event.trigger(map, 'resize');
    Map.showMarker(data.location.lat, data.location.lng, data.description);
    Map.map.panTo(new google.maps.LatLng(data.location.lat, data.location.lng));
    Map.map.setZoom(15);
  }
});

/**
 * when the current user settings are changed check if there were errors in the form
 */
socket.on('settings', function(data) {
  if (!data.error) {
    if (data.email) {
      $('#userEmail').val(data.email);
    }
    if (data.name) {
      $('#userName').val(data.name);
    }
    settings.email = $('#userEmail').val();
    settings.name = $('#userName').val();
    ui.backButtons[0].click();
  } else {
    if (data.error.name) {
      $('#user-name-error').text(data.error.name.msg).show();
    } else {
      $('#user-name-error').hide();
    }

    if (data.error.email) {
      $('#user-email-error').text(data.error.email.msg).show();
    } else {
      $('#user-email-error').hide();
    }

    if (data.error.password) {
      $('#user-password-error').text(data.error.password).show();
    } else {
      $('#user-password-error').hide();
    }
  }
});

