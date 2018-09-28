/* global angular, createjs, juice */
(function () {
  'use strict';

  var MODULE        = 'fridge_magnets',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('FridgeMagnetsGame', ['GameResolver', 'Log', 'Util', 'GameFeedback', 'FridgeMagnetsView', 'GameMixin', 'GameStateTracker', function (GameResolver, Log, Util, GameFeedback, FridgeMagnetsView, GameMixin, GameStateTracker) {
    var path = 'fridge_magnets/images/';
    GameResolver.register(MODULE, Game, {
      logo: path + 'fridgemagnets_logo.png',
      backgrounds: {
        info: path + 'FridgeMagnets_background_lger_grayscale.png',
        game: path + 'Fridgemagnets_Background_lger.png'
        //game: path + 'Refrig_magnets_background_with.png'
      },
      images: [
        {id: 'fridge-left', src: path + 'Left.png'},
        {id: 'fridge-piece', src: path + 'Piece.png'},
        {id: 'fridge-right', src: path + 'Right.png'}
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

    function putValuesIntoValueSets(round){
      if(!round.value_sets){
        round.value_sets = [[]];
        if(round.values){
          round.values.forEach(function(value){
            round.value_sets[0].push(value);
          });
        }
      }
      delete round.values;
    }

    Game.prototype._start = function () {
      var game = this;
      game.view = new FridgeMagnetsView(game, document.querySelector('.modal-content #game'));

      game.view.registerEvents();
      game.view.displayInstructions(game.content);
      game.view.displayExample(game.content);
      putValuesIntoValueSets(game.content);
	  MathJax.Hub.queue.queue = [];  //clean-up MathJax Queue!!
      Util.runMathJax(function () { //run asynchronously so we position the fridge correctly
        game.view.displayMagnets(game.content.value_sets[0].concat(game.content.distractors));
        game.view.displayAnswerBox();
        if (game.startingState) {
          game.view.startingState(game.startingState);
          game.checkAnswers();
        }

        Util.runMathJax();
      });
     };

    Game.prototype.roundFeedback = function () {
      return this._roundFeedback;
    };
    Game.prototype.cleanUp = function () {
      this.view && this.view.reset();
      Util.clearTimers();
    };
    Game.prototype.transition = function () {
      this.view.transition();
    };
    Game.prototype.checkAnswers = function () {
      var answerStatus = this._answerStatus();

      if (this._isCorrect(answerStatus)) {
        this.recordFeedback({ //Feedback for 'submit'
          feedbackMessage : this.content.general_correct,
		  roundId: this.content.id,
          answers: answerStatus,
          objectState: this.view.objectState()
        });
        this.view.popup({
          status: 'correct',
          isCenter: true,
          title: GameFeedback.correct(),
          feedbackSuccess: true,
          content: this.content.general_correct,
          x: 450,
          y: 100,
          attachTo: document.querySelector('.modal-content')
        });
        this.view.playSound('correct');
        return true;
      } else {
        this.view.popup(angular.extend({
          status: 'incorrect',
          isCenter: true,
          x: 450,
          y: 100,
          attachTo: document.querySelector('.modal-content')
        }, this._constructFeedback(answerStatus)));
        this.view.playSound('incorrect');
        return false;
      }
    };
    Game.prototype._isCorrect = function (answerStatus) {
      return answerStatus.length &&
        answerStatus.length === this.most_correct_value_set.length &&
        answerStatus.every(function (item) { return item.correct; });
    };
    Game.prototype.showAnswers = function () {
      this.recordCurrentAnswers(); //before we correct everything, record what actually happened

      this.view.showAnswers(this.content.value_sets[0]);
      this._answerStatus(); //used here for the outlining side effect
      this.view.dismissPopups();
    };
    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      var answerStatus = this._answerStatus(),
          feedbackMessage;
      if (this._isCorrect(answerStatus)) {
        feedbackMessage = this.content.general_correct;
      } else {
        feedbackMessage = this._constructFeedback(answerStatus).content;
      }

      this.recordFeedback({ //Feedback for 'submit'
        feedbackMessage: feedbackMessage,
        roundId: this.content.id,
        answers: answerStatus,
        objectState: this.view.objectState()
      });
      console.log('feedback message', feedbackMessage);
    };

    Game.prototype.recordFeedback = function (results) {
      this._roundFeedback.record(results);
    };

    Game.prototype.rewind = function () {
      this.view.dismissPopups();
      this.view.rewind(this.content.value_sets[0]);
    };
    Game.prototype.getAsset = function (assetId) {
      return this.loader.getResult(assetId);
    };

    Game.prototype._answerStatus = function () {
      var most_correct_value_set = null;
      var num_correct = -1;
      var domAnswers = this.view.getAnswers();
      this.content.value_sets.forEach(function findValueSetThatMatchesAnswer(values){
        var set_correct = 0;
        var is_fully_correct = true;
        if(domAnswers.length != values.length){
          is_fully_correct = false;
        }
        values.forEach(function (answer, i){
          var domAnswer = domAnswers.get ? domAnswers.eq(i) : $(domAnswers[i]);
          if(!!domAnswer.data('answer-content') && domAnswer.data('answer-content') === answer.content){
            set_correct++;
          }else{
            is_fully_correct = false;
          }
        });
        if((set_correct > num_correct)||(is_fully_correct)){
          num_correct = set_correct;
          most_correct_value_set = values;
        }
      });
      this.most_correct_value_set = most_correct_value_set;
      var answers = most_correct_value_set,
          i, answerStatus;

      answerStatus = [];
      for (i = 0; i < domAnswers.length; i++) {
        var domAnswer = domAnswers.get ? domAnswers.eq(i) : $(domAnswers[i]),
            answer    = answers[i] || {},
            status    = {
              id: answer.content,
              content: _domText(domAnswer),
              feedbackMessage: ''
            };

        status.correct = !!domAnswer.data('answer-content') && domAnswer.data('answer-content') === answer.content;
        answerStatus.push(status);

        this.view.toggleCorrect(domAnswer, status.correct);
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

    function _domText(el) {
      return el.get ? el.get(0).textContent : el.textContent;
    }

    GameMixin.include(Game);
    return Game;
  }]);
})();