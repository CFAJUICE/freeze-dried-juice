/* global angular, createjs, $, textFit, MathJax */
(function () {
  'use strict';

  var services = angular.module('juice.services', []);
  services.factory('Sounds', [SoundService]);
  services.factory('FileService', [FileService]);
  services.factory('ConfirmModal', ['$modal', ConfirmModal]);
  services.factory('NotificationModal', ['$modal', NotificationModal]);
  services.factory('AuthoringService', ['$http', AuthoringService]);
  services.factory('TextParser', [TextParser]);
  services.factory('Util', ['$timeout', '$interval', Util]);
  services.factory('Log', ['$log', Log]);
  services.factory('CanvasService', ['$window', CanvasService]);
  services.factory('IdGenerator', [IdGenerator]);
  services.factory('preventClick', [preventClick]);

  /*
    Create a set of routes and controller links based upon two arrays
    template path automatically gets /component/ prefixed to it
   */


  function preventClick() {
    return function (e) {
      e.preventDefault && e.preventDefault();
    };
  }

  function IdGenerator() {
    //a decent generator, which came from a stackoverflow answer here http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    function generateId() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }

    return {
      uuid: generateId
    };
  }

  function CanvasService($window) {
    return {
      adjustToResolution: function (canvas, easeljsStage) {
        if (!canvas) { return; }

        //http://www.unfocus.com/2014/03/03/hidpiretina-for-createjs-flash-pro-html5-canvas/
        var devicePixelRatio = $window.devicePixelRatio;
        if (!devicePixelRatio) {
          return;
        }

        if (canvas.getAttribute('data-adjusted') !== 'true') {
          // grab the width and height from canvas
          var height = canvas.getAttribute('height');
          var width = canvas.getAttribute('width');
          // reset the canvas width and height with window.devicePixelRatio applied
          canvas.setAttribute('width', Math.round(width * devicePixelRatio));
          canvas.setAttribute('height', Math.round( height * devicePixelRatio));
          // force the canvas back to the original size using css
          canvas.style.width = width + 'px';
          canvas.style.height = height + 'px';
          canvas.setAttribute('data-adjusted', 'true');
        }
        if (easeljsStage.adjusted !== true) {
          // set CreateJS to render scaled
          easeljsStage.scaleX = easeljsStage.scaleY = devicePixelRatio;
          easeljsStage.adjusted = true;
        }
      }
    };
  }

  function SoundService() {
    return {
      _enabled: true,
      _muteNext: false,
      _mutedNext: {},
      muteNext: function (name) {
        if (name) {
          this._mutedNext[name] = null;
        } else {
          this._muteNext = true;
        }
      },
      toggle: function () {
        this._enabled = !this._enabled;
      },
      stop: function () {
        createjs.Sound.stop();
      },
      play: function (sound) {
        if (!this._enabled) {
          return;
        }
        if (this._muteNext) {
          this._muteNext = false;
          return;
        }
        if (sound in this._mutedNext) {
          delete this._mutedNext[sound];
          return;
        }
        createjs.Sound.play(sound);
      }
    };
  }


  function FileService() {
    return {
      inputAsBase64: function (fileInput, callback) {
        var file = fileInput.files && fileInput.files[0];
        if (file) {
          var reader = new FileReader();

          reader.onload = function (readerEvent) {
            callback(btoa(readerEvent.target.result));
          };

          reader.readAsBinaryString(file);
        } else {
          setTimeout(function () {
            callback('');
          }, 10);
        }
      }
    };
  }


  function ConfirmModal($modal) {
    return {
      show: function (options) {
        $modal.open({
          templateUrl: '/components/services/confirm-modal.html'+hashAppend,
          controller: function ($modalInstance) {
            var vm = this;
            setOption('title');
            setOption('content');
            setOption('yes');
            setOption('no');
            setOption('yesClass');
            setOption('noClass');

            vm.callback = options.callback || function () {};
            vm.ok = function () {
              action(true);
            };
            vm.cancel = function () {
              action(false);
            };

            function setOption(key) {
              options[key] && (vm[key] = options[key]);
            }
            function action(confirmed) {
              vm.callback(confirmed);
              $modalInstance.close();
            }
          },
          controllerAs: 'confirm'
        });
      }
    };
  }


  function NotificationModal($modal) {
    return {
      show: function (options) {
        $modal.open({
          templateUrl: '/components/services/alert-modal.html'+hashAppend,
          controller: function ($modalInstance) {
            var vm = this;
            vm.message = options.message;
            vm.yes = options.yes || 'Ok';
            vm.close = function () {
              $modalInstance.close();
            };
          },
          controllerAs: 'alert'
        });
      }
    };
  }


  function AuthoringService($http) {
    return {
      post: function (data, success, failure) {
        if (!data.fname)  {
          data.fname = data.refKey;
        }

        $http.post('/juice/author', {data: data}).success(function(data){
          if (data == 'OK'){
            success(data);
          } else {
            failure('There was a problem saving your information');
          }
        });
      }
    };
  }

  function TextParser() {
    return {
      parse: function (content, options) {
        var pieces = [];
        splitContent(content, function (chunk) {
          pieces.push(chunk);
        });
        return pieces;
      },
      tokenize: function (content, options) {
        var pieces = [];
        tokenize(content, (options || {}).rules || [{type: 'isLive', open: '[[', close: ']]'}], function (chunk) {
          pieces.push(chunk);
        });
        return pieces;
      }
    };

    function tokenize(content, rules, next) {
      var i          = 0,
          chunkStart = -1,
          more       = true,
          double     = false,
          single     = false,
          space      = false,
          processing = false,
          chunks     = [];
      while (more) {
        if (i >= content.length) {
          //if (balanced || space) {
            chomp(/*true*/);
          //}
          break;
        }

        var char = content.charAt(i);
        if (processing) {
          if (closing()) {
            chomp();
            close();
            continue;
          }

          if (chunkStart === -1) {
            chunkStart = i;
          }
          i++;
        }
        else {
          processing = startProcessing();
          checkParser();
        }
      }

      angular.forEach(chunks, function (chunk) {
        next({
          text: chunk.content,
          type: chunk.type
        });
      });

      function chomp(/*eof*/) {
        if (chunkStart !== -1) {
          var index = chunkStart;
          //if (!eof || (!eof && (!space && !double && !single))) {
            index += (double ? 2 : (single ? 1 : 0));
          //}
          chunks.push({
            type: single ? 'single' : (double ? 'double' : 'space'),
            content: content.substring(index, i)
          });
        }
      }

      function closing() {
        if ((single || double) && char === ']') {
          if (single) {
            return true;
          } else {
            if (content.charAt(i + 1) === ']') {
              return true;
            }
          }
        }
        else if (space && char === '[') {
          return true;
        }
        else if (space) {
          if (char === ' ') {
            return true;
          }
        }
      }
      function close() {
        if ((single || double) && char === ']') {
          if (single) {
            i++;
          } else {
            if (content.charAt(i + 1) === ']') {
              i = i + 2;
            }
          }
        }
        chunkStart = -1;
        double = single = space = false;
        processing = false;
      }
      function startProcessing() {
        return char === '[' || char === ' ' || i === 0;
      }
      function checkParser() {
        //balanced = false;

        if (char === '[') {
          if (content.charAt(i + 1) === '[') {
            double = true;
            //i = i + 2;
          } else {
            single = true;
            //i++;
          }
        } else if (char === ' ') {
          if (content.charAt(i + 1) === '[') { //move forward to the next item. we have a space, but really we have a bracket.
            i++;
            processing = false;
            return;
          }
          space = true;
          i++;
        } else if (i === 0) {
          space = true;
        } else {
          i++;
        }
      }
    }

    function splitContent(content, next) {
      var pieces    = [],
          lastIndex = 0,
          more      = true, nextIndex;

      while (more) {
        nextIndex = content.indexOf('[[', lastIndex);
        if (nextIndex === lastIndex) {
          nextIndex = content.indexOf(']]', lastIndex);
          if (nextIndex !== -1) { //balanced, move forward so we start chunking the next section
            nextIndex = nextIndex + 2;
          }
        }

        pieces.push(content.substring(lastIndex, nextIndex === -1 ? content.length : nextIndex));
        lastIndex = nextIndex;
        more = lastIndex !== -1;
      }

      for (var i = 0; i < pieces.length; i++) {
        var piece     = pieces[i],
            liveIndex = piece.indexOf('[['),
            liveText  = liveIndex !== -1 && piece.indexOf(']]', liveIndex) !== -1;
        if (liveText) {
          piece = piece.replace(/\[\[|\]\]/g, '');
        }
        next({
          isLive: liveText,
          text: piece
        });
      }
    }
  }

  function Util($timeout, $interval) {
    var timeouts  = [],
        intervals = [];
    return {
      bind: function (fn, context) {
        return fn.bind ? fn.bind(context) : $.proxy(fn, context);
      },
      timeout: function (callback, timeout, context) {
        if (context) {
          callback = this.bind(callback, context);
        }
        timeouts.push($timeout(callback, timeout));
      },
      interval: function (callback, timeout, context) {
        if (context) {
          callback = this.bind(callback, context);
        }
        intervals.push($interval(callback, timeout));
      },
      validateMethods: function (object, methods) {
        var invalidMethods = false;
        for (var i = 0; i < methods.length; i++) {
          var method   = methods[i];
          if (!object.hasOwnProperty(method)) {
            console && console.error && console.error('Method [' + method + '] not implemented. You must implement all required Game methods: [' + methods.join(', ') + ']');
            console && console.trace && console.trace();
            invalidMethods = true;
          }
        }
        if (invalidMethods) {
          console && console.trace && console.trace();
          throw 'Please fix your method definitions before continuing.';
        }
      },
      clearTimers: function () {
        timeouts.forEach(function (timer) { $timeout.cancel(timer); });
        intervals.forEach(function (timer) { $interval.cancel(timer); });
        timeouts = [];
        intervals = [];
      },
      resizeText: function (el, options) {
        if (el.constructor.toString().indexOf('Array') > -1) {
          for (var i = 0; i < el.length; i++) {
            textFit(el[i], options);
          }
        } else {
          textFit(el, options);
        }
      },
      groupBy: function (array, field) {
        var grouped = {};
        for (var i = 0; i < array.length; i++) {
          grouped[array[i][field]] = array[i];
        }
        return grouped;
      },
      newLineInput: function (content) {
        return newLine(content, '~\n');
      },
      newLineHtml: function (content) {
        return newLine(content, '<br/>');
      },
      parseQuery: function () {
        var hash   = location.hash,
            href   = location.href,
            values = {},
            query;
        if (hash.indexOf('#/') !== -1) { //with angular routing, sometimes reload the page messes up the ability to grab query params
          href = href.substring(0, href.indexOf('#/'));
          query = href.split('?');
        } else {
          query = location.hash.split('?');
        }

        if (query[1]) {
          query = query[1].split('&');
        } else {
          query = location.search ? (location.search.substring(1).split('&')) : [];
        }
        for (var i = 0; i < query.length; i++) {
          var split = query[i].split('=');
          values[split[0]] = split[1] ? split[1] : null;
        }
        return values;
      },
      runMathJax: function (el) {
        this.timeout(function() {
          var params = ['Typeset', MathJax.Hub];
          if (el) {
            params.push(el);
          }
          MathJax.Hub.Queue(params);
        }, 0); // Neded to update MathJax expressions after html is loaded
      },
      //http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
      shuffle: function (array) {
        var currentIndex = array.length, temporaryValue, randomIndex ;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;

          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }

        return array;
      },
      transitionEnd: function (element, callback) {
        var supportsTransition = 'transition' in document.body.style;
        if (!supportsTransition) {
          return callback();
        }

        function transitionend() {
          callback();
          element.removeEventListener('transitionend', transitionend);
        }

        element.addEventListener('transitionend', transitionend);
      },
      animationEnd: function (element, callback) {
        //webkitAnimationEnd oanimationend msAnimationEnd animationend
        var supportsAnimation = 'animation' in document.body.style;
        if (!supportsAnimation) {
          return callback();
        }

        function transitionend() {
          callback();
          element.removeEventListener('animationend', transitionend);
        }

        element.addEventListener('animationend', transitionend);
      },
      closestParent: function (element, selector) {
        var parent = element.parentNode,
            el     = element,
            child;
        while (parent && !child) {
          child = parent.querySelector(selector);
          if (child === el) {
            return el;
          }
          el = parent;
          parent = parent.parentNode;
        }
        return null;
      },
      // Returns a random integer between min (included) and max (excluded)
      // Using Math.round() will give you a non-uniform distribution!
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
      randomInt: function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
      },
      noop: function () {},
      rad2Deg: function (radians) {
        return radians * 180 / Math.PI;
      },
      deg2Rad: function (degrees) {
        return degrees * (Math.PI / 180);
      }
    };

    function newLine(content, replaceWith) {
      if (!content) {
        return undefined;
      }
      return content.replace(/~/g, replaceWith);
    }
  }

  function Log($log) {
    return {
      _eval: function (method, context, content) {
        var enabled = true;
        if (arguments.length === 3) {
          enabled = this.isEnabled(context);
        } else {
          content = context;
        }
        return enabled ? method.call($log, content) : null;
      },
      log: function (context, content) {
        return this._eval($log.log, context, content);
      },
      info: function (context, content) {
        return this._eval($log.info, context, content);
      },
      debug: function (context, content) {
        return this._eval($log.debug, context, content);
      },

      contexts: {},
      enableContext: function (context) {
        if (context.splice) {
          angular.forEach(context, function (ctx) {
            this.contexts[ctx] = null;
          }, this);
        } else {
          this.contexts[context] = null;
        }
      },
      isEnabled: function (context) {
        if ('*' in this.contexts) {
          return true;
        }
        return context in this.contexts;
      }
    };
  }
})();