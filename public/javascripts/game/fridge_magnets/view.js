/* global angular, createjs, juice, $, Sortable */
(function () {
  'use strict';

  var MODULE        = 'fridge_magnets',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('FridgeMagnetsView', ['Log', 'Util', 'Sounds', 'Popover', 'DomHelper', ViewFactory]);

  function ViewFactory(Log, Util, Sounds, Popover, DomHelper) {
    var gameHeight = 510,
        gameWidth  = 900,
        states     = {
          correct: '2px solid green',
          incorrect: '2px solid orange',
          neutral: '2px solid black'
        };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `fridge_magnets` view constructor');

      this.game = game;
      this.domEls = [];
      this.popovers = [];
      this.containerEl = DomHelper.createEl('div', {
        attachTo: containerEl
      });
      this.$container = $(this.containerEl);

      this.domEls.push(this.containerEl);
    }

    View.prototype.registerEvents = function () {
      var $dragging = null,
          self      = this;
      this.move = function move(e) {
        if ($dragging) {
          $dragging.offset({
            top: e.pageY - ($dragging.height() / 2),
            left: e.pageX - ($dragging.width() / 2)
          });
          e.stopPropagation();
          e.preventDefault();
        }
      };
      this.down = function down(e) {
        self.dismissPopups();

        $dragging = $(e.target);

        if ($dragging.closest('.answer-box').length) {
          $dragging = null;
          return;
        } else if ($dragging.closest('.dragger').length) {
          $dragging = $dragging.closest('.dragger');
        } else {
          $dragging = null;
          return;
        }

        if (!self.$answerBox.hasClass('drag-helper')) {
          self.$answerBox.addClass('drag-helper');
        }

        $dragging.addClass('dragging');
        e.stopPropagation();
        e.preventDefault();
      };
      this.up = function up(e) {
        if (!$dragging) { return; }

        self.$answerBox.removeClass('drag-helper');

        var dragBounding = $dragging.get(0).getBoundingClientRect(),
            boxBounding  = self.$answerBox.get(0).getBoundingClientRect();

        if ((dragBounding.left >= boxBounding.left || dragBounding.right >= boxBounding.left) &&
            dragBounding.top >= boxBounding.top &&
            dragBounding.left < (boxBounding.left + boxBounding.width) &&
            dragBounding.top < (boxBounding.top + boxBounding.height)) {

          var $answers = self.$answerBox.find('ul.answers'),
              dragLeft = dragBounding.left,
              dragTop  = dragBounding.top,
              found    = false,
              $prev    = null;

          $answers.find('li').each(function (i, el) {
            var $el      = $(el),
                elOffset = $el.offset();

            if (dragTop >= (elOffset.top + $el.height())) {
              $prev = $el;
              return;
            }

            if ($prev &&
                $prev.length &&
                (dragLeft <= elOffset.left) &&
                (dragLeft >= $prev.offset().left)) {
              $prev.after(_createLi($dragging));
              found = true;
              return false;
            }

            else if (dragLeft <= elOffset.left) {
              $answers.prepend(_createLi($dragging));
              found = true;
              return false;
            }

            $prev = $el;
          });
          if (!found) {
            $answers.append(_createLi($dragging));
          }
        }

        $dragging.removeClass('dragging');
        //self.$answerBox.removeClass('active');
        $dragging = null;

        //remove empty els
        self.$answerBox.find('li').each(function (i, el) {
          var $el = $(el);
          if ($el.children().length === 0) {
            $el.remove();
          }
        });
      };

      $(document.body).on('mousemove', this.move);
      $(document.body).on('mousedown', '.dragger', this.down);
      $(document.body).on('mouseup', this.up);
    };

    View.prototype.displayInstructions = function (content) {
      var $instructions = $('<div></div>').append(Util.newLineHtml(content.instructions)).addClass('text-piece fm-instructions').css({
        top: this._positionFor('instructions') + 'px',
        position: 'absolute',
        textAlign: content.instructions_align || 'center',
        color: 'rgb(13, 36, 246)',
        fontSize: '20px',
        fontFamily: 'Verdana',
        margin: 'auto',
        right: '0',
        left: '0',
        marginLeft: '10px',
        marginRight: '10px',
        padding: '5px'
      });

      $(this.containerEl).append($instructions);
      this.domEls.push($instructions);
    };

    View.prototype.displayExample = function (content) {
      if (!content || !content.example || !content.example.trim()) {
        return;
      }

      var align       = content.example_align || 'center',
          isCentered  = align === 'center',
          marginRight = 10,
          marginLeft  = isCentered ? 10 : 40;
      var $example = $('<div></div>').append(Util.newLineHtml(content.example)).addClass('text-piece fm-example').css({
        top: this._positionFor('example') + 'px',
        position: 'absolute',
        fontSize: '20px',
        fontFamily: 'Verdana',
        margin: 'auto',
        right: '0',
        left: '0',
        marginRight: marginRight + 'px',
        color: 'black',
        padding: '5px',
        overflow: 'hidden',

        textAlign: align,
        width: (gameWidth - (marginRight + marginLeft)) + 'px',
        marginLeft: marginLeft + 'px'
      });

      this.$container.append($example);
      this.domEls.push($example);

      Util.resizeText($example.get(0), {maxFontSize: 20});
    };

    View.prototype.toggleCorrect = function (domAnswer, correct) {
      if (correct) {
        domAnswer.css('border', states.correct);
        domAnswer.parent().removeClass('incorrect');
      } else {
        domAnswer.css('border', states.incorrect);
        domAnswer.parent().addClass('incorrect').css('position', 'relative');
      }
    };

    View.prototype.displayMagnets = function (values) {
      var $container  = this.$container,
          leftDefault = 25,
          left        = leftDefault,
          top         = this._positionFor('magnets'),
          domEls      = this.domEls;

      var shuffled = Util.shuffle(values.concat([]));

      var $magnetBox = this.$magnetBox = $('<div></div>').addClass('fm-magnet-box');
      $container.append($magnetBox);

      shuffled.forEach(function (value) {
        var $value = $('<div></div>')
          .addClass('dragger')
          .html(value.content)
          .data('answer-id', value.id)
          .data('answer-content', value.content)
          .css({
            top: top + 'px',
            left: left + 'px',
            position: 'absolute',
            backgroundColor: 'white',
            textAlign: 'center',
            padding: '10px',
            minWidth: '50px',
            border: states.neutral,
            zIndex: 1000
          });
        $value.append('<span class="cross-out"></span>');
        $magnetBox.append($value);

        left += $value.width() + 30;

        if (left > 900) {
          top += 50;
          left = leftDefault;
          $value.css({
            top: top + 'px',
            left: left + 'px'
          });
          left += $value.width() + 30;
        }

        domEls.push($value);
      }, this);
    };

    View.prototype._displayFridge = function (top) {
      var $fridge  = $(
            '<div class="fridge">' +
              '<div class="left piece">&nbsp;</div>' +
              '<div class="center piece">&nbsp;</div>' +
              '<div class="right piece">&nbsp;</div>' +
            '</div>'
          ),
          imgLeft    = this.game.getAsset('fridge-left'),
          imgPiece   = this.game.getAsset('fridge-piece'),
          imgRight   = this.game.getAsset('fridge-right'),
          pieceWidth = gameWidth - 20 - imgLeft.width - imgRight.width,
          minTop     = 155, //this is the minimum top to make sure the fridge is hidden beneath the controller console at the bottom
          fridgeTop  = top >= minTop ? top : minTop;
      $fridge.css({
        position: 'absolute',
        top: fridgeTop,
        left: '10px',
        height: (top > minTop ? (gameHeight + 80) - top : imgPiece.height) + 'px',
        width: (gameWidth - 20) + 'px'
      });

      $fridge.find('.left').css({
        'background-image': 'url(' + imgLeft.src + ')',
        width: imgLeft.width + 'px'
      });
      $fridge.find('.center').css({
        'background-image': 'url(' + imgPiece.src + ')',
        left: imgLeft.width + 'px',
        width: pieceWidth + 'px',
        backgroundRepeat: 'repeat'
      });
      $fridge.find('.right').css({
        'background-image': 'url(' + imgRight.src + ')',
        width: imgRight.width + 'px',
        left: (imgLeft.width + pieceWidth) + 'px'
      });

      this.$container.append($fridge);
      this.domEls.push($fridge);

      return $fridge;
    };

    View.prototype.displayAnswerBox = function () {
      var top               = this._positionFor('answers'),
          FRIDGE_TOP        = 32,
          MAX_BOX_HEIGHT    = 230,
          originalBoxHeight = (gameHeight - top + 50),
          boxHeight         = (originalBoxHeight - FRIDGE_TOP),
          self              = this;

      boxHeight = boxHeight > MAX_BOX_HEIGHT ? MAX_BOX_HEIGHT : boxHeight;

      var $answerBox = this.$answerBox = $('<div class="answer-box"></div>').css({
        position: 'absolute',
        top: top + 'px',
        right: '15px',
        left: '15px',
        margin: 'auto 10px',
        height: boxHeight + 'px',
        minWidth: '800px',
        border: '3px solid rgb(168,168,168)',
        textAlign: 'center',
        backgroundColor: 'rgb(229,229,229)'
      });
      var $ul = $('<ul class="answers"></ul>').css({
        minWidth: '800px',
        height: boxHeight + 'px'
      });
      $('<div class="drag-helper-msg">Drag your answer here!</div>')
        .appendTo($answerBox);

      //we want magnets to be at the bottom, but need all the content of the screen to have been displayed before we can
      //  make the swap (without it we don't have heights or positions).
      //now that the answer box is available, we can use its screen information to move the magnets
      var $container    = $(this.containerEl),
          $draggers     = $container.find('.dragger'),
          $first        = $draggers.first(),
          $last         = $draggers.last(),
          newTop        = $first.position().top,
          draggerHeight;
      boxHeight = $answerBox.outerHeight();


      var $fridge = this._displayFridge(newTop);
      newTop = $fridge.position().top;


      //$answerBox.css('top', (newTop + fridgeTop) + 'px');
      $answerBox.css('top', (newTop + FRIDGE_TOP) + 'px');
      $draggers.each(function (i, el) {
        var $el = $(el),
            top = ($el.position().top + originalBoxHeight + 10) + 'px';
        $el.css('top', top);
        $el.data('original-position', {
          top: top,
          left: $el.css('left')
        });
      });





      draggerHeight = $last.position().top - $first.position().top + 60;

      //Dragging outside of the draggable area is actually a really annoying problem to solve
      //  mouse events are disabled while in a drag operation, but also drag events don't get called outside of the draggable area.
      //  so if you want to have an event register x/y coordinates outside the drag area, you're in trouble
      //To get around this, when the user starts dragging we _creatively_ expand the drop area using a combination of css attributes
      //  so that everything appears to stay in place while actually encompassing the entire game view
      var dragged     = null,
          draggedX    = null,
          draggedY    = null,
          answerStyle = {
            marginTop: '',
            paddingTop: '',
            paddingBottom: '',
            height: ''
          };
      Sortable.create($ul.get(0), {
        animation: 150,
        draggable: 'li.sortable-answer',
        onStart: function (e) {
          dragged = e.item.querySelector('.dragger');

          answerStyle.marginTop = $ul.css('margin-top');
          answerStyle.paddingTop = $ul.css('padding-top');
          answerStyle.paddingBottom = $ul.css('padding-bottom');
          answerStyle.height = $ul.css('height');

          $ul.css({ //the paddingTop is a positive number that negates the effect of the negative marginTop.
            //the height expands so that we fill to the bottom of the game view, while the margin now expands to the top of it
            // The effect is that the dropzone encompasses the whole view while the content stays in place
            height: boxHeight + newTop + draggerHeight + 'px',
            marginTop: -newTop + 'px',
            paddingTop: newTop + 'px'
          });
        },
        onEnd: function () {
          $ul.css({ //reset the answer box, since we don't need the expanded dragzone anymore
            marginTop: answerStyle.marginTop,
            paddingTop: answerStyle.paddingTop,
            height: answerStyle.height
          });

          var answerOffset = $answerBox.offset(),
              answerY      = answerOffset.top;
          if (draggedY < answerY ||
            draggedY > (answerY + boxHeight)) {
            self._revertPosition(dragged);
          }
        }
      });


      $ul.on('dragover', getClientPosition);
      function getClientPosition(e) {
        draggedX = e.originalEvent.clientX;
        draggedY = e.originalEvent.clientY;
      }


      $answerBox.append($ul);
      $container.append($answerBox);
      this.domEls.push($answerBox);
    };

    View.prototype.reset = function () {
      angular.forEach(this.domEls, function (el) {
        if (el.remove) { el.remove(); }
        else {
          el.parentNode && el.parentNode.removeChild(el);
        }
      });

      this.dismissPopups();

      $(document.body).off('mousemove', this.move);
      $(document.body).off('mousedown', 'div', this.down);
      $(document.body).off('mouseup', this.up);
    };

    View.prototype.popup = function (options) {
      options.className += ' game-popup no-arrow';
      options.remove = 'click';
      options.clickAnywhere = ('clickAnywhere' in options) ? options.clickAnywhere : true;
      this.popovers.push(Popover.show(options));
    };

    View.prototype.transition = function () {
      this.domEls.forEach(function (el) {
        (el.get ? el.get(0) : el).style.opacity = 0;
      });
    };

    View.prototype._revertPosition = function (draggerEl) {
      var $el              = $(draggerEl),
          originalPosition = $el.data('original-position');

      var $li = $el.closest('li');

      $el.css({
        top: originalPosition.top,
        left: originalPosition.left,
        position: 'absolute',
        border: states.neutral
      }).appendTo(this.$magnetBox);

      if ($li.length) {
        $li.remove();
      }
    };

    View.prototype.showAnswers = function (answers) {
      var $answers   = this.$answerBox.find('ul.answers'),
          self       = this,
          i;

      this.$answerBox.find('ul.answers .dragger').each(function (i, el) {
        self._revertPosition(el);
      });

      $answers.empty();
      var magnetMap = this._elMapById(this.$magnetBox.find('.dragger'));

      for (i = 0; i < answers.length; i++) {
        var magnets = magnetMap[answers[i].content];
        if (magnets && magnets.length) {
          $answers.append(_createLi(magnets.shift()));
        }
      }
    };

    View.prototype._elMapById = function (magnets) {
      var magnetMap = {};

      for (var i = 0; i < magnets.length; i++) {
        var magnet = magnets.eq ? magnets.eq(i) : magnets[i];
        var id = magnet.data ? magnet.data('answer-content') : magnet.content;
        if (!magnetMap[id]) {
          magnetMap[id] = [];
        }
        magnetMap[id].push(magnet);
      }

      return magnetMap;
    };

    View.prototype.rewind = function (answers) {
      var answerMap  = Util.groupBy(answers, 'content'),
          self       = this;

      this.$answerBox.find('ul.answers .dragger').each(function (i, el) {
        var $el              = $(el),
            $li              = $el.closest('li');

        $el.css('border', states.neutral);
        $li.removeClass('incorrect');
        if ($el.data('answer-content') in answerMap) {
          return;
        }

        self._revertPosition(el);
        $li.remove();
      });
    };

    View.prototype.startingState = function (startingState) {
      var $draggers   = $(this.containerEl).find('.dragger'),
          $answers    = this.$answerBox.find('ul.answers'),
          answers     = [],
          $dragger, starting;

      var startingMap = this._elMapById(startingState);
      for (var i = 0; i < $draggers.length; i++) {
        $dragger = $draggers.eq(i);
        starting = startingMap[$dragger.data('answer-content')];
        if (!starting.length) {
          continue;
        }

        starting = starting.splice(0, 1)[0];
        if (starting.location === 'magnet-box') {
          $dragger.css({
            top: starting.top,
            left: starting.left
          });
        } else if (starting.location === 'answer-box') {
          answers[starting.index] = $dragger;
        }
      }

      for (i = 0; i < answers.length; i++) {
        if (!answers[i]) { continue; }
        $answers.append(_createLi(answers[i]));
      }
    };

    View.prototype.getAnswers = function () {
      return $(this.containerEl).find('.answer-box li .dragger');
    };

    View.prototype.dismissPopups = function () {
      this.popovers.forEach(function (popover) { popover(); });
      this.popovers.length = 0;
    };
    View.prototype.playSound = function (name) {
      Sounds.play(name);
    };

    View.prototype.objectState = function () {
      var state = [];

      if (!this.$magnetBox) { return state; }
      this.$magnetBox.find('.dragger').each(saveState('magnet-box'));
      this.$answerBox.find('li .dragger').each(saveState('answer-box'));

      function saveState(location) {
        return function (i, el) {
          var $el = $(el);
          state.push({
            index: i,
            location: location,
            top: $el.css('top'),
            left: $el.css('left'),
            id: $el.data('answer-id'),
            content: $el.data('answer-content')
          });
        };
      }
      return state;
    };

    View.prototype._positionFor = function (section) {
      var $container   = $(this.containerEl),
          instructions = $container.find('.fm-instructions').outerHeight(true),// + 50,
          example      = $container.find('.fm-example').outerHeight(true),
          position;
      switch (section) {
        case 'instructions':
          return 50;
        case 'example':
          position = $container.find('.fm-instructions').position();
          if (position) {
            return position.top + instructions + 10;
          } else {
            return 50;
          }
          break;
        case 'magnets':
          position = $container.find('.fm-example').position();
          if (position) {
            return position.top + example + 10;
          } else {
            position = $container.find('.fm-instructions').position();
            if (position) {
              return position.top + instructions + 10;
            } else {
              return 50;
            }
          }
          break;
        case 'answers':
          return $container.find('.dragger:last').position().top + 60;
        default:
          return '';
      }
    };

    function _createLi($draggable) {
      return $('<li class="sortable-answer"></li>').append(
        $draggable.css({
          position: 'relative',
          top: 0,
          left: 0
        })
      ).css('display', 'inline-block');
    }

    return View;
  }
})();
