/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Voice = require('ui/voice');
var Clock = require('clock');
var Wakeup = require('wakeup');
var Vibe = require('ui/vibe');
var Light = require('ui/light');
var Settings = require('settings');

var pebbleStorage = window.localStorage || localStorage;
var store = {
  getNextAlert: function() {
    var time = pebbleStorage.getItem('alert');
    return time ? time : 0;
  },
  setAlert: function(time) {
    return pebbleStorage.setItem('alert', new Date(time).getTime());
  },
  getTasks: function(type) {
    if(!type) type = 'tasks';
    var value = pebbleStorage.getItem(type);
    var tasks = value ? JSON.parse(value) : [];
    return tasks;
  },
  getDisplayTasks: function(type) {
    if(!type) type = 'tasks';
    var value = pebbleStorage.getItem(type);
    var tasks = value ? JSON.parse(value) : [];
    if(type=="history") tasks.unshift({title: "Clear History", icon: "images/remove.png"});
    else tasks.unshift({title: "Add New Task", icon: "images/plus.png"});
    return tasks;
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
    var task = {title: text, added: new Date()};
    tasks.unshift(task);
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

var daysAgo = function(added) {
  var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
  var now = new Date();
  added = new Date(added);
  var diffDays = Math.round(Math.abs((added.getTime() - now.getTime())/(oneDay)));

  if(diffDays<1) return "Added Today";
  else if(diffDays==1) return "Added Yesterday";
  else if(diffDays>1) return "Added "+diffDays+" ago";
};

var validateTime = function(time) {
  if(time > 0 && time < 24) return true;
  else return false;
};

var voiceAdd = function(callback) {
  Voice.dictate('start', false, function(e) {
    if (e.err) {
      console.log('Error: ' + e.err);
      return;
    } else {
      confirmTask(e.transcription, function(resp) {
        if(resp) {
          store.addTask(e.transcription);
          if(callback) callback();
        } else {
          voiceAdd(callback);
        }
      });
    }
  });
};

var setNextAlert = function() {
  var morning = Settings.option('morning') ? Settings.option('morning') : 10;
  var evening = Settings.option('evening') ? Settings.option('evening') : 17;
  var night = Settings.option('night') ? Settings.option('night') : 22;
  // Take date 10 min from now
  var now = new Date(new Date().getTime() + 10 * 60 * 1000);
  var day = now.getUTCDay();
  var hours = now.getHours();
  var nextDay = day;
  var nextHours = morning;
  if(hours < morning) nextHours = morning;
  else if(hours < evening) nextHours = evening;
  else if(hours < night) nextHours = night;
  else if(hours > night) {
    nextHours = morning;
    if(nextDay == 6) nextDay = 0;
    else nextDay++; 
  }
  console.log('wakeup ' + nextDay + ' ' + nextHours);
  var nextTime = Clock.weekday(nextDay, nextHours, 0);
  Wakeup.schedule({time: nextTime, data: {alarmTime: nextTime}},
    function(e) {
      if (e.failed) {
        // Log the error reason
        console.log('Wakeup set failed: ' + e.error);
      } else {
        store.setAlert(nextTime);
      }
    }
  );
};

var displayCard = function(type, index, next) {
  var task = store.getTask(type, index);
  var card = new UI.Card({
    title: task.title,
    body: daysAgo(task.added),
    fullscreen: true,
    backgroundColor: '#55AAFF'
  });

  if(type == "history") {
    card.action({
      up: 'images/reuse.png',
      down: 'images/remove.png'
    });
  } else {
    card.action({
      up: 'images/tick.png',
      down: 'images/cross.png'
    });
  }

  card.on('click', 'up', function() {
    if(type == "history") {
      store.moveTask("history", "tasks", index);
      tasks.items(0, store.getDisplayTasks('tasks'));
      history.items(0, store.getDisplayTasks('history'));
      tasks.show();
      card.hide();
    } else {
      store.moveTask("tasks", "history", index);
      tasks.items(0, store.getDisplayTasks('tasks'));
      history.items(0, store.getDisplayTasks('history'));
      if(next>=0) next--;
      if(next>=0 && next < store.getTasks('tasks').length) displayCard(type, next, next+1);
      else main.show();
      card.hide();
    }
  });

  card.on('click', 'down', function() {
    if(type == "history") {
      store.removeTask(index);
      history.items(0, store.getDisplayTasks('history'));
      history.show();   
      card.hide();   
    } else {
      if(next>=0 && next < store.getTasks('tasks').length) displayCard(type, next, next+1);
      else main.show();
      card.hide();
    }
  });

  card.show();
};

var confirmTask = function(text, callback) {
  var card = new UI.Card({
    title: "Add Task?",
    body: text,
    fullscreen: true,
    backgroundColor: '#55FFAA'
  });

  card.action({
    up: 'images/tick.png',
    down: 'images/cross.png'
  });
  
  card.on('click', 'up', function() {
    card.hide();
    callback(true);
  });

  card.on('click', 'down', function() {
    card.hide();
    callback(false);
  });

  card.show();
}

var configuration = new UI.Card({
  title: "ToDoIt configuration is open",
  body: "Check your phone for configuration options",
  fullscreen: true,
  backgroundColor: '#55AAFF'
});

var tasks = new UI.Menu({
  fullscreen: true,
  textColor: 'black',
  highlightBackgroundColor: 'black',
  highlightTextColor: 'white',
  sections: [{
    title: "Current Tasks",
    items: store.getDisplayTasks('tasks')
  }]
});

tasks.on('select', function(e) {
  if(e.itemIndex == 0) {
    voiceAdd(function() {
      tasks.items(0, store.getDisplayTasks('tasks'));
    });
  } else displayCard('tasks', e.itemIndex-1, -1);
});

var history = new UI.Menu({
  fullscreen: true,
  textColor: 'black',
  highlightBackgroundColor: 'black',
  highlightTextColor: 'white',
  sections: [{
    title: 'Task History',
    items: store.getDisplayTasks('history')
  }]
});

history.on('select', function(e) {
  if(e.itemIndex == 0) {
    store.clearHistory();
    history.items(0, store.getDisplayTasks('history'));
  } else displayCard('history', e.itemIndex-1, -1);
});

var main = new UI.Menu({
  textColor: 'black',
  highlightBackgroundColor: 'black',
  highlightTextColor: 'white',
  sections: [{
    items: [
      {title: 'Add New Task', icon: 'images/plus.png'},
      {title: 'Do Tasks', icon: 'images/check.png'},
      {title: 'Browse Tasks', icon: 'images/tasks.png'},
      {title: 'Task History', icon: 'images/history.png'}
    ]
  }]
});

main.on('select', function(e) {
  if(e.itemIndex == 0) voiceAdd(function() { 
    tasks.items(0, store.getDisplayTasks('tasks')); 
    tasks.show(); 
  });
  else if(e.itemIndex == 1) {
    if(store.getTasks('tasks').length > 0) displayCard('tasks', 0, 1);
  } else if(e.itemIndex == 2) tasks.show();
  else if(e.itemIndex == 3) history.show();
});

main.show();

Wakeup.on('wakeup', function(e) {
  if(store.getTasks('tasks').length > 0) {
    displayCard('tasks', 0, 1);
    Light.trigger();
    Vibe.vibrate('short');
  }
  setNextAlert();
});

Settings.config({ 
    url: 'http://michalkow.github.io/pebble-ToDoIt/?morning='+Settings.option('morning')+'&evening='+Settings.option('evening')+'&night='+Settings.option('night'),
    autoSave: false
  },
  function(e) {
    console.log('http://michalkow.github.io/pebble-ToDoIt/?morning='+Settings.option('morning')+'&evening='+Settings.option('evening')+'&night='+Settings.option('night'));
    configuration.show();
  },
  function(e) {
    if(e.options) {
      console.log(JSON.stringify(e.options));
      if(e.options.morning && validateTime(e.options.morning)) Settings.option('morning', e.options.morning);
      if(e.options.evening && validateTime(e.options.evening)) Settings.option('evening', e.options.evening);
      if(e.options.night && validateTime(e.options.night)) Settings.option('night', e.options.night);
      Wakeup.cancel('all');
      setNextAlert();
    }
    configuration.hide();
  }
);

if(new Date(store.getNextAlert()).getTime() < new Date().getTime()) {
  setNextAlert();
};