/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Voice = require('ui/voice');
var Clock = require('clock');
var Wakeup = require('wakeup');

var pebbleStorage = window.localStorage || localStorage;
var store = {
  getNextAlert: function() {
    var time = pebbleStorage.getItem('alert');
    return time ? time : 0;
  },
  setNextAlert: function(time) {
    return pebbleStorage.setItem('alert', new Date(time).getTime());
  },
  getTasks: function(type) {
    if(!type) type = 'tasks';
    var value = pebbleStorage.getItem(type);
    if(value) return JSON.parse(value);
    else return [];
  },
  getTask: function(type, index) {
    var value = pebbleStorage.getItem(type);
    if(value) return JSON.parse(value)[index];
    else return null;
  },
  addTask: function(text) {
    var value = pebbleStorage.getItem('tasks');
    var tasks = [];
    if(value) tasks = JSON.parse(value);
    var task = {title: text};
    tasks.push(task);
    return pebbleStorage.setItem('tasks', JSON.stringify(tasks));
  },
  moveTask: function(from, to, index) {
    var fromValue = pebbleStorage.getItem(from);
    var fromTasks = [];
    if(fromValue) fromTasks = JSON.parse(fromValue);
    var toValue = pebbleStorage.getItem(to);
    var toTasks = [];
    if(toValue) toTasks = JSON.parse(toValue);
    var task = fromTasks[index];
    fromTasks.splice(index, 1);
    toTasks.unshift(task);
    pebbleStorage.setItem(from, JSON.stringify(fromTasks));
    pebbleStorage.setItem(to, JSON.stringify(toTasks));
    return true;
  },
  clearHistory: function() {
    return pebbleStorage.setItem('history', JSON.stringify([]));
  },
  removeTask: function(index) {
    var hValue = pebbleStorage.getItem('history');
    var history = [];
    if(hValue) history = JSON.parse(hValue);
    history.splice(index, 1);
    return pebbleStorage.setItem('history', JSON.stringify(history));
  }
};

var setNextAlert = function() {
  // Take date 10 min from now
  var now = new Date(new Date().getTime() + 10 * 60 * 1000);
  var day = now.getUTCDay();
  var hours = now.getHours();
  var nextDay = day;
  var nextHours = 10;
  if(hours < 10) nextHours = 10;
  else if(hours < 17) nextHours = 17;
  else if(hours < 22) nextHours = 22;
  else if(hours > 22) {
    nextHours = 10;
    if(nextDay == 6) nextDay = 0;
    else nextDay++; 
  }
  var nextTime = Clock.weekday(nextDay, nextHours, 0);
  Wakeup.schedule({time: nextTime},
    function(e) {
      if (e.failed) {
        // Log the error reason
        console.log('Wakeup set failed: ' + e.error);
      } else {
        store.setNextAlert(nextTime);
      }
    }
  );
};

var main = new UI.Menu({
  textColor: '#0055AA',
  highlightBackgroundColor: '#0055AA',
  highlightTextColor: 'white',
  sections: [{
    items: [
      {title: '+ Add New Task'},
      {title: 'Check Tasks'},
      {title: 'Task List'},
      {title: 'History'},
      {title: 'Clean History'}
    ]
  }]
});

if(new Date(store.getNextAlert()).getTime() < new Date().getTime()) {
  setNextAlert();
}

var displayCard = function(type, index, next) {
  var task = store.getTask(type, index);
  var card = new UI.Card({
    title: task.title,
    fullscreen: true,
    backgroundColor: '#55AAFF'
  });

  card.action({
    up: 'images/tick.png',
    down: 'images/tick.png'
  });

  card.on('click', 'up', function() {
    if(type == "history") {
      store.moveTask("history", "tasks", index);
      main.show();
      card.hide();
    } else {
      store.moveTask("tasks", "history", index);
      if(next>=0) next--;
      if(next>=0 && next < store.getTasks('tasks').length) displayCard(type, next, next+1);
      else main.show();
      card.hide();
    }
  });

  card.on('click', 'down', function() {
    if(type == "history") {
      store.removeTask(index);
      main.show();   
      card.hide();   
    } else {
      if(next>=0 && next < store.getTasks('tasks').length) displayCard(type, next, next+1);
      else main.show();
      card.hide();
    }
  });

  card.show();
};

var displayTasks = function(type) {
  var tasks = store.getTasks(type);
  var menu = new UI.Menu({
    fullscreen: true,
    textColor: '#0055AA',
    highlightBackgroundColor: '#0055AA',
    highlightTextColor: 'white',
    sections: [{
      title: type,
      items: tasks
    }]
  });

  menu.on('select', function(e) {
    displayCard(type, e.itemIndex, -1);
  });

  menu.show();
};

main.on('select', function(e) {
  if(e.itemIndex == 0) {
    Voice.dictate('start', false, function(e) {
      if (e.err) {
        console.log('Error: ' + e.err);
        return;
      } else {
        store.addTask(e.transcription);
      }
    });
  } else if(e.itemIndex == 1) displayCard('tasks', 0, 1);
  else if(e.itemIndex == 2) displayTasks('tasks');
  else if(e.itemIndex == 3) displayTasks('history');
  else if(e.itemIndex == 4) store.clearHistory();
});

main.show();

Wakeup.on('wakeup', function(e) {
  displayCard('tasks', 0, 1);
});