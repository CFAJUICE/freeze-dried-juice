/* global angular, createjs, juice, $, Sortable */
(function () {
  'use strict';

  var MODULE        = 'quick_pick',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('QuickPickView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

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
      choices: {
        top: 320,
        left: 0,
        right: 0
      },
      choice: {
      },
      speechBubble: {
        fontSize: 22,
        padding: '2px 0 2px 5px',

        height: 120,
        HEIGHT_SMALL: -60,
        HEIGHT_NORMAL: 0,
        HEIGHT_LARGE: 40,
        HEIGHT_EXTRA_LARGE: 240
      },
      choiceImage: {
        height: 100
      },
      offsets: {
        promptTop: 10
      },
      game: {
        height: 510,
        width: 850
      },
      diffs: {
        bubbleWidth: 20
      },
      defaults: {
        fontSize: 16
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `quick_pick` view constructor');

      this.game = game;
      this.containerEl = containerEl;
      this.manager = new ViewManager();
      this.choices = new Choices(this.containerEl);

      this.manager.trackUi(this.choices);
    }

    View.prototype.onSelect = function (callback) {
      this.choices.onSelect(callback);
    };

    View.prototype.getAnswer = function () {
      return this.choices.getSelectedChoice();
    };

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
            className: 'quick-pick-instructions',
            html: (content.instructions && content.instructions.content) || '',
            attachTo: this.containerEl
          });

      this.manager.trackUi(instructions);
    };

    View.prototype.displayPrompt = function (content) {
      var choiceHeight       = this.choices.choiceHeight(),
          instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
          maxHeight          = styles.game.height - choiceHeight - instructionsHeight - styles.offsets.promptTop,
          promptEl           = DomHelper.createEl(content.instructions.img ? 'img' : 'div', {
            style: {
              maxHeight: maxHeight + 'px',
              top: (instructionsHeight + styles.instructions.top + styles.offsets.promptTop) + 'px',
              position: styles.prompt.position,
              left: styles.prompt.left + 'px',
              right: styles.prompt.right + 'px',
              margin: styles.prompt.margin,
              fontSize: styles.prompt.fontSize + 'px'
            },
            attachTo: this.containerEl
          });

      if (content.instructions.img) {
        promptEl.src = 'data:image/png;base64, ' + content.instructions.img;
      } else {
        promptEl.innerHTML = content.prompt ? content.prompt.content : '';
        promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center';
        if (promptEl.style.textAlign === 'left') {
          promptEl.style.marginLeft = styles.prompt.marginLeft + 'px';
        }
      }

      this.manager.trackUi(promptEl);
    };

    View.prototype.displayChoices = function (content, startingState) {
      var choiceStyle    = styles.choice,
          values         = content.values;
          //selectedAnswer = startingState && startingState[0];
      choiceStyle.width = styles.game.width / values.length;

      values = this.randomizeValues(values, startingState);

      var correctAnswer = content.answer;
      for (var i = 0; i < values.length; i++) {
        var value = this.choices.addChoice({
          content: values[i],
          img: content.icon && content.icon.img,
          speechStyle: content.text_display,
          fontSize: (content.font_size || styles.defaults.fontSize) + 'px'
        });
        var isCorrect = values[i].id === correctAnswer;
        if (isCorrect) {
          this.correctAnswer = value;
        }

        if (startingState && value.content.isAnswer) {
          this.choices.choose(value);
          this.choices.markStatus(value, isCorrect);
        }
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

    View.prototype.reset = function () {
      this.manager.cleanUi();
      this.manager.dismissPopups();
    };
    View.prototype.dismissPopups = function () {
      this.manager.dismissPopups();
    };
    View.prototype.popup = function () {
      return this.manager.popup.apply(this.manager, arguments);
    };
    View.prototype.playSound = function () {
      return this.manager.playSound.apply(this.manager, arguments);
    };
    View.prototype.showAnswers = function () {
      this.choices.choose(this.correctAnswer);
      this.choices.markStatus(this.correctAnswer, true);
    };
    View.prototype.rewind = function () {
      this.choices.rewind();
    };
    View.prototype.markCorrect = function (value) {
      this.choices.markStatus(value, true);
    };
    View.prototype.markIncorrect = function (value) {
      this.choices.markStatus(value, false);
    };
    View.prototype.objectState = function () {
      var answer = this.getAnswer(),
          state  = [];
      this.choices.each(function (choice) {
        state.push({
          id: choice.content.id,
          content: choice.content.content,
          isAnswer: answer === choice,
          size: choice.content.size
        });
      });
      return state;
    };






    function Choices(container) {
      this.manager = new ViewManager();
      this.container = container;
      this.choices = [];
      this.el = DomHelper.createEl('div', {
        className: 'qp-choices',
        attachTo: this.container,
        style: {
          top: styles.choices.top + 'px',
          left: styles.choices.left + 'px',
          right: styles.choices.right + 'px',
          margin: '0 auto',
          width: '0'
        }
      });

      this.manager.trackUi(this.el);
    }
    Choices.prototype.onSelect = function (callback) {
      var choices = this;
      this.onSelectCallback = callback;
      for (var i = 0; i < this.choices.length; i++) {
        this.choices[i].onSelect(function (value) {
          choices.choose(value);
          choices.onSelectCallback(value);
        });
      }
    };
    Choices.prototype.choose = function (value) {
      var choices = this;

      this.each(function (choice) {
        if (choice === value) {
          choices.selectedChoice = value;

          choice.select();
        } else {
          choice.deselect();
        }
      });
    };
    Choices.prototype.getSelectedChoice = function () {
      return this.selectedChoice;
    };
    Choices.prototype.addChoice = function (options) {
      var prevChoice = this._prevChoice(),
          val        = new Value(this.el, options),
          left       = prevChoice ? parseInt(prevChoice.el.style.marginLeft) + styles.choice.width : 0;
      val.display({
        marginLeft: left + 'px',
        fontSize: options.fontSize,
        zIndex: 1
      });
      val.parent = this;

      this.choices.push(val);
      DomHelper.modifyEl(this.el, {
        style: {
          width: (parseInt(this.el.style.width, 10) + styles.choice.width) + 'px'
        }
      });

      this.manager.trackUi(val);
      return val;
    };
    Choices.prototype.remove = function () {
      this.manager.cleanUi();
    };
    Choices.prototype._prevChoice = function () {
      return this.choices[this.choices.length - 1];
    };
    Choices.prototype.top = function () {
      return parseInt(this.el.style.top);
    };
    Choices.prototype.each = function (callback) {
      for (var i = 0; i < this.choices.length; i++) {
        var result = callback(this.choices[i]);
        if (result === false) {
          return;
        }
      }
    };
    Choices.prototype.rewind = function () {
      this.choose(null);
    };
    Choices.prototype.markStatus = function (value, isCorrect) {
      this.each(function (choice) {
        if (choice === value) {
          choice.markStatus(isCorrect);
        } else {
          choice.markStatus(null);
        }
      });
    };
    Choices.prototype.choiceHeight = function () {
      if (!this.choices) {
        return 0;
      }
      return DomHelper.height(this.choices[0].el);
    };
    Choices.prototype.each = function (callback) {
      for (var i = 0; i < this.choices.length; i++) {
        callback(this.choices[i]);
      }
    };


    function Value(container, options) {
      this.manager = new ViewManager();
      this.container = container;
      this.content = options.content;
      this.img = options.img;
      this.speechStyle = options.speechStyle;
      this.el = DomHelper.createEl('div', {
        className: 'qp-choice',
        attachTo: this.container
      });

      this.manager.trackUi(this.el);
    }
    Value.prototype.remove = function () {
      this.manager.cleanUi();
    };
    Value.prototype.select = function () {
      DomHelper.addClass(this.el, 'selected');
    };
    Value.prototype.deselect = function () {
      DomHelper.removeClass(this.el, ['selected', 'incorrect']);
    };
    Value.prototype.display = function (style) {
      var bubbleModifier,
          bubbleSize = this.content.size;

      if (bubbleSize === 'small') {
        bubbleModifier = styles.speechBubble.HEIGHT_SMALL;
      } else if (bubbleSize === 'large') {
        bubbleModifier = styles.speechBubble.HEIGHT_LARGE;
      } else if (bubbleSize === 'extra large') {
        bubbleModifier = styles.speechBubble.HEIGHT_EXTRA_LARGE;
      } else {
        bubbleModifier = styles.speechBubble.HEIGHT_NORMAL;
      }

      DomHelper.modifyEl(this.el, {
        style: $.extend(style, {
          top: -bubbleModifier + 'px'
        })
      });

      var speech = this.speechStyle === 'bubble',
          bubble = DomHelper.createEl('div', {
            className: 'bubble' + (speech ? ' speech' : ''),
            attachTo: this.el,
            html: this.content.content,
            style: {
              width: (styles.choice.width - styles.diffs.bubbleWidth) + 'px',
              height: styles.speechBubble.height + bubbleModifier + 'px',
              padding: styles.speechBubble.padding
            }
          });


      var width    = (styles.choice.width / 2),
          elements = [bubble];
      if (this.img) {
        var image = DomHelper.createEl('div', {
          className: 'qp-image',
          attachTo: this.el,
          style: {
            backgroundImage: this.img ? 'url(\'data:image/png;base64, ' + this.img + '\')' : 'none',
            backgroundSize: width + 'px ' + styles.choiceImage.height + 'px',
            backgroundRepeat: 'no-repeat',
            width: width + 'px',
            height: styles.choiceImage.height + 'px',
            border: this.img ? 'none' : '1px solid black'
          }
        });
        elements.push(image);
      } else {
        bubble.parentNode.style.marginTop = styles.choiceImage.height + 20 + 'px';
        DomHelper.modifyEl(bubble, {
          className: 'bubble',
          style: {
            marginBottom: 0
          }
        });
      }

      DomHelper.createEl('span', {
        attachTo: bubble,
        className: 'cross-out'
      });

      //Util.resizeText(bubble, {maxFontSize: styles.speechBubble.fontSize});
      this.manager.trackUi.apply(this.manager, elements);
    };
    Value.prototype.onSelect = function (callback) {
      var value = this;
      if (this.onSelectCallback) {
        this.manager.off('click', this.el, this.onSelectCallback);
      }
      this.onSelectCallback = this.manager.on(this.el, 'click', function () {
        callback(value);
      });
    };
    Value.prototype.markStatus = function (isCorrect) {
      DomHelper.removeClass(this.el, ['wrong', 'incorrect']);
      DomHelper.removeClass(this.el, ['right', 'correct']);
      if (isCorrect === null) {
        return;
      }

      DomHelper.addClass(this.el, isCorrect ? ['right', 'correct'] : ['wrong', 'incorrect']);
    };
    Value.prototype.textHeight = function () {
      var text = this.el.querySelector('.textFitted');
      return DomHelper.height(text);
    };

    ViewManager.validate(View.prototype);
    return View;
  }
})();
