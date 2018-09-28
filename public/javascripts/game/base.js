/* global createjs, angular, juice */
var juice = juice || {};
juice.sounds = {
  collision: 'collision',
  correct: 'correct',
  incorrect: 'incorrect',
  click: 'click',
  snapTo: 'snapTo',
  applause: 'applause',
  applauseLarge: 'applauseLarge',
  applauseMedium: 'applauseMedium',
  applauseSmall: 'applauseSmall',
  fireworksApplause: 'fireworksApplause',
  arrow: 'arrow',
  zoom: 'zoom'
};

$().ready(function () {
  createjs.Sound.registerSound('/javascripts/game/sounds/Button Click.mp3', juice.sounds.click);
  createjs.Sound.registerSound('/javascripts/game/sounds/Collision.mp3', juice.sounds.collision);
  createjs.Sound.registerSound('/javascripts/game/sounds/Correct.mp3', juice.sounds.correct);
  createjs.Sound.registerSound('/javascripts/game/sounds/Incorrect.mp3', juice.sounds.incorrect);
  createjs.Sound.registerSound('/javascripts/game/sounds/Click-SoundBible.com-1387633738.mp3', juice.sounds.snapTo);
  createjs.Sound.registerSound('/javascripts/game/sounds/SMALL_CROWD_APPLAUSE-Yannick_Lemieux-1268806408.mp3', juice.sounds.applause);
  createjs.Sound.registerSound('/javascripts/game/sounds/Fireworks Finale-SoundBible.com-370363529.mp3', juice.sounds.fireworksApplause);
  createjs.Sound.registerSound('/javascripts/game/sounds/applause_small.mp3', juice.sounds.applauseSmall);
  createjs.Sound.registerSound('/javascripts/game/sounds/applause_medium.mp3', juice.sounds.applauseMedium);
  createjs.Sound.registerSound('/javascripts/game/sounds/applause_large.mp3', juice.sounds.applauseLarge);
  createjs.Sound.registerSound('/javascripts/game/sounds/Arrow-SoundBible.com-1760405458.mp3', juice.sounds.arrow);
  createjs.Sound.registerSound('/javascripts/game/sounds/flyby-Conor-1500306612.mp3', juice.sounds.zoom);
});


(function () {
  'use strict';
  window.juiceDisplayError = function (errorDisplay) {
    window.juiceDisplayError.count = window.juiceDisplayError.count || 0;
    window.juiceDisplayError.count++;

    if (typeof errorDisplay !== 'string') {
      errorDisplay = 'Error: ' + errorDisplay.message + ' Script: ' + errorDisplay.fileName + ' Line: ' + errorDisplay.lineNumber + ' Column: ' + errorDisplay.columnNumber + ' StackTrace: ' +  errorDisplay.stack;
    }
    helpers.logError('widget', errorDisplay);

    var debugView = document.body.querySelector('#debug-view'),
        content, toggle;
    if (!debugView) {
      debugView = document.createElement('div');
      debugView.id = 'debug-view';
      debugView.style.zIndex = 10000;
      debugView.style.position = 'fixed';
      debugView.style.top = '0';
      debugView.style.left = '0';
      debugView.style.height = '200px';
      debugView.style.width = '300px';
      debugView.style.overflow = 'scroll';
      debugView.style.background = 'white';
      debugView.style.padding = '10px';
      debugView.style.color = 'red';

      content = document.createElement('div');
      content.style.marginTop = '30px';
      content.className = 'content';
      debugView.appendChild(content);

      toggle = document.createElement('div');
      toggle.style.position = 'absolute';
      toggle.style.top = '5px';
      toggle.className = 'debug-toggle';
      toggle.innerHTML = '<button class="btn btn-info debug-toggle">toggle errors</button>';
      debugView.appendChild(toggle);

      document.body.appendChild(debugView);

      debugView.addEventListener('click', function (e) {
        if (e.target.className.indexOf('debug-toggle') !== -1) {
          if (debugView.className.indexOf('debug-hidden') === -1) {
            debugView.className += ' debug-hidden';
            debugView.style.height = '50px';
            content.className += ' hidden';
          } else {
            debugView.className = debugView.className.replace('debug-hidden', '');
            debugView.style.height = '200px';
            content.className = content.className.replace('hidden', '');
          }
        }
      });
    }

    content = debugView.querySelector('.content');
    content.innerHTML = (window.juiceDisplayError.count + '. ') + errorDisplay + '<br/>---<br/><br/>' + content.innerHTML;
  };

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    var errorDisplay = 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber + ' Column: ' + column + ' StackTrace: ' +  errorObj;
    if (!document.body) {
      return alert(errorDisplay);
    }

    juiceDisplayError(errorDisplay);
  };

  var manifest = [
    {src: 'images/bar_button.png', id: 'bar_button'},
    {src: 'images/bar_button_pressed.png', id: 'bar_button_pressed'},
    {src: 'images/info_button.png', id: 'info'},
    {src: 'images/info_button_pressed.png', id: 'info_pressed'},
    {src: 'images/refresh_button.png', id: 'refresh'},
    {src: 'images/refresh_button_pressed.png', id: 'refresh_pressed'},
    {src: 'images/bottom_bar.png', id: 'bottom_bar'},

    {src: 'images/round_light.png', id: 'round_light'},
    {src: 'images/round_light_off_color.png', id: 'round_light_off'},
    {src: 'images/round_light_on_color.png', id: 'round_light_on'},
    {src: 'images/top_bar.png', id: 'top_bar'}
  ];
  var preload = new createjs.LoadQueue(true, '/');
  preload.installPlugin(createjs.Sound);
  preload.loadManifest(manifest, true, '/javascripts/game/');

  juice.preload = preload;
})();
