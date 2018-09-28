/* global angular, juice, $, GAME_LOADED */
(function() {
  'use strict';

  var gameControllers = angular.module('juice.games.controllers', [
    'ngAnimate',
    'ui.router',
    'ui.bootstrap',
    'juice',
    'juice.clicks',
    'juice.services',
	'angular-bind-html-compile' //!PM added to include html content in instuctions popover
  ]);

  gameControllers.controller('JuiceGameController', [
    '$scope', '$position', '$timeout', '$sce', '$filter', 'Util', 'Popover', 'GameOptions', 'GameData',
    'GameStates', '$rootScope', '$location', JuiceGameController
  ]);
  gameControllers.controller('GameModalController', ['$scope', '$modalInstance', 'framework', '$location', GameModalController]);

  function JuiceGameController($scope, $position, $timeout, $sce, $filter, Util, Popover, GameOptions, GameData, GameStates, $rootScope, $location) {
    var vm = this;
    vm.challenge_wheel_game = $location.url().indexOf('challenge_wheel')!== -1;
    vm.section = {};
    vm.popovers = [];
    vm.modalLoaders = [];
    vm.start = start;
    vm.getData = getData;
    vm.reset = reset;
    vm.submit = submit;
    vm._submitFlags = _submitFlags;
    vm.nextRound = nextRound;
    vm.play = play;
    vm.rewind = rewind;
    vm.showAnswers = showAnswers;
    vm.go = go;
    vm.goToLink = goToLink;
    vm.toInstructions = toInstructions;
    vm.dismissPopovers = dismissPopovers;
    vm.instructionsShow = instructionsShow;
    vm.playAgain = playAgain;
    vm.showRound = showRound;
    vm.isRoundCorrect = isRoundCorrect;
    vm.init = init;
    vm.roundStats = roundStats;
    vm.feedbackMessage = feedbackMessage;
    vm.getRoundValue = getRoundValue;
    vm.showAttempt = showAttempt;
    vm.hasNextRound = hasNextRound;
    vm.feedbackBackground = feedbackBackground;
    vm.gameplayBackground = gameplayBackground;
    vm.gameOptions = GameOptions;
	GAME_LOADED = true; //to allow closing on initial screen

    $rootScope.$on('popOverClicked', function(){  //!PM to close instruction popover when clicking on it. 
	   if (vm._instructionsCallback) {
         delete vm._instructionsCallback;
      }
	});

    function go(state) {
		if (state=='play' || state=='playAgain' || state=='nextRound') GAME_LOADED = false;  //to disable closing if game not loaded, see close() below.
      var args = Array.prototype.slice.call(arguments, 1);
      return vm[state] && vm[state].apply(vm[state], args);
    }

    function goToLink(link){
      $location.url(link);
    }
    function feedbackBackground(gameName) {
      var background = vm.gameService.getBackground('feedback');
      if (!background) {
        background = vm.gameService.getBackground('game');
      }
      return background;
    }
    function gameplayBackground() {
      return vm.gameService.getBackground(vm.completed ?
        'info' :
        'game'
      );
    }
    function showAttempt(roundNumber) {
      if (roundNumber === undefined) {
        roundNumber = vm.currentRound + 1;
        if (roundNumber > vm.gameService.content.number_rounds) {
          roundNumber = 1;
        }
      }

      vm.currentRound = roundNumber;
      vm.feedback = false;

      vm.dismissPopovers();
      vm.gameplay = true;
      vm.instructions = false;

      vm.playing = false;
      vm.completed = true;

      vm.forceScoreboard = true;
      $timeout(function () {
        vm.gameService.handle('showAttempt', roundNumber);
      });
    }
    function hasNextRound() {
      if (vm.forceScoreboard === true) {
        return false;
      }
      return vm.currentRound !== vm.gameService.content.number_rounds &&
        !(vm.currentRound >= vm.gameService.content.rounds.length);
    }
    function reset() {
      vm.gameService.handle('reset');
      vm.immediate = vm.gameService.isImmediate();

      vm.completed = false;
      vm.playing = true; vm.checkedIt = false;
      vm.error = false;
    }
    function submit() {
      var success = vm.gameService.handle('submit');
      vm.immediate = vm.gameService.isImmediate();
      vm._submitFlags(success);
    }
    function _submitFlags(success) {
      vm.checkedIt = true;
      if (success) {
        vm.completed = true;
        vm.playing = false;
        vm.error = false;
      } else {
        vm.error = true;
      }

      vm.immediate = vm.gameService.isImmediate();
    }
    function playAgain() {
      vm.gameService.clearPreviousFeedback();
      vm.forceScoreboard = false;

      vm.currentRound = 1;
      vm.feedback = false;

      vm.dismissPopovers();
      vm.transitioning = true;
      vm.gameplay = true;
      vm.instructions = false;

      $timeout(function () {
        vm.playing = true; vm.checkedIt = false;
        vm.transitioning = false;
        vm.gameService.handle('playAgain');
        vm.immediate = vm.gameService.isImmediate();
      }, 1500);
    }

    function nextRound() {
      if (!vm.hasNextRound()) { //we're done!
        GAME_LOADED = true;  //to allow closing on scoreboard
        vm.gameplay = false;

        vm.completed = false;
        vm.feedback = true;
        vm.gameService.handle('quit');
        vm.immediate = vm.gameService.isImmediate();

        Util.runMathJax();


        //
        //<feedback logic>
        //
        vm.gameAttempt = vm.gameService.getAttempt();
        vm.gameDataRounds = vm.gameService.content.rounds;
        vm.showRound(1);
        //
        //</feedback logic>
        //




      } else {
        vm.transitioning = true;
        vm.gameService.handle('nextRound', function () {
          vm.transitioning = false;
          vm.immediate = vm.gameService.isImmediate();
          $scope.$apply();
        });
        vm.gameplay = true;

        vm.completed = false;
        vm.error = false;
        vm.playing = true; vm.checkedIt = false;
        vm.currentRound++;
      }
    }
    function play() {
      vm.dismissPopovers();
      vm.transitioning = true;
      vm.gameplay = true;
      vm.instructions = false;
      vm.immediate = vm.gameService.isImmediate();

      $timeout(function () {
        vm.playing = true; vm.checkedIt = false;
        vm.transitioning = false;
        vm.gameService.handle('play');
        vm.immediate = vm.gameService.isImmediate();
      }, 1500);
    }

    function instructionsShow($event) {
      var coords = $position.offset([$event.currentTarget]);
      var left = coords.left ; //!PM -20 to bring entirely into game modal
      if (vm._instructionsCallback) {
        vm._instructionsCallback();
        delete vm._instructionsCallback;
        return;
      }
      var $instructions = $(vm.modalBodyEl[0].querySelector('.instructions-view'));
      vm._instructionsCallback = Popover.show({
        status: 'none',
        left: left,
        top: coords.top - 450,
        animated: false,
        targetHeight: coords.height,
        content: '<div>' + $instructions.html() + '</div>', //+ $instructions.find('.instructions').html() + $instructions.find('.tip').html(),
        remove: 'click',
        className: 'info-screen-popover',
        isCenter: false,
        attachTo: vm.modalEl
		//attachTo: $('#game')[0]  //!PM
      });

	  window.stopPhysicsClicks = true; //!PM to stop physic interactions when instructions pop-over is up

      var $screen = $('.info-screen-popover').css('background-image', $instructions.css('background-image'));
      Util.transitionEnd($screen.get(0), function () {
        $screen.css('height', '450px');
        _moveInstructionPopovers($screen.get(0));
      });

    }
    function toInstructions() {
      vm.splash = false;
      vm.instructions = true;

      _moveInstructionPopovers();
    }
    function _moveInstructionPopovers(root) {
      var bodyEl = vm.modalBodyEl[0];
      if (root) {
        bodyEl = root.get ? root.get(0) : root;
      }

      var img          = bodyEl.querySelector('img.instruction-img'),
          $img         = $(img),
          timesChecked = 0,
          intervalId;

      function adjustPosition() {
        var img   = bodyEl.querySelector('img.instruction-img'),
            left  = bodyEl.querySelector('.popover.left-popover'),
            right = bodyEl.querySelector('.popover.right-popover');

        if (!img || !left || !right) { return; }

        var imgDimensions   = img.getBoundingClientRect(),
            leftDimensions  = left.getBoundingClientRect(),
            rightDimensions = right.getBoundingClientRect();
        left.style.top = imgDimensions.height + 'px';
        left.style.left = -(leftDimensions.width - 56) + 'px';
        left.querySelector('.arrow').style.left = '95%';
        right.style.top = imgDimensions.height + 'px';
        right.style.left = (imgDimensions.width - rightDimensions.width) + 'px';
        right.querySelector('.arrow').style.left = '94%';

        if (intervalId !== undefined && (timesChecked++) > 10) {
          clearInterval(intervalId);
        }
      }

      $(img).on('load', adjustPosition());
      intervalId = setInterval(adjustPosition, 200);

      var src = $img.attr('src');
      $img.attr('src', '');
      $img.attr('src', src);
    }
    function rewind() {
      vm.gameService.handle('rewind');
      vm.immediate = vm.gameService.isImmediate();
      vm.error = false;
      /*vm.playing = true;*/ vm.checkedIt = false;
    }
    function showAnswers() {
      if (vm.gameService.isMultiMode() && vm.gameService.isImmediate()) {
        vm.gameService.handle('showAnswers');
        vm.completed = false;
        vm.playing = true;
        vm.error = false;
        //multi-mode game, meaning it starts as immediate feedback then switches to manual feedback so don't submit just yet
      } else {
        vm.gameService.handle('showAnswers');
        vm._submitFlags(/*success=*/true);
      }
    }

    function showRound(roundNumber) {
      if (!vm.gameAttempt) {
        return;
      }

      vm.gameRoundIndex = roundNumber - 1;
      vm.gameRound = vm.gameAttempt.rounds[roundNumber - 1];
      vm.gameTry = vm.gameRound.tries[vm.gameRound.tries.length - 1];


      var round;
      for (var i = 0; i < vm.gameDataRounds.length; i++) {
        if (vm.gameDataRounds[i].id == vm.gameRound.roundId) {
          round = vm.gameDataRounds[i];
          break;
        }
      }

      vm.gameDataRound = round;
    }
    function _getRound(roundNumber) {
      if (!vm.gameAttempt) {
        return false;
      }

      return vm.gameAttempt.rounds[roundNumber - 1];
    }
    function getRoundValue(roundNumber, key){
      return $sce.trustAsHtml(vm.gameService.getRoundValue(roundNumber, key));
    }

    function feedbackMessage(roundNumber) {
      _getRound(roundNumber);
      return $sce.trustAsHtml(vm.gameService.feedbackMessage(roundNumber));
    }
    function isRoundCorrect(roundNumber) {
      var round = _getRound(roundNumber), roundTry;
      if (!round) { return false; }

      roundTry = round.tries[round.tries.length - 1];

      return roundTry.state === 'submit';
    }

    function roundStats() {
      if (!vm.gameAttempt) {
        return false;
      }


      var attempt   = vm.gameAttempt,
          rounds    = attempt.rounds,
          tries     = [];
      angular.forEach(rounds, function (round) {
        var lastTry  = round.tries[round.tries.length - 1],
            tryCount = 0;

        for (var i = 0; i < round.tries.length; i++) {
          if (round.tries[i].state !== 'progress') {
            tryCount++;
          }
        }

        tries.push({
          numberTries: tryCount,
          lastTry: lastTry,
          lastTryCorrect: lastTry.state === 'submit'
        });
      });

      var state    = 'state1',
          stateMap = {
            state1: GameStates.scoring.NO_RETRY,
            state2: GameStates.scoring.RETRIED,
            state3: GameStates.scoring.AT_LEAST_ONE_WRONG,
            state4: GameStates.scoring.ALL_WRONG
          }, i;
      if (tries.every(function (item) { return item.lastTryCorrect; })) {
        state = 'state1';

        for (i = 0; i < tries.length; i++) {
          if (tries[i].numberTries > 1) {
            state = 'state2';
            break;
          }
        }
      } else {
        var allIncorrect = true;
        for (i = 0; i < tries.length; i++) {
          if (tries[i].lastTryCorrect) {
            allIncorrect = false;
            break;
          }
        }

        state = allIncorrect ? 'state4' : 'state3';
      }

      return stateMap[state];
    }

    function init(options) {
      vm.framework = options.framework;

      //game content feedback
      vm.gameService = vm.framework.gameService;
      vm.gameData = vm.framework.gameData;
      var test = false;
      if(test === true) {
        console.log('Temporary test!');
        vm.gameData.content.number_rounds = 1;
      }
      vm.authoring = vm.framework.authoring;
      vm.gameTitle = vm.framework.gameTitle;
      vm.gameName = vm.framework.gameName;
      vm.gameDescription = vm.framework.gameDescription;

      vm.feedback = vm.gameService.feedbackType();

      vm.feedbackDuration = 3000;
      vm.immediate = vm.gameService.isImmediate();
      vm.currentRound = 1;

      vm.infoBackground = vm.gameService.getBackground('info');
      vm.logo = vm.gameService.logo();
      var backgroundGradient = vm.gameService.backgroundGradient();
      vm.backgroundTo = backgroundGradient[0];
      vm.backgroundBottom = backgroundGradient[1];

      vm.section.instructions = {
        image: $sce.trustAsHtml(getData('instructions.image')),
        context: $sce.trustAsHtml(getData('instructions.context')),
        instructions: $sce.trustAsHtml(getData('instructions.instructions')),
        tip: $sce.trustAsHtml(getData('instructions.tip'))
      };
      vm.section.game = {
        numberRounds: vm.gameService.content.number_rounds,
        content: vm.gameService.content
      };
      vm.section.feedback = {
      };

      vm.maxRounds = vm.gameService.content.number_rounds;
      if (vm.maxRounds > vm.gameService.content.rounds.length) { //if we don't have enough rounds for the max we can play, play what we have
        vm.maxRounds = vm.gameService.content.rounds.length;
      }

      vm.roundCountIterator = $filter('range')([], vm.maxRounds);

      if (vm.immediate) {
        if (!vm.answerCallback) {
          vm.answerCallback = vm.gameService.onAnswer(function (status) {
            if (vm.completed) { return; }

            if (status === 'progress') {
              vm.gameService.handle('progress');
            } else if (status === 'correct' || status === 'incorrect') {
              vm.gameService.handle('submit');
              vm._submitFlags(status === 'correct');
            } else if (status === 'checkMode') {
              vm.immediate = false;
              vm.error = false;
            }
          });
        }
      }

      if (vm.authoring) {
        vm.splash = false;
        vm.instructions = vm.authoring.screen === 'instructions' || false;
        vm.gameplay = vm.authoring.screen === 'gameplay' || false;
        vm.feedback = vm.authoring.screen === 'feedback' || false;
      } else {
        if(vm.challenge_wheel_game){
          if(vm.gameService.loadPreviousFeedback()){
            setView('feedback');
          }else{
            setView('instructions');
          }
        }else{
          setView('instructions');
        }
      }
    }

    function setView(view){
      vm.splash = false;
      vm.instructions = false;
      vm.gameplay = false;
      vm.feedback = false;
      vm[view] = true;
    }



    function dismissPopovers() {
      vm.popovers && vm.popovers.forEach(function (callback) {
        callback();
      });
      vm.popovers = [];
    }

    function start(modalBody) {
      vm.modalBodyEl = modalBody;
      vm.modalEl = Util.closestParent(modalBody[0], '.modal');
      vm.modalEl.className += ' arvo';

      vm.framework.onReady(function () {
        Util.transitionEnd(vm.modalEl, function () {
          _modalLoad();
        });

        if (vm.gameplay) {
          vm.play();
        }
        if (vm.instructions) {
          vm.toInstructions();
        }
      });
    }

    function _modalLoad() {
      vm.modalDidLoad = true;
      vm.modalLoaders.forEach(function (loader) { loader(); });
      vm.modalLoaders = [];
    }

    function getData(path, defaultData) {
      var pieces = path.split(/\./),
          next   = vm.gameData;
      for (var i = 0; i < pieces.length; i++) {
        next = next && next[pieces[i]];
      }
      return next ? next : defaultData;
    }
  }

  /**
   * Simple controller for handling the content of the game modal
   * @param $scope current scope
   * @param $modalInstance related modal instance
   * @param framework framework object
   * @constructor
   */
  function GameModalController($scope, $modalInstance, framework, $location) {
    var vm = this;
    $scope.framework = framework;
    $scope.gameNameClass = framework.gameName+'-game-container';

    vm.close = function () {
     if(GAME_LOADED){  // close only if game loaded--to prevent errors in some games.
       var onFeedbackPage = $scope.juiceGame.feedback;
       var inChallengeWheel = ($location.absUrl().indexOf('challenge_wheel') !== -1);
       if(onFeedbackPage && inChallengeWheel && !$scope.juiceGame.gameService.isScoreboardReplay()){
         notifyGlobal.message = 'We have saved your scoreboard! We\'ll show it to you if you try the Challenge Wheel again.';
       }
       $modalInstance.close();
	 }
    };
  }

  window.getWatchers = function (root) {
    root = angular.element(root || document.documentElement);
    var watcherCount = 0;

    function getElemWatchers(element) {
      var isolateWatchers = getWatchersFromScope(element.data().$isolateScope);
      var scopeWatchers = getWatchersFromScope(element.data().$scope);
      var watchers = scopeWatchers.concat(isolateWatchers);
      angular.forEach(element.children(), function (childElement) {
        watchers = watchers.concat(getElemWatchers(angular.element(childElement)));
      });
      return watchers;
    }

    function getWatchersFromScope(scope) {
      if (scope) {
        return scope.$$watchers || [];
      } else {
        return [];
      }
    }

    return getElemWatchers(root);
  };

  //setInterval(function () {
  //  var watchers = getWatchers();
  //  console.log(watchers.length, watchers);
  //}, 5000);
})();
