/**
 * ToDoIt in Pebble.js
 *
 * By Michal Kowalkowski (kowalkowski.michal@gmail.com)
 */

var UI = require('ui');
var Voice = require('ui/voice');
var Clock = require('clock');
var Wakeup = require('wakeup');
var Vibe = require('ui/vibe');
var Light = require('ui/light');
var Settings = require('settings');
var Platform = require('platform');
var tertiaryText = require('./tertiaryText.js');

var locales = {
  pl: {
    "Clear History": "Usuń Historię",
    "Add New Task": "Dodaj Zadanie",
    "Added Today": "Dodane Dzisiaj",
    "Added Yesterday": "Dodane Wczoraj",
    "Added ": "Dodane ",
    " ago": " dni temu",
    "No Mic": " Brak Mikrofonu",
    "Sorry, you will have to add new tasks via app configuration in your phone": "Przepraszamy, bęsziesz musiał dodać zadania przez ustawienia applikacji w telefonie",
    "ToDoIt configuration is open": "Konfiguracja ToDoIt otwarta",
    "Check your phone for configuration options": "Sprawdź opcje konfiguracji na telefonie",
    "Current Tasks": "Obecne Zadania",
    'Task History': "Historia Zadań",
    'Do Tasks': "Wykonaj Zadania",
    'Browse Tasks': "Zobacz Zadania",
    'Task History': "Historia Zadań"
  }
}

console.log('Phone language is ' + navigator.language);
var __ = function(key) {
  var lang = navigator.language.substring(0,2);
  console.log("Locale is: "+lang);
  if(locales[lang]) {
    if(locales[lang][key]) return locales[lang][key];
    else return key;
  } else return key;
}

if(Platform.version() != 'aplite' && Platform.version() != 'pypkjs') { //There exists Pebble.getActiveWatchInfo().platform; however it appears to be broken. I'll check into this further
    var colors = {
      green: '#00AA55',
      lblue: '#00AAFF',
      dblue: '#0055AA',
      orange: '#FF5500',
      purple: '#AA00AA',
    }
} else {
    // This is the Aplite platform, getActiveWatchinfo is unavaliable in SDK versions < 3.0
    var colors = {
      green: 'white',
      lblue: 'white',
      dblue: 'black',
      orange: 'black',
      purple: 'black',
    }
}

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
    if(type=="history") tasks.unshift({title: __("Clear History"), icon: "images/remove.png"});
    else tasks.unshift({title: __("Add New Task"), icon: "images/plus.png"});
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
    setNextAlert();
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
    setNextAlert();
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

  if(diffDays<1) return __("Added Today");
  else if(diffDays==1) return __("Added Yesterday");
  else if(diffDays>1) return __("Added ")+diffDays+__(" ago");
};

var validateTime = function(time) {
  if(time == -2) return true;
  else if(time >= 0 && time < 24) return true;
  else return false;
};

var voiceAdd = function(callback) {
  if(Platform.version() != 'aplite' && Platform.version() != 'pypkjs' && !Settings.option('tertiary')) {
    var card = new UI.Card({
      title: __("Add Task?"),
      fullscreen: true,
      backgroundColor: colors.green
    });

    card.action({
      up: 'images/tick.png',
      down: 'images/cross.png'
    });
    
    card.on('click', 'up', function() {
      store.addTask(card.body());
      if(callback) callback();
      card.hide();
    });

    card.on('click', 'down', function() {
      voiceAdd(callback);
      card.hide();
    });

    card.show();

    Voice.dictate('start', false, function(e) {
      if (e.err) {
        card.hide();
        return;
      } else {
        card.body(e.transcription);
        card.backgroundColor(colors.green);
      }
    });
  } else {
    tertiaryText('Add New Task', function(text) {
      store.addTask(text);
      if(callback) callback();
    }); 
  }
};

var setNextAlert = function() {
  if(store.getTasks('tasks').length > 0) {
    var reminders = [];
    if(Settings.option('reminders')) { 
      reminders = JSON.parse(Settings.option('reminders'));
    } else reminders = [11,17,21];
    console.log('Reminders: '+JSON.stringify(reminders));
    if(reminders.length>0) {
      reminders.sort(function(a, b) { return a-b });
      console.log('Reminders sorted: '+JSON.stringify(reminders));
      // Take date 5 min from now
      var now = new Date(new Date().getTime() + 5 * 60 * 1000);
      var day = now.getUTCDay();
      var hours = now.getHours();
      var nextHours = null;
      var nextDay = day;
      for (var i = 0; i < reminders.length; i++) {
        if(hours < reminders[i]) {
          nextHours = reminders[i];
          break;
        }
      }
      if(nextHours===null) {
        if(nextDay == 6) nextDay = 0;
        else nextDay++; 
        nextHours = reminders[0];
      }
      console.log(now);
      var nextTime = Clock.weekday(nextDay, nextHours, 0);
      console.log(nextTime);
      Wakeup.cancel('all');
      Wakeup.schedule({time: nextTime, data: {alarmTime: nextTime}},
        function(e) {
          if (e.failed) {
            // Log the error reason
            console.log('Wakeup set failed: ' + e.error);
            Wakeup.cancel('all');
          } else {
            console.log('Wakeup set - '+nextDay +' '+ nextHours)
            store.setAlert(nextTime);
          }
        }
      );
    }
  } else {
    console.log('No tasks - clear wake up');
    Wakeup.cancel('all');
  }
};

var displayCard = function(type, index, next, wakeup) {
  var task = store.getTask(type, index);
  var card = new UI.Card({
    title: task.title,
    body: daysAgo(task.added),
    fullscreen: true,
    backgroundColor: colors.lblue
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
      else if(wakeup) main.hide();
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
      else if(wakeup) main.hide();
      else main.show();
      card.hide();
    }
  });

  card.show();
};

var configuration = new UI.Card({
  title: __("ToDoIt configuration is open"),
  body: __("Check your phone for configuration options"),
  fullscreen: true,
  backgroundColor: colors.lblue
});

var tasks = new UI.Menu({
  fullscreen: true,
  textColor: 'black',
  highlightBackgroundColor: colors.dblue,
  highlightTextColor: 'white',
  sections: [{
    title: __("Current Tasks"),
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
  highlightBackgroundColor: colors.purple,
  highlightTextColor: 'white',
  sections: [{
    title: __('Task History'),
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
  highlightBackgroundColor: colors.orange,
  highlightTextColor: 'white',
  sections: [{
    items: [
      {title: __('Add New Task'), icon: 'images/plus.png'},
      {title: __('Do Tasks'), icon: 'images/check.png'},
      {title: __('Browse Tasks'), icon: 'images/tasks.png'},
      {title: __('Task History'), icon: 'images/history.png'}
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
    displayCard('tasks', 0, 1, true);
    Light.trigger();
    Vibe.vibrate('short');
  }
  setNextAlert();
});

Settings.config({ 
    url: 'http://michalkow.github.io/pebble-ToDoIt/?platform='+Platform.version(),
    autoSave: false
  },
  function(e) {
    configuration.show();
  },
  function(e) {
    if(e.options) {
      if(e.options.reminders) Settings.option('reminders', JSON.stringify(e.options.reminders));
      if(e.options.tertiary) Settings.option('tertiary', e.options.tertiary); 
      else Settings.option('tertiary', null);
      if(e.options.tasks) {
        for (var i = 0; i < e.options.tasks.length; i++) {
          store.addTask(e.options.tasks[i]);
        };
        tasks.items(0, store.getDisplayTasks('tasks'));
      }
      setNextAlert();
    }
    configuration.hide();
  }
);

if(new Date(store.getNextAlert()).getTime() < new Date().getTime()) {
  setNextAlert();
}