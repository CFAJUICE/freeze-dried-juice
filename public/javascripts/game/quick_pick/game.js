/* global angular, createjs, juice */
(function () {
  'use strict';

  var quickPick = angular.module('quick_pick');
  quickPick.factory('QuickPickGame', ['GameResolver', 'Log', 'GameMixin', 'GameFeedback', 'QuickPickView', 'Util', 'GameStateTracker', GameFactory]);

  function GameFactory(GameResolver, Log, GameMixin, GameFeedback, QuickPickView, Util, GameStateTracker) {
    var path = 'quick_pick/images/';
    GameResolver.register('quick_pick', Game, {
      logo: path + 'QuickPick_title_fin.png',
      backgrounds: {
        info: path + 'QuickPick_Scoreboard_Background_grayscale_fin_12-15.png',
        game: path + 'QuickPick_updated_12-18.png',
        feedback: path + 'QuickPick_background_scoreboard.png'
      }
    });

    function Game(gameStateTracker) {
      Log.log('quick_pick', 'inside `quick_pick` constructor');
      //this._stateTracker = gameStateTracker;
      this._stateTracker = new GameStateTracker();
    }
    Game.prototype.isImmediate = function () {
      return true;
    };
    Game.prototype.play = function (content, startingState) {
      this.content = content;
      this.startingState = startingState;

      this.onLoad(this._start);
    };
    Game.prototype._isCorrect = function (choice) {
      return choice.content.id === this.content.answer;
    };
    Game.prototype._start = function () {
      this.view = new QuickPickView(this, document.querySelector('.modal-content #game'));

      this.view.displayInstructions(this.content);
      this.view.displayChoices(this.content, this.startingState);
      this.view.displayPrompt(this.content);

      var game = this,
          view = this.view;
      this.view.onSelect(function (choice) {
        if (game._isCorrect(choice)) {
          view.markCorrect(choice);
          game.answerStatus('correct');
          game._correct(true);
        } else {
          view.markIncorrect(choice);
          game._incorrect(GameMixin.findFeedback(game.content.feedback, choice.content));
        }
      });

      Util.runMathJax();

      this._startingState();
      //MathJax.Hub.Queue(function () {
      //  view.resizeChoices();
      //});
    };

    Game.prototype._startingState = function () {
      if (this.startingState) {
        var choice = this.view.getAnswer();
        if (this._isCorrect(choice)) {
          this._correct(true);
        } else {
          this._incorrect(GameMixin.findFeedback(this.content.feedback, choice.content));
        }
      }
    };

    Game.prototype.rewind = function () {
      this.recordCurrentAnswers();

      this.view.rewind();
      this.view.dismissPopups();
      this._answerStatus = undefined;
    };
    Game.prototype.cleanUp = function () {
      this.view && this.view.reset();
    };
    Game.prototype.showAnswers = function () {
      this.recordCurrentAnswers();

      this.view.showAnswers();
      this.view.dismissPopups();
    };
    Game.prototype.checkAnswers = Util.noop;
    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      var answer   = this.view.getAnswer(),
          feedback = {
            feedbackMessage: '',
            answers: [],
            objectState: this.view.objectState()
          };

      if (answer) {
        var answerFeedback = {
          id: answer.content.id,
          content: answer.content.content,
          feedbackMessage: GameMixin.findFeedback(this.content.feedback, answer.content),
          correct: this._isCorrect(answer)
        };
        feedback.answers.push(answerFeedback);

        feedback.feedbackMessage = answerFeedback.feedbackMessage ||
          (answerFeedback.correct ? this.content.general_correct : this.content.general_incorrect);
      }

      this.recordFeedback(feedback);
    };
    Game.prototype.roundFeedback = function () {
      return this._stateTracker;
    };
    Game.prototype.recordFeedback = function (results) {
      this._stateTracker.record(results);
    };
    Game.prototype.transition = function () {
    };

    Game.prototype._incorrect = function (feedback) {
      this.view.dismissPopups();
      this.answerStatus('incorrect');
      this.view.popup({
        status: 'incorrect',
        isCenter: true,
        title: GameFeedback.incorrect(),
        content: feedback || this.content.general_incorrect,
        x: 450,
        positionAbove: this.view.choices.choices[0].el.querySelector('.bubble'),
        attachTo: document.querySelector('.modal-content'),
        className: 'game-popup no-arrow',
        remove: 'click'
      });
      this.view.playSound('incorrect');
      return false;
    };
    Game.prototype._correct = function (done) {
      this.view.dismissPopups();

      this.view.popup({
        status: 'correct',
        isCenter: true,
        title: GameFeedback.correct(),
        content: this.content.general_correct,
        x: 450,
        y: 100,
        feedbackSuccess: done,
        attachTo: document.querySelector('.modal-content'),
        className: 'game-popup no-arrow',
        remove: 'click'
      });
      this.view.playSound('correct');
      return true;
    };

    GameMixin.include(Game);
    return Game;
  }
})();