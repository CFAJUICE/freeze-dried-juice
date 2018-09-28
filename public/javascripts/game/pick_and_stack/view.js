/* global angular, createjs, juice, $, Sortable */
(function () {
  'use strict';

  var MODULE        = 'pick_and_stack',
      fridgeMagnets = angular.module(MODULE);
  fridgeMagnets.factory('PickAndStackView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

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
      valuePlaceholder: {
        border: '1px dashed black'
      },
      title: {
        height: 40,
        width: 325,
        fontSize: 17,
        color: '#1645CD',
        listMarginOffset: 12,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, .5)'
      },
      listValue: {
        width: 325,
        fontSize: 18,
        border: '1px solid black',

        height: 50,
        HEIGHT_SMALL: 0,
        HEIGHT_LARGE: 80,
        HEIGHT_NORMAL: 10,
        HEIGHT_MEDIUM_LARGE: 25
      },
      sortableListValue: {
        width: 300,
        height: 50
      },
      pickValue: {
        backgroundColor: 'white'
      },
      pickList: {
        bottom: 65,
        left: 50
      },
      stackList: {
        bottom: 65,
        right: 100,
        borderWidth: 2
      },
      offsets: {
        promptTop: 10
      },
      game: {
        width: 900,
        height: 515
      },
      defaults: {
        fontSize: 16
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside `pick_and_stack` view constructor');

      this.game = game;
      this.containerEl = containerEl;
      this.manager = new ViewManager();
    }

    View.prototype.displayInstructions = function (content) {
      var fontSize = this.manager.INSTR_FONT_SIZE;
      if (content.instructions && content.instructions.font_size) {
        fontSize = content.instructions.font_size;
      }

      var style        = styles.instructions,
          instructions = this.instructionsEl = DomHelper.createEl('div', {
            style: {
              color: this.manager.BLUE_TEXT,
              fontFamily: this.manager.FONT_FAMILY,
              fontSize: fontSize + 'px',
              top: style.top + 'px',
              textAlign: (content.instructions && content.instructions.align) || 'center',
              marginRight: style.marginRight + 'px',
              marginLeft: style.marginLeft + 'px',
              padding: style.padding + 'px'
            },
            className: 'pick-stack-instructions',
            html: (content.instructions && content.instructions.content) || '',
            attachTo: this.containerEl
          });

      this.manager.trackUi(instructions);
    };

    View.prototype.displayPrompt = function (content) {
      var pickHeight         = this.pickList.height(),
          instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
          maxHeight          = styles.game.height - pickHeight - instructionsHeight - styles.title.height - styles.offsets.promptTop - 5,
          promptEl           = DomHelper.createEl(content.instructions_img ? 'img' : 'div', {
            style: {
              maxHeight: (maxHeight && maxHeight > 0 ? maxHeight : 0) + 'px',
              top: (instructionsHeight + styles.instructions.top + styles.offsets.promptTop) + 'px',
              position: styles.prompt.position,
              left: styles.prompt.left + 'px',
              right: styles.prompt.right + 'px',
              margin: styles.prompt.margin,
              fontSize: styles.prompt.fontSize + 'px'
            },
            attachTo: this.containerEl
          });

      if (content.instructions_img) {
        promptEl.src = 'data:image/png;base64, ' + content.instructions_img;
      } else {
        promptEl.innerHTML = content.prompt ? content.prompt.content : '';
        promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center';
        if (promptEl.style.textAlign === 'left') {
          promptEl.style.marginLeft = styles.prompt.marginLeft + 'px';
        }
      }

      this.manager.trackUi(promptEl);
    };

    View.prototype.randomize = function (values) {
      return Util.shuffle(values.concat([]));
    };

    View.prototype.displayLists = function (content, startingState) {
      var pickValues = [];
      if (startingState) {
        pickValues = startingState;
      } else {
        pickValues = this.randomize(content.values);
      }

      this.displayPick(content, pickValues, !!(startingState && startingState.length));
      this.displayStack(content);
    };

    View.prototype.startingState = function (startingState) {
      var pickLookup = {},
          stack      = this.stackList;
      angular.forEach(this.pickList.values, function (item) {
        pickLookup[item.content.id] = item;
      });

      angular.forEach(startingState, function (state) {
        if (state.list === 'stack') {
          stack.addValue(pickLookup[state.id]);
        } else {
          pickLookup[state.id].markStatus(state.correct);
        }
      });
    };

    View.prototype.displayPick = function (content, values, isShowAttempt) {
      var pickList = this.pickList = new List(this.containerEl, values.length);
      pickList.display({
        className: 'picker',
        style: {
          position: 'absolute',
          bottom: styles.pickList.bottom + 'px',
          left: styles.pickList.left + 'px'
        }
      });

      for (var i = 0; i < values.length; i++) {
        var val = new Value(pickList.el, values[i]);
        pickList.addValue(val);

        val.display({
          fontSize: (content.font_size || styles.defaults.fontSize) + 'px'
        });
        val.resizeContent();
        !isShowAttempt && val.wiggleFor(i * 250);
        this.manager.trackUi(val);
      }

      pickList.setTitle(content.titles && content.titles.pick);

      this.manager.trackUi(pickList);
    };

    View.prototype.displayStack = function (content) {
      var stackList = this.stackList = new List(this.containerEl, content.answers.length);

      stackList.display({
        style: {
          position: 'absolute',
          bottom: styles.stackList.bottom + 'px',
          right: styles.stackList.right + 'px',
          height: DomHelper.height(this.pickList.el) + 'px',
          width: (DomHelper.width(this.pickList.el) + (styles.stackList.borderWidth * 2)) + 'px',
          border: styles.stackList.borderWidth + 'px dashed black'
        }
      });

      stackList.setTitle(content.titles && content.titles.stack);
      this.manager.trackUi(stackList);
    };

    View.prototype.addToStack = function (value) {
      value.markStatus(true);
      this.stackList.addValue(value);
    };

    View.prototype.backToPick = function (value) {
      value.el.style.left = '0px';
      value.el.style.top = '0px';
      value.markStatus(false);
      this.pickList.addValue(value);
    };

    View.prototype.enablePickMode = function () {
      var view = this;


      var draggedX, draggedY;

      view.helperArrow();
      view.pickList.pickMode('pick');
      view.pickList.sortableInstance.option('onStart', function (e) {
        view.hideHelperArrow();
        view.stackList.toggleHelperText();
        view.stackList.highlight(true);
        view.pickList.clearStatus();
        view.pickList.stopWigglingByDom(e.item);
      });
      view.pickList.sortableInstance.option('onEnd', function (e) {
        view.stackList.toggleHelperText();
        view.stackList.highlight(false);
        var value = view.pickList.valueByDom(e.item);
        if (value && view.overlapsStack(draggedX, draggedY)) {
          view.game.handlePick(value);
        } else {  //to fix the inconsistent status that can happen when dragging back oustide of pickList AND stackList !PM 11/23/2016
		  value.el.style.left = '0px';
          value.el.style.top = '0px';
          view.pickList.addValue(value);
		}
      });

      DomHelper.on(view.pickList.el, 'dragover', getClientPosition);
      DomHelper.on(view.stackList.el, 'dragover', getClientPosition);
      function getClientPosition(e) {
        draggedX = e.originalEvent.clientX;
        draggedY = e.originalEvent.clientY;
      }

      view.stackList.pickMode('stack');
    };
    View.prototype.overlapsStack = function (x, y) {
      var bounds = this.stackList.el.getBoundingClientRect();
      return x >= bounds.left && y >= bounds.top;
	  //return true;
    };
    View.prototype.helperArrow = function () {
      var el,
          view = this;
      el = DomHelper.createEl('div', {
        style: {
          bottom: (parseInt(this.pickList.el.style.bottom, 10) + (DomHelper.height(this.pickList.el) / 1.5)) + 'px',
          left: (parseInt(this.pickList.el.style.left, 10) + DomHelper.width(this.pickList.el) + 10) + 'px',
          position: 'absolute',
          zIndex: '100000'
        },
        attachTo: view.containerEl
      });
      el.innerHTML = '<div class="guidance-wrapper"><div class="guidance"></div></div>';

      this.helperArrowEl = el;
      view.manager.trackUi(el);
    };
    View.prototype.hideHelperArrow = function () {
      this.helperArrowEl.className += ' fade';
    };
    View.prototype.enableStackMode = function () {
      this.pickList.stackMode('pick');
      this.stackList.stackMode('stack');
      this.isStackMode = true;
      this.pickList.clearStatus();
      this.stackList.clearStatus();

      var view = this;
      view.stackList.sortableInstance.option('onStart', function (e) {
        view.dismissPopups();
      });
    };

    View.prototype.reset = function () {
      this.manager.cleanUi();
      this.manager.dismissPopups();
    };
    View.prototype.getStackList = function () {
      return this.stackList;
    };
    View.prototype.getPickList = function () {
      return this.pickList;
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
    View.prototype.showAnswers = function (answers) {
      this.stackList.rearrangeByAnswers(answers);
    };
    View.prototype.showPickAnswers = function (answers) {
      var answersById = {},
          pickList    = this.pickList,
          stackList   = this.stackList,
          newList     = [];

      angular.forEach(answers, function (answer) {
        answersById[answer.value] = null;
      });
      pickList.each(function (value) {
        if (value.content.id in answersById) {
          newList.push(value);
        }
      });

      if (newList.length && newList.length > 1) { //make sure the results are not in correct order (only if more than one answer!)
        while (newList[0].content.id === answers[0].value) {
          answers = this.randomize(answers);
          newList = this.randomize(newList);
        }
      }

      angular.forEach(newList, function (value) {
        stackList.addValue(value);
      });
    };
    View.prototype.rewind = function () {
      this.pickList.clearStatus();

      if (!this.isStackMode) {
        return; //there is nothing to do in this case, since you wouldn't reset answers while picking
      }

      this.stackList.clearStatus(true);
    };
    View.prototype.objectState = function () {
      var state = [];

      this._saveState('pick', this.pickList, state);
      this._saveState('stack', this.stackList, state);

      return state;
    };
    View.prototype._saveState = function (listType, list, state) {
      var mode  = this.game.isImmediate() ? 'immediate' : 'check',
          item, i;

      for (i = 0; i < list.values.length; i++) {
        item = list.values[i];

        state.push({
          list: listType,
          mode: mode,
          content: item.content.content,
          id: item.content.id,
          correct: item.correct,
          size: item.content.size
        });
      }
    };


    function List(container, maxLength) {
      this.manager = new ViewManager();
      this.maxLength = maxLength;
      this.values = [];
      this.placeholder = undefined;
      this.container = container;

      this.el = DomHelper.createEl('ul', {
        className: 'pick-stack-list'
      });
      this.manager.trackUi(this.el);
    }
    List.prototype.display = function (options) {
      var display = {
        style: options.style,
        attachTo: this.container
      };
      DomHelper.modifyEl(this.el, display);
      options.className && DomHelper.addClass(this.el, options.className);
    };
    List.prototype.addValue = function (value) {
      value.detach();

      if (value.parent === this) {
        var index = this.values.indexOf(value);

        if (this.values[index + 1]) {
          DomHelper.insertBefore(value.el, this.values[index + 1].el);
        } else {
          this.el.appendChild(value.el);
        }
        return;
      }


      if (value.parent) {
        value.parent.removeValue(value);
      }
      value.parent = this;
      this.values.push(value);
      this.el.appendChild(value.el);
    };
    List.prototype.getOrderedAnswers = function (answers) {
      var i       = 0,
          ordered = [],
          answer;
      for (; i < answers.length; i++) {
        answer = answers[i];
        this.each(function (value) {
          if (value.content.id === answer.value) {
            ordered.push(value);
          }
        });
      }

      return ordered;
    };
    List.prototype.rearrangeByAnswers = function (answers) {
      var values  = this.values,
          i;
      var ordered = this.getOrderedAnswers(answers),
          length  = values.length;
      for (i = length - 1; i >= 0; i--) {
        this.removeValue(values[i]);
      }

      for (i = 0; i < ordered.length; i++) {
        this.addValue(ordered[i]);
        ordered[i].markStatus(true);
      }
    };
    List.prototype.removeValue = function (value) {
      this.values.splice(this.values.indexOf(value), 1);
      value.detach();
      value.parent = null;
    };
    List.prototype.remove = function () {
      this._destroySortable();
      this.manager.cleanUi();
    };
    List.prototype._destroySortable = function () {
      this.sortableInstance && this.sortableInstance.destroy();
      this.sortableInstance = null;
    };
    List.prototype.isFull = function () {
      return this.values.length === this.maxLength;
    };
    List.prototype.length = function () {
      return this.values.length;
    };
    List.prototype.reorderList = function () {
      var domList = this.el.querySelectorAll('li'),
          values  = this.values,
          sorted  = [], value;
      angular.forEach(domList, function (el) {
        for (var i = 0; i < values.length; i++) {
          value = values[i];
          if (el === value.el) {
            sorted.push(value);
            break;
          }
        }
      });
      this.values = sorted;
    };
    List.prototype.each = function (callback) {
      var result;
      for (var i = 0; i < this.values.length; i++) {
        result = callback(this.values[i]);
        if (result === false) {
          return;
        }
      }
    };
    List.prototype.disable = function () {
      this.each(function (value) {
        value.disable();
      });
      this._destroySortable();
      if (this.titleEl) {
        DomHelper.remove(this.titleEl);
      }
    };
    List.prototype.setTitle = function (title) {
      if (!title) {
        return;
      }

      var left  = this.el.style.left,
          right = this.el.style.right,
          borderWidth = parseInt(this.el.style.border, 10) || 0,
          style = {
            bottom: (parseInt(this.el.style.bottom, 10) + DomHelper.height(this.el) + styles.title.listMarginOffset) + (borderWidth * 2) + 'px',
            height: styles.title.height + 'px',
            width: styles.title.width + 'px',
            position: 'absolute',
            color: styles.title.color,
            fontWeight: styles.title.fontWeight,
            backgroundColor: styles.title.backgroundColor,
            fontSize: styles.title.fontSize + 'px'
          };
      if (left) {
        style.left = left;
      }
      if (right) {
        var border = styles.stackList.borderWidth * 2;
        style.width = (styles.title.width + border) + 'px';
        style.right = right;
      }

      var titleEl = this.titleEl = DomHelper.createEl('div', {
        style: style,
        html: title,
        attachTo: this.el.parentNode
      });
      Util.resizeText(titleEl, {maxFontSize: styles.title.fontSize, alignHoriz: true, alignVert: true});

      this.manager.trackUi(titleEl);
    };
    List.prototype.top = function () {
      return parseInt(this.titleEl ? this.titleEl.style.top : this.el.style.top, 10);
    };
    List.prototype.height = function () {
      return DomHelper.height(this.el);
    };
    List.prototype._enableSorting = function () {
      if (this.sortableInstance) {
        return;
      }

      this.sortableInstance = Sortable.create(this.el, {
        animation: 150,
        draggable: 'li'
      });
    };
    List.prototype.pickMode = function (type) {
      this._enableSorting();

      if (type === 'pick') {
        this.sortableInstance.option('group', {
          name: 'move',
          put: false,
          pull: true
        });
        this.sortableInstance.option('sort', false);
      } else {
        this.sortableInstance.option('group', {
          name: 'move',
          put: true,
          pull: false
        });
      }
    };
    List.prototype.stackMode = function (type) {
      var view = this;

      view._enableSorting();
      if (type === 'pick') {
        view.disable();
      } else {
        view.isSorting = true;
        DomHelper.addClass(view.el, 'sort-mode');

        view.sortableInstance.option('group', {
          put: false,
          pull: false
        });
        view.sortableInstance.option('onEnd', function (e) {
          view.manager.playSound(juice.sounds.snapTo);
          view.reorderList();
        });

        view.each(function (value) {
          value.resizeContent();
        });
      }
    };
    List.prototype.highlight = function (toggle) {
      if (toggle) {
        DomHelper.addClass(this.el, 'hvr-ripple-out');
        DomHelper.addClass(this.el, 'pick-stack');
      } else {
        DomHelper.removeClass(this.el, 'hvr-ripple-out');
        DomHelper.removeClass(this.el, 'pick-stack');
      }
    };
    List.prototype.valueByDom = function (el) {
      var returnValue;
      this.each(function (value) {
        if (value.el === el) {
          returnValue = value;
          return false;
        }
      });
      return returnValue;
    };
    List.prototype.clearStatus = function (keepCorrect) {
      this.each(function (value) {
        if (keepCorrect && value.markedCorrect()) {
          return;
        }

        value.markStatus(null);
      });
    };
    List.prototype.stopWigglingByDom = function (el) {
      var val = this.valueByDom(el);
      val.stopWiggling();
    };
    List.prototype.toggleHelperText = function () {
      var helperEl = this.el.querySelector('.drag-helper-msg');
      if (!helperEl) {
        helperEl = DomHelper.createEl('div', {
          className: 'drag-helper-msg',
          attachTo: this.el,
          html: 'Build your stack here.',
          style: {
            textAlign: 'center'
          }
        });

        this.manager.trackUi(helperEl);
      }

      var hasClass = this.el.className.indexOf('drag-helper') !== -1;
      DomHelper[hasClass ? 'removeClass' : 'addClass'](this.el, 'drag-helper');
    };
    List.prototype.getIncorrect = function () {
      for (var i = 0; i < this.values.length; i++) {
        var value = this.values[i];
        if (value.correct != undefined && !value.correct) {
          return value;
        }
      }
      return null;
    };






    function Value(container, content) {
      this.manager = new ViewManager();
      this.container = container;
      this.content = content;
      this.el = DomHelper.createEl('li', {});
      this.manager.trackUi(this.el);
    }
    Value.prototype.display = function (opts) {
      var sizeModifier,
          size = this.content.size;

      if (size === 'medium') {
        sizeModifier = styles.listValue.HEIGHT_NORMAL;
      } else if (size === 'large') {
        sizeModifier = styles.listValue.HEIGHT_LARGE;
      } else if (size === 'med-large') {
	    sizeModifier = styles.listValue.HEIGHT_MEDIUM_LARGE;
	  } else {
        sizeModifier = styles.listValue.HEIGHT_SMALL;
      }

      DomHelper.modifyEl(this.el, {
        attachTo: this.container,
        className: 'pick-stack-value',
        html: '<div class="content">' + ((this.content && this.content.content) || '') + '</div>' + '<span class="sortable-handle"></span>',
        style: {
          border: '1px solid black',
          height: styles.listValue.height + sizeModifier + 'px',
          width: styles.listValue.width + 'px',
          backgroundColor: styles.pickValue.backgroundColor,
          fontSize: opts.fontSize
        }
      });

      DomHelper.createEl('span', {
        attachTo: this.el,
        className: 'cross-out'
      });
    };
    Value.prototype.remove = function () {
      this.manager.cleanUi();
    };
    Value.prototype.resizeContent = function () {
      var contentEl = this.el.querySelector('.content'),
          isSorting = this.parent.isSorting;
      DomHelper.modifyEl(contentEl, {
        style: {
          width: (isSorting ? styles.sortableListValue.width : styles.listValue.width) + 'px',
          height: (isSorting ? styles.sortableListValue.height : styles.listValue.height) + 'px',
          paddingLeft: '3px',
          paddingTop: '2px',
          paddingRight: '3px'
        }
      });
      //Util.resizeText(contentEl, {maxFontSize: styles.listValue.fontSize});
    };
    Value.prototype.detach = function () {
      if (this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    };
    Value.prototype.disable = function () {
      this.el.className += ' disabled';
    };
    Value.prototype.markStatus = function (isCorrect) {
      if (isCorrect === null) {
        this.el.style.backgroundColor = 'white';
        this.el.style.color = 'black';
        this.correct = null;

        DomHelper.removeClass(this.el, ['incorrect', 'correct']);
      } else {
        this.el.style.backgroundColor = isCorrect ? 'green' : 'orange';
        this.el.style.color = 'white';
        this.correct = isCorrect;

        DomHelper.addClass(this.el, isCorrect ? 'correct' : 'incorrect');
        DomHelper.removeClass(this.el, isCorrect ? 'incorrect' : 'correct');
      }
    };
    Value.prototype.hasStatus = function () {
      return this.correct != null;
    };
    Value.prototype.markedCorrect = function () {
      return this.el.style.backgroundColor === 'green';;
    };
    Value.prototype.wiggleFor = function (milliseconds) {
      var el = this.el;
      Util.timeout(function () {
        Util.animationEnd(el, function () {
          el.className = el.className.replace(' wiggle', '');
        });
        el.className += ' wiggle animated';
      }, milliseconds);
    };
    Value.prototype.stopWiggling = function () {
      this.el.className = this.el.className.replace(' wiggle', '');
    };





    ViewManager.validate(View.prototype);
    return View;
  }
})();
