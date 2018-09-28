/* global angular, createjs, juice */
(function () {
  'use strict';

  var pickAndStack = angular.module('pick_and_stack');
  pickAndStack.factory('PickAndStackGame', ['GameResolver', 'Log', 'GameMixin', 'GameFeedback', 'PickAndStackView', 'Util', 'GameStateTracker', 'ASSETS', GameFactory]);

  function GameFactory(GameResolver, Log, GameMixin, GameFeedback, PickAndStackView, Util, GameStateTracker, ASSETS) {
    var path           = 'pick_and_stack/images/',
        IMMEDIATE_MODE = 'immediate';
    GameResolver.register('pick_and_stack', Game, {
      logo: path + ASSETS.logo, //'PickandStack_title_fin.png',
      backgrounds: {
        info: path + ASSETS.infoBackground, //'PicknStack_background_grayscale.png',
        game: path + ASSETS.gameBackground //'PicknStack_background_darker.png'
      }
    });

    function Game(gameStateTracker) {
      Log.info('pick_and_stack', 'inside `pick_and_stack` constructor');
      this.mode = IMMEDIATE_MODE;
      this._stateTracker = new GameStateTracker();
    }

    Game.prototype.isImmediate = function () {
      return this.mode === IMMEDIATE_MODE;
    };

    Game.prototype.play = function (content, startingState) {
      this.content = content;
      this.startingState = startingState;

      this.onLoad(this._start);
    };
    Game.prototype._start = function () {
      this.view = new PickAndStackView(this, document.querySelector('.modal-content #game'));

      this.view.displayInstructions(this.content);
      this.view.displayLists(this.content, this.startingState);
      this.view.displayPrompt(this.content);
      this.view.enablePickMode();

      Util.runMathJax();

      if (this.startingState && this.startingState.length) {
        this.view.startingState(this.startingState);
        if (this.startingState[0].mode === 'immediate') {
          this._showPickAttempt(); //specialized method for showing attempts
        } else {
          this.handleStack();
        }
      }
    };

    Game.prototype.rewind = function () {
      this.view.rewind();
      this.view.dismissPopups();
      if (this.isImmediate()) {
        this._answerStatus = undefined;
      }
    };
    Game.prototype.cleanUp = function () {
      this.view && this.view.reset();
    };
    Game.prototype.showAnswers = function () {
      this.recordCurrentAnswers(); //before we correct everything, record what actually happened

      this.view.dismissPopups();
      if (this.isImmediate()) {
        this.view.showPickAnswers(this.content.answers);

        if (this._shouldDisregardOrder()) {
          this._showStackAnswers();
        } else {
          this._setCheckMode();
          this._popup({
            status: 'neutral',
            content: GameFeedback.message('pickAndStack.switchToStack')
          });
        }
      } else {
        this._showStackAnswers();
      }
    };
    Game.prototype._showStackAnswers = function () {
      this.view.showAnswers(this.content.answers);
    };
    Game.prototype.isMultiMode = function () {
      return !this._shouldDisregardOrder();
    };
    Game.prototype.checkAnswers = function () {
      if (this.isImmediate()) {
        return;
      }
      return this.handleStack();
    };














    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      this._pickState = this._pickState || [];
      this._stackState = this._stackState || [];

      var stackList = this.view.getStackList(),
          pickList  = this.view.getPickList(),
          answers   = this.content.answers,
          allValues, value, i,
          feedbackMessage;




      if (this.isImmediate()) { //if we're still in immediate mode, we store these answers separately
        //pickstate contains everything you've picked up until that point BEFORE this
        //get any status marked values, and remove them from the state
        //  whatever is left in the list means that's our newest answer
        var _pickState          = this._pickState.concat([]), //readonly
            newestAnswer,
            previousStateLookup = {},
            isCorrect,
            splicePickState     = function (value) {
              var item = previousStateLookup[value.content.id];
              if (item && value.hasStatus()) {
                var index = _pickState.indexOf(item);
                _pickState.splice(index, 1);
              } else if (value.hasStatus()) {
                newestAnswer = value;
              }
            };

        angular.forEach(_pickState, function (item) { previousStateLookup[item.id] = item; });
        angular.forEach(pickList.values, splicePickState);
        angular.forEach(stackList.values, splicePickState);

        if (!newestAnswer) { //same state as before, so don't record anything
          return;
        }






        this._pickState.splice(0, this._pickState.length);
        allValues = pickList.values.concat(stackList.values);
        for (i = 0; i < allValues.length; i++) {
          value = allValues[i];
          if (value.hasStatus()) {
            var message = GameMixin.findFeedback(
              GameMixin.filterFeedback(this.content.feedback, 'pick'),
              value.content
            );
            var correct = this.isPickCorrect(value);
            if (newestAnswer === value) {
              feedbackMessage = message;
              isCorrect = correct;
            }
            this._pickState.push({
              id: value.content.id,
              content: value.content.content,
              feedbackMessage: feedbackMessage,
              correct: correct,
              type: 'pick'
            });
          }
        }

        if (!feedbackMessage) {
          feedbackMessage = GameFeedback.message('pickAndStack.' + (isCorrect ? 'scoreboardDefault' : 'scoreboardDefaultIncorrect'));
        }

        if (this._pickState.length === answers.length &&
            this._pickState.every(function (item) { return item.correct; })) {
          feedbackMessage = this.content.general_correct;
        }

      } else {

        this._stackState.splice(0, this._stackState.length);
        for (i = 0; i < stackList.values.length; i++) {
          value = stackList.values[i];
          if (value.hasStatus()) {
            this._stackState.push({
              id: value.content.id,
              content: value.content.content,
              correct: !!answers[i] && value.content.id === answers[i].value,
              type: 'stack'
            });
          }
        }

        var result = this.getCheckModeStatus();
        if (result.status) {
          feedbackMessage = this.content.general_stack_correct;
        } else {
          feedbackMessage =
            GameMixin.findFeedback(
              GameMixin.filterFeedback(this.content.feedback, 'stack'),
              result.answerContent
            );
        }
      }

      if (!feedbackMessage) {
        if (this._stackState.length === answers.length &&
            this._stackState.every(function (item) { return item.correct; })) {
          feedbackMessage = this.content.general_stack_correct;
        }
      }
      var allAnswers  = this._pickState.concat(this._stackState),
          feedbackObj = {
            feedbackMessage: feedbackMessage,
            answers: allAnswers,
            objectState: this.view.objectState()
          };
      this.recordFeedback(feedbackObj);
    };








    Game.prototype.roundFeedback = function () {
      return this._stateTracker;
    };
    Game.prototype.recordFeedback = function (results) {
      this._stateTracker.record(results);
    };
    Game.prototype.transition = function () {
      //FIXME
    };

    Game.prototype.handleStack = function () {
      this.markCheckModeStatus();
      var result = this.getCheckModeStatus();


      this.recordCurrentAnswers();
      if (result.status) {
        return this._correct(true, 'complete', this.content.general_stack_correct);
      } else {
        return this._incorrect(
          GameMixin.findFeedback(
            GameMixin.filterFeedback(this.content.feedback, 'stack'),
            result.answerContent
          )
        );
      }
    };
    //Game.prototype.getCheck
    Game.prototype.markCheckModeStatus = function () {
      var stackList = this.view.getStackList(),
          answers   = this.content.answers,
          i         = 0;
      stackList.each(function (value) {
        if (answers[i].value !== value.content.id) {
          value.markStatus(false);
        }
        else {
          value.markStatus(true);
        }
        i++;
      });
    };
    Game.prototype.getCheckModeStatus = function () {
      var stackList = this.view.getStackList(),
          answers   = this.content.answers,
          i         = 0,
          wrong     = false;

      var answerContent = [];
      stackList.each(function (value) {
        answerContent.push(value.content);
        if (answers[i].value !== value.content.id) {
          wrong = true;
        }
        i++;
      });

      return {
        answerContent: answerContent,
        status: !wrong
      };
    };

    Game.prototype._showPickAttempt = function () {
      var list          = this.view.getStackList(),
          pickList      = this.view.getPickList(),
          incorrectPick = pickList.getIncorrect();

      angular.forEach(list.values, function (value) { value.markStatus(true); });
      if (incorrectPick) {
        return this._incorrect(GameMixin.findFeedback(GameMixin.filterFeedback(this.content.feedback, 'pick'), incorrectPick.content), false);
      }

      if (list.values.length === 0) {
        return this._incorrect('', false);
      }

      if (list.length() === this.content.answers.length) {
        this._correct(true, 'complete', this.content.general_correct || '');
      } else {
        this._correct(false, 'incomplete', undefined);
      }
    };

    Game.prototype.handlePick = function (value) {
      var status = this.getImmediateModeStatus(value);
      if (!status.correct) {
        this.view.backToPick(value);
        this.answerStatus('incorrect');
        return this._incorrect(GameMixin.findFeedback(GameMixin.filterFeedback(this.content.feedback, 'pick'), value.content), false);
      }

      this.view.addToStack(value);

      var generalCorrect = this.content.general_correct ? this.content.general_correct + ' ' : '';
      if (!this._shouldDisregardOrder()) {
        generalCorrect = generalCorrect + GameFeedback.message('pickAndStack.switchToStack');
      }

      if (status.done) {
        this._correct(status.done, 'complete', generalCorrect);
        this.answerStatus('correct');
      } else {
        this.recordCurrentAnswers();
        this._correct(false, 'incomplete', status.mode === 'check' ? generalCorrect : undefined); //Then when you've picked everything right, put up the big one and say "Now stack it"
        this.answerStatus('progress'); //triggers next round...
      }

      if (status.mode === 'check') {
        this._setCheckMode();
      }
    };
    Game.prototype._shouldDisregardOrder = function () {
      return this.content.disregard_order == true;
    };
    Game.prototype._setCheckMode = function () {
      this.answerStatus('checkMode'); //FIXME something of an abuse of the system, to be able to switch from immediate to 'check it' mode
      this.view.enableStackMode();
      this.mode = '';
    };
    Game.prototype.isPickCorrect = function (value) {
      var valueContent  = value.content,
          answers       = this.content.answers,
          answerAt;

      var correct = false;
      for (var i = 0; i < answers.length; i++) {
        answerAt = answers[i];
        if (answerAt.value === valueContent.id) {
          correct = true;
        }
      }

      return correct;
    };
    Game.prototype.getImmediateModeStatus = function (value) {
      var stackList     = this.view.getStackList(),
          answers       = this.content.answers;

      if (this.isPickCorrect(value)) {
        var answeredAll = answers.length === (stackList.length() + 1);
        if (answeredAll) {
          if (this._shouldDisregardOrder()) {
            return {
              done: true,
              correct: true
            };
          } else {
            return {
              done: false,
              correct: true,
              mode: 'check'
            };
          }
        }
        return {
          done: false,
          correct: true
        };
      } else {
        return {
          done: false,
          correct: false
        };
      }
    };

    Game.prototype._incorrect = function (feedback, useGeneralContent) {
      var content = feedback;

      if (useGeneralContent === undefined) {
        useGeneralContent = true;
      }
      if (useGeneralContent && !content) {
        content = this.content.general_incorrect;
      }

      this.view.dismissPopups();
      this._popup({
        status: 'incorrect',
        title: GameFeedback.incorrect(),
        content: content
      });
      this.view.playSound('incorrect');
      return false;
    };
    Game.prototype._correct = function (done, status, contentMessage) {
      this.view.dismissPopups();

      var popupOptions = {
        status: 'correct',
        title: GameFeedback.correct(),
        feedbackSuccess: done
      };
      if (status === 'complete' || contentMessage) {
        popupOptions.content = contentMessage;
      } else if (contentMessage) {
        popupOptions.content = contentMessage;
      } else {
        popupOptions.content = 'Keep going!';
      }

      this._popup(popupOptions);
      this.view.playSound('correct');
      return true;
    };
    Game.prototype._popup = function (options) {
      var newOptions = angular.extend({
        isCenter: true,
        x: 450,
        y: 100,
        attachTo: document.querySelector('.modal-content'),
        className: 'game-popup no-arrow',
        remove: 'click'
      }, options);

      this.view.popup(newOptions);
    };

    GameMixin.include(Game);
    return Game;
  }
})();
