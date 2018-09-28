/* global angular, juice, $ */

(function() {
  'use strict';

  var gameDirectives = angular.module('juice.games.directives', [
    'ui.router',
    'ui.bootstrap',
    'juice',
    'juice.clicks',
    'juice.services'
  ]);

  gameDirectives.directive('juiceGame', [juiceGame]);
  gameDirectives.directive('juiceGameSplash', [juiceGameSplash]);
  gameDirectives.directive('juiceGameInstructions', [juiceGameInstructions]);
  gameDirectives.directive('juiceGameplay', [juiceGameplay]);
  gameDirectives.directive('juiceGameFeedback', [juiceGameFeedback]);
  gameDirectives.directive('playGame', ['$modal', '$timeout', 'preventClick', 'interactiveData', 'GameService', playGameDirective]);
  gameDirectives.directive('feedbackAnimation', ['$timeout', 'FeedbackAnimation', feedbackAnimationDirective]);
  gameDirectives.directive('feedbackSound', ['Sounds', 'GameStates', feedbackSound]);
  gameDirectives.directive('bgPattern', [bgPattern]);
  gameDirectives.directive('textFit', ['Util', textFit]);
  gameDirectives.directive('truncateFeedback', ['$timeout', 'Util', 'DomHelper', function ($timeout, Util, DomHelper) {
    return {
      restrict: 'A',
      link: function ($scope, el, $attrs) {
        $timeout(function () {
          var opts = $.parseJSON($attrs.truncateFeedback),
              $el  = $(el[0]);
          if (DomHelper.height(el[0]) > opts.threshold) {
            $el.dotdotdot({height: opts.maxHeight});
          }
        }, 0);
      }
    }
  }]);
  gameDirectives.factory('Popover', ['$rootScope', '$interpolate', '$compile', '$timeout', 'Util', PopoverFactory]);
  gameDirectives.filter('unsafe', function($sce) { //http://creative-punch.net/2014/04/preserve-html-text-output-angularjs/
    return function(val) {
      return $sce.trustAsHtml(val);
    };
  });

  //juice-game
  //  juice-game-splash
  //  juice-game-instructions
  //  juice-gameplay
  //  juice-feedback
  function juiceGame() {
    return {
      restrict: 'E',
      controller: 'JuiceGameController',
      controllerAs: 'juiceGame',
      replace: true,
      transclude: true,
      templateUrl: '/javascripts/game/templates/game.html'+hashAppend,
      link: {
        pre: function (scope, element, attrs, juiceGameController) {
          juiceGameController.init({framework: scope.framework});
        },
        post: function (scope, element, attrs, juiceGameController) {
          juiceGameController.start(element);
          $('#loading').hide();
          calcAdjustSizes();
        }
      }
    };
  }

  function juiceGameSplash() {
    return {
      restrict: 'E',
      replace: true,
      require: '^juiceGame',
      templateUrl: '/javascripts/game/templates/splash.html'+hashAppend
    };
  }

  function juiceGameInstructions() {
    return {
      restrict: 'E',
      replace: true,
      require: '^juiceGame',
      templateUrl: '/javascripts/game/templates/instructions.html'+hashAppend
    };
  }

  function juiceGameplay() {
    return {
      restrict: 'E',
      replace: true,
      require: '^juiceGame',
      templateUrl: '/javascripts/game/templates/content.html'+hashAppend
    };
  }

  function juiceGameFeedback() {
    return {
      restrict: 'E',
      replace: true,
      require: '^juiceGame',
      templateUrl: '/javascripts/game/templates/feedback.html'+hashAppend
    };
  }

  function feedbackSound(Sounds, GameStates) {
    return {
      restrict: 'E',
      replace: true,
      link: function (scope, element, attrs) {
        var int = parseInt(attrs.roundStats, 10);
        if (!isNaN(int) && int > 0) {
          switch (int) {
            case GameStates.scoring.NO_RETRY:
              Sounds.play(juice.sounds.applauseLarge);
              break;
            case GameStates.scoring.RETRIED:
              Sounds.play(juice.sounds.applauseLarge);
              break;
            case GameStates.scoring.AT_LEAST_ONE_WRONG:
              Sounds.play(juice.sounds.applauseSmall);
              break;
            default:
              break;
          }
        }
        scope.$on('$destroy', function () {
          Sounds.stop();
        });
      }
    };
  }

  function feedbackAnimationDirective($timeout, FeedbackAnimation) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        duration: '@'
      },
      template:
        '<div id="feedback-animation-container" style="position: absolute; top: 0; width: 900px; min-width: height: 600px; z-index: 0;">' +
          '<canvas id="feedback-animation" width="900px" height="600"/>' +
        '</div>',
      link: function (scope, element, attrs) {
        $timeout(function () {
          var animation = new FeedbackAnimation({multiplier: attrs.roundStats}),
              duration  = parseInt(attrs.duration, 10);
          animation.runFor(duration);

          $timeout(function () {
            animation.hardStop();
          }, duration * 5);

          scope.$on('$destroy', function () {
            animation.hardStop();
          });
        }, 200);
      }
    };
  }

  function playGameDirective($modal, $timeout, preventClick, interactiveData, GameService) {
    return {
      restrict: 'AE',
      link: function (scope, element, attrs) {
        if ('autoPlay' in attrs) {
          $timeout(function () {
            openGame();
          }, 200);
        }

        element.bind('click', clickToOpen);

          var bucketURI = public_configs.fileResources;
   
        //'autoPlay' in attrs
        function openGame() {
          var isAuthoring    = attrs.authoring === 'true',
              authoringRound = attrs.authoringRound,
        // added s3 bucket substitution
              content = helpers.replaceS3BucketInData(interactiveData.interactive.content, bucketURI);
          if (isAuthoring && authoringRound) {
            content = {
			  // added s3 bucket substitution
              rounds: [JSON.parse(authoringRound.replaceAll("S3_BUCKET_", bucketURI.substring(0, bucketURI.length-1)))],
              number_rounds: 1
            };
          }

          var framework = new Framework({
            gameService: new GameService({
              name: attrs.gameName,
              content: content,
              feedback: attrs.feedback || 'check',
              session: interactiveData.widgetSession,
              previousFeedback: interactiveData.previousFeedback
            }),
            authoring: isAuthoring,
            gameData: interactiveData.interactive,
            gameTitle: attrs.gameTitle,
            gameDescription: attrs.gameDescription
          });
          var scaleableGames = public_configs.scaleable_games;
          var isScaleable = (scaleableGames.indexOf(attrs.gameName)!==-1);
		  
          console.log('attr', attrs, isScaleable)
          if (isScaleable) {
            setTimeout(function () {
              if($('.modal-body')[0]){
                $('.instructions-view').height($('.modal-body')[0].scrollHeight);
              }
            }, 400)
          }

          var modal = $modal.open({
            templateUrl: '/javascripts/game/templates/game-modal.html'+hashAppend,
            controller: 'GameModalController',
            controllerAs: 'gameModal',
            windowClass: (isScaleable ? 'scaleable-game game' : 'game'),
            backdrop: 'static', //can't close modal by clicking backdrop
            keyboard: false,    //can't close modal by hitting ESC
            resolve: {
              framework: function () {
                return framework;
              }
            }
          });
          modal.rendered.then(function () {
            framework.ready();
          });
          modal.result.then(function closed() {
            framework.shutdown();
          }, function dismissed() {
            framework.shutdown();
          });
        }

        function clickToOpen(e) {
          preventClick(e);
          openGame();
        }
      }
    };
  }

  function bgPattern() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        attrs.$observe('bgPattern', function (value) {
          var options = scope.$parent.$eval(value);
          element[0].style.backgroundImage = 'url(' + options.background + ')';
          element[0].style.backgroundPositionY = '32px';
          element[0].style.backgroundRepeat = 'repeat-y';

          /*if (!options.to) {
            element[0].style.backgroundColor = 'rgba(190,190,190,.5)';//'gray';
            element[0].style.backgroundImage = 'url(' + options.pattern + ')';
          } else {
            element[0].style.background = 'url(' + options.pattern + '), linear-gradient(to bottom, ' + options.to + ', ' + options.bottom + ')';
          }*/
        });
      }
    };
  }

  function textFit(Util) {
    return {
      restrict: 'A',
      scope: {
        textFit: '=',
        minFontSize: '='
      },
      //link: function(scope, elem, attrs) {
      //  scope.$watch('textFit', function (value) {
      //    elem.html(value);
      //    Util.resizeText(elem[0], {minFontSize: parseInt(attrs.minFontSize, 10)});
      //  });
      //},
      link: {
        post: function (scope, elem, attrs) {
          Util.timeout(function () {
            scope.$watch('textFit', function (value) {
              elem.html(value);
              Util.resizeText(elem[0], {minFontSize: parseInt(attrs.minFontSize, 4), maxFontSize: parseInt(attrs.maxFontSize, 4)});
            });
          }, 1000);

        }
      }
    };
  }

  function PopoverFactory($rootScope, $interpolate, $compile, $timeout, Util) {
    var template =
      '<div class="game-popover top fade out {{className}}" style="display: block; visibility: hidden; z-index: 2000; min-width: 160px; {{title ? \'padding-top: 10px;\' : \'\'}} {{content ? \'\' : \'padding-bottom: 10px;\'}}">' +
        '<div class="arrow"></div>' +
          '<div class="popover-inner">' +
            '<h3 class="popover-title" ng-if="popoverTitle"></h3>' +
            '<div class="close-button">x</div>' +
            '<div class="sa-icon sa-success animate" style="display: block; margin-bottom: 25px; min-width: 80px;" ng-if="feedbackSuccess">' +
            '<span class="sa-line sa-tip animateSuccessTip"></span>' +
            '<span class="sa-line sa-long animateSuccessLong"></span>' +
            '<div class="sa-placeholder"></div>' +
            '<div class="sa-fix"></div>' +
          '</div>' +
          '<div style="text-align: center; font-weight: bold; padding-left: 14px; padding-right: 14px;" ng-if="title">{{title}}</div>' +
          '<div class="popover-content" ng-if="content">{{content}}</div>' +
        '</div>' +
      '</div>',
        STATUSES = {
          correct: 'is-correct',
          incorrect: 'is-incorrect',
          neutral: 'is-neutral',
          none: ''
        };

    function Popover(options) {
      this.scope           = $rootScope.$new(true);
      this.options         = angular.extend({
        title: '',
        content: '',
        className: '',
        attachTo: undefined,
        clickAnywhere: undefined,
        remove: undefined,
        isRight: undefined,
        isCenter: undefined,
        left: undefined,
        top: undefined,
        right: undefined,
        x: undefined,
        y: undefined,
        targetHeight: undefined,
        offsetHeight: undefined,
        offsetWidth: undefined,
        animated: true,
        positionAbove: undefined,
        positionBelow: undefined,
        status: undefined
      }, options);

      this.scope.title     = this.options.title;
      this.scope.content   = this.options.content;
      this.scope.className = this.options.className + ' ' + STATUSES[this.options.status || 'neutral'];
      this.scope.feedbackSuccess = this.options.feedbackSuccess;
      this.popover         = $compile($interpolate(template)(this.scope))(this.scope)[0];
      this.removeFn        = this._remove.bind(this);

    }



    Popover.prototype._remove = function (evt) {
      if (window.ignoreClick) {
        window.ignoreClick = false;
        return;
      }
	  window.stopPhysicsClicks = false; //!PM to reactivate physic interactions when instructions pop-over is removed
      $rootScope.$emit('popOverClicked');  //!PM to handle close popover (for instructions) when  clicking on it.
      var popover   = this.popover,
          self      = this;
      popover.className = 'game-popover top fade out ' + this.scope.className;
      Util.transitionEnd(popover, function () {
        self._toggleClickEvent(false);
        popover.parentNode && popover.parentNode.removeChild(popover);
      });
    };

    Popover.prototype._toggleClickEvent = function (add) {
      var modalBody = document.querySelector('.modal-body'),
          method    = add ? 'addEventListener' : 'removeEventListener';

      this.popover[method]('click', this.removeFn);
      if (this.options.clickAnywhere && modalBody) {
        modalBody[method]('click', this.removeFn);
      }
    };

    Popover.prototype._applyBehavior = function () {
      if (this.options.remove === 'click') { //do a timed fadeout if not click
        this._toggleClickEvent(true);
        return;
      }

      var remove = this.removeFn;
      $timeout(function () {
        remove();
      }, 3000);
    };

    Popover.prototype._positionAndShow = function () {
      var popover         = this.popover,
          dimensions      = popover.getBoundingClientRect(),
          scope           = this.scope,
          scrollTopOffset = document.querySelector('.modal.fade').scrollTop,
          options         = this.options;

      popover.style.visibility = 'visible';
      if (!options.isCenter) {
        var height = dimensions.height;
        if (options.targetHeight !== undefined) {
          if (options.targetHeight >= height) {
            height = 0;
          }
        }
        popover.style.left = options.left + 'px';
        popover.style.top = (options.top - (height)) + 'px';
      } else {
        popover.style.left = (options.x - popover.offsetWidth / 2) + 10 + 'px';
        popover.style.top = ((options.y - (scrollTopOffset || 0)) - dimensions.height / 2) + 'px';

        popover.style.left = '0';
        popover.style.right = '0';
        popover.style.margin = 'auto';

        var content = this.options.content;
        var $testDom = $('<div class="test-text game-popover"></div>');
        $testDom.text(content);
        $(document.querySelector('.modal.fade')).find('.test-text').remove();
        $(document.querySelector('.modal.fade')).append($testDom);
        var $test = $(document.querySelector('.modal.fade')).find('.test-text');
        $test.css('font-size', '17px');

        popover.style.width = ($test.width() + 28 + 2 + 2) + 'px';
        popover.style.maxWidth = options.maxWidth ? options.maxWidth : '825px'; // !PM was 500
        if($('.scaleable-game').length){
          popover.style.width = "100%";
          popover.style.top = "30%";
        }
      }

      $timeout(function () {
        popover.className = 'game-popover top fade in ' + scope.className + (options.animated ? ' animated' : '');

        if (options.positionAbove) {
          var top = $(options.positionAbove).offset().top;
          popover.style.top = (top - $(popover).height() - 40) + 'px';
        }
        if (options.positionBelow) {
          var $belowEl = $(options.positionBelow),
              offset   = $belowEl.offset();
          popover.style.top = (offset.top + $belowEl.height()) + 'px';
        }
      }, 0);
    };

    Popover.prototype.show = function () {
      var popover         = this.popover,
          remove          = this.removeFn,
          options         = this.options;

      if (options.attachTo) {
        options.attachTo.appendChild(popover);
      } else {
        document.body.appendChild(popover);
      }

      this._positionAndShow();
      this._applyBehavior();
      Util.runMathJax(popover);

      return function hardRemove() {
        remove();
      };
    };

    return {
      show: function (options) {
        var popover = new Popover(options);
        return popover.show();
      }
    };
  }

  /**
   * Private object, exposed only as an interface through the playGameDirective
   * @param options
   * @constructor
   */
  function Framework(options) {
    this._ready = [];
    this.gameService = options.gameService;
    this.gameData = options.gameData;
    this.gameTitle = options.gameTitle;
    this.gameName = options.gameService.name;
    this.gameDescription = options.gameDescription;
    this.authoring = !options.authoring ? null : {
      authoring: true,
      screen: this.gameData.activeTab
    };
  }
  Framework.prototype.onReady = function (callback) {
    this._ready.push(callback);
    if (this.readyRun) {
      this.ready();
    }
  };
  Framework.prototype.ready = function () {
    this.readyRun = true;
    this._ready.forEach(function (callback) {
      callback();
    });
  };
  Framework.prototype.quit = function () {
    this.gameService.handle('quit');
  };
  Framework.prototype.shutdown = function () {
    this.gameService.shutdown();
  };
})();
