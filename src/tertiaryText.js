/**
 * tertiary_text.js
 *
 * By Michal Kowalkowski (kowalkowski.michal@gmail.com)
 */

var UI = require('ui');
var Vector2 = require('vector2');

var tertiaryText = function(titleText, callback) {

  var characters = [
    "abc def ghi",
    "jkl m"+String.fromCharCode(160)+"n opq",
    "rst uvw xyz"
  ];

  var specials = [
    "123 456 789",
    "0!? _'\" $()",
    "&*| %:@ /,."
  ];

  var main = new UI.Window({
    backgroundColor: 'white',
    fullscreen: true
  });
  //var bg = new UI.Rect({position: new Vector2(0, 0), size: new Vector2(144, 168),  });
  var title = new UI.Text({position: new Vector2(3, 2), size: new Vector2(109, 22), font: 'gothic-18-bold', text: titleText ? titleText : "Text Input", color: "black", textAlign: "left" });
  var input = new UI.Text({position: new Vector2(6, 30), size: new Vector2(104, 138), font: 'gothic-24-bold', text: "", color: "black", textOverflow: "wrap", textAlign: "left" });
  var bar = new UI.Rect({position: new Vector2(112, 0), size: new Vector2(32, 168), backgroundColor: 'black' });
  var action = [
    new UI.Text({position: new Vector2(112, 0), size: new Vector2(32, 44), text: characters[0], color: "white", textOverflow: "wrap", textAlign: "center", font: 'gothic-14' }),
    new UI.Text({position: new Vector2(112, 62), size: new Vector2(32, 44), text: characters[1], color: "white", textOverflow: "wrap", textAlign: "center", font: 'gothic-14' }),
    new UI.Text({position: new Vector2(112, 122), size: new Vector2(32, 44), text: characters[2], color: "white", textOverflow: "wrap", textAlign: "center", font: 'gothic-14' })
  ];
  main.add(title);
  main.add(bar);
  main.add(input);
  main.add(action[0]);
  main.add(action[1]);
  main.add(action[2]);

  main.show();

  main.on('click', 'up', function(e) {
    buttonClick(0);
  });

  main.on('longClick', 'up', function(e) {
    if(action[0].text() == characters[0]) {
      setActions(characters, true, true);
    } else if(action[0].text() == characters[0].toUpperCase()) {
      setActions(specials, true);
    } else {
      setActions(characters, true);     
    }
  });

  main.on('click', 'select', function(e) {
    buttonClick(1);
  });

  main.on('longClick', 'select', function(e) {
    if(callback) {
      callback(input.text());
      main.hide();
    }
  });

  main.on('click', 'down', function(e) {
    buttonClick(2);
  });

  main.on('longClick', 'down', function(e) {
    if(action[0].text() != characters[0]) {
      setActions(characters, true);
    } else {
      var newInput = input.text().slice(0, -1);
      input.text(newInput);
    }
  });

  var buttonClick = function(button) {
    if(action[button].text() == characters[button]) {
      var newText = characters[button].split(' ');
      setActions(newText, false);
    } else if(action[button].text() == characters[button].toUpperCase()) {
      var newText = characters[button].toUpperCase().split(' ');
      setActions(newText, false);
    } else if(action[button].text() == specials[button]) {
      var newText = specials[button].split(' ');
      setActions(newText, false);
    } else if(action[button].text().length == 3) {
      var newText = action[button].text().split('');
      setActions(newText, false);  
    } else if(action[button].text().length == 1) {
      var newInput = input.text() + action[button].text();
      input.text(newInput);
      setActions(characters, true); 
    }
  };

  var setActions = function(arr, fullsize, uppercase) {
    for (var i = 0; i < action.length; i++) {
      action[i].text(uppercase ? arr[i].toUpperCase() : arr[i]);
      action[i].size(fullsize ? new Vector2(32, 44) : new Vector2(32, 15));
    };
    if(fullsize) {
      action[0].position(new Vector2(112, 0));
      action[1].position(new Vector2(112, 62));
      action[2].position(new Vector2(112, 122));
    } else {
      action[0].position(new Vector2(112, 15));
      action[1].position(new Vector2(112, 76));
      action[2].position(new Vector2(112, 138));
    }
  }
};

module.exports = tertiaryText;