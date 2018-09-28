/* global angular, createjs, juice */
(function () {
  'use strict';

  /**
   * Gives an example of the Game interface
   * @type {module}
   */
  var perfectWord = angular.module('perfect_word'),
      LOG_CONTEXT = 'perfect_word';
  perfectWord.factory('PerfectWordGame', ['GameResolver', 'Log', 'Util', 'GameMixin', 'GameFeedback', 'GameStateTracker', 'PerfectWordView', GameFactory]);

  function GameFactory(GameResolver, Log, Util, GameMixin, GameFeedback, GameStateTracker, PerfectWordView) {
    var path           = 'perfect_word/images/';
	GameResolver.register('perfect_word', Game, {
      logo: path + 'perfectword_logo.png',
      backgrounds: {
        info: path + 'perfectword_background_grayscale.png',
        game: path + 'perfectword_background.png'
      }
    });

    function Game() {
      Log.log(LOG_CONTEXT, 'inside `perfect_word` constructor');
      this.stateTracker = new GameStateTracker();
    }

	function replaceEmbeddedBrackets(strIn) {
		var str = strIn
		var str1 = str.replace(/\[[^\]]*\[/g, '$&{{').replace(/\][^\[]*\]/g, '}}$&');
		str1 = str1.replace(/\[{{/g, '{{').replace(/}}\]/g, '}}');
		return str1;
	}

    Game.prototype.isImmediate = function () {
      return false;
    };

    Game.prototype.play = function (content, startingState) {
      Log.log(LOG_CONTEXT, ['play', arguments]);
      console.trace();
	  this.content = content;
      this.view = new PerfectWordView(this, document.querySelector('.modal-content #game'));
      //this.content = content;
	  this.startingState = startingState;
	  this.prepare(content);
      this.onLoad(this._start);
    };

    Game.prototype.prepare = function (content) {
      Log.log(LOG_CONTEXT, ['prepare', arguments]);
      console.trace();
	  var game = this;
	  //
	  // collect choices
	  //
	  game.choices = [];
	  //to handle [[...]] choices
      //var choices = content.values_content.replace(/\[\[/g, '[{{').replace(/\]\]/g, '}}]');
	  var choices = replaceEmbeddedBrackets(content.values_content);
	  //
	  choices = choices.match(/\[[^\[]+\]/g);
	  var punctuationList = ".,;:!?'\"";
	  var i = 0;
	  var maxLength = 0;
      if (choices) { 
	     choices.forEach(function(choice) {           
	       //var choiceClean = choice.replace('[{{', '{{').replace('}}]','}}');
		   var choiceClean = choice.replace('[', '').replace(']','').replace('{{','[').replace('}}',']');
		   maxLength = Math.max(maxLength, choiceClean.length);
           game.choices.push({"id": "choice_" + i, "value": choiceClean, "answer": ' '});
		   i = i + 1;
	     });
      }
	  var distractors = content.distractors;	  
	  if (distractors) { 
	     distractors.forEach(function(dist) {
		   maxLength = Math.max(maxLength, dist.content.length); 
           game.choices.push({"id": "choice_" + i, "value": dist.content});
		   i = i + 1
	     });
      }
	  maxLength = Math.min(maxLength, 20); 	
	  game.choices = Util.shuffle(game.choices);
	  game.startingState ? game.choices = game.startingState[0] : game.choices; // if review mode
	  //
	  // prepare text
	  //
	  //var contentTmp = content.values_content.replace(/\[\[/g, '[{{').replace(/\]\]/g, '}}]')
      var contentTmp = replaceEmbeddedBrackets(content.values_content);
      var dArr = contentTmp.split("[");
	  var dataArr = [];
	  var j = 0;
	  dArr.forEach(function(elem) {
		var blank = "";
		var n = elem.search(']');
		if (n > 0){
			var st = elem.substr(0, n);
			if (punctuationList.indexOf(st[0]) >= 0) {
			   blank = "&nbsp;&nbsp;&nbsp;";
		   } else {
               for (var i = 0; i < maxLength * 2; i++) {
				   blank = blank + "&nbsp;";
               }
		   }
			dataArr.push({"id": "target_" + j, "value":blank});
			st = elem.split("]");
			dataArr.push({"id": "target_" + j + "_correct", "value":st[0].replace('{{','[').replace('}}',']'), "correct":true});
			dataArr.push({"id":"", "value":st[1]});
		} else {
			dataArr.push({"id":"", "value":elem});
        }
		j = j+1;
	  });
	  game.text = dataArr; 
	  game.view.dropTargetNo = j-1;
      //
      game.content = content;
   };
     
//*********************

    Game.prototype._start = function () {
	  var game = this;
      game.view.displayInstructions(this.content);
	  game.view.displayPrompt(this.content);
        console.log('text', this.text);
	  game.view.displayText(this.text, this.content);
	  //this.view.displayDistractors(this.content);
	  game.view.displayDistractors(this.choices, this.content);
	  game.view.registerEvents();

/*      Util.runMathJax(function () { //run asynchronously so we position the fridge correctly
        game.view.displayInstructions(game.content);
        game.view.displayPrompt(game.content);
        if (game.startingState) {
          game.view.startingState(game.startingState);
          game.checkAnswers();
        }

        Util.runMathJax();
      });
*/

	  Util.runMathJax(function() {
		 game.view.updateFields();  
		 if (game.startingState) {
			 game.evaluateAnswers();
			 game.checkAnswers();
		 }
	  });
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
	  this.view && this.view.reset();
      Util.clearTimers();
    };

    /**
     * Actual start of the gameplay
     * @param content content that will be displayed to the user
     * @param startingState if we're showing the user a previous gameplay experience, this will include data specific to this game on how to recreate the gameplay
    
    Game.prototype.play = function (content, startingState) {
      Log.log(LOG_CONTEXT, ['play', arguments]);
      console.trace();
    };
	 */


    Game.prototype._answerStatus = function () {
      var status = true;
	  if (!this.startingState) {  //normal game play
	    $.each(this.view.answerList, function(key, item) {
          status = status && item.isCorrect;
        });
      } else {  // review mode
		for (var i = 1; i< this.startingState.length; i++){
			status = status && this.startingState[i].isCorrect;
		}
	  }
	  return status;
	}



   Game.prototype.evaluateAnswers = function() {
      var view = this.view; 
	  $.each(view.answerList, function(key, item) {
		  item.isCorrect = false;
		  if (item.answer  &&  $(item.answer).find(".MathJax")[0]) { //if MathJax answer...
			  console.log("MathJax cor.",  item.correctVal.replace(/`/g,""));
			  console.log("MathJax answ.", $(item.answer).find("script")[0].innerHTML) ; 
			  if (item.correctVal.replace(/`/g,"") == $(item.answer).find("script")[0].innerHTML){
                item.isCorrect = true;
			  }
		  } else {
              //if (item.answer && (item.answer.innerHTML.replace(/&nbsp;/g, "") == item.correctVal.replace(/&nbsp;/g, ""))){  // "replace" to handle "fat" punctuation symbols
			  // next line to allow for html in answer 
			  if (item.answer && (item.answer.innerHTML.replace(/&nbsp;/g, "").replace(/<[^>]+>/g, "") == item.correctVal.replace(/&nbsp;/g, "").replace(/<[^>]+>/g, ""))){  // "replace" to handle "fat" punctuation symbols
			  item.isCorrect = true;
             }
          }
	  });
	}




    /**
     * This is used for games that have Check It functionality. Not necessary for 'immediate' feedback games
     */
    Game.prototype.checkAnswers = function () {
      Log.log(LOG_CONTEXT, ['checkAnswers', arguments]);
      console.trace();
       
      var view = this.view;
      view.displayCorrect();

	  if (this._answerStatus()) {
        view.popup({
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
        view.popup({
          status: 'incorrect',
          isCenter: true,
          title: GameFeedback.incorrect(),
          content: this.content.general_incorrect,
          x: 450,
          y: 100,
          attachTo: document.querySelector('.modal-content')
        });
		this.view.playSound('incorrect');
        return false;
	  }
    };




    /**
     * Show the player the answers. Construct the game content so that the answers are displayed for the player.
     */
    Game.prototype.showAnswers = function () {
      Log.log(LOG_CONTEXT, ['showAnswers', arguments]);
      console.trace();
	  this.view.displayAnswers(); 
    };

    /**
     * Forces game to record the current answers, whatever they are and whatever state the game is in
     */
    Game.prototype.recordCurrentAnswers = function () {
      Log.log(LOG_CONTEXT, ['recordCurrentAnswers', arguments]);

      if (!this.view) { return; }
	  
	  this.evaluateAnswers();
	  var feedback;
	  if (this._answerStatus()) { 
          feedback = this.content.general_correct;
      } else {
          feedback = this.content.general_incorrect
	  }
      this.stateTracker.record({
        feedbackMessage: feedback,
        answers: this.view.buildAnswerArray(), 
        objectState: this.view.objectState()
      });
      console.trace();
	  console.log('rec cur answ', this.view.objectState(),this.stateTracker.objectState);
    };

    /**
     * 'Rewinding' a game means you remove all wrong answers, and leave the right answers behind
     */
    Game.prototype.rewind = function () {
      Log.log(LOG_CONTEXT, ['rewind', arguments]);
      console.trace();
	  this.view.clearAnswers();
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