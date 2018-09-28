/* global angular, createjs, juice */
(function () {
  'use strict';
  var game_name = 'highlighter';
  var module = angular.module('highlighter');
  module.factory('HighlighterGame', ['GameResolver', 'Log', 'GameMixin', 'GameFeedback', 'HighlighterView', 'Util', 'GameStateTracker', GameFactory]);

  function GameFactory(GameResolver, Log, GameMixin, GameFeedback, HighlighterView, Util, GameStateTracker) {
    var path = game_name + '/images/';
    var gameObj;
    GameResolver.register(game_name, Game, {
      logo: path + 'logo.png',
      backgrounds: {
        info: path + 'info_background.png',
        game: path + 'game_background.png',
        feedback: path + 'game_background.png'
      }
    });
    
    function Game(gameStateTracker) {
      gameObj = this;
      this._stateTracker = new GameStateTracker();
      var scaleableGames = public_configs.scaleable_games;
      var isScaleable = (scaleableGames.indexOf(game_name) !== -1);
      if (isScaleable) {
        setTimeout(function () {
          if ($('.modal-body')[0]) {
            $('.instructions-view, #canvas-container').height($('.modal-body')[0].scrollHeight);
          }
        }, 400)
      }
    }

    Game.prototype.isImmediate = function () {
      return false;
    };

    Game.prototype.play = function (content, startingState) {
      this.content = content;
      this.prepare(content, startingState);
      this.startingState = startingState;
      this.onLoad(this._start);

    };

    Game.prototype.prepare = function(content, startingState){
      content.problem_display = prepareProblem(content.problem_content);
      function prepareProblem(text){
        var out = text;
        var rx1 = /\[([^\]]+)]/g;
        var result = [];
        var id = -1;
        while ((result = rx1.exec(text)) !== null) {
          id++;
          var msg = 'Found ' + result[1] + '. ';
          var is_answer = false;
          var inner_text = result[1];
          var css_class = 'answer-choice incorrect-answer';

          if(inner_text[0]=='!'){
            css_class = 'answer-choice correct-answer';
            is_answer = true;
            inner_text = inner_text.substr(1);
          }

          if(startingState){
            css_class += ' show-correct-and-incorrect-selected unselectable';
            startingState.answers.forEach(function(answer){
              if((answer.id == id) && answer.selected){
                css_class += ' selected';
              }
            });
          }

          out = out.replace(result[0], '<span class="'+css_class+'" id="answer-id-'+id+'">'+inner_text+'</span>');
          msg += 'Next match starts at ' + rx1.lastIndex;
        }
        out = '<div class="answers-container">'+out+'</div>';
        return replaceAll('~', '<br>', out);
      }


    }

    Game.prototype._isCorrect = function (choice) {
      return choice.content.id === this.content.answer;
    };

    Game.prototype._start = function () {
      this.view = new HighlighterView(this, document.querySelector('.modal-content #game'));
      this.view.displayInstructions(this.content);
      this.view.displayPrompt(this.content);
      this.view.displayText(this.content, this.startingState);
      if(this.startingState) {
        this.checkAnswers();
      }

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

    };

    /**
     * 'Rewinding' a game means you remove all wrong answers, and leave the right answers behind
     */
    Game.prototype.rewind = function () {
      this.view.dismissPopups();
      this.view.clearAnswers();
      this.recordCurrentAnswers();
    };

    Game.prototype.cleanUp = function () {
      this.view && this.view.reset();
    };
    Game.prototype.showAnswers = function () {
      this.recordCurrentAnswers();

      this.view.showAnswers();
      this.view.dismissPopups();
    };

    Game.prototype._answerStatus = function () {
      var answerStatus = true;
      $('.answer-choice').addClass('show-correct-and-incorrect-selected');
      this.view.updateMathJaxStyles();
      $('.answer-choice').each(function(){
        var el = $(this);
        var correct_answer = el.hasClass('correct-answer');
        var selected = el.hasClass('selected');
        if(selected && !correct_answer){
          answerStatus = false;//you selected a wrong answer
        }
        if(!selected && correct_answer){
          answerStatus = false;//you failed to select the correct answer
        }
      });
      return answerStatus;
    };

    Game.prototype.checkAnswers = function (view) {
      var status = this._answerStatus();
      this.view.dismissPopups()
      if(!status) {
        this.view.popup({
          status: 'incorrect',
          isCenter: true,
          title: GameFeedback.incorrect(),
          content: this.content.general_incorrect,
          x: 450,
          y: 417,
          attachTo: document.querySelector('.modal-content'),
          className: 'game-popup no-arrow',
          remove: 'click'
        });
        this.view.playSound('incorrect');
      }else{
        this.view.popup({
          status: 'correct',
          isCenter: true,
          title: GameFeedback.correct(),
          content: this.content.general_correct,
          feedbackSuccess: true,
          x: 450,
          y: 100,
          attachTo: document.querySelector('.modal-content'),
          className: 'game-popup no-arrow',
          remove: 'click'
        });
        this.view.playSound('correct');
      }

      return status;
    };




    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }
      var answers = this.view.getAnswers();
      var feedback;
      if (this._answerStatus()) {
        feedback = this.content.general_correct;
      } else {
        feedback = this.content.general_incorrect;
      }
      this._stateTracker.record({
        feedbackMessage: feedback,
        answers: answers,
        objectState: {feedbackMessage:feedback, answers:answers}
      });
    };
    Game.prototype.roundFeedback = function () {
      return this._stateTracker;
    };
    Game.prototype.recordFeedback = function (results) {
      this._stateTracker.record(results);
    };
    Game.prototype.transition = function () {
    };


    GameMixin.include(Game);
    return Game;
  }
})();