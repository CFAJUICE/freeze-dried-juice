/* global angular, createjs, juice */
(function () {
  'use strict';

  /**
   * Gives an example of the Game interface
   * @type {module}
   */
  var exampleGame = angular.module('game_example'),
      LOG_CONTEXT = 'game_example';
  exampleGame.factory('GameExampleGame', ['GameResolver', 'Log', 'GameMixin', 'GameStateTracker', 'GameExampleView', GameFactory]);

  function GameFactory(GameResolver, Log, GameMixin, GameStateTracker, GameExampleView) {
    GameResolver.register('game_example', Game, {
      logo: '',
      backgrounds: {
        info: '',
        game: ''
      }
    });

    function Game() {
      Log.log(LOG_CONTEXT, 'inside `game_example` constructor');
      this.stateTracker = new GameStateTracker();
    }

    Game.prototype.isImmediate = function () {
      return false;
    };

    Game.prototype.play = function (content, startingState) {
      this.view = new GameExampleView(this, document.querySelector('.modal-content #game'));
      this.content = content;
      this.startingState = startingState;
      this.onLoad(this._start);
    };

    Game.prototype._start = function () {
      this.view.displayInstructions(this.content);
      this.view.displayChoices(this.content);
    };

    /**
     * Return the current feedback for the round, what was right/wrong and saved state about the game
     * @returns {{}}
     */
    Game.prototype.roundFeedback = function () {
      Log.log(LOG_CONTEXT, ['roundFeedback', arguments]);
      console.trace();
      return this.stateTracker;
    };

    /**
     * Run through whatever is necessary to clean up the game (for example, resetting a canvas, removing events + DOM elements, or
     * resetting the world in a physics engine)
     */
    Game.prototype.cleanUp = function () {
      Log.log(LOG_CONTEXT, ['cleanUp', arguments]);
      console.trace();
    };

    /**
     * Actual start of the gameplay
     * @param content content that will be displayed to the user
     * @param startingState if we're showing the user a previous gameplay experience, this will include data specific to this game on how to recreate the gameplay
     */
    Game.prototype.play = function (content, startingState) {
      Log.log(LOG_CONTEXT, ['play', arguments]);
      console.trace();
    };

    /**
     * This is used for games that have Check It functionality. Not necessary for 'immediate' feedback games
     */
    Game.prototype.checkAnswers = function () {
      Log.log(LOG_CONTEXT, ['checkAnswers', arguments]);
      console.trace();
    };

    /**
     * Show the player the answers. Construct the game content so that the answers are displayed for the player.
     */
    Game.prototype.showAnswers = function () {
      Log.log(LOG_CONTEXT, ['showAnswers', arguments]);
      console.trace();
    };

    /**
     * Forces game to record the current answers, whatever they are and whatever state the game is in
     */
    Game.prototype.recordCurrentAnswers = function () {
      Log.log(LOG_CONTEXT, ['recordCurrentAnswers', arguments]);
      this.stateTracker.record({
        feedbackMessage: '',
        answers: [{
          id: '',
          content: '',
          feedbackMessage: '',
          correct: false
        }],
        objectState: []
      });
      console.trace();
    };

    /**
     * 'Rewinding' a game means you remove all wrong answers, and leave the right answers behind
     */
    Game.prototype.rewind = function () {
      Log.log(LOG_CONTEXT, ['rewind', arguments]);
      console.trace();
    };

    /**
     * Only required for `immediate` feedback games
     * Should be able to accept an arbitrary amount of listeners, managed internally in whatever way works best
     * Immediate feedback games don't wait for the player to ask for an answer, but give feedback immediately whenever the player
     * performs an appropriate action. The listener(s) provided here are meant to be invoked whenever the user performs
     * an action that would trigger feedback
     * @param statusListenerCallback callback to be invoked whenever the status of the game changes (correct / incorrect)
     */
    Game.prototype.onStatusChange = function (statusListenerCallback) {
      Log.log(LOG_CONTEXT, ['onStatusChange', arguments]);
      console.trace();
    };

    Game.prototype.transition = function () {
      this.view.transition();
    };

    GameMixin.include(Game);
    return Game;
  }
})();