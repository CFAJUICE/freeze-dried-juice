/* global angular, createjs, juice, $, Draggabilly */
(function () {
  'use strict';

  var MODULE        = 'balancer',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('BalancerView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

  function ViewFactory(Log, Util, ViewManager, DomHelper) {
    var styles = {
      instructions: {
        top: 50,
        marginRight: 10,
        marginLeft: 10,
        padding: 5
      },
      prompt: {
        marginLeft: 40,
        position: 'absolute',
        left: '0',
        right: '0',
        margin: '0 auto',
        fontSize: 20
      },
      platform: {
        height: 54,
        valueModifier: -17
      },
      value: {
        width: 150,
        display: 'inline-block',
        border: '1px solid black',
        backgroundColor: 'white',
        color: 'black',
        height: 60,
        HEIGHT_SMALL: 0,
        HEIGHT_MEDIUM: 40,
        HEIGHT_LARGE: 40,
        WIDTH_LARGE: 35
      },
      valueCorrect: {
        backgroundColor: 'green',
        color: 'white'
      },
      valueIncorrect: {
        backgroundColor: 'orange',
        color: 'white'
      },
      valueRowDiff: {
        fromInstructions: 50
      },
      choice: {
        top: 130,
        left: 20,
        zIndex: 1000
      },
      comparison: {
        position: 'relative',
        top: -17
      },
      game: {
        width: 900,
        height: 515
      },
      spacing: {
        value: 20
      },
      offsets: {
        balanceHeight: 230
      },
      defaults: {
        fontSize: 16
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `balancer` view constructor');

      this.game = game;
      this.containerEl = containerEl;
      this.choices = [];

      var manager = this.manager = new ViewManager();
      var self = this;

      this.manager.on(this.containerEl, 'click', function () {
        if (self.dragJustEnded) { return; }
        manager.dismissPopups();
      });
    }

    View.prototype.displayInstructions = function (content) {
      var style        = styles.instructions,
          instructions = this.instructionsEl = DomHelper.createEl('div', {
            style: {
              color: this.manager.BLUE_TEXT,
              fontFamily: this.manager.FONT_FAMILY,
              fontSize: this.manager.INSTR_FONT_SIZE + 'px',
              top: style.top + 'px',
              textAlign: (content.instructions && content.instructions.align) || 'center',
              marginRight: style.marginRight + 'px',
              marginLeft: style.marginLeft + 'px',
              padding: style.padding + 'px'
            },
            className: 'balancer-instructions',
            html: (content.instructions && content.instructions.content) || '',
            attachTo: this.containerEl
          });
      this.manager.trackUi(instructions);
    };

    View.prototype._maxChoiceHeight = function () {
      var choiceEls = this.containerEl.querySelectorAll('.balancer-choice'),
          max       = -1,
          height    = 0;
      for (var i = 0; i < choiceEls.length; i++) {
        height = DomHelper.height(choiceEls[i]);
        if (height > max) {
          max = height;
        }
      }
      return max;
    };

    View.prototype.displayPrompt = function (content) {
      var displayPrompt = this;
      var choiceHeight = this._maxChoiceHeight(),
          instructionsHeight = DomHelper.height(this.instructionsEl) + 20,
          maxHeight = styles.game.height - styles.offsets.balanceHeight - choiceHeight - instructionsHeight;
      if (content.prompt && (content.prompt.img || content.prompt.content)) {
        var promptEl = DomHelper.createEl(content.prompt.img ? 'img' : 'div', {
          style: {
            maxHeight: (maxHeight && maxHeight > 0 ? maxHeight : 0) + 'px',
            top: (instructionsHeight + styles.instructions.top) + 'px',
            position: styles.prompt.position,
            left: styles.prompt.left + 'px',
            right: styles.prompt.right + 'px',
            margin: styles.prompt.margin,
            fontSize: styles.prompt.fontSize + 'px'
          },
          attachTo: this.containerEl
        });

        if (content.prompt.img) {
          promptEl.src = 'data:image/png;base64, ' + content.prompt.img;
        } else {
          promptEl.innerHTML = content.prompt ? content.prompt.content : '';
          promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center';
          if (promptEl.style.textAlign === 'left') {
            promptEl.style.marginLeft = styles.prompt.marginLeft + 'px';
          }
        }
        this.manager.trackUi(promptEl);
      } else{
        maxHeight = maxHeight / 2; //if there is no image, we want to choices to end up higher and not have a bunch of random white space in between
      }

      if ((!content.prompt) || (!content.prompt.img) || (typeof(promptEl)=='undefined')) {// not an image
        setChoicePositions();
      } else if (promptEl.complete) {// is a complete image
        setChoicePositions();
      } else {//is an incomplete image
        promptEl.addEventListener('load', setChoicePositions);
      }

      function setChoicePositions() {
        if(typeof(promptEl)!='undefined') {
          var actualHeight = DomHelper.height(promptEl);
          if (actualHeight < maxHeight) {
            maxHeight = actualHeight;
          }
        }else{
          maxHeight = instructionsHeight < maxHeight ? instructionsHeight : maxHeight;
        }

        angular.forEach(displayPrompt.containerEl.querySelectorAll('.balancer-row .balancer-choice'), function (choiceEl) {
          var top = parseInt(choiceEl.style.top, 10);
          choiceEl.style.top = (top + maxHeight) + 'px';
        });
      }
    };

    View.prototype.randomizeValues = function (values, startingState) {
      if (!startingState) {
        return Util.shuffle(values.concat([])); //randomize the layout
      }

      var newValues = [];
      angular.forEach(startingState, function (value) {
        newValues.push(value);
      });
      return newValues;
    };

    View.prototype.displayChoices = function (content, startingState) {
      var style     = styles.choice,
          left      = style.left,
          values    = content.values,
          width     = 0,
          self      = this,
          balance   = this.balance,
          row       = this._createValueRow(),
          value, i;

      values = this.randomizeValues(values, startingState);
      this.shuffledValues = values;

      for (i = 0; i < values.length; i++) {
        value = this._createValue(row, values[i]);
        value.display({
          style: {
            top: style.top,
            left: left + 'px',
            position: 'absolute',
            zIndex: style.zIndex,
            fontSize: (content.font_size || styles.defaults.fontSize) + 'px'
          },
          className: 'balancer-choice'
        });
        width += value.width();
        left += styles.spacing.value + value.width();

        if (values[i].correct) {
          this.correctAnswer = value;
        }
        this.choices.push(value);

        if (value.content.type && value.content.type === 'answer') { //showing existing answer
          balance.addChoice(value);
          this.game.showFeedback();
        }

        if (startingState) {
          continue; //we don't need dragging when we're showing answers from before
        }

        value.enableDragging();
        value.dragMove(function (value) {
          self.dismissPopups();

          if (balance.previousValue === value) {
            return;
          }

          if (DomHelper.elementsOverlap(value.el, balance.previousValue.el)) {
            DomHelper.addClass(balance.previousValue.el, 'hvr-ripple-out');
          } else {
            DomHelper.removeClass(balance.previousValue.el, 'hvr-ripple-out');
            DomHelper.removeClass(balance.placeholder.el, 'hvr-ripple-out');
          }
        });
        value.dragEnd(function (value) {
          if (balance.previousValue === value) {
            balance.rewind();
            return;
          }

          if (DomHelper.elementsOverlap(value.el, balance.previousValue.el)) {
            balance.addChoice(value);
            self.game.showFeedback();
          } else {
            value.moveBack();
          }

          DomHelper.removeClass(balance.previousValue.el, 'hvr-ripple-out');
          DomHelper.removeClass(balance.placeholder.el, 'hvr-ripple-out');

          self.dragJustEnded = true;
          setTimeout(function () {
            self.dragJustEnded = false;
          }, 200);
        });
      }

      var valueWidth = styles.game.width - width - (styles.spacing.value * values.length);
      row.style.marginLeft = (valueWidth / 2) + 'px';
    };

    View.prototype.afterMathJax = function () {
      angular.forEach(this.choices, function (choice) {
        choice.recordUiState();
      });
    };

    View.prototype.dismissPopups = function () {
      this.manager.dismissPopups();
    };

    View.prototype.displayBalance = function (content) {
      var balance = this.balance = new Balance(this.containerEl, this.game);
      this.balance.display(content);
      this.manager.trackUi(this.balance);

      balance.rotateLeft();
    };

    View.prototype.reset = function () {
      this.manager.cleanUi();
      this.manager.dismissPopups();
    };
    View.prototype.transition = function () {

    };
    View.prototype.getAnswer = function () {
      return this.balance.getChoice();
    };
    View.prototype.popup = function () {
      return this.manager.popup.apply(this.manager, arguments);
    };
    View.prototype.playSound = function () {
      return this.manager.playSound.apply(this.manager, arguments);
    };
    View.prototype.showAnswers = function () {
      this.balance.addChoice(this.correctAnswer);
    };
    View.prototype.rewind = function () {
      this.balance.rewind();
    };
    View.prototype._createValueRow = function () {
      var instructionsHeight = DomHelper.height(this.instructionsEl) - styles.valueRowDiff.fromInstructions;
      if (instructionsHeight <= 0) {
        instructionsHeight = 0;
      }

      var row = DomHelper.createEl('div', {
        className: 'balancer-row',
        attachTo: this.containerEl,
        style: {
          top: instructionsHeight + 'px',
          position: 'absolute'
        }
      });
      this.manager.trackUi(row);
      return row;
    };
    View.prototype._createValue = function (container, content) {
      var value = new Value(container, content);
      this.manager.trackUi(value);
      return value;
    };
    View.prototype.objectState = function () {
      var values = this.shuffledValues.concat([]),
          choice = this.balance.getChoice(),
          state  = [],
          value, currentState;
      for (var i = 0; i < values.length; i++) {
        value = values[i];
        currentState = {
          id: value.id,
          content: value.content,
          type: value.id === choice.content.id ? 'answer' : 'choice',
          correct: value.correct,
          img: value.img,
          weight: parseInt(value.weight, 10),
          size: value.size
        };
        state.push(currentState);
      }

      return state;
    };
    View.prototype.getLastChoice = function () {
      var choice;
      for (var i = 0; i < this.choices.length; i++) {
        choice = this.choices[i];
        if (this.balance.el === choice.el.parentNode) {
          continue;
        }
        return choice;
      }
      return choice;
    };







    function Value(container, content) {
      this.manager = new ViewManager();
      this.container = container;
      this.content = content;
      this.previousStates = [];
    }
    Value.prototype.display = function (options) {
      var size         = this.content.size,
          sizeModifier = getSizeModifier(size);

      var style = angular.extend({}, (options && options.style) || {}, styles.value);
      var value = this.el = DomHelper.createEl('div', {
        className: 'value ' + (options.className || ''),
        style: angular.extend(style, {
          backgroundImage: this.content.img ? 'url(\'data:image/png;base64, ' + this.content.img + '\')' : 'none',
          backgroundColor: this.content.img ? '' : 'white',
          backgroundSize: style.width + 'px ' + style.height + 'px',
          width: style.width + (size === 'large' ? styles.value.WIDTH_LARGE : '') + 'px',
          height: style.height + sizeModifier + 'px',
          top: (style.top) + 'px' ,
          padding: '2px 0px 2px 5px'
        }),
        attachTo: this.container,
        html: this.content.content
      });

      this.manager.trackUi(value);
    };
    Value.prototype.recordUiState = function () {
      this.previousStates.push({
        container: this.container,
        style: angular.extend({}, {
          backgroundImage: this.el.style.backgroundImage,
          backgroundColor: this.el.style.backgroundColor,
          backgroundSize: this.el.style.backgroundSize,
          width: this.el.style.width,
          height: this.el.style.height,
          top: this.el.style.top,
          left: this.el.style.left,
          color: this.el.style.color,

          position: 'absolute',
          float: null
        }),
        className: this.el.className
      });
    };
    Value.prototype.moveTo = function (newContainer, options) {
      this._switchContainer(newContainer);
      angular.extend(this.el.style, options || {});
    };
    Value.prototype.moveBack = function () {
      var previous = this.previousStates[this.previousStates.length - 1];
      if (!previous) {
        return;
      }

      this._switchContainer(previous.container);
      this.el.className = previous.className;
      angular.extend(this.el.style, previous.style);
    };
    Value.prototype._switchContainer = function (newParent) {
      this.el.parentNode && this.el.parentNode.removeChild(this.el);
      newParent.appendChild(this.el);
    };
    Value.prototype.remove = function () {
      this.manager.cleanUi();
    };
    Value.prototype.width = function () {
      return DomHelper.width(this.el);
    };
    Value.prototype.isLighter = function () {
      return this.content.weight == 1;
    };
    Value.prototype.isHeavier = function () {
      return this.content.weight == 3;
    };
    Value.prototype.isCorrect = function () {
      return this.content.correct;
    };
    Value.prototype.markCorrect = function () {
      DomHelper.modifyEl(this.el, {
        style: {
          backgroundColor: this.content.correct ? styles.valueCorrect.backgroundColor : styles.valueIncorrect.backgroundColor,
          color: this.content.correct ? styles.valueCorrect.color : styles.valueIncorrect.color
        }
      });


      if (this.content.correct) {
        DomHelper.removeClass(this.el, 'incorrect');
        DomHelper.addClass(this.el, 'correct');
      } else {
        DomHelper.removeClass(this.el, 'correct');
        DomHelper.addClass(this.el, 'incorrect');
      }
      DomHelper.createEl('span', {
        attachTo: this.el,
        className: 'cross-out'
      });
    };
    Value.prototype.enableDragging = function () {
      this.draggable = new Draggabilly(this.el, {});
    };
    Value.prototype.dragMove = function (callback) {
      if (!this.draggable) { return; }
      if (this.dragMoveCallback) {
        this.draggable.off('dragMove', this.dragMoveCallback);
      }

      var value = this;
      this.dragMoveCallback = function (event, pointer) {
        callback(value);
      };
      this.draggable.on('dragMove', this.dragMoveCallback);
    };
    Value.prototype.dragEnd = function (callback) {
      if (!this.draggable) { return; }
      if (this.dragEndCallback) {
        this.draggable.off('dragEnd', this.dragEndCallback);
      }
      var value = this;
      this.dragEndCallback = function (event, pointer) {
        callback(value);
      };
      this.draggable.on('dragEnd', this.dragEndCallback);
    };




    function Balance(container, assets) {
      this.manager = new ViewManager();
      this.container = container;
      this.assets = assets;
    }
    Balance.prototype.display = function (content) {
      var ballImg     = this.assets.getAsset('ball'),
          platformImg = this.assets.getAsset('platform');
      var scale    = DomHelper.createEl('div', {
            className: 'balance-scale',
            attachTo: this.container
          }),
          platform = DomHelper.createEl('div', {
            className: 'balance-platform',
            attachTo: scale,
            style: {
              height: styles.platform.height + 'px',
              backgroundImage: 'url(' + platformImg.src + ')',
              backgroundRepeat: 'repeat-x',
              backgroundSize: '100% 11px',
              backgroundPosition: '16px 43px'
            }
          }),
          ball     = DomHelper.createEl('div', {
            className: 'balance-ball',
            attachTo: scale,
            style: {
              backgroundImage: 'url(' + ballImg.src + ')',
              backgroundRepeat: 'no-repeat'
            }
          }),
          compare     = new Value(platform, content.comparison),
          placeholder = new Value(platform, {weight: 1});

      styles.comparison.fontSize = (content.font_size || styles.defaults.fontSize) + 'px';
      compare.display({
        className: 'balancer-comparison',
        style: angular.extend(
          {},
          styles.comparison,
          {
            top: styles.comparison.top - getSizeModifier(content.comparison.size)
          }
        )
      });

      this.scale = scale;
      this.platform = platform;
      this.ball = ball;
      this.compare = compare;

      this.placeholder = placeholder;
      placeholder.display({
        className: 'balancer-placeholder'
      });
      placeholder.el.style.border = '1px dashed black';
      placeholder.el.style.backgroundColor = 'transparent';
      this.addChoice(placeholder);

      this.manager.trackUi(platform, ball, compare, this.placeholder);
    };
    Balance.prototype.addChoice = function (value) {
      var size         = value.content.size,
          sizeModifier = getSizeModifier(size);

      if (this.previousValue && this.previousValue === this.placeholder) {
        this.placeholder.el.style.display = 'none';
      } else if (this.previousValue) {
        this.previousValue.moveBack();
      }

      if (value === this.placeholder) {
        value.el.style.display = 'block';
      }

      value.moveTo(this.platform, {
        position: 'relative',
        float: 'right',
        top: styles.platform.valueModifier - sizeModifier + 'px',
        left: null
      });
      this.previousValue = value;

      switch (true) {
        case value.isLighter():
          return this.rotateLeft();
        case value.isHeavier():
          return this.rotateRight();
        default:
          return this.rotateNeutral();
      }
    };
    Balance.prototype.getChoice = function () {
      return this.previousValue;
    };
    Balance.prototype.remove = function () {
      this.manager.cleanUi();
    };
    Balance.prototype.rotateLeft = function () {
      DomHelper.removeClass(this.platform, 'right');
      DomHelper.addClass(this.platform, 'left');
    };
    Balance.prototype.rotateRight = function () {
      DomHelper.removeClass(this.platform, 'left');
      DomHelper.addClass(this.platform, 'right');
    };
    Balance.prototype.rotateNeutral = function () {
      DomHelper.removeClass(this.platform, 'right');
      DomHelper.removeClass(this.platform, 'left');
    };
    Balance.prototype.rewind = function () {
      this.previousValue.moveBack();
      this.previousValue = null;

      this.addChoice(this.placeholder);
    };

    function getSizeModifier(size) {
      if (size === 'medium') {
        return styles.value.HEIGHT_MEDIUM;
      } else if (size === 'large') {
        return styles.value.HEIGHT_LARGE;
      } else {
        return styles.value.HEIGHT_SMALL;
      }
    }

    ViewManager.validate(View.prototype);
    return View;
  }


})();
