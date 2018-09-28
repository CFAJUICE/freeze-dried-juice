/* global angular, createjs, juice, $ */
(function () {
  'use strict';

  var MODULE  = 'stacker',
      stacker = angular.module(MODULE);
  stacker.factory('StackerView', ['Log', 'Util', 'Sounds', 'Popover', function (Log, Util, Sounds, Popover) {
    var styles = {
      stack: {
        height: 450
      },
      defaults: {
        fontSize: 22,
        minFontSize: 14
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `stacker` view constructor');

      this.game = game;
      this.domEls = [];
      this.popovers = [];
      this.containerEl = containerEl;
      this.$container = $(this.containerEl);
    }

    View.prototype.displayDirections = function (content, img) {
      var $container = this.$container,
          $directions = $('<div></div>').append(Util.newLineHtml(content)).addClass('text-piece').css({
            top: '70px',
            width: '530px',
            maxHeight: '250px',
            overflow: 'hidden',
            fontSize: '22px',
            position: 'absolute',
            marginLeft: '10px',
            padding: '5px',
            color: 'black'
          }),
          $img, $imgContainer, fromTop;
      $container.append($directions);

      Util.resizeText($directions.get(0), {maxFontSize: styles.defaults.fontSize, minFontSize: styles.defaults.minFontSize});

      if (img && img.trim() !== '') {
        fromTop = 70 + $directions.outerHeight(true) + 10;
        $img = $('<img/>')
          .prop('src', 'data:image/png;base64, ' + img)
          .css({
            maxWidth: '530px',
            maxHeight: (520 - fromTop) + 'px',
            margin: '0 auto',
            left: '0',
            right: '0',
            position: 'absolute'
          });
        $imgContainer = $('<div></div>').css({
          top: fromTop + 'px',
          width: '530px',
          height: 520 - fromTop,
          position: 'absolute',
          paddingLeft: '10px'
        });
        $imgContainer.append($img);
        $container.append($imgContainer);

        this.domEls.push($imgContainer);
      }

      this.domEls.push($directions);
    };
    View.prototype.toggleCorrect = function ($dom, correct) {
      if (correct === null) {
        $dom.removeClass('correct incorrect');
        return;
      }
      $dom.addClass(correct ? 'correct' : 'incorrect');
      $dom.removeClass(correct ? 'incorrect' : 'correct');
    };
    View.prototype.clearWrongAnswers = function () {
      var answers = this.getAnswers();
      answers.each(function (i) {
        answers.eq(i).removeClass('incorrect');
      });
    };
    View.prototype.popup = function (options) {
      options.className += ' game-popup no-arrow';
      options.remove = 'click';
      options.clickAnywhere = ('clickAnywhere' in options) ? options.clickAnywhere : true;
      this.popovers.push(Popover.show(options));
    };
    View.prototype.playSound = function (name) {
      Sounds.play(name);
    };
    View.prototype.transition = function () {
      this.domEls.forEach(function (el) {
        (el.get ? el.get(0) : el).style.opacity = 0;
      });
    };
    View.prototype.displayScaleIndicators = function (content) {
      var $ul    = this.$container.find('ul.stack'),
          $label = $('<li class="stack-label"></li>'),
          $top    = $label.clone(),
          $bottom = $label.clone(),
          width   = $ul.find('li:first').css('width'),
          height  = this._calculateHeight(content);

      var indicatorHeight = (100 - (height * content.values.length)) / 2;

      if (content.scale_top) {
        $ul.prepend($top.text(content.scale_top).css({
          top: '0px',
          height: indicatorHeight + '%',
          width: width
        }).toggleClass('active', !!content.scale_top).data('stack-position', 'top'));
      }
      if (content.scale_bottom) {
        $ul.append($bottom.text(content.scale_bottom).css({
          bottom: '5px',
          height: indicatorHeight + '%',
          width: width
        }).toggleClass('active', !!content.scale_top).data('stack-position', 'bottom'));
      }

      Util.resizeText($ul.find('.stack-label').toArray(), {maxFontSize: 22, alignHoriz: true, alignVert: true});
    };
    View.prototype.afterMathJax = function (content) {
      if (!this.$stackEl || !this.$stackEl.get(0).parentNode) { return; } //it's possible in the time mathjax was queueing this up that we detached from the DOM
      this.$stackEl.find('li').each(function (i, li) {
        var font = parseInt(content.font_size || styles.defaults.fontSize, 10);
        Util.resizeText(li.firstChild, {minFontSize: font, maxFontSize: font, alignVert: true}); //using it just to get the vertical centering
        $(li).append('<span class="cross-out"></span>'); //needs to happen after resize, which alters content position
      });
    };
    View.prototype._calculateHeight = function (content) {
      var values    = content.values,
          hasTop    = !!content.scale_top,
          hasBottom = !!content.scale_bottom;

      return (100 - (hasTop ? 5 : 0) - (hasBottom ? 5 : 0)) / values.length;
    };
    View.prototype.displayStack = function (content, startingState) {
      var values    = content.values,
          answers   = content.answers,
          hasTop    = !!content.scale_top,
          hasBottom = !!content.scale_bottom,
          $ul       = $('<ul></ul>').css({
            top: hasTop ? '50px' : hasBottom ? '70px' : '85px',
            maxWidth: '300px',
            fontSize: '22px',
            height: styles.stack.height + 'px'
          }).addClass('stack');

      values = reorder(values, answers, startingState);

      var heightPercentage = this._calculateHeight(content),
          i                = 0,
          couponBackground = this.game.getAsset('coupon');

      angular.forEach(values, function (value) {
        $ul.append(
          $('<li><div class="stack-item-content-wrapper">' + Util.newLineHtml(value.content) + '</div></li>')
            .data('answer-id', value.id)
            .data('answer-content', value.content)
            .data('original-position', i++)
            .addClass('stack-item')
            .css({
              height: heightPercentage + '%',
              width: couponBackground.width + 'px',
              fontSize: (content.font_size || styles.defaults.fontSize) + 'px'
            })
        );
      });

      this.$container.append($ul);
      this.$stackEl = $ul;

      $ul.children().each(function (i, el) {
        Util.timeout(function () {
          Util.animationEnd(el, function () {
            el.className = el.className.replace(' wiggle', '');
          });
          el.className += ' wiggle animated';
        }, i * 150);
      });

      var self = this;
      $ul.on('mousedown', function () {
        self.dismissPopups();
      });

      Sortable.create($ul.get(0), {
        animation: 150,
        draggable: '.stack-item',
        onStart: function () {
          self.dismissPopups();
        },
        onEnd: function () {
          Sounds.play(juice.sounds.snapTo);
        }
      });

      this.domEls.push($ul);
    };
    View.prototype.showAnswers = function (answers) {
      var $container = $(this.containerEl),
          $stack     = $container.find('ul.stack'),
          $els       = $container.find('.stack-item'),
          answerMap  = Util.groupBy(answers, 'value'),
          inOrder    = [];

      $els.each(function (i, el) {
        var $el    = $(el),
            answer = answerMap[$el.data('answer-id')],
            index  = answers.indexOf(answer);

        inOrder[index] = $el;
        $el.removeClass('incorrect correct');
      });

      $stack.find('.stack-item').detach();
      angular.forEach(inOrder, function ($el) {
        $stack.append($el.addClass('correct'));
      });

      var $label = $stack.find('.stack-label:last');
      if ($label.data('stack-position') === 'bottom') {
        $stack.append($label); //we just re-appended the stack items to the list, so the stack labels are out of order
                               //this will move the bottom stack label back to the bottom, if needed
      }
    };
    View.prototype.getAnswers = function () {
      return $(this.containerEl).find('.stack li.stack-item');
    };
    View.prototype.objectState = function () {
      var $answers = this.getAnswers(),
          state    = [];
      for (var i = 0; i < $answers.length; i++) {
        var $answer = $answers.eq(i);

        state.push({
          index: i,
          content: $answer.data('answer-content'),
          id: $answer.data('answer-id')
        });
      }
      return state;
    };
    View.prototype.reset = function () {
      angular.forEach(this.domEls, function (el) {
        if (el.remove) { el.remove(); }
        else {
          el.parentNode && el.parentNode.removeChild(el);
        }
      });
      this.dismissPopups();
    };
    View.prototype.dismissPopups = function () {
      this.popovers.forEach(function (popover) { popover(); });
      this.popovers.length = 0;
    };

    function reorder(values, answers, startingState) {
      if (!startingState) {
        return randomize(values, answers);
      }

      var valueMap        = Util.groupBy(values, 'id'),
          reorderedValues = [];
      for (var i = 0; i < startingState.length; i++) {
        reorderedValues.push(valueMap[startingState[i].id]);
      }

      return reorderedValues;
    }

    function randomize(values, answers) {
      values = Util.shuffle(values.concat([]));
      if (isCorrect(values, answers) && values.length > 1) { //make sure we don't shuffle it into the correct answers
        while (true) {
          values = Util.shuffle(values.concat([]));
          if (!isCorrect(values, answers)) {
            break;
          }
        }
      }
      return values;
    }
    function isCorrect(values, answers) {
      if (values.length !== answers.length) {
        return false;
      }
      for (var i = 0; i < values.length; i++) {
        if (values[i].id !== answers[i].value) {
          return false;
        }
      }
      return true;
    }

    return View;
  }]);
})();