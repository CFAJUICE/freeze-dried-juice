/* global angular, createjs, juice, $, Draggabilly, Sortable */
(function () {
  'use strict';

  var MODULE        = 'game_example',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('GameExampleView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

  function ViewFactory(Log, Util, ViewManager, DomHelper) {
    var styles = {
      defaults: {
        fontSize: 16
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `game_example` view constructor');

      this.game = game;
      this.containerEl = containerEl;
      this.manager = new ViewManager();
    }

    View.prototype.displayInstructions = function (content) {};

    View.prototype.displayChoices = function (content) {
      //Sortable
      //Draggable
    };

    View.prototype.afterMathJax = function () {
      //angular.forEach(this.choices, function (choice) {
      //  choice.recordUiState();
      //});
    };

    View.prototype.dismissPopups = function () {
      this.manager.dismissPopups();
    };
    View.prototype.reset = function () {
      this.manager.cleanUi();
      this.manager.dismissPopups();
    };
    View.prototype.transition = function () {

    };
    View.prototype.popup = function () {
      return this.manager.popup.apply(this.manager, arguments);
    };
    View.prototype.playSound = function () {
      return this.manager.playSound.apply(this.manager, arguments);
    };
    View.prototype.showAnswers = function () {
      //
    };
    View.prototype.rewind = function () {
      //
    };
    View.prototype.objectState = function () {
      return [];
    };

    return View;
  }
})();
