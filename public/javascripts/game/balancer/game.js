/* global angular, createjs, juice */
(function () {
  'use strict';

  var balancer = angular.module('balancer');
  balancer.factory('BalancerGame', ['GameResolver', 'Log', 'GameMixin', 'GameFeedback', 'BalancerView', 'Util', 'GameStateTracker', GameFactory]);

  function GameFactory(GameResolver, Log, GameMixin, GameFeedback, BalancerView, Util, GameStateTracker) {
    var path = 'balancer/images/';
    GameResolver.register('balancer', Game, {
      logo: path + 'Balancer_title_fin.png',
      backgrounds: {
        info: path + 'Balancer_background_grayscale.png',
        game: path + 'Balancer_background.png'
      },
      images: [
        {id: 'ball', src: path + 'Balancer_Ball.png'},
        {id: 'platform', src: path + 'Balancer_Board_fin.png'}
      ]
    });

    function Game(gameStateTracker) {
      //this._stateTracker = gameStateTracker;
      this._stateTracker = new GameStateTracker();
    }
    Game.prototype.isImmediate = function () {
      return true;
    };
    Game.prototype.play = function (content, startingState) {
//console.log('MathJax Queue in Blancer play()', MathJax.Hub.queue.queue);
      this.content = content;
      console.log('WAT', content);

      this.startingState = startingState;

      this.onLoad(this._start);
    };
    Game.prototype._start = function () {
      this.view = new BalancerView(this, document.querySelector('.modal-content #game'));

      this.view.displayBalance(this.content);
      this.view.displayInstructions(this.content);
      this.view.displayChoices(this.content, this.startingState);
      this.view.displayPrompt(this.content);

      var view = this.view;
console.log('MathJax Queue before Balancer cleanup', MathJax.Hub.queue.queue);
	  MathJax.Hub.queue.queue = [];  //clean-up MathJax Queue!!
console.log('MathJax Queue after Balancer cleanup', MathJax.Hub.queue.queue);
      Util.runMathJax(function () {
        view.afterMathJax();
      });
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
      this.recordCurrentAnswers(); //before we correct everything, record what actually happened

      this.view.showAnswers();
      this.view.dismissPopups();

      var answer = this.view.getAnswer();
      if (answer) {
        answer.markCorrect();
      }
    };
    Game.prototype.checkAnswers = Util.noop;
    Game.prototype.showFeedback = function (showAnswers) {
      var answer   = this.view.getAnswer(),
          feedback = this.content.feedback;

      answer && answer.markCorrect(); //this answer shouldn't know it's correct
      if (answer && answer.isCorrect()) {
        !showAnswers && this.answerStatus('correct');
        this.view.popup({
          status: 'correct',
          isCenter: true,
          title: GameFeedback.correct(),
          content: this.content.general_correct,
          x: 450,
          y: 100,
          feedbackSuccess: true,
          attachTo: document.querySelector('.modal-content'),
          className: 'game-popup no-arrow',
          remove: 'click'
        });
        this.view.playSound('correct');
        return true;
      } else {
        this.answerStatus('incorrect');
        this.view.popup({
          status: 'incorrect',
          isCenter: true,
          title: GameFeedback.incorrect(),
          content: GameMixin.findFeedback(feedback, answer.content) || this.content.general_incorrect,
          x: 450,
          y: 100,
          attachTo: document.querySelector('.modal-content'),
          className: 'game-popup no-arrow',
          remove: 'click'
        });
        this.view.playSound('incorrect');
        return false;
      }
    };
    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      var answer   = this.view.getAnswer(),
          feedback = {
            feedbackMessage: '',
            answers: [],
            objectState: this.view.objectState() //FIXME
          };

      if (answer) {
        var answerFeedback = {
          id: answer.content.id,
          content: answer.content.content,
          feedbackMessage: GameMixin.findFeedback(this.content.feedback, answer.content),
          correct: !!answer.content.correct
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
      this.view && this.view.transition();
    };
    Game.prototype.getAsset = function (assetId) {
      return this.loader.getResult(assetId);
    };

    GameMixin.include(Game);
    return Game;
  }
})();
