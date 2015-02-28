// ------------------------
// ----- Tasks Object -----
// ------------------------

var Tasks = function(options) {
  /*******************
   ***** PRIVATE *****
   *******************/

  // tasks array
  var tasks = [];

  // tasks status
  var status = options.status || 'todo';

  // dom element
  var el = options.el;

  // task index template
  var taskIndexTemplate = options.taskIndexTemplate || '';

  // template engine
  var templateEngine = options.templateEngine;

  /**
   * format task date
   */
  function formatDate(date) {
    return date.getDay() + '/' +  (date.getMonth() + 1) + '/' + date.getFullYear();
  }

  /**
   * format time
   */
  function formatTime(date) {
    var hours = ((date.getHours() + '').length == 2) ? date.getHours() : '0' + date.getHours();
    var minutes = ((date.getMinutes() + '').length == 2) ? date.getMinutes() : '0' + date.getMinutes();
    return hours + ':' + minutes;
  }

  /**
   * format all tasks dates
   */
  function formatTask(task) {
    task.date = new Date(task.date);
    task.time = formatTime(task.date);

    if(!task.pending) {
      task.pending = [];
    }

    if (task.pending.length > 0) {
      for(var i=0;i<task.pending.length;i++) {
        task.pending[i].date = new Date(task.pending[i].date);
        task.pending[i].formated_date = formatDate(task.pending[i].date)
        + ' ' + formatTime(task.pending[i].date);
      }
    }

    if (task.status == 'done' && task.done_date) {
      task.done_date = new Date(task.done_date);
      task.formated_done_date = formatTime(task.done_date);
    }

    return task;
  }

  /**
   * return the tasks rendered template
   *
   * @param object data
   */
  function renderTemplate(data) {
    return templateEngine.render(taskIndexTemplate, data);
  }

  /**
   * sort tasks array
   */
  function sortTasks() {
    tasks.sort(function(a, b) {
      var dateA = new Date(a.date)
          dateB = new Date(b.date);

      if (a.status == 'pending' && b.status != 'pending') {
        return 1;
      } else if (a.status != 'pending' && b.status == 'pending') {
        return -1;
      }

      if ((dateA > dateB)) {
        return 1;
      } else if (dateA < dateB) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  /**
   * check if the tasks list is empty and show the empty message if needed
   */
  function checkEmptyList() {
    if(el.innerHTML.replace(/^\s+|\s+$/g, '') == '') {
      el.innerHTML = '<i class="empty-msg">' +   el.getAttribute('data-empty') + '</i>';
    }
  }

  /******************
   ***** PUBLIC *****
   ******************/

  // object
  var T = {};

  // DOM element
  T.el = el;

  /**
   * initialize tasks
   */
  T.init = function(data) {
    tasks = data;
    for(var i=0;i<tasks.length;i++) {
      tasks[i] = formatTask(tasks[i]);
    };

    sortTasks();
    this.render();
  }

  /**
   * set the tasks list status
   */
  T.setStatus = function(s) {
    status = s;
    this.render();
  };

  /**
   * render tasks
   */
  T.render = function() {
    var tasksHtml = '';
    for(var i=0;i<tasks.length;i++) {
      if(tasks[i] && (tasks[i].status == status || (tasks[i].status == 'pending' && status == 'todo'))) {
        tasks[i].index = i;
        tasksHtml += renderTemplate(tasks[i]);
      }
    }
    el.innerHTML = tasksHtml;
    checkEmptyList();
  };

  /**
   * add a new task
   */
  T.addTask = function (data) {
    tasks.push(formatTask(data));
    sortTasks();
    this.render();
  };

  /**
   * mark a task as done
   */
  T.taskDone = function(data) {
    var task = this.getTask(data.id);
    task.status = 'done';
    task.done_date = new Date(data.done_date);
    task.formated_done_date = formatTime(task.done_date);

    if (status == 'todo') {
      document.getElementById(data.id).remove();
    }

    checkEmptyList()
  };

  /**
   * mark a task as todo
   */
  T.taskTodo = function(data) {
    var task = this.getTask(data.id);
    task.status = 'todo';

    if (status == 'done') {
      document.getElementById(data.id).remove();
    }

    checkEmptyList();
  };

  /**
   * mark a task as pending
   */
  T.taskPending = function(data) {
    var task = this.getTask(data.id);
    task.status = 'pending';

    data.pending.date = new Date(data.pending.date);
    data.pending.formated_date = formatDate(data.pending.date)
    + ' ' + formatTime(data.pending.date);
    if(!task.pending) {
      task.pending = [];
    }
    task.pending.push(data.pending);

    if (status == 'todo') {
      var element = document.getElementById(data.id);
      element.className = element.className + ' task-pending';
      element.remove();
      el.appendChild(element);
    } else {
      document.getElementById(data.id).remove();
    }
    checkEmptyList();
  };

  /**
   * edit a task
   */
  T.edit = function(data) {
    for(var i=0;i<tasks.length;i++) {
      if(tasks[i] && tasks[i]._id == data._id) {
        tasks[i] = formatTask(data);
      }
    }
    sortTasks();
    this.render();
  };

  /**
   * delete a task
   */
  T.delete = function(data) {
    for(var i=0;i<tasks.length;i++) {
      if(tasks[i] && (tasks[i]._id == data._id)) {
        delete tasks[i];
        break;
      }
    }
    document.getElementById(data._id).remove();
    checkEmptyList();
  };

  /**
   * get a task by id
   */
  T.getTask = function getTask(id) {
    for(var i=0;i<tasks.length;i++) {
      if(tasks[i] && tasks[i]._id == id) {
        return tasks[i];
      }
    }
    return null;
  };

  return T;
}