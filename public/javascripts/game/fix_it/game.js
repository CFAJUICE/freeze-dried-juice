/* global angular, createjs, juice */
(function () {
  'use strict';
  var game_name = 'fix_it';
  var module = angular.module(game_name, ['juice.tooltip']);
  module.factory('FixItGame', ['GameResolver', 'Log', 'GameMixin', 'GameFeedback', 'FixItView', 'Util', 'GameStateTracker', GameFactory]);
  function GameFactory(GameResolver, Log, GameMixin, GameFeedback, FixItView, Util, GameStateTracker) {
    var path = game_name + '/images/';
    var gameObj, viewGbl;
    GameResolver.register('fix_it', Game, {
      logo: path + 'logo.png',
      backgrounds: {
        info: path + 'info_background.png',
        game: path + 'game_background.png',
        feedback: path + 'game_background.png'
      }
    });

    function Game(gameStateTracker) {
      gameObj = this;
      Log.log(game_name, 'inside `'+game_name+'` constructor');
      //this._stateTracker = gameStateTracker;
      this._stateTracker = new GameStateTracker();
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
          var original_answer = '';
          var msg = 'Found ' + result[1] + '. ';
          var inner_text = result[1];
          var css_class = 'answer-choice already-correct';
          var data_attrs = '';
          if(inner_text.indexOf('|') !== -1){
            var split = inner_text.split('|');
            inner_text = split[0]
            original_answer = split[0];
            data_attrs += ' data-original-answer="'+original_answer+'" ';
            data_attrs += ' data-correct-answers="'+split.slice(1).join('|')+'" ';
            css_class = 'answer-choice needs-correction';
          }

          if(startingState){
            console.log(startingState, 'starting state');
            css_class += ' show-correct-and-incorrect-selected unselectable';
            startingState.answers.forEach(function(answer){
              if(answer.id == id){
                inner_text = answer.content;
                if(answer.correct){
                  css_class+= ' incorrect-answer';
                }else{
                  css_class+= ' correct-answer';
                }
              }
            });
          }
          var test_text = '';
          var test_text_length = Math.round(Math.random()*20);
          for(var i=0; i< test_text_length; i++){
            test_text += 'X';
          }
          var tooltip = '<tooltip class="above point-from-left">This is already correct</tooltip>'
          if(original_answer) {
            tooltip =
                '<tooltip class="above point-from-left">' +
                '<span class="original-answer">' + original_answer + '</span> ' +
                '<span class="arrow">&#8594;</span>' +
                '<input type="button" class="ok-button" value="&#10003;" />' +
                '<input class="change-answer-textbox" placeholder="change to?" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" />' +
                '</tooltip>';
          }
          out = out.replace(result[0],
              '<span class="'+css_class+'" '+data_attrs+' id="answer-id-'+id+'">'+
              tooltip +
              '<span class="inner-text">' + inner_text + '</span>' +
              '</span>');
          msg += 'Next match starts at ' + rx1.lastIndex;
        }


        return replaceAll('~', '<br>', '<div id="'+game_name+'-problem-text">' + out + '</div>');
      }


    }

    Game.prototype._isCorrect = function (choice) {
      return choice.content.id === this.content.answer;
    };

    Game.prototype._start = function () {
      this.view = new FixItView(this, document.querySelector('.modal-content #game'));
      viewGbl = this.view;
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
      var game = this;
      this.recordCurrentAnswers();
      $('.answer-choice.needs-correction').each(function(){
        var el = $(this);
        if(!game.testCorrectAnswer(el)){
          var answer = el.attr('data-correct-answers').split('|')[0];
          el.find('.inner-text').text(answer);
        }
        el.removeClass('incorrect-answer').addClass('correct-answer').addClass('show-correct-and-incorrect-selected');
      })
      viewGbl.updateMathJaxStyles();

      this.view.dismissPopups();
    };

    Game.prototype.testCorrectAnswer = function(el){
      var answers = el.attr('data-correct-answers').split('|');
      var user_answer = el.find('.inner-text').text().trim();
      var answer_has_match = false;
      answers.forEach(function(answer){
        if(answer.trim() == user_answer){
          answer_has_match = true;
        }
      });
      return answer_has_match;
    }

    //update_display defaults to true
    Game.prototype._answerStatus = function (update_display) {
      if(typeof(update_display)==='undefined'){
        update_display = true;
      }
      var answer_status = true;
      var game = this;
      console.log('update answer status');
      $('.answer-choice.needs-correction').each(function(){
        var is_correct = game.testCorrectAnswer($(this));
        if(!is_correct){
          answer_status = false;
        }
        if(update_display) {
          $(this).removeClass('incorrect-answer').removeClass('correct-answer');
          if (!is_correct) {
            $(this).addClass('incorrect-answer');
          } else {
            $(this).addClass('correct-answer');
          }
        }
      });
      return answer_status;
    };

    Game.prototype.checkAnswers = function (view) {
      console.log('check-answers');
      var status = this._answerStatus();
      $('.answer-choice').addClass('show-correct-and-incorrect-selected');
      $('.answer-choice.selected').removeClass('selected');
      this.view.dismissPopups()
      if(!status) {
        this.view.popup({
          status: 'incorrect',
          isCenter: true,
          title: GameFeedback.incorrect(),
          content: this.content.general_incorrect,
          x: 450,
          y: 417,
          maxWidth:'830px',
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

    Game.prototype.getAnswers = function () {
      var answers = [];
      var game = this;
      $('.answer-choice.needs-correction').each(function(){
        var el = $(this);
        var answer = {
          dom_id: el.attr('id'),
              id: Number(el.attr('id').replace('answer-id-', '')),
            original_answer: el.attr('data-original-answer'),
            correct_answers: el.attr('data-correct-answers'),
            content: el.find('.inner-text').text(),
            correct: game.testCorrectAnswer(el)
        }

        answers.push(answer);
      });
      return answers;
    };


    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }
      var answers = this.getAnswers();
      console.log(answers, 'answers');
      var feedback;
      if (this._answerStatus(false)) {
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