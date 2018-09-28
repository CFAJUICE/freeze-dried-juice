/* global angular, createjs, juice */
(function () {
  'use strict';

  var sorter = angular.module('sorter');
  sorter.factory('SorterGame', ['GameResolver', 'SorterPhysics', 'SorterView', 'Util', 'GameOptions', 'CanvasService', 'GameMixin', 'GameStateTracker', '$timeout', GameFactory]);

  function GameFactory(GameResolver, SorterPhysics, SorterView, Util, GameOptions, CanvasService, GameMixin, GameStateTracker, $timeout) {
    var path = 'sorter/images/';
    GameResolver.register('sorter', Game, {
      logo: path + 'Sorter_Logo.png',
      backgrounds: {
        info: path + 'Sorter_Background_Lger_grayscale.png',
        game: path + 'Sorter_background.png'
      },
      images: [
        {id: 'corner-left', src: path + 'sorter_bin_102715_left.png'},
        {id: 'corner-right', src: path + 'sorter_bin_102715_right.png'},
        {id: 'platform', src: path + 'sorter_bin_102715_piece.png'},
        {id: 'split', src: path + 'Sorter_bin_split.png'}
      ]
    });

    function Game(gameStateTracker) {
      createjs.EventDispatcher.initialize(this);
      //this._roundFeedback = gameStateTracker;
      this._roundFeedback = new GameStateTracker();
    }
    Game.prototype.isImmediate = function () {
      return true;
    };
    Game.prototype.play = function (content, startingState) {
	MathJax.Hub.queue.queue = [];
      this.view = new SorterView(this, document.querySelector('.modal-content #game'));

      this.content = content;
      this.canvas = document.querySelector('#canvas');
      this.stage = new createjs.Stage(this.canvas);
      this.physics = new SorterPhysics(this, this.view);
      this.startingState = startingState;

      CanvasService.adjustToResolution(this.canvas, this.stage);

      createjs.Ticker.setFPS(60);
      createjs.Ticker.addEventListener('tick', this.stage); // add game.stage to ticker make the stage.update call automatically.
      createjs.Ticker.addEventListener('tick', this.tick.bind(this)); // gameloop
      createjs.Touch.enable(this.stage);
      if (GameOptions.debug) {
        this.physics.showDebugDraw();
      }
      this.onLoad(this._start);
      //this.loader.on('complete', this._start, /*once=*/this, /*once=*/true);
      //this.loader.load(); //force complete event to fire again, since it may have loaded before this point
    };
    Game.prototype._start = function () {
      this.view.displayBucketDescriptions(this.content.buckets);
      this.view.displayQuestion(this.content);
      var game = this;
     Util.runMathJax(function () { //run mathjax to position instructions and prompts first, then we can determine where everything else goes
        game.physics.createWorld();
        game.physics.createRound({
          buckets: game.content.buckets,
          contents: game.content.answer_content,
          answers: game.content.answers,
          appearRandomly: !!game.content.appear_randomly
        }, game.startingState);
    });


    };
    Game.prototype.checkAnswers = Util.noop;

    Game.prototype.rewind = function () {
      this.physics.rewind();
      this.view.dismissPopups();
      this.view.tempPopup({
          status: 'neutral',
          title: '',
          isCenter: true,
          content: 'Keep going!',
          remove: 'click',
          //feedbackSuccess: allCorrect,
          x:  450,
          y:  300,
          attachTo: document.querySelector('.modal-content')
        });

      this._answerStatus = undefined;
      //The removal of wrong answers hasn't happened yet.
      //We should wait to recheck until after they have been removed.
      var self = this;
      setTimeout(function(){
        self.physics.checkAnswers();
      }, 100);
    };
    Game.prototype.roundFeedback = function () {
      return this._roundFeedback;
    };


    Game.prototype.answerStatus = function (status) {
      if (arguments.length === 0) {
        return this._answerStatus;
      }
      this._answerStatus = status;
      this._triggerStatusChange();
    };
    Game.prototype.onStatusChange = function (callback) {
      this._statusListeners = this._statusListeners || [];
      this._statusListeners.push(callback);
    };
    Game.prototype._triggerStatusChange = function () {
      var status = this.answerStatus();
      this._statusListeners = this._statusListeners || [];
      angular.forEach(this._statusListeners, function (listener) {
        listener(status);
      });
    };


    Game.prototype.recordCurrentAnswers = function () {
      if (!this.view) { return; }
      if (!this.physics.answered) { return; }

      var answeredKeys = Object.keys(this.physics.answered),
          lastFeedback = this.physics.lastFeedback;

      this.recordFeedback({ //Feedback for 'rewind'
        feedbackMessage: lastFeedback && lastFeedback.content,
        answers: answeredKeys.map(function (key) {
          var answered = this.physics.answered[key],
              data     = answered.body.GetUserData();
          return {
            id: data.answer.id,
            content: data.content,
            feedbackMessage: '', //data.feedbackMessage,
            correct: answered.correct
          };
        }, this),
        objectState: this.physics.objectState(lastFeedback)
      });
    };
    Game.prototype.findWording = function (answerId, bucketId) {
      //find the most specific rules first (answer id, bucket id)
      //find the next most specific        (answer id, any)
      //find the next most specific        (any,       bucket id)
      //find the next most specific        (any,       any)
      var feedback  = this.content.feedback,
          choiceMap = {}, i;

      for (i = 0; i < feedback.length; i++) {
        var current       = feedback[i],
            currentAnswer = current.answer,
            currentBucket = current.bucket;

        choiceMap[currentAnswer + currentBucket] = current;
      }

      if (choiceMap[answerId + bucketId]) {
        return choiceMap[answerId + bucketId].content;
      }
      else if (choiceMap[answerId + 'any']) {
        return choiceMap[answerId + 'any'].content;
      }
      else if (choiceMap['any' + bucketId]) {
        return choiceMap['any' + bucketId].content;
      }
      else if (choiceMap['anyany']) {
        return choiceMap['anyany'].content;
      }
      return '';
    };
    Game.prototype.showAnswers = function () {
      this.physics.showAnswers();
      this.view.dismissPopups();
      this._answerStatus = undefined;
    };
    Game.prototype.transition = function () {
      this.view.transition();
    };

    Game.prototype.cleanUp = function () {
		//console.log('CLEANUP');
      if (!this.physics) { return; } //hasn't been loaded yet

      this.physics.reset();
      this.view.reset();
      Util.clearTimers();
    };

    Game.prototype.reset = function () {
		//console.log('RESET');
      if (!this.physics) { return; } //hasn't been loaded yet

      this.physics.reset();
      this.view.reset();
      Util.clearTimers();
    };
    Game.prototype.recordFeedback = function (results) {
      this._roundFeedback.record(results);
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