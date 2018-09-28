/* global angular, juice, Box2D, MathJax, createjs, GAME_LOADED */
/* option multistr */

(function() {
  'use strict';

  var gameServices = angular.module('juice.games.services', [
    'ui.router',
    'ui.bootstrap',
    'juice',
    'juice.clicks',
    'juice.services',
    'resource-helper',
    'juice.data-store-api'
  ]);

  //gameServices
  gameServices.factory('FeedbackAnimation', ['$timeout', 'Util', FeedbackAnimation]);
  gameServices.factory('GameOptions', ['Util', GameOptions]);
  gameServices.factory('GameData', ['IdGenerator', 'interactiveData', GameData]);
  gameServices.factory('GameStates', [GameStates]);
  gameServices.factory('PhysicsInteraction', [PhysicsInteraction]);
  gameServices.factory('GameFeedback', [GameFeedback]);
  gameServices.factory('GameResolver', [GameResolver]);
  gameServices.factory('DomHelper', [DomHelper]);
  gameServices.factory('GameStateTracker', [GameStateTracker]);
  gameServices.factory('$exceptionHandler', function () {
    return function errorCatcherHandler(exception, cause) {
      console.error(exception.stack);
      window.juiceDisplayError(exception);
    };
  });
  gameServices.factory('GameMixin', ['Util', GameMixin]);
  gameServices.factory('ViewManager', ['Popover', 'Sounds', 'Util', 'DomHelper', ViewManager]);
  gameServices.factory('GameService', [
    '$timeout',
    'GameResolver',
    'Sounds',
    'Util',
    'GameStateTracker',
    'GameFeedback',
    'HighlighterGame',
    'PuzzlerGame',
    'SorterGame',
    'FridgeMagnetsGame',
    'StackerGame',
    'BalancerGame',
    'PickAndStackGame',
    'TumblerGame',
    'QuickPickGame',
    'FixItGame',
    'GameExampleGame',
    'PerfectWordGame',
    GameService
  ]);

  function GameMixin(Util) {
    var requiredMethods = [
      'play',
      'rewind',
      'cleanUp',
      'showAnswers',
      'checkAnswers',
      'recordCurrentAnswers',
      'roundFeedback',
      'transition',
      'isImmediate'
    ], optionalMethods = [
      'onStatusChange'
    ];
    var game = {
      onLoad: function (callback) {
        //this.loader.on('complete', callback, /*once=*/this, /*once=*/true);
        var self = this;
        this.loader.on('complete', function () {

          GAME_LOADED = true;  //used to disable closing game if not loaded. GAME_LOADED is a gloabal variable, shame on me.
          var gameContainer = document.querySelector('#game');
          if (gameContainer) {
            callback.apply(self, arguments);
          } else {
            self.cleanUp();
          }
        }, /*once=*/this, /*once=*/true);

        this.loader.load(); //force complete event to fire again, since it may have loaded before this point
      },
      answerStatus: function (status) {
        if (arguments.length === 0) {
          return this._answerStatus;
        }
        this._answerStatus = status;
        this._triggerStatusChange();
      },
      onStatusChange: function (callback) {
        this._statusListeners = this._statusListeners || [];
        this._statusListeners.push(callback);
      },
      _triggerStatusChange: function () {
        var status = this.answerStatus();
        this._statusListeners = this._statusListeners || [];
        angular.forEach(this._statusListeners, function (listener) {
          listener(status);
        });
      }
    };
    return {
      include: function (constructor) {
        if (constructor.__gameResolved !== true) {
          throw 'GameResolver is required for games to load properly. Call GameResolver#resolve on your game constructor';
        }

        Util.validateMethods(constructor.prototype, requiredMethods);
        angular.extend(constructor.prototype, game);
      },
      findFeedback: function (feedback, content) {
        for (var i = 0; i < feedback.length; i++) {
          var item = feedback[i];
          if (item.conditions) {
            if (matchMulti(item, content)) {
              return item.content;
            }
          } else {
            if (matchSingle(item, content)) {
              return item.content;
            }
          }
        }

        function matchSingle(item, content) {
          return item.answer === content.id;
        }

        function matchMulti(item, contents) {
          if (item.conditions.length !== contents.length) {
            return false;
          }

          var matches = true;
          for (var i = 0; i < item.conditions.length; i++) {
            var condition = item.conditions[i],
                content   = contents[i];

            if (!condition.id) {
              if (content.content !== condition.content) {
                matches = false;
              }
            } else {
              if (content.id !== condition.answer) {
                matches = false;
              }
            }
          }
          return matches;
        }
      },
      filterFeedback: function (feedback, type) {
        var filtered = [];
        for (var i = 0; i < feedback.length; i++) {
          if (feedback[i].type && feedback[i].type === type) {
            filtered.push(feedback[i]);
          }
        }
        return filtered;
      }
    };
  }

  function ViewManager(Popover, Sounds, Util, DomHelper) {
    function Manager() {
      this.uiEls = [];
      this.popovers = [];
    }
    Manager.prototype = {
      BLUE_TEXT: '#0D24F6',
      INSTR_FONT_SIZE: 20,
      FONT_FAMILY: 'Verdana',
      cleanUi: function () {
        if (!this.uiEls) { return; }

        angular.forEach(this.uiEls, function (el) {
          if (el.remove) {
            el.remove();
          } else {
            el.parentNode && el.parentNode.removeChild(el);
          }
        });

        angular.forEach(this.events || [], function (event) {
          $(event.el).off(event.event);
        });
      },
      trackUi: function (domEl) {
        var uiEls = this.uiEls = this.uiEls || [];

        //if ()
        if (arguments.length > 1) {
          angular.forEach(arguments, function (el) {
            uiEls.push(el);
          });
        } else {
          uiEls.push(domEl);
        }
      },
      dismissPopups: function () {
        if (!this.popovers) { return; }

        this.popovers.forEach(function (popover) {
          popover();
        });
        this.popovers.length = 0;
      },
      popup: function (options) {
        this.popovers = this.popover || [];
        this.popovers.push(Popover.show(options));
      },
      playSound: function (name) {
        Sounds.play(name);
      },
      on: function (el, event, selector, callback) {
        this.events = this.events || [];
        this.events.push({
          el: el,
          event: event
        });
        DomHelper.on(el, event, selector, callback);
      }
    };
    Manager.validate = function (viewObject) {
      Util.validateMethods(viewObject, ['reset']);
    };

    return Manager;
  }

  function DomHelper() {
    function removeClass(el, className) {
      var existing = el.className,
          chunked  = existing.split(' '),
          index    = chunked.indexOf(className);
      if (index !== -1) {
        chunked.splice(index, 1);
      }
      el.className = chunked.join(' ');
    }
    function addClass(el, className) {
      var existing = el.className,
          chunked  = existing.split(' ');
      if (chunked.indexOf(className) !== -1) {
        return;
      }
      el.className += ' ' + className;
    }

    return {
      addClass: function (el, className) {
        className = typeof className === 'string' ? [className] : className;
        angular.forEach(className, function (name) {
          addClass(el, name);
        });
      },
      removeClass: function (el, className) {
        className = typeof className === 'string' ? [className] : className;
        angular.forEach(className, function (name) {
          removeClass(el, name);
        });
      },
      modifyEl: function (el, options) {
        if (options.className) {
          el.className = options.className;
        }
        if (options.style) {
          angular.forEach(options.style, function (value, key) {
            el.style[key] = value;
          });
        }
        if (options.html) {
          el.innerHTML = options.html;
        }
        if (options.attachTo) {
          options.attachTo.appendChild(el);
        }
        return el;
      },
      createEl: function (type, options) {
        return this.modifyEl(document.createElement(type), options);
      },
      width: function (el) {
        return $(el).width();
      },
      height: function (el) {
        return $(el).height();
      },
      remove: function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      },
      insertBefore: function (newEl, referenceEl) {
        referenceEl.parentNode.insertBefore(newEl, referenceEl);
      },
      on: function (el, event, selector, callback) {
        if (!callback) {
          $(el).on(event, selector);
        } else {
          $(el).on(event, selector, callback);
        }
      },
      elementsOverlap: function elementsOverlap(elem1, elem2) {
        return checkOverlap(getDims(elem1), getDims(elem2));
      },
      setStyleDeep: function(elem, style, value) {
         $(elem).css(style, value);
		 $(elem).find('*').css(style, value);
	  }
    };
  }

  function getDims(elem) { //https://github.com/shaunxcode/elements-overlap/blob/master/index.js
    var coords = elem.getBoundingClientRect();
    return [
      coords.top,
      coords.left,
      coords.width,
      coords.height
    ];
  }

  //Derived from https://github.com/brandonaaron/jquery-overlaps
  function checkOverlap(dims1, dims2) {
    var x1 = dims1[1], y1 = dims1[0],
        w1 = dims1[2], h1 = dims1[3],
        x2 = dims2[1], y2 = dims2[0],
        w2 = dims2[2], h2 = dims2[3];
    return !(y2 + h2 < y1 || y1 + h1 < y2 || x2 + w2 < x1 || x1 + w1 < x2);
  }

  function GameOptions(Util) {
    var queryOpts = Util.parseQuery(),
        opts      = (queryOpts.options && queryOpts.options.split(',')) || [],
        options   = {};
    angular.forEach(opts, function (option) {
      options[option] = true;
    });
    return options;
  }

  function GameResolver() {
    var games    = {},
        basePath = '/javascripts/game/';
    function Resolver(gameName) {
      this.game = games[gameName];
      if(!this.game) {
        console.log(gameName + ' not registered you must add the camel case SomegameGame to line 36 (GameServices) of services.js to register it');
      }
      this.loader = games[gameName].loader;
    }
    Resolver.prototype.new = function (gameStateTracker) {
      var newGame = new this.game.constructor(gameStateTracker);
      newGame.loader = this.loader;
      return newGame;
    };
    Resolver.prototype.logo = function () {
      return basePath + this.game.assets.logo;
    };
    Resolver.prototype.infoBackground = function () {
      return this.background('info');
    };
    Resolver.prototype.background = function (area) {
      var backgrounds = this.game.assets.backgrounds;
      switch (area) {
        case 'info':
          return backgrounds.info ? basePath + backgrounds.info : '';
        case 'feedback':
          return backgrounds.feedback ? basePath + backgrounds.feedback : '';
        default:
          return backgrounds.game ? basePath + backgrounds.game : '';
      }
    };
    Resolver.prototype.gameBackground = function () {
      return this.background('game');
    };
    Resolver.register = function (name, constructor, assets) {
      if (name in games) {
        throw 'A game by name [' + name + '] has already been registered. Please choose a different name.';
      }
      constructor.__gameResolved = true;
      games[name] = {
        constructor: constructor,
        assets: assets ? {
          logo: assets.logo,
          backgrounds: assets.backgrounds,
          images: assets.images
        } : {}
      };

      games[name].loader = createLoader(games[name].assets);
    };

    function createLoader(assets) {
      var manifest = (assets.images || []).concat([assets.logo, assets.backgrounds.info, assets.backgrounds.game]),
          loader   = new createjs.LoadQueue(/*preferXHR=*/true, /*basePath=*/'/');

      if (manifest) {
        loader.loadManifest(manifest, /*loadNow=*/false, basePath); //manifest, loadNow, basePath
      }
      return loader;
    }

    return Resolver;
  }


  function PhysicsInteraction() {
    return {
      mixin: function (object) {
        var canvasName = 'canvas';
        var b2Vec2     = box2d.b2Vec2,
            b2AABB     = box2d.b2AABB,
            b2Body     = box2d.b2Body;
        //var b2Vec2     = Box2D.Common.Math.b2Vec2,
        //    b2AABB     = Box2D.Collision.b2AABB,
        //    b2Body     = Box2D.Dynamics.b2Body;

        object.handleMouseDown = function (e) {
			if (window.stopPhysicsClicks) return;  //!PM to stop physic interactions when instructions pop-over is up

          object.isMouseDown = true;

          object.handleMouseMove(e);
          document.addEventListener('mousemove', object.handleMouseMove, true);
          document.addEventListener('touchmove', object.handleMouseMove, true);
        }.bind(object);

        object.handleMouseUp = function () {
          document.removeEventListener('mousemove', object.handleMouseMove, true);
          document.removeEventListener('touchmove', object.handleMouseMove, true);
          object.isMouseDown = false;
          //object.isMouseMove = false;
          object.mouseX = undefined;
          object.mouseY = undefined;
        }.bind(object);

        object.handleMouseMove = function (e) {
          var clientX, clientY;
          var modalFade = document.querySelector('.modal.fade').scrollTop;

          if(e.pageX)
          {
            clientX = e.pageX;
            //clientY = e.pageY;
            clientY = e.pageY + modalFade;
          }
          else if(e.changedTouches && e.changedTouches.length > 0)
          {
            var touch = e.changedTouches[e.changedTouches.length - 1];
            clientX = touch.pageX;
            //clientY = touch.pageY;
            clientY = touch.pageY + modalFade;
          }
          else
          {
            return;
          }

          var canvasPosition = getElementPosition(document.getElementById(canvasName));
          object.mouseX = (clientX - canvasPosition.x) / 30;
          object.mouseY = (clientY - canvasPosition.y) / 30;
          e.preventDefault();
        }.bind(object);

        object.getBodyAtMouse = function () {
          object.mousePVec = new b2Vec2(object.mouseX, object.mouseY);
          var aabb = new b2AABB();
          aabb.lowerBound.x = object.mouseX - 0.001;
          aabb.lowerBound.y = object.mouseY - 0.001;

          aabb.upperBound.x = object.mouseX + 0.001;
          aabb.upperBound.y = object.mouseY + 0.001;

          // Query the world for overlapping shapes.
          object.selectedBody = null;
          object.world.QueryAABB(getBodyCB, aabb);

          return object.selectedBody;
        };

        function getBodyCB(fixture) {
          if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
            if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), object.mousePVec)) {
              object.selectedBody = fixture.GetBody();
              return false;
            }
          }
          return true;
        }

        //http://js-tut.aardon.de/js-tut/tutorial/position.html
        function getElementPosition(element) {
          var elem = element, tagname = '', x = 0, y = 0;

          while(elem !== null && (typeof(elem) == 'object') && (typeof(elem.tagName) != 'undefined')) {
            y += elem.offsetTop;
            x += elem.offsetLeft;
            tagname = elem.tagName.toUpperCase();

            if(tagname == 'BODY')
              elem=0;

            if(typeof(elem) == 'object') {
              if(typeof(elem.offsetParent) == 'object')
                elem = elem.offsetParent;
            }
          }

          return {x: x, y: y + document.body.scrollTop};
        }

        object.addInteractions = function () {
          document.addEventListener('mousedown', object.handleMouseDown, true);
          document.addEventListener('touchstart', object.handleMouseDown, true);
          document.addEventListener('mouseup', object.handleMouseUp, true);
          document.addEventListener('touchend', object.handleMouseUp, true);
        };
        object.removeInteractions = function () {
          document.removeEventListener('mousedown', object.handleMouseDown, true);
          document.removeEventListener('touchstart', object.handleMouseDown, true);
          document.removeEventListener('mouseup', object.handleMouseUp, true);
          document.removeEventListener('touchend', object.handleMouseUp, true);
          document.removeEventListener('mousemove', object.handleMouseMove, true);
          document.removeEventListener('touchmove', object.handleMouseMove, true);
        };
      }
    };
  }

  function GameFeedback() {
    return {
      message: function (path) {
        var pieces = path.split('.'),
            next   = juice.messages;
        for (var i = 0; i < pieces.length; i++) {
          next = next[pieces[i]];
        }
        return next;
      },

      incorrect: function () {
        var wording = juice.messages.incorrectWording;
        return wording[Math.floor(Math.random() * wording.length)];
      },
      correct: function () {
        var wording = juice.messages.congratulatoryWording;
        return wording[Math.floor(Math.random() * wording.length)];
      }
    };
  }

  function GameData(IdGenerator, interactiveData) {
    var data         = interactiveData.interactive || {},
        general      = data.general,
        splash       = data.splash,
        instructions = data.instructions,
        gameContent  = data.content,
        review       = data.review;

    function generateId() {
      return IdGenerator.uuid();
    }
    function Data(section) {
      this.data = section;
    }
    Data.prototype.get = function (key) {
      return this.data[key];
    };
    Data.prototype.add = function (key) {
      this.data[key].push({});
    };
    Data.prototype.remove = function (key, item) {
      this.data[key].splice(this.data[key].indexOf(item), 1);
    };
    return {
      generateId: generateId,
      data: {
        general: {
          name: general && general.name || ''
        },
        splash: {
          image: splash && splash.image || ''
        },
        instructions: {
          context: instructions && instructions.context || '',
          instructions: instructions && instructions.instructions || '',
          tip: instructions && instructions.tip || '',
          image: instructions && instructions.image || ''
        },
        content: {
          number_rounds: gameContent && gameContent.number_rounds || 1,
          rounds: gameContent && gameContent.rounds || [{
            id: generateId()
          }]
        },
        review: {
          feedbackType: review && review.feedbackType || ''
        }
      },
      section: function (section) {
        return new Data(this.data[section]);
      },
      toJSON: function () {
        return this.data;
      }
    };
  }


  function GameStates() {
    return {
      gameplay: {
        REWIND: 'rewind',
        RESET: 'reset',

        SUBMIT: 'submit',
        SHOW_ANSWERS: 'showAnswers',

        SHOW_ATTEMPT: 'showAttempt',

        QUIT: 'quit',
        NEXT_ROUND: 'nextRound',
        PLAY_AGAIN: 'playAgain',
      },
      scoring: {
        NO_RETRY: 10,          //state1: never retried, all right
        RETRIED: 5,            //state2: retried, all right
        AT_LEAST_ONE_WRONG: 1, //state3: at least one round wrong
        ALL_WRONG: 0           //state4: all rounds wrong
      }
    };
  }

  function GameService($timeout, GameResolver, Sounds, Util, GameStateTracker, GameFeedback) {
    function GameInterface(options) {
      this.name = options.name;
      this.content = options.content;
      this.feedback = options.feedback;
      this.resolver = new GameResolver(this.name);
      this.gameStateTracker = new GameStateTracker();
      this.game = this._create();
      this.session = options.session;
      this.previousFeedback = options.previousFeedback;
      this._setupAttempts();
    }


    GameInterface.prototype.clearPreviousFeedback = function(){
      if(this.previousFeedback){
        this.skipAdvanceOnPlayAgain = true;
      }
      this.previousFeedback = null;
      //this.feedback_ = new Feedback(this, this.game);
    }

    GameInterface.prototype.getAttempt = function () {
      var attempt = this.feedback_ && this.feedback_.currentAttempt;
      if(!attempt && this.previousFeedback){
        attempt = this.feedback_ && this.feedback_.attempts && this.feedback_.attempts[this.feedback_.attempts.length -1];
      }
      return attempt;
    };

    GameInterface.prototype.progress = function () {
      if (!this.isImmediate()) {
        throw 'Only immediate mode games should submit progress';
      }
    };

    GameInterface.prototype.handle = function (state) {
      console.log("STATE:"+state);

      if(state==='nextRound'){
        $('.modal-body').scrollTop(0);
      }
      var args = Array.prototype.slice.call(arguments, 1);
      if (!this[state] || (typeof this[state]) !== 'function') {
        throw 'State [' + state + '] is invalid.';
      }

      if (state === 'reset') {
        this.game.recordCurrentAnswers();
      }
      if (state === 'showAttempt') { //showAttempt should not result in new feedback being registered
        console.log('show attempt');
        return this[state].apply(this, args);
      }

      if (!this.feedback_ || this.feedback_.isPreviousFeedback) {
        this.feedback_ = new Feedback(this, this.game);
      }

      var result = this[state].apply(this, args);
      var feedback = this.game.roundFeedback();

      this.feedback_.new(state, this._getCurrentRound().id);
      this.feedback_.record(state, feedback);

      if (this._sessionComplete !== true) { //once it's true, keep it that way
        this._sessionComplete = this.hasCompletedAttempt();
      }
      if(this.feedback_ && this.feedback_.gameType){
        var scaleableGames = public_configs.scaleable_games;
        var gameName = this.feedback_.gameType;
        var isScaleable = (scaleableGames.indexOf(gameName)!==-1);
        console.log('are we scaleable', isScaleable);
      }
      rescaleGameBackground();
      this.saveSession();

      return result;
    };

    GameInterface.prototype.loadPreviousFeedback = function() {
      if(!this.previousFeedback){
        return false;
      } else {
        this.previousFeedback.isPreviousFeedback = true;
        this.feedback_ = this.previousFeedback;
        return true;
      }
    }

    GameInterface.prototype.hasCompletedAttempt = function () {
      var attemptedRounds = this.feedback_.getRounds(),
          numberAttempted = attemptedRounds.length,
          empty           = attemptedRounds.length === 0,
          numberRounds    = parseInt(this.content.number_rounds, 10);
      return !empty &&
             (numberAttempted === numberRounds) &&
             !!(attemptedRounds[attemptedRounds.length - 1].endedAt);
    };

    GameInterface.prototype.feedbackType = function () {
      return this.feedback;
    };

    GameInterface.prototype.quit = function () {
      this.game.recordCurrentAnswers();

      this.game.cleanUp();

      this.game = this._create();
      this._applyOnAnswer();
    };

    GameInterface.prototype.shutdown = function () {
      //this.game.cleanUp();
      this.handle('quit');
      this.feedback_.end();
      this.saveSession();
    };

    GameInterface.prototype.isSessionComplete = function () {
      return this._sessionComplete === true;
    };

    GameInterface.prototype.saveSession = function () {
      if (this.session) {
        console.log(this.feedback_.toSessionJSON());
        this.session.save(this.feedback_.toSessionJSON(), this.isSessionComplete());
      }
    };

    GameInterface.prototype.reset = function () {
      this.play();
    };

    GameInterface.prototype.nextRound = function (callback) {
      var self = this;
      self._advanceRound();
      self.transition();
      $timeout(function () {
        self.play();
        callback();
      }, 1000);
    };

    GameInterface.prototype.transition = function () {
      this.game.transition();
    };


    GameInterface.prototype.playAgain = function () {
      if(!this.skipAdvanceOnPlayAgain){
        this._advanceRound();
      }else{
        this.skipAdvanceOnPlayAgain = false;
      }

      this.play();
    };

    GameInterface.prototype.play = function (gameState, roundIndex) {
      this.quit();

      var roundContent = roundIndex === undefined ? this._getCurrentRound() : this._getRound(roundIndex);
      this.game.play(RoundFormatter.format(roundContent), gameState);
    };

    GameInterface.prototype.rewind = function () {
      this.game.recordCurrentAnswers();
      this.game.rewind();
    };

    GameInterface.prototype.showAnswers = function () {
      this.game.recordCurrentAnswers();
      this.game.showAnswers();
    };

    GameInterface.prototype.submit = function () {
      this.game.recordCurrentAnswers();
      return this.game.checkAnswers();
    };

    GameInterface.prototype.isImmediate = function () {
      return this.game.isImmediate ? this.game.isImmediate() : false;
    };

    GameInterface.prototype.isMultiMode = function () {
      return this.game.isMultiMode ? this.game.isMultiMode() : false;
    };

    GameInterface.prototype.showAttempt = function (roundNumber) {
      Sounds.muteNext('incorrect');

      var roundTry = this.feedback_.getRoundTry(roundNumber - 1);
      this.play(roundTry && roundTry.feedback && roundTry.feedback.objectState, this.currentAttempt[roundNumber - 1]);
    };

    GameInterface.prototype.getRoundValue = function(roundNumber, key){
      var roundIndex    = roundNumber - 1;
      var round         = this.availableRounds[this.currentAttempt[roundIndex]];
      return round[key];
    }


    GameInterface.prototype.isScoreboardReplay = function(){
      if(this.previousFeedback){
        return true;
      }else{
        return false;
      }
    }

    GameInterface.prototype.feedbackMessage = function (roundNumber) {
      var currentUserAttempt = this.getAttempt();
      if (!currentUserAttempt) { //mostly just to keep previewing feedback screen from erroring out
        return ' ';
      }

      if (roundNumber === undefined) {
        var correct = [];
        for (var i = 0; i < currentUserAttempt.rounds.length; i++) {
          var lastTry = currentUserAttempt.rounds[i].tries;
          lastTry = lastTry[lastTry.length - 1];
          if (lastTry.state === 'submit') {
            correct.push({});
          }
        }
        var percentage = correct.length / currentUserAttempt.rounds.length;
        return GameFeedback.message('feedback.header')
          .replace(':number_correct', correct.length)
          .replace(':number_rounds', currentUserAttempt.rounds.length)
          .replace(':congrats', percentage > 0.34 ? ' Nice Job!' : '');
      }

      var roundIndex    = roundNumber - 1,
          roundFeedback = currentUserAttempt.rounds[roundIndex],
          round         = this.availableRounds[this.currentAttempt[roundIndex]],
          roundTry;
      if (!round) { return ' '; }
      if (!roundFeedback) { return ' '; }
      if (roundFeedback && roundFeedback.tries && roundFeedback.tries.length){
        var last_try = roundFeedback.tries[roundFeedback.tries.length-1];
        if(last_try.state === 'submit'){ //we were successful
          if(roundFeedback.tries.length === 1){
            return 'Great! Got it on the first try!';
          }else if(roundFeedback.firstTrySuccess==true) {
            return 'Great! Got it on the first try!';
          }else{
            return 'Good! You got it right.';
          }
        }else if(last_try.state === 'showAnswers'){
          return 'Oops! Your answer was incorrect.';
        }else{
          return 'ERROR - Unknown success state: '+last_try.state;
        }
      }
      return ' ';
      //no longer create detailed round feedback messages
      // roundTry = roundFeedback.tries[roundFeedback.tries.length - 1];
      // var feedbackMessage = roundTry && roundTry.feedback && roundTry.feedback.feedbackMessage;
      // return feedbackMessage || (roundTry.correct ?
      //                          round.general_correct :
      //                          round.general_incorrect);
    };

    GameInterface.prototype.onAnswer = function (callback) {
      var self = this;
      if (!self.isImmediate()) {
        return;
      }

      var game = this.game;
      this.answerListeners = this.answerListeners || [];
      this.answerListeners.push(callback);
      this.game.onStatusChange(function (status) {
        game.recordCurrentAnswers();
        if (status === undefined) { return; }
        if (status === true || status === false) { return; }
        return callback(status);
      });
    };

    GameInterface.prototype._setupAttempts = function () {
      var roundsPerAttempt = this.content.number_rounds;
      var roundsAvailable = this.content.rounds.length;
      var remainder = roundsAvailable % roundsPerAttempt;
      var attemptBlocks = [],
          block         = [];
      for (var i = 0, chunk = 0; i < (roundsAvailable - remainder); i++, chunk++) {
        if (chunk === roundsPerAttempt) {
          attemptBlocks.push(block);
          chunk = 0;
          block = [];
        }
        block.push(i);
      }
      if (block.length) { //condition to make sure the last block created also gets included
        attemptBlocks.push(block);
      }

      //this.availableRounds   --> rounds that can be played
      //this.availableAttempts --> what each attempt can consist of. arrays of integers, representing indexes into this.availableRounds
      //this.currentAttempt    --> the array of indexes we're currently on. cyclical, and will start back at the beginning once we hit the end
      this.availableRounds = this.content.rounds;
      this.availableAttempts = attemptBlocks;
      this.currentAttempt = attemptBlocks[Util.randomInt(0, attemptBlocks.length)];

      if (this.content.authoringRound) { //when authoring round is chosen ("preview" mode), force it to be one round only
        this.availableAttempts = [[parseInt(this.content.authoringRound, 10)]];
        this.currentAttempt = this.availableAttempts[0];
      }
      this.currentRoundIndex = this.currentAttempt[0];
    };

    GameInterface.prototype._getCurrentRound = function () {
      return this._getRound(this.currentRoundIndex);
    };

    GameInterface.prototype._getRound = function (roundIndex) {
      return this.availableRounds[this.currentAttempt[this.currentAttempt.indexOf(roundIndex)]];
    };

    GameInterface.prototype._advanceRound = function () {
      setRoundStatus(this.feedback_.currentRound);
      //availableAttempts -> all blocks
      //currentAttempt    -> currently selected block
      //currentRoundIndex -> index of the round, which will always live within the currentAttempt
      //attemptIndex -> index of the current attempt inside of currentAttempts
      var attemptIndex              = this.availableAttempts.indexOf(this.currentAttempt);
      var attemptRoundIndex         = this.availableAttempts[attemptIndex].indexOf(this.currentRoundIndex);
      var nextRoundIndex            = this.currentAttempt[attemptRoundIndex + 1];
      var lastAvailableAttemptIndex = this.availableAttempts.length - 1;

      if (nextRoundIndex === undefined) {
        if (attemptIndex === lastAvailableAttemptIndex) {
          this.currentAttempt = this.availableAttempts[0];
        } else {
          this.currentAttempt = this.availableAttempts[attemptIndex + 1];
        }
        nextRoundIndex = this.currentAttempt[0];
      }

      this.currentRoundIndex = nextRoundIndex;
    };

    GameInterface.prototype._applyOnAnswer = function () {
      var self      = this,
          listeners = (this.answerListeners || []).concat([]);
      this.answerListeners = [];
      angular.forEach(listeners, function (listener) {
        self.onAnswer(listener);
      });
    };

    GameInterface.prototype._create = function () {
      return this.resolver.new(this.gameStateTracker);
    };
    GameInterface.prototype.logo = function () {
      return this.resolver.logo();
    };
    GameInterface.prototype.infoBackground = function () {
      return this.resolver.infoBackground();
    };
    GameInterface.prototype.getBackground = function (name) {
      return this.resolver.background(name);
    };
    GameInterface.prototype.gameBackground = function () {
      return this.resolver.gameBackground();
    };
    GameInterface.prototype.backgroundGradient = function () {
      return [
        ['#6cab26', '#6ceb86'],
        ['#FB83FA', '#E93CEC'],
        ['#CDEB8E', '#A5C956'],
        ['#7ABCFF', '#4096EE']
      ][Util.randomInt(0, 3)];
    };

    return GameInterface;
  }



  var RoundFormatter = (function () {
    return {
      format: function format(roundContent) {
        var transformed = JSON.parse(JSON.stringify(roundContent));

        transformed = formatInstructions(transformed);
        transformed = formatPrompt(transformed);

        return transformed;
      }
    };

    function formatInstructions(content) {
      var obj = content,
          key = 'question';

      if (obj.question || obj.directions) {
        key = obj.question ? key : 'directions';
      } else if (obj.instructions) {
        if (obj.instructions.content) {
          obj = obj.instructions;
          key = 'content';
        } else {
          key = 'instructions';
        }
      }

      if (obj[key]) {
        obj[key] = runFormatters(obj[key]);
      }

      return content;
    }

    function formatPrompt(content) {
      var obj = content,
          key = 'equation';

      key = obj.equation ? key : 'prompt';
      if (obj.prompt && typeof obj.prompt == 'object') {
        obj = obj.prompt;
        key = 'content';
      }

      if (obj[key]) {
        obj[key] = runFormatters(obj[key] || '');
      }

      return content;
    }

    function runFormatters(content) {
      return popupTag(content);
    }

    function popupTag(content) {
      //<popup href="http://google.com" width="150" height="150">content</popup>
      var div = document.createElement('div'), popups;
      div.innerHTML = content;
      popups = div.querySelectorAll('popup');
      angular.forEach(popups, function (popup) {
        var width  = popup.getAttribute('width')  || '800',
            height = popup.getAttribute('height') || '600',
            href   = popup.getAttribute('href'),
            text   = popup.textContent;
        popup.outerHTML =
          '<a href="#" class="game-popup" onclick="' +
          "window.open('" + href + "', '_blank', 'top=50, left=100, width=" + width + ', height=' + height + "');" + // 'Read More' was the name
          'return false;">' +
          text +
          '</a>';
      });
      return div.innerHTML;
    }
  })();




  function GameStateTracker() {
    function GameStateTracker() {
      this.answers = this.objectState = this.roundId = null;
    }
    GameStateTracker.requiredProperties = [
      'id',
      'content',
      'correct'
    ];
    GameStateTracker.prototype.record = function (options) {
      var answers        = options.answers,
          objectState    = options.objectState,
          curatedAnswers = [];

      for (var i = 0; i < answers.length; i++) {
        var answer        = answers[i],
            curatedAnswer = {},
            property, j, key;

        for (j = 0; j < GameStateTracker.requiredProperties.length; j++) {
          property = GameStateTracker.requiredProperties[j];
          if (!(property in answer)) {
            throw 'Property [' + property + '] is required in the answer object';
          }
        }

        for (key in answer) {
          if (answer.hasOwnProperty(key)) {
            curatedAnswer[key] = answer[key];
          }
        }

        curatedAnswers.push(curatedAnswer);
      }

      this.answers = curatedAnswers;
      this.objectState = objectState;
      this.roundId = options.roundId;
      this.feedbackMessage = options.feedbackMessage;
    };

    return GameStateTracker;
  }




  /**
   * Private class, used internally by the GameService to manage feedback
   * @constructor
   */
  function Feedback(gameInterface, game) {
    ////
    //Suppose we can store all attempts for each game and all  tries for each round.
    //  Store this: Game ID, Game attempt #, Round ID, Try #, # Correct, # incorrect, # not answered, time stamp
    //Suppose we are storing all attempts for each game and only storing the last try for each round.
    //  Store this: Game ID, Game attempt #, Round ID,  Last Try #, # Correct on last attempt, # incorrect on last attempt,
    //              # not answered on last attempt, time stamp
    ////
    //Play          - Round > Try
    //Rewind        - Try
    //Reset         - Try
    //Show Answers  - Try
    //Next Round    - Round > Try
    //Play Again    - Attempt > Round > Try
    this.gameType = gameInterface.name;
    this.attempts = [];
    this.startedAt = new Date();
    this.endedAt = null;
  }
  Feedback.prototype.try = function () {
    if (!this.currentRound) {
      this.round();
    }

    this._ended(this.currentTry);

    this.currentTry = {};
    this.currentRound.tries.push(this._started(this.currentTry));
  };

  function setRoundStatus(round, gameType){
    if(!round){
      return;
    }
    var firstTrySuccess = true;

    var one_try_is_needed_for_first_try_success = ['fridge_magnets', 'puzzler'];
    if(one_try_is_needed_for_first_try_success.indexOf(gameType)!==-1){
      if(round.tries.length > 1){
        firstTrySuccess = false;
      }
    }
    round.tries && round.tries.forEach(function(try_){//try is a reserved word... so try_
      var feedback = try_.feedback;
      feedback && feedback.answers && feedback.answers.forEach(function(answer){
          if(answer.correct === false){
            firstTrySuccess = false;
          }
      });
    });
    round.firstTrySuccess = firstTrySuccess;
  }

  Feedback.prototype.round = function (roundId, state) {
    if (!this.currentAttempt) {
      this.attempt();
    }
    if (state != 'playAgain') {this._ended(this.currentRound)};  // to fix the last round end time--do not update on playAgain! 

    this.currentRound = {
      roundId: roundId,
      tries: []
    };
    this.currentAttempt.rounds.push(this._started(this.currentRound));
  };
  Feedback.prototype.attempt = function () {
    this._ended(this.currentAttempt);

    this.currentAttempt = {
      rounds: []
    };
    this.attempts.push(this._started(this.currentAttempt));
  };
  Feedback.prototype.currentState = function () {
    return this.currentTry ?
      this.currentTry.state :
      '';
  };
  Feedback.prototype.record = function (state, gameFeedback) {
    if (!this.currentTry) {
      return console && console.error && console.error('No try is currently active');
    }

    if (state === 'nextRound' || state === 'quit') {  //update end time on quit also!
      this._ended(this.currentRound);
    }

    var feedback = this;
    if (state === 'submit'){
      if(this.currentAttempt && this.currentAttempt.rounds && this.currentAttempt.rounds.length) {
        this.currentAttempt.rounds.forEach(function(round){
          if(round.tries && round.tries.length){
            setRoundStatus(round, feedback.gameType || null);
          }
        });
      }
    }

    if (['nextRound', 'playAgain'].indexOf(state) !== -1) { return; }

    if (state === 'quit' && this.currentTry.state) { return; } //don't overwrite the state if one exists. only record 'quit' if they hadn't finished the try
    this.currentTry.state = state;
    this.currentTry.feedback = JSON.parse(JSON.stringify(gameFeedback)); //clone by serializing then unserializing
    this._ended(this.currentTry);
  };
  Feedback.prototype.end = function () {
    if (this.currentTry && !this.currentTry.endedAt) {
      this._ended(this.currentTry);
    }
    if (this.currentRound && !this.currentRound.endedAt) {
      this._ended(this.currentRound);
    }
    if (this.currentAttempt && !this.currentAttempt.endedAt) {
      this._ended(this.currentAttempt);
    }
    if (!this.endedAt) {
      this._ended(this);
    }
  };
  Feedback.prototype.new = function (state, roundId) {
    var states = {
      quit: [],   
      showAnswers: ['try'],
      submit: ['try'],
      progress: ['try'],

      rewind: ['try'],
      reset: ['try'],

      play: ['round'],
      nextRound: ['round'],

      playAgain: ['attempt', 'round']
    };

    var steps = states[state];
    steps.forEach(function (step) {
      this[step](roundId, state);
    }, this);
  };
  Feedback.prototype.getRoundTry = function (roundNumber) {
    var attempt = this.attempts[this.attempts.length - 1];
    var round = attempt.rounds[roundNumber];
    if(!round || !round.tries){
      return null;
    }
    return round.tries[round.tries.length - 1];
  };
  Feedback.prototype.toSessionJSON = function () {
    var json = this.toJSON();
    angular.forEach(json.attempts, function (attempt) {
      stripObjectState(attempt);
    });
    return json;

    function stripObjectState(object) {
      var iterate;
      if (object.rounds) {
        iterate = object.rounds;
      }
      if (object.tries) {
        iterate = object.tries;
      }
      if (iterate) {
        angular.forEach(iterate, function (item) {
          stripObjectState(item);
        });
      } else {
        if (!object.feedback) {
          return;
        }
        delete object.feedback.objectState;
      }
    }
  };
  Feedback.prototype.getRounds = function () {
    var attempt = this.attempts[this.attempts.length - 1];
    return (attempt && attempt.rounds) || [];
  };
  Feedback.prototype.toJSON = function () {
    return JSON.parse(JSON.stringify({
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      attempts: this.attempts
    }));
  };
  Feedback.prototype._started = function (obj) {
    obj.startedAt = new Date();
    obj.endedAt = null;
    return obj;
  };
  Feedback.prototype._ended = function (obj) {
    if (!obj) { return; }
    obj.endedAt = new Date();
    return obj;
  };


  function FeedbackAnimation($timeout, Util) {
    var ANIMATIONS = [
      'confetti',
      'fireworks',
      'balloons'
    ];
    ANIMATIONS = ANIMATIONS.concat(ANIMATIONS).concat(ANIMATIONS).concat(ANIMATIONS); //more likely to choose a unique 'random' animation
    function Animation(options) {
      var type = ANIMATIONS[Util.randomInt(0, ANIMATIONS.length)];

      switch (type) {
        case 'confetti':
          this.animator = Confetti({maxConfetti: options.multiplier * 25});
          break;
        case 'fireworks':
          this.animator = Fireworks({fireworksPerLoop: 50 / options.multiplier});
          break;
        case 'balloons':
          this.animator = Balloons({balloonsPerLoop: 50 / options.multiplier});
          break;
        default:
          break;
      }
    }
    Animation.prototype.runFor = function (duration) {
      var self = this;
      self.animator.run();
      $timeout(function () {
        self.animator.stopAfterExit();
      }, duration);
    };
    Animation.prototype.hardStop = function () {
      this.animator.stop();
    };
    return Animation;
  }

  (function() {
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
    // MIT license
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
        || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
      window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
  }());

  var Confetti = (function () {
    function newConfetti(options) {
      //http://jsfiddle.net/vxP5q/61/light/
      var canvas;
      var ctx;
      var confettiHandler;
      //canvas dimensions
      var W;
      var H;
      var mp = options.maxConfetti || 0; //max particles
      var particles = [];
      var stopFalling = false;

      function run() {
        canvas = document.getElementById('feedback-animation');
        if (!canvas || !canvas.getContext) { return; }

        ctx = canvas.getContext('2d');
        //canvas dimensions
        W = 894;
        H = 600;
        canvas.width = W;
        canvas.height = H;
        stopFalling = false;

        for (var i = 0; i < mp; i++) {
          particles.push({
            x: Math.random() * W, //x-coordinate
            y: Math.random() * H, //y-coordinate
            r: randomFromTo(5, 30), //radius
            d: (Math.random() * mp) + 10, //density
            color: "rgba(" + Math.floor((Math.random() * 255)) + ", " + Math.floor((Math.random() * 255)) + ", " + Math.floor((Math.random() * 255)) + ", 0.7)",
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncremental: (Math.random() * 0.07) + .05,
            tiltAngle: 0
          });
        }
        startConfetti();
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < mp; i++) {
          var p = particles[i];
          ctx.beginPath();
          ctx.lineWidth = p.r / 2;
          ctx.strokeStyle = p.color;  // Green path
          ctx.moveTo(p.x + p.tilt + (p.r / 4), p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 4));
          ctx.stroke();  // Draw it
        }

        update();
      }
      function randomFromTo(from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
      }
      var TiltChangeCountdown = 5;
      //Function to move the snowflakes
      //angle will be an ongoing incremental flag. Sin and Cos functions will be applied to it to create vertical and horizontal movements of the flakes
      var angle = 0;
      var tiltAngle = 0;
      function update() {
        angle += 0.01;
        tiltAngle += 0.1;
        TiltChangeCountdown--;
        for (var i = 0; i < mp; i++) {

          var p = particles[i];
          p.tiltAngle += p.tiltAngleIncremental;
          //Updating X and Y coordinates
          //We will add 1 to the cos function to prevent negative values which will lead flakes to move upwards
          //Every particle has its own density which can be used to make the downward movement different for each flake
          //Lets make it more random by adding in the radius
          p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) / 2;
          p.x += Math.sin(angle);
          //p.tilt = (Math.cos(p.tiltAngle - (i / 3))) * 15;
          p.tilt = (Math.sin(p.tiltAngle - (i / 3))) * 15;

          //Sending flakes back from the top when it exits
          //Lets make it a bit more organic and let flakes enter from the left and right also.
          if (p.x > W + 5 || p.x < -5 || p.y > H && !stopFalling) {
            if (i % 5 > 0 || i % 2 == 0) //66.67% of the flakes
            {
              particles[i] = { x: Math.random() * W, y: -10, r: p.r, d: p.d, color: p.color, tilt: Math.floor(Math.random() * 10) - 10, tiltAngle: p.tiltAngle, tiltAngleIncremental: p.tiltAngleIncremental };
            }
            else {
              //If the flake is exitting from the right
              if (Math.sin(angle) > 0) {
                //Enter from the left
                particles[i] = { x: -5, y: Math.random() * H, r: p.r, d: p.d, color: p.color, tilt: Math.floor(Math.random() * 10) - 10, tiltAngleIncremental: p.tiltAngleIncremental };
              }
              else {
                //Enter from the right
                particles[i] = { x: W + 5, y: Math.random() * H, r: p.r, d: p.d, color: p.color, tilt: Math.floor(Math.random() * 10) - 10, tiltAngleIncremental: p.tiltAngleIncremental };
              }
            }
          }
        }
      }
      function startConfetti() {
        W = 894;
        H = 600;
        canvas.width = W;
        canvas.height = H;
        confettiHandler = setInterval(draw, 15);
      }
      function stopConfetti() {
        clearTimeout(confettiHandler);
        if (ctx == undefined) { return; }
        ctx.clearRect(0, 0, W, H);
      }
      function stopAfterExit() {
        stopFalling = true;
      }

      return {
        run: run,
        stop: stopConfetti,
        stopAfterExit: stopAfterExit
      };
    }

    return newConfetti;
  })();

  var Fireworks = (function () {
    function newFireworks(options) {
      // http://jsfiddle.net/mostlygeek/etz43/
      // now we will setup our basic variables for the demo
      var canvas,
          ctx,
          // full screen dimensions
          //cw = window.innerWidth,
          cw = 900,
          //ch = window.innerHeight,
          ch = 560,
          // firework collection
          fireworks = [],
          // particle collection
          particles = [],
          // starting hue
          hue = 120,
          // when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
          limiterTotal = options.fireworksPerLoop || -1,
          limiterTick = 0,
          // this will time the auto launches of fireworks, one launch per X loop ticks
          timerTotal = options.fireworksPerLoop || -1,
          timerTick = 0,
          mousedown = false,
          stopFiring = false,
          // mouse x coordinate,
          mx,
          // mouse y coordinate
          my,
          animationFrameRef;

      function run() {
        canvas = document.getElementById( 'feedback-animation' );
        if (!canvas || !canvas.getContext) { return; }

        ctx = canvas.getContext( '2d' );
        // set canvas dimensions
        canvas.width = cw;
        canvas.height = ch;

        loop();
      }

      function stopFireworks() {
        cancelAnimationFrame(animationFrameRef);
        if (ctx == undefined) { return; }
        ctx.clearRect(0, 0, cw, ch);
      }

      // get a random number within a range
      function random( min, max ) {
        return Math.random() * ( max - min ) + min;
      }

      // calculate the distance between two points
      function calculateDistance( p1x, p1y, p2x, p2y ) {
        var xDistance = p1x - p2x,
            yDistance = p1y - p2y;
        return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) );
      }

      // create firework
      function Firework( sx, sy, tx, ty ) {
        // actual coordinates
        this.x = sx;
        this.y = sy;
        // starting coordinates
        this.sx = sx;
        this.sy = sy;
        // target coordinates
        this.tx = tx;
        this.ty = ty;
        // distance from starting point to target
        this.distanceToTarget = calculateDistance( sx, sy, tx, ty );
        this.distanceTraveled = 0;
        // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
        this.coordinates = [];
        this.coordinateCount = 3;
        // populate initial coordinate collection with the current coordinates
        while( this.coordinateCount-- ) {
          this.coordinates.push( [ this.x, this.y ] );
        }
        this.angle = Math.atan2( ty - sy, tx - sx );
        this.speed = 2;
        this.acceleration = 1.05;
        this.brightness = random( 50, 70 );
        // circle target indicator radius
        this.targetRadius = 1;
      }

      // update firework
      Firework.prototype.update = function( index ) {
        if (timerTotal === -1) { return; }

        // remove last item in coordinates array
        this.coordinates.pop();
        // add current coordinates to the start of the array
        this.coordinates.unshift( [ this.x, this.y ] );

        // cycle the circle target indicator radius
        if( this.targetRadius < 8 ) {
          this.targetRadius += 0.3;
        } else {
          this.targetRadius = 1;
        }

        // speed up the firework
        this.speed *= this.acceleration;

        // get the current velocities based on angle and speed
        var vx = Math.cos( this.angle ) * this.speed,
            vy = Math.sin( this.angle ) * this.speed;
        // how far will the firework have traveled with velocities applied?
        this.distanceTraveled = calculateDistance( this.sx, this.sy, this.x + vx, this.y + vy );

        // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
        if( this.distanceTraveled >= this.distanceToTarget ) {
          createParticles( this.tx, this.ty );
          // remove the firework, use the index passed into the update function to determine which to remove
          fireworks.splice( index, 1 );
        } else {
          // target not reached, keep traveling
          this.x += vx;
          this.y += vy;
        }
      };

      // draw firework
      Firework.prototype.draw = function() {
        ctx.beginPath();
        // move to the last tracked coordinate in the set, then draw a line to the current x and y
        ctx.moveTo( this.coordinates[ this.coordinates.length - 1][ 0 ], this.coordinates[ this.coordinates.length - 1][ 1 ] );
        ctx.lineTo( this.x, this.y );
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
        ctx.stroke();
      };

      // create particle
      function Particle( x, y ) {
        this.x = x;
        this.y = y;
        // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
        this.coordinates = [];
        this.coordinateCount = 5;
        while( this.coordinateCount-- ) {
          this.coordinates.push( [ this.x, this.y ] );
        }
        // set a random angle in all possible directions, in radians
        this.angle = random( 0, Math.PI * 2 );
        this.speed = random( 1, 10 );
        // friction will slow the particle down
        this.friction = 0.95;
        // gravity will be applied and pull the particle down
        this.gravity = 1;
        // set the hue to a random number +-50 of the overall hue variable
        this.hue = random( hue - 50, hue + 50 );
        this.brightness = random( 50, 80 );
        this.alpha = 1;
        // set how fast the particle fades out
        this.decay = random( 0.015, 0.03 );
      }

      // update particle
      Particle.prototype.update = function( index ) {
        // remove last item in coordinates array
        this.coordinates.pop();
        // add current coordinates to the start of the array
        this.coordinates.unshift( [ this.x, this.y ] );
        // slow down the particle
        this.speed *= this.friction;
        // apply velocity
        this.x += Math.cos( this.angle ) * this.speed;
        this.y += Math.sin( this.angle ) * this.speed + this.gravity;
        // fade out the particle
        this.alpha -= this.decay;

        // remove the particle once the alpha is low enough, based on the passed in index
        if( this.alpha <= this.decay ) {
          particles.splice( index, 1 );
        }
      };

      // draw particle
      Particle.prototype.draw = function() {
        ctx.beginPath();
        ctx.lineWidth = 2; //firework thickness
        // move to the last tracked coordinates in the set, then draw a line to the current x and y
        ctx.moveTo( this.coordinates[ this.coordinates.length - 1 ][ 0 ], this.coordinates[ this.coordinates.length - 1 ][ 1 ] );
        ctx.lineTo( this.x, this.y );
        ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
        ctx.stroke();
      };

      // create particle group/explosion
      function createParticles( x, y ) {
        // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
        var particleCount = 30;
        while( particleCount-- ) {
          particles.push( new Particle( x, y ) );
        }
      }

      // main demo loop
      function loop() {
        // this function will run endlessly with requestAnimationFrame
        animationFrameRef = requestAnimationFrame( loop );

        // increase the hue to get different colored fireworks over time
        //hue += 0.5;

        // create random color
        hue = random(0, 360 );

        // normally, clearRect() would be used to clear the canvas
        // we want to create a trailing effect though
        // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
        ctx.globalCompositeOperation = 'destination-out';
        // decrease the alpha property to create more prominent trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect( 0, 0, cw, ch );
        // change the composite operation back to our main mode
        // lighter creates bright highlight points as the fireworks and particles overlap each other
        ctx.globalCompositeOperation = 'lighter';

        // loop over each firework, draw it, update it
        var i = fireworks.length;
        while( i-- ) {
          fireworks[ i ].draw();
          fireworks[ i ].update( i );
        }

        // loop over each particle, draw it, update it
        var i = particles.length;
        while( i-- ) {
          particles[ i ].draw();
          particles[ i ].update( i );
        }

        // launch fireworks automatically to random coordinates, when the mouse isn't down
        if( timerTick >= timerTotal ) {
          // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
          fireworks.push( new Firework( cw / 2, ch, random( 0, cw ), random( 0, ch / 2 ) ) );
          timerTick = 0;
        } else {
          timerTick++;
        }
      }

      return {
        run: run,
        stop: stopFireworks,
        stopAfterExit: function () {
          stopFiring = true;
        }
      };
    }

    return newFireworks;

  })();

  var Balloons = (function () {
    function newBalloons(options) {
      /**
       * @namespace Core namespace
       */
      var CANVASBALLOON     = {},
          Color             = net.brehaut.Color,
          timerTotal        = options.balloonsPerLoop || -1,
          timerTick         = 0,
          animationFrameRef;

      // Constants
      CANVASBALLOON.KAPPA = (4 * (Math.sqrt(2) - 1))/3;
      CANVASBALLOON.WIDTH_FACTOR = 0.0333;
      CANVASBALLOON.HEIGHT_FACTOR = 0.4;
      CANVASBALLOON.TIE_WIDTH_FACTOR = 0.12;
      CANVASBALLOON.TIE_HEIGHT_FACTOR = 0.10;
      CANVASBALLOON.TIE_CURVE_FACTOR = 0.13;
      CANVASBALLOON.GRADIENT_FACTOR = 0.3;
      CANVASBALLOON.GRADIENT_CIRCLE_RADIUS = 3;

      /**
       * Creates a new Balloon
       * @class	Represents a balloon displayed on a HTML5 canvas
       * @param	{String}	canvasElementID		Unique ID of the canvas element displaying the balloon
       * @param	{Number}	centerX				X-coordinate of the balloon's center
       * @param	{Number}	centerY				Y-coordinate of the balloon's center
       * @param	{Number}	radius				Radius of the balloon
       * @param	{String}	color				String representing the balloon's base color
       */
      CANVASBALLOON.Balloon = function(canvasElementID, centerX, centerY, radius, color) {
        var canvas = this.canvas = document.getElementById(canvasElementID);

        if(!canvas || !canvas.getContext)
        {
          return;
        }

        this.gfxContext = canvas.getContext('2d');
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        this.baseColor = new Color(color);
        this.darkColor = (new Color(color)).darkenByRatio(CANVASBALLOON.GRADIENT_FACTOR);
        this.lightColor = (new Color(color)).lightenByRatio(CANVASBALLOON.GRADIENT_FACTOR);
      };

      /**
       * Draws the balloon on the canvas
       */
      CANVASBALLOON.Balloon.prototype.draw = function() {
        if (!this.canvas) { return; }
        // Prepare constants

        var gfxContext = this.gfxContext;
        var centerX = this.centerX;
        var centerY = this.centerY;
        var radius = this.radius;

        var handleLength = CANVASBALLOON.KAPPA * radius;

        var widthDiff = (radius * CANVASBALLOON.WIDTH_FACTOR);
        var heightDiff = (radius * CANVASBALLOON.HEIGHT_FACTOR);

        var balloonBottomY = centerY + radius + heightDiff;

        // Begin balloon path

        gfxContext.beginPath();

        // Top Left Curve

        var topLeftCurveStartX = centerX - radius;
        var topLeftCurveStartY = centerY;

        var topLeftCurveEndX = centerX;
        var topLeftCurveEndY = centerY - radius;

        gfxContext.moveTo(topLeftCurveStartX, topLeftCurveStartY);
        gfxContext.bezierCurveTo(topLeftCurveStartX, topLeftCurveStartY - handleLength - widthDiff,
          topLeftCurveEndX - handleLength, topLeftCurveEndY,
          topLeftCurveEndX, topLeftCurveEndY);

        // Top Right Curve

        var topRightCurveStartX = centerX;
        var topRightCurveStartY = centerY - radius;

        var topRightCurveEndX = centerX + radius;
        var topRightCurveEndY = centerY;

        gfxContext.bezierCurveTo(topRightCurveStartX + handleLength + widthDiff, topRightCurveStartY,
          topRightCurveEndX, topRightCurveEndY - handleLength,
          topRightCurveEndX, topRightCurveEndY);

        // Bottom Right Curve

        var bottomRightCurveStartX = centerX + radius;
        var bottomRightCurveStartY = centerY;

        var bottomRightCurveEndX = centerX;
        var bottomRightCurveEndY = balloonBottomY;

        gfxContext.bezierCurveTo(bottomRightCurveStartX, bottomRightCurveStartY + handleLength,
          bottomRightCurveEndX + handleLength, bottomRightCurveEndY,
          bottomRightCurveEndX, bottomRightCurveEndY);

        // Bottom Left Curve

        var bottomLeftCurveStartX = centerX;
        var bottomLeftCurveStartY = balloonBottomY;

        var bottomLeftCurveEndX = centerX - radius;
        var bottomLeftCurveEndY = centerY;

        gfxContext.bezierCurveTo(bottomLeftCurveStartX - handleLength, bottomLeftCurveStartY,
          bottomLeftCurveEndX, bottomLeftCurveEndY + handleLength,
          bottomLeftCurveEndX, bottomLeftCurveEndY);

        // Create balloon gradient

        var gradientOffset = (radius/3);

        var balloonGradient =
              gfxContext.createRadialGradient(centerX + gradientOffset, centerY - gradientOffset,
                CANVASBALLOON.GRADIENT_CIRCLE_RADIUS,
                centerX, centerY, radius + heightDiff);
        balloonGradient.addColorStop(0, this.lightColor.toRGB());
        balloonGradient.addColorStop(0.7, this.darkColor.toRGB());

        gfxContext.fillStyle = balloonGradient;
        gfxContext.fill();

        // End balloon path

        // Create balloon tie

        var halfTieWidth = (radius * CANVASBALLOON.TIE_WIDTH_FACTOR)/2;
        var tieHeight = (radius * CANVASBALLOON.TIE_HEIGHT_FACTOR);
        var tieCurveHeight = (radius * CANVASBALLOON.TIE_CURVE_FACTOR);

        gfxContext.beginPath();
        gfxContext.moveTo(centerX - 1, balloonBottomY);
        gfxContext.lineTo(centerX - halfTieWidth, balloonBottomY + tieHeight);
        gfxContext.quadraticCurveTo(centerX, balloonBottomY + tieCurveHeight,
          centerX + halfTieWidth, balloonBottomY + tieHeight);
        gfxContext.lineTo(centerX + 1, balloonBottomY);
        gfxContext.fill();
      };




      var INITY = 500;
      var XMAX = 900;
      var balloonConstructor = function(xcoord, ycoord, size, color) {
        var that;
        that = {};
        that.xcoord = xcoord ;
        that.ycoord = ycoord ;
        that.size = size;
        that.color = color;
        //that.delta = -1 * ((Math.random()*3.4)+0.25);
        that.delta = -1 * ((Math.random() * 7) + 0.25);
        that.xdelta = -.5 + Math.random();

        that.tick = function() {
          that.ycoord = that.ycoord +that.delta;
          that.xcoord = that.xcoord +that.xdelta;
          if (that.xcoord < 0) {
            that.xdelta = -that.xdelta;;
          }
          if (that.xcoord > XMAX) {
            that.xdelta = -that.xdelta;
          }
        };

        that.draw = function (canvas) {
          if (this.ycoord > -100) {
            if(!canvas || !canvas.getContext)
            {
              return;
            }

            var balloon = new CANVASBALLOON.Balloon('feedback-animation', this.xcoord, this.ycoord, this.size, this.color);
            balloon.draw();
          }
        };

        return that;
      };


      var BalloonAnimation = {};
      BalloonAnimation.COLORS = [
        '#Ed1c24', '#00a651', '#2e3192', '#Fff200', '#F06a43', '#663399'
      ];
      BalloonAnimation.init = function() {
        animationFrameRef = requestAnimationFrame(BalloonAnimation.run);
        this.canvas = document.querySelector('#feedback-animation');
        this.balloons = [];
      };

      BalloonAnimation.randomBalloon = function() {
        var xcoord = Math.floor(Math.random()*XMAX );
        var ycoord = INITY;
        var randomSize = 24+Math.floor(Math.random()*50);

        //var getRandomRGB = function() {
        //  return Math.floor(Math.random() * 255);
        //};
        //return balloonConstructor(xcoord, ycoord, randomSize, 'rgb(' + getRandomRGB() + ',' + getRandomRGB() + ',' + getRandomRGB() + ')');

        var length = BalloonAnimation.COLORS.length;
        return balloonConstructor(xcoord, ycoord, randomSize,
          BalloonAnimation.COLORS[Math.floor(Math.random() * (length - 0))]
        );
      };

      BalloonAnimation.tick = function() {
        if (timerTotal === -1) { return; }

        var i;

        for (i = 0; i < this.balloons.length; i++) {
          if (this.balloons[i].ycoord < -100) {
            this.balloons.splice(i,1);
            i--;
          }
        }

        if (timerTick >= timerTotal) {
          if (!BalloonAnimation.stopped && !BalloonAnimation.stopping) {
            this.balloons.push(this.randomBalloon());
          }

          timerTick = 0;
        } else {
          timerTick++;
        }

        //if (Math.random() < 0.10) {
        //  this.balloons.push(this.randomBalloon());
        //}

        for (i in this.balloons) {
          this.balloons[i].tick();
        }
      };

      BalloonAnimation.draw = function() {
        for (var i in this.balloons) {
          this.balloons[i].draw(this.canvas);
        }
      };

      BalloonAnimation.clear = function() {
        var self = this;
        if (self.canvas && self.canvas.getContext('2d')) {
          self.ctx = self.canvas.getContext('2d');
          self.ctx.clearRect( 0, 0, 900, 600);
        }
        cancelAnimationFrame(animationFrameRef);
      };

      BalloonAnimation.update = function() {
        var self = this;
        self.clear();
        self.tick();
        self.draw();
      };
      BalloonAnimation.run = function() {
        if (!BalloonAnimation.stopped) {
          BalloonAnimation.update();
          animationFrameRef = requestAnimationFrame(BalloonAnimation.run);
        }
      };



      return {
        run: function () {
          BalloonAnimation.stopped = false;
          BalloonAnimation.init();
        },
        stop: function () {
          BalloonAnimation.clear();
        },
        stopAfterExit: function () {
          //BalloonAnimation.stopped = true;
          BalloonAnimation.stopping = true;
        }
      };
    }

    return newBalloons;
  })();
})();
