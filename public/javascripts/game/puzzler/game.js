/* global angular, createjs, juice */
(function () {
  'use strict';

  var puzzler = angular.module('puzzler');
  puzzler.factory('PuzzlerGame', ['GameResolver', 'GameFeedback', 'PuzzlerPhysics', 'PuzzlerView', 'Util', 'GameOptions', 'CanvasService', 'GameMixin', 'GameStateTracker', GameFactory]);

  function GameFactory(GameResolver, GameFeedback, PuzzlerPhysics, PuzzlerView, Util, GameOptions, CanvasService, GameMixin, GameStateTracker) {
    var path = 'puzzler/images/';
    GameResolver.register('puzzler', Game, {
      logo: path + 'Puzzler_Logo.png',
      backgrounds: {
        info: path + 'Puzzler_Information_background.png',
        game: path + 'Puzzler_background.png'
      },
      images: [
        {id: 'corner-right', src: path + 'shelf_corner_right.png'},
        {id: 'platform', src: path + 'Shelf_piece.png'},
        {id: 'corner-left', src: path + 'shelf_corner_left.png'}
      ]
    });

    function Game(gameStateTracker) {
      createjs.EventDispatcher.initialize(this);
      this._roundFeedback = new GameStateTracker();
    }

    Game.prototype.isImmediate = function () {
      return false;
    };

    Game.prototype.play = function (content, startingState) {
      this.view = new PuzzlerView(this);

      this.content = content;
      this.canvas = document.querySelector('#canvas');
      this.stage = new createjs.Stage(this.canvas);
      this.physics = new PuzzlerPhysics(this, this.view);
      this.startingState = startingState;

      CanvasService.adjustToResolution(this.canvas, this.stage);

      createjs.Ticker.setFPS(60);
      createjs.Ticker.addEventListener('tick', this.stage); // add game.stage to ticker make the stage.update call automatically.
      createjs.Ticker.addEventListener('tick', this.tick.bind(this)); // gameloop
      createjs.Touch.enable(this.stage);
      this.stage.enableMouseOver();

      if (GameOptions.debug) {
        this.physics.showDebugDraw();
      }

      this.onLoad(this._start);
    };

    Game.prototype._start = function () {
      this.content.objects = [];

      this.roundData = this.content;
      this.physics.createWorld();
      this.physics.createRound(this.content.values, this.startingState);
      this.view.displayQuestion(this.roundData);
      MathJax.Hub.queue.queue = [];  //clean-up MathJax Queue!!
      if (!GameOptions.disableMath) {
        Util.runMathJax();
      }
    };

    Game.prototype._answerStatus = function () {
      var onScoringPlatform = this.physics.checkContact(),
          contents          = [],
          status            = {
            correct: false,
            answers: onScoringPlatform,
            type: undefined,
            sortedAnswers: undefined
          }, i, j;

      for (i = 0; i < onScoringPlatform.length; i++) {
        contents.push(onScoringPlatform[i]);
      }
      contents.sort(function (a, b) {
        return parseFloat(a.content.style.left) - parseFloat(b.content.style.left);
      });
      status.sortedAnswers = contents;


      if (!onScoringPlatform.length) {
        return angular.extend(status, {type: 'noAnswer'});
      } else {
        var answers  = [],
            incorrect;






        var answerSets = this.content.answer_sets,
            tooLong    = true,
            tooShort   = true;
        angular.forEach(answerSets, function (answerSet) {
          tooLong = tooLong && (contents.length > answerSet.answers.length);
          tooShort = tooShort && (!incorrect && contents.length < answerSet.answers.length);
        });




        //
        //1. determine how answer matches with different answer sets
        //
        for (i = 0; i < answerSets.length; i++) {
          var answerSet = answerSets[i],
              results   = [];

          for (j = 0; j < answerSet.answers.length && contents[j]; j++) {
            var content       = contents[j].content.getAttribute('answer-content'),
                answerContent = answerSet.answers[j].content,
                equal         = content === answerContent;

            results.push({
              content: contents[j],
              correct: equal
            });
          }

          //iterate through answers
          //check to see if they match _anything_ from this answer set
          for (j = 0; j < contents.length; j++) {
            var content = contents[j].content.getAttribute('answer-content');

            angular.forEach(answerSet.answers, function (answer) {
              var equal = answer.content === content;
              if (equal) {
                contents[j].matchesAny = true;
              }
            });
          }

          results.answerSet = answerSet; //FIXME arbitrarily adding property to an array

          answers.push(results);
        }

        //
        //2. Get length of longest answer set
        //
        var longest = -1;
        for (i = 0; i < answers.length; i++) {
          if (answers[i].length > longest) {
            longest = answers[i].length;
          }
        }

        /*
         3. Keep answer set that consistently matches

         - Not in any answer, orange
         - First answer to match something wins. Keep evaluating both until more are matches in order than the other

         1 2 3 4
         2 2 3 1

         You Answer 4 2 3 1

         The logic will keep following both answers until one is wrong.
         4 is wrong in the beginning in both, orange (no answer set assumed yet)
         2 is right in the second position in both, green (no answer set assumed yet)
         3 is right in third position in both, green (no answer set assumed yet)
         1 is right in the second answer set, assume second answer set is what they meant to answer, green
         */
        for (i = 0; i < longest; i++) {
          var foundAnswer     = false,
              noAnswer        = [];

          for (j = answers.length - 1; j >= 0; j--) {
            var isCorrect = answers[j][i] && answers[j][i].correct;

            if (isCorrect) {
              foundAnswer = true;
            } else if (!isCorrect) {
              if (noAnswer.indexOf(answers[j]) === -1) {
                noAnswer.push(answers[j]);
              }
            }
          }

          if (foundAnswer && noAnswer.length) {
            angular.forEach(noAnswer, function (answer) {
              answers.splice(answers.indexOf(answer), 1);
            });
          } else {
            noAnswer = [];
          }
        }


        var compareAnswer = answers[0];
        if (compareAnswer && compareAnswer.length) {
          angular.forEach(compareAnswer, function (answer) {
            answer.content.correct = answer.correct;
          });
        }
        status.answerSet = compareAnswer && compareAnswer.answerSet;

        if (tooLong) {
          return angular.extend(status, {type: 'tooLong'});
        }

        if (tooShort ||
           (compareAnswer &&
            compareAnswer.length && !compareAnswer.every(function (answer) { return answer.correct; }))) {
          return angular.extend(status, {type: 'wrongAnswer'});
        }


        return angular.extend(status, {correct: true});
      }
    };

    Game.prototype._updateAnswerStatus = function (answers) {
      var contents = answers,
          i, content;
      for (i = 0; i < contents.length; i++) {
        content = contents[i];
        this.view.updateShape(content.ui, {
          correct: content.correct,
          drawInfo: content.drawInfo
        });
      }
    };

    Game.prototype._constructFeedback = function (answerStatus) {
      switch (answerStatus.type) {
        case 'noAnswer':
          return {check: true, correct: false, content: GameFeedback.message('puzzler.choose')};
        case 'tooLong':
          return {check: true, correct: false, title: GameFeedback.incorrect(), content: GameFeedback.message('puzzler.tooLong')};
        case 'wrongAnswer':
          var contents = answerStatus.sortedAnswers, i;

          for (i = 0; i < this.content.feedback.length; i++) {
            var feedback = this.content.feedback[i];
            if (!feedback.conditions) { continue; } //only partially constructed
            if (feedback.conditions.length === contents.length) {
              var matches = true;
              for (var j = 0; j < feedback.conditions.length; j++) {
                var condition = feedback.conditions[j],
                    response  = contents[j];

                if (response.content.getAttribute('answer-content') !== condition.content && condition.content !== 'incorrect') { //it being generally 'incorrect' means it matches any incorrect answer
                  matches = false;
                }
              }
              if (matches) {
                return {correct: false, title: GameFeedback.incorrect(), content: feedback.content};
              }
            }
          }
          return {correct: false, title: GameFeedback.incorrect(), content: this.content.general_incorrect};
      }


      if (answerStatus.type === undefined && answerStatus.correct === true) { //answer is correct
        return {
          correct: true,
          title: GameFeedback.correct(),
          content: this.content.general_correct
        };
      }

    };

    Game.prototype.checkAnswers = function () {
      var answerStatus    = this._answerStatus(),
          scoringPlatform = this.physics.scoringPlatform(),
          self            = this;

      var feedback = this._constructFeedback(answerStatus);
      if (feedback.check) {
        showError(scoringPlatform, feedback);
      } else {
        this._updateAnswerStatus(answerStatus.sortedAnswers);
        showError(scoringPlatform, {title: GameFeedback.incorrect(), content: feedback.content});
      }

      if (answerStatus.type === undefined && answerStatus.correct === true) { //answer is correct
        playSound(juice.sounds.correct);
        popup(scoringPlatform, {
          status: 'correct',
          title: GameFeedback.correct(),
          content: this.content.general_correct,
          success: true
        });
        this._updateAnswerStatus(answerStatus.sortedAnswers);
        this.recordCurrentAnswers();
        return true;
      }


      function playSound(name) {
        self.view.playSound(name);
      }

      function popup(body, options) {
        var position = self.view.getLocation(body);
        options = options || {};
        self.view.tempPopup({
          status: options.status,
          title: options.title,
          isCenter: true,
          content: options.content,
          feedbackSuccess: options.success,
          x: options.x === undefined ? 450 : options.x,
          y: options.success ? position.y + 75 : position.y + 150,
          attachTo: document.querySelector('.modal-content')
        });
      }

      function showError(incorrectBody, message) {
        if (!message) {
          message = {};
        }

        playSound(juice.sounds.incorrect);
        popup(incorrectBody, angular.extend({status: 'incorrect'}, message));
        return false;
      }
    };

    Game.prototype.reset = Game.prototype.cleanUp = function () {
      if (!this.physics) { return; } //hasn't been loaded yet

      this.physics.reset();
      this.view.reset();
      Util.clearTimers();
    };
    Game.prototype.showAnswers = function () {
      var bodiesInOrder = this.physics.showAnswers(),
          answers       = bodiesInOrder.map(function (body) {
            var data = angular.extend({}, body.GetUserData());
            data.correct = true;
            return data;
          });
      this._updateAnswerStatus(answers);
      this.view.dismissPopups();
    };
    Game.prototype.rewind = function () {
      this.view.resetShapes();
      this.physics.rewind();
      this.view.dismissPopups();
    };
    Game.prototype.roundFeedback = function () {
      return this._roundFeedback;
    };
    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }

      var answerStatus = this._answerStatus(),
          feedback     = this._constructFeedback(answerStatus),
          feedbackMessage;

      if (feedback.correct) {
        feedbackMessage = this.content.general_correct;
      } else {
        feedbackMessage = feedback.content;
      }

      this.recordFeedback({ //Feedback for 'submit'
        feedbackMessage: feedbackMessage,
        answers: answerStatus.answers.map(function (answer) {
          return {
            id: answer.content.getAttribute('answer-id'),
            content: answer.content.getAttribute('answer-content'),
            feedbackMessage: '',
            correct: answer.correct
          };
        }),
        objectState: this.physics.objectState()
      });
    };
    Game.prototype.recordFeedback = function (results) {
      this._roundFeedback.record(results);
    };
    Game.prototype.transition = function () {
      this.view.transition();
    };
    Game.prototype.getAsset = function (assetId) {
      return this.loader.getResult(assetId); //this.loader is set by the GameResolver
    };


    Game.prototype.tick = function () {
      if (createjs.Ticker.getPaused()) { return; } // run when not paused
      this.physics.update();
    };

    GameMixin.include(Game);
    return Game;
  }
})();