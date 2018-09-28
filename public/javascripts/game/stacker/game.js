/* global angular, createjs, juice */
(function () {
  'use strict';

  var MODULE  = 'stacker',
      stacker = angular.module(MODULE);
  stacker.factory('StackerGame', ['GameResolver', 'Log', 'Util', 'StackerView', 'GameFeedback', 'GameMixin', 'GameStateTracker', function (GameResolver, Log, Util, StackerView, GameFeedback, GameMixin, GameStateTracker) {
    var path = 'stacker/images/';
    GameResolver.register(MODULE, Game, {
      logo: path + 'stacker_logo.png',
      backgrounds: {
        info: path + 'Stacker_Background_grayscale.png',
        game: path + 'stacker_background.png'
      },
      images: [
        {id: 'coupon', src: path + 'Stacker_Coupon.png'}
      ]
    });

    function Game(gameStateTracker) {
      //this._roundFeedback = gameStateTracker;
      this._roundFeedback = new GameStateTracker();
    }

    Game.prototype.isImmediate = function () {
      return false;
    };

    Game.prototype.play = function (content, startingState) {
      this.content = content;
      this.startingState = startingState;

      this.onLoad(this._start);
    };

    Game.prototype._start = function () {
      this.view = new StackerView(this, document.querySelector('.modal-content #game'));

      this.view.displayDirections(this.content.directions, this.content.instructions_img);
      this.view.displayStack(this.content, this.startingState);
      this.view.displayScaleIndicators(this.content);
      if (this.startingState) {
        this.checkAnswers();
      }

      var game = this,
          view = game.view;
      view.afterMathJax(game.content); //decided not to run after mathjax because it caused a noticeable UI jump
      Util.runMathJax(function () {});
    };

    Game.prototype.roundFeedback = function () {
      return this._roundFeedback;
    };

    Game.prototype.transition = function () {
      this.view.transition();
    };

    Game.prototype.cleanUp = function () {
      this.view && this.view.reset();
      Util.clearTimers();
    };

    Game.prototype.checkAnswers = function () {
      var domAnswers = this.view.getAnswers(),
          answers    = this.content.answers,
          view       = this.view;

      var answerStatus = this._compareAnswer(answers, domAnswers);
      angular.forEach(answerStatus, function (status) {
        view.toggleCorrect(status.el, status.correct);
      });

      if (this._isCorrect(answerStatus)) {
        //this.recordFeedback({ //Feedback for 'submit'
        //  answers: answerStatus,
        //  objectState: this.view.objectState()
        //});
        this.recordCurrentAnswers();
        this.view.popup({
          status: 'correct',
          isCenter: true,
          title: GameFeedback.correct(),
          content: this.content.general_correct,
          feedbackSuccess: true,
          x: 450,
          y: 350,
          attachTo: document.querySelector('.modal-content')
        });
        this.view.playSound(juice.sounds.correct);
        return true;
      } else {
        this.view.popup(angular.extend({
          status: 'incorrect',
          isCenter: true,
          x: 450,
          y: 350,
          attachTo: document.querySelector('.modal-content')
        }, this._constructFeedback(answerStatus)));
        this.view.playSound(juice.sounds.incorrect);
        return false;
      }
    };

    Game.prototype._isCorrect = function (answerStatus) {
      return answerStatus.every(function (item) { return item.correct; });
    };

    Game.prototype.showAnswers = function () {
      this.recordCurrentAnswers(); //before we correct everything, record what actually happened

      this.view.showAnswers(this.content.answers);
      this.view.dismissPopups();
    };

    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      var answerStatus = this._compareAnswer(this.content.answers, this.view.getAnswers()),
          feedbackMessage;
      if (this._isCorrect(answerStatus)) {
        feedbackMessage = this.content.general_correct;
      } else {
        feedbackMessage = this._constructFeedback(answerStatus).content;
      }

      answerStatus.forEach(function removeDomFromAnswer(answer){
        //dom elements can't be saved into mongodb
        delete answer.el;
      })
      this.recordFeedback({ //Feedback for 'submit'
        feedbackMessage: feedbackMessage,
        answers: answerStatus,
        objectState: this.view.objectState()
      });
    };

    Game.prototype.recordFeedback = function (results) {
      this._roundFeedback.record(results);
    };

    Game.prototype.rewind = function () {
      this.recordCurrentAnswers();

      this.view.clearWrongAnswers();
      this.view.dismissPopups();
    };

    Game.prototype.getAsset = function (assetId) {
      return this.loader.getResult(assetId);
    };

    Game.prototype._compareAnswer = function (answers, domAnswers) {
      var answerStatus = [];
      for (var i = 0; i < domAnswers.length; i++) {
        var domAnswer = domAnswers.get ? domAnswers.eq(i) : $(domAnswers[i]),
            answer    = answers[i],
            status    = {
              id: answer.value,
              content: domAnswer.eq ? domAnswer.data('answer-content') : domAnswer.getAttribute('data-answer-content'),
              feedbackMessage: '',
              el: domAnswer
            };

        status.correct = domAnswer.data('answer-id') === answer.value;
        answerStatus.push(status);
      }
      return answerStatus;
    };
    Game.prototype._constructFeedback = function (answerStatuses) {
      for (var i = 0; i < this.content.feedback.length; i++) {
        var feedback = this.content.feedback[i];
        if (!feedback.conditions) {
          continue; //not a full condition constructed
        }

        if (feedback.conditions.length === answerStatuses.length) {
          var matches = true;
          for (var j = 0; j < feedback.conditions.length; j++) {
            var condition = feedback.conditions[j],
                response  = answerStatuses[j];

            if (response.content !== condition.content) {
              matches = false;
            }
          }
          if (matches) {
            return {title: GameFeedback.incorrect(), content: feedback.content};
          }
        }
      }
      return {title: GameFeedback.incorrect(), content: this.content.general_incorrect};
    };

    GameMixin.include(Game);
    return Game;
  }]);
})();
