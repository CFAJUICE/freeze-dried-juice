/* global angular, createjs, juice, $, Sortable */
(function () {
  'use strict';

  var MODULE        = 'fix_it',
      moduleObject = angular.module(MODULE);
  moduleObject.factory('FixItView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

  function ViewFactory(Log, Util, ViewManager, DomHelper) {
    var viewGbl;

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
        height: 120,
        fontSize: 22,
        padding: '2px 0 2px 5px'
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
      title: {
        height: 40,
        width: 325,
        fontSize: 17,
        color: '#1645CD',
        listMarginOffset: 12,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, .5)'
      },

      text: {
        marginLeft: 20,
        //***position: 'absolute',
        left: '20',
        right: '20',
        margin: '0 auto',
        fontSize: 22,
        color: '#222222'
      },
      defaults: {
        fontSize: 16
      }
    };

    function View(game, containerEl) {
      Log.log(MODULE, 'inside '+MODULE+' view constructor');
      viewGbl = this;
      //add the css for the game
      var cssId = MODULE+'stylesheet';
      if (!document.getElementById(cssId))
      {
        var head  = document.getElementsByTagName('head')[0];
        var link  = document.createElement('link');
        link.id   = cssId;
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = '/widgets/'+MODULE+'_widget/'+MODULE+'_widget.css';
        link.media = 'all';
        head.appendChild(link);
      }

      this.game = game;
      this.containerEl = containerEl;
      this.manager = new ViewManager();
      this.choices = new Choices(this.containerEl);

      this.manager.trackUi(this.choices);
    }

    View.prototype.onSelect = function (callback) {
      this.choices.onSelect(callback);
    };

    View.prototype.updateMathJaxStyles = function(target){
      function doUpdate(target){
        var textDecoration = target.css('text-decoration');
        var backgroundColor = target.css('background-color');
        if(!target.hasClass('selected')){
          backgroundColor = 'initial';
        }
        DomHelper.setStyleDeep(target.find('.MathJax'), 'backgroundColor',  backgroundColor);
        DomHelper.setStyleDeep(target.find('.MathJax'),'text-decoration', textDecoration );
      }
      if(target){
        doUpdate(target);
      }else {
        $('.answer-choice').each(function () {
          doUpdate($(this));
        });
      }
    }

    View.prototype.displayInstructions = function (content) {
      var style        = styles.instructions,
          instructions = this.instructionsEl = DomHelper.createEl('div', {
            style: {
			  position: 'absolute', //!PM  first node must be absolutely positioned, otherwise, it is pushed back way below.
              color: this.manager.BLUE_TEXT,
              fontFamily: this.manager.FONT_FAMILY,
              fontSize: content.instructions_font_size ? content.instructions_font_size + 'px' : this.manager.INSTR_FONT_SIZE + 'px',
              top: style.top + 'px',
              textAlign: content.instructions.align || 'center',
              marginRight: style.marginRight + 'px',
              marginLeft: style.marginLeft + 'px',
              padding: style.padding + 'px'
            },
            className: MODULE+'instructions',
            html: (content.instructions && content.instructions.content) || '',
            attachTo: this.containerEl
          });
      $(this.containerEl).append(instructions);  //!PM needed to attach the instructions to the document
      this.manager.trackUi(instructions);
    };


    View.prototype.displayText = function (content, startingState) {
      var view = this;
      var instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
          promptHeight = DomHelper.height(this.promptEl) + 10,
          maxHeight          = styles.game.height - instructionsHeight - promptHeight - styles.title.height - styles.offsets.promptTop - 5,
          textEl           = DomHelper.createEl('div', {
            class: MODULE+'-problem-text',
            style: {
              maxHeight: maxHeight + 'px',
              //***top: (instructionsHeight + styles.instructions.top + 2 * styles.offsets.promptTop + promptHeight) + 'px',
              //***position: styles.text.position,
              left: styles.text.left + 'px',
              right: styles.text.right + 'px',
              color: styles.text.color,
              fontSize: content.problem_font_size ? content.problem_font_size + 'px' : styles.text.fontSize + 'px',
              fontFamily: 'Verdana',
              marginRight: '10px', //***
              paddingTop: '20px',
            },
            attachTo: this.containerEl
          });
      this.textEl = textEl;

      textEl.innerHTML = content.problem_display ? content.problem_display : '';
      textEl.style.textAlign =  'left';
      textEl.style.marginLeft = styles.text.marginLeft + 'px';
      var instructionsEl = $(this.instructionsEl);
      instructionsEl.append(textEl); //***
      instructionsEl.find('tooltip').click(function (event) {
        event.stopPropagation();
      });
      instructionsEl.find('.change-answer-textbox').keyup(function(){
        var el = $(this).parent().parent();
        var val = $(this).val();
        var set_inner = val;
        if(!val){
          set_inner = el.attr('data-original-answer');
        }
        set_inner = set_inner.trim();
        el.find('.inner-text').text(set_inner);
        updateIndividualAnswer(el);
      });

      instructionsEl.find('.ok-button').click(function(){
        var el = $(this).parent().parent();
        el.removeClass('selected');
      })

      instructionsEl.find('.answer-choice').click(function (event) {
        $('.answer-choice.selected').removeClass('selected')
        event.stopPropagation();
        if(!$(this).hasClass('unselectable')) {
          $(this).removeClass('show-correct-and-incorrect-selected');
          view.playSound('click');
          toggleTooltip($(this));
          $(this).find('tooltip').each(function(){
            var left = $(this).offset().left;
            var width = $(this).prop("scrollWidth");
            var screen_width = $(window).width();
            if(left < 0){
              $(this).offset({left:0})
            }
            if(left+width > screen_width){
              $(this).offset({left:screen_width - width});
            }
            console.log($(this).offset());
          })
          view.updateMathJaxStyles($(this));
        }
      });

      $('#game #canvas, .fix_itinstructions').click(function(){
        var el = instructionsEl.find('.selected').removeClass('selected');
        updateEdited(el);
      });

      function toggleTooltip(el){
        el.toggleClass('selected');
        if(el.hasClass('selected')){
          el.find('.change-answer-textbox').focus();
        }
        el.find('.original-answer').each(function(){
          $(this).parent().width($(this).width()+160);
        });
        updateEdited(el);
      }

      function updateEdited(){
        instructionsEl.find('.answer-choice').each(function(){
          var el = $(this);
          updateIndividualAnswer(el);
        });
      }

      function updateIndividualAnswer(el){
        if(!el.attr('data-original-answer')){
          return;// nothing to do here
        }

        if(el.attr('data-original-answer').trim() != el.find('.inner-text').text().trim()){
          el.addClass('edited');
        } else{
          el.removeClass('edited');
        }
      }

      if (!startingState) {
        textEl.style.transform = 'scale(0.2, 0.2)';
        textEl.style.transition = 'all 1s ease-in-out';
        setTimeout(function() {
              viewGbl.playSound('zoom');
              textEl.style.transform = 'scale(1.0, 1.0)';
            }, 0);

      }
      this.manager.trackUi(textEl);
    };



    View.prototype.displayPrompt = function (content) {
      var image = content.instructions ? content.instructions.img : undefined;
      var promptImgAlign = styles.prompt.margin;
      if (image && content.prompt && content.prompt.align == "left") {
        promptImgAlign = "0px";
      }
      var instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
          promptHeight = DomHelper.height(this.promptEl) + 10,
          maxHeight          = styles.game.height - instructionsHeight - promptHeight - styles.title.height - styles.offsets.promptTop - 5,
          promptEl           = DomHelper.createEl('div', {
            class: MODULE+'-problem-text',
            style: {
              maxHeight: maxHeight + 'px',
              //***top: (instructionsHeight + styles.instructions.top + 2 * styles.offsets.promptTop + promptHeight) + 'px',
              //***position: styles.text.position,
              left: styles.text.left + 'px',
              right: styles.text.right + 'px',
              fontSize: content.prompt_font_size ? content.prompt_font_size + 'px' :styles.text.fontSize + 'px',
              fontFamily: 'Verdana',
              marginRight: '10px', //***
              paddingTop: '20px',
              color: '#5B5E60',
              margin: promptImgAlign
            },
            attachTo: this.containerEl
          });
      this.promptEl = promptEl;
      promptEl.style.textAlign =  'left';
      promptEl.style.marginLeft = styles.text.marginLeft + 'px';
      if (image) {
        promptEl.innerHTML = "<img src='data:image/png;base64, " + image +  "'>" //***
        promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center'; //***

      } else { //no image
        promptEl.innerHTML = content.prompt ? content.prompt.content : '';
        promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center';
        if (promptEl.style.textAlign === 'left') {
          promptEl.style.marginLeft = styles.prompt.marginLeft + 'px';
        }
      }

      $(this.instructionsEl).append(promptEl); //***
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

      //this.choices.each(function (choice) {
      //  choice.el.querySelector('.bubble').style.height = (tallestText * 1.5) + 'px';
      //});
    };
    //View.prototype.resizeChoices = function () {
    //  var tallestText = -1,
    //      textHeight;
    //  this.choices.each(function (choice) {
    //    textHeight = choice.textHeight();
    //    if (textHeight > tallestText) {
    //      tallestText = textHeight;
    //    }
    //  });
    //  console.log('tallest text', tallestText, tallestText * 1.5);
    //  this.choices.each(function (choice) {
    //    choice.el.querySelector('.bubble').style.height = (tallestText * 2) + 'px';
    //  });
    //};

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

    View.prototype.clearAnswers = function(){
      viewGbl.dismissPopups();
      viewGbl.answersChecked = false;
      $('.answer-choice.incorrect-answer').addClass('edited').removeClass('incorrect-answer');
      console.log('cleared answers');
      /* $('.answer-choice').each(function(){
        console.log('hello');
        //$(this).find('.inner-text').text($(this).attr('data-original-answer'));
      })
      */
      viewGbl.updateMathJaxStyles();
    };

    View.prototype.dismissPopups = function () {
      this.manager.dismissPopups();
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
      var answers = this.getAnswers();
      var state = answers;
     /*     state  = [];
      this.choices.each(function (choice) {
        state.push({
          id: choice.content.id,
          content: choice.content.content,
          isAnswer: answer === choice
        });
      });
      */
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
      function onSelectFunction(value) {
        choices.choose(value);
        choices.onSelectCallback(value);
      }
      for (var i = 0; i < this.choices.length; i++) {
        this.choices[i].onSelect(onSelectFunction);
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
        fontSize: options.fontSize
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
      if ((!this.choices)||(!this.choices.length)) {
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

      DomHelper.modifyEl(this.el, {
        style: style
      });

      var speech = this.speechStyle === 'bubble',
          bubble = DomHelper.createEl('div', {
            className: 'bubble' + (speech ? ' speech' : ''),
            attachTo: this.el,
            html: this.content.content,
            style: {
              width: (styles.choice.width - styles.diffs.bubbleWidth) + 'px',
              height: styles.speechBubble.height + 'px',
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
