/* global angular, createjs, juice, $, Draggabilly, Sortable */
(function () {
  'use strict';
  
  var MODULE        = 'perfect_word',
  perfectWord = angular.module(MODULE);
  perfectWord.factory('PerfectWordView', ['Log', 'Util', 'ViewManager', 'DomHelper', ViewFactory]);

  function ViewFactory(Log, Util, ViewManager, DomHelper) {
    var viewGbl, answersChecked, choicesLocation = {};
	//var dropBackColor = 'rgba(255, 255, 255, .0)';
    var styles = {
      instructions: {
        top: 50,
        marginRight: 10,
        marginLeft: 10,
        padding: 5
      },
      prompt: {
        marginLeft: 20,
        //***position: 'absolute',
        left: '20',
        right: '20',
        margin: '0 auto',
		color: '#59595B', //***
        fontSize: 20
      },
	  text: {
        marginLeft: 20,
        //***position: 'absolute',
        left: '20',
        right: '20',
        margin: '0 auto',
        fontSize: 22,
        color: '#222222',
        answerBlankBackColor: '#F0F0F0',
        dropBackColNormal: 'rgb(230, 230, 255)',  // background color of distractors
	    dropBackColNormalReview: 'rgb(230,230,230)' ,
		dropBackColCorrect: 'rgb(210,230,220)',  //greenish
		dropBackColIncorrect: '#FFA500',  //orangish
		dropActiveBackColor: 'rgb(179, 179, 255)'//background color of drop zone when active 
      },
	  distractor: {
        marginLeftRight: 90,
        //***position: 'absolute',
        left: '20',
        right: '20',
        margin: '0 auto',
        fontSize: 22,
        color: '#222222',
		backgroundColor: 'rgba(247, 245, 241, 0.5)',  //background color of distractors containers
        fontFamily: 'Verdana',
        cloneBackColor: 'blue' ,
        cloneDropBackColor: 'rgb(230, 230, 255)' //background color of cloned item on active drop zone.
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
        height: 50,
        fontSize: 18,
        border: '1px solid black'
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
      Log.log(MODULE, 'inside `perfect_word` view constructor');

      this.game = game;
	  this.domEls = [];
      this.popovers = [];
      this.containerEl = DomHelper.createEl('div', {
        attachTo: containerEl
      });
      this.$container = $(this.containerEl);
	  containerEl = this.$container;

	  this.manager = new ViewManager(); //???

      this.domEls.push(this.containerEl);
	  viewGbl = this;

  
    }


	View.prototype.registerEvents = function () {
       var $containerEl = $(this.containerEl), dragTargetEl, cloneEl, x0Drag, y0Drag, dxDrag, dyDrag, dropElementsArr = [], dropActiveEl, animationInProgress, prevAd = [];
	   //viewGbl = this;
	   //viewGbl.answerList = {};
	   viewGbl.invanswerList = {};
       
	   //
	   // returns the "active" drop target element (dragging in progress and mouse pointer over drop target) 
       var activeDrop = function(x, y) {
          var ret;
		  clearActiveDrops();
		  dropActiveEl = null;
          dropElementsArr.forEach(function(item) {
			 var rect = item.rect;
             if (y>rect.top-2 && y<rect.bottom+10 && x>rect.left-25 && x<rect.right+25) {
				ret = item;
             }
		  });
		  dropActiveEl = ret;
          return ret;
       }

	   var clearActiveDrops = function() {
		   prevAd.forEach(function (ad) {
              ad.el.style.backgroundColor = styles.text.answerBlankBackColor;
		   });
		   prevAd = [];

	   }

       this.viewOver = function(e) {
		  //viewGbl.dismissPopups();
		  if (!viewGbl.game.startingState){  //disable in review mode
		    var target = $(e.target).closest('.dragit')[0];
		    DomHelper.setStyleDeep(target, 'backgroundColor', styles.distractor.cloneBackColor);
		    DomHelper.setStyleDeep(target, 'color', 'white');  
          }
      }

	  this.viewOverAgain = function(e) {
		  //viewGbl.dismissPopups();
		  if (!viewGbl.game.startingState){  //disable in review mode
		    var target = $(e.target).closest('.dragit-again')[0];
		    DomHelper.setStyleDeep(target, 'backgroundColor', styles.distractor.cloneBackColor);
		    DomHelper.setStyleDeep(target, 'color', 'white'); 
          }
      }

	   this.viewLeave = function(e) {
          if (!viewGbl.game.startingState){  //disable in review mode
		     var target = $(e.target).closest('.dragit')[0];
		     DomHelper.setStyleDeep(target, 'backgroundColor', getDropBackColNormal());
		     DomHelper.setStyleDeep(target, 'color',  styles.distractor.color);
          }
      } 

	  this.viewLeaveAgain = function(e) {
		  if (!viewGbl.game.startingState){  //disable in review mode
		     var target = $(e.target).closest('.dragit-again')[0];
		     DomHelper.setStyleDeep(target, 'backgroundColor', getDropBackColor(target.id));
		     DomHelper.setStyleDeep(target, 'color',  styles.distractor.color);
          }
      }
  

	  this.viewDown = function(e) {
         if (!viewGbl.game.startingState){  //disable in review mode
			 viewGbl.dismissPopups();
			 e.stopPropagation();
			 e.preventDefault();
			 var target = $(e.target).closest('.dragit')[0];
			 var rect = target.getBoundingClientRect();
			 var inst = viewGbl.instructionsEl[0];
			 var rectInstructions = inst.getBoundingClientRect();
			 var dragClone = target.cloneNode(true);
			 dragClone.style.position = 'absolute';
			 dragClone.style.left = (rect.left-rectInstructions.left + styles.instructions.marginLeft)+'px';
			 dragClone.style.top = (rect.top-rectInstructions.top + viewGbl._positionFor('instructions'))+'px';
			 choicesLocation[target.id] = {top: dragClone.style.top, left: dragClone.style.left};
			 dragClone.style.backgroundColor = styles.distractor.cloneBackColor;
			 dragClone.style.fontSize = viewGbl.text_font_size; //styles.distractor.fontSize + 'px';
			 dragClone.style.fontFamily = styles.distractor.fontFamily;
			 dragClone.style.zIndex = 1000;
			 DomHelper.removeClass(dragClone, 'dragit');
			 DomHelper.addClass(dragClone, 'dragclone');
			 $containerEl.append(dragClone);		 
			 $(target).css('visibility', 'hidden');
			 $(target).find('*').css('visibility', 'inherit');
			 dragTargetEl = target;
			 cloneEl = dragClone;
			 x0Drag = e.clientX;
			 y0Drag = e.clientY;
			 dxDrag = (rect.left-rectInstructions.left + styles.instructions.marginLeft) - x0Drag;
			 dyDrag = (rect.top-rectInstructions.top + viewGbl._positionFor('instructions')) - y0Drag;
			 //
			 // build array of drop elements in text, with bounding rectangle; 
			 dropActiveEl = null;
			 dropElementsArr = [];
			 $(viewGbl.textEl).find(".drop-target").each(function(ind) {
				dropElementsArr.push({el: this, rect:this.getBoundingClientRect()});
			 });
		 }
      }

	  this.viewDownAgain = function(e) {
         if (!viewGbl.game.startingState){  //disable in review mode
			 viewGbl.dismissPopups();
			 e.stopPropagation();
			 e.preventDefault();
			 var target = $(e.target).closest('.dragit-again')[0];
			 var rect = target.getBoundingClientRect();
			 var inst = viewGbl.instructionsEl[0];
			 var rectInstructions = inst.getBoundingClientRect();
			 var dragNode = target;
			 dragNode.style.position = 'absolute';
			 dragNode.style.left = (rect.left-rectInstructions.left + styles.instructions.marginLeft)+'px';
			 dragNode.style.top = (rect.top-rectInstructions.top + viewGbl._positionFor('instructions'))+'px';
			 //dragNode.style.backgroundColor = styles.distractor.cloneBackColor;
			 DomHelper.setStyleDeep(target, 'backgroundColor', styles.distractor.cloneBackColor);
			 DomHelper.setStyleDeep(target, 'color', 'white');
			 dragNode.style.fontSize = viewGbl.text_font_size; //styles.distractor.fontSize + 'px';
			 dragNode.style.fontFamily = styles.distractor.fontFamily;
			 dragNode.style.zIndex = 1000;
			 DomHelper.removeClass(dragNode, 'dragit-again');
			 DomHelper.addClass(dragNode, 'dragclone');
			 $containerEl.append(dragNode);
			 dragTargetEl = target;
			 cloneEl = dragNode;
			 x0Drag = e.clientX;
			 y0Drag = e.clientY;
			 dxDrag = (rect.left-rectInstructions.left + styles.instructions.marginLeft) - x0Drag;
			 dyDrag = (rect.top-rectInstructions.top + viewGbl._positionFor('instructions')) - y0Drag;
			 //
			 //show empty taget area
			 viewGbl.invanswerList[target.id].style.display = '';
			 viewGbl.answerList[viewGbl.invanswerList[target.id].id].answer = "";
			 viewGbl.invanswerList[target.id] = "";
			 //
			 // build array of drop elements in text, with bounding rectangle; 
			 dropActiveEl = null;
			 dropElementsArr = [];
			 $(viewGbl.textEl).find(".drop-target").each(function(ind) {
				dropElementsArr.push({el: this, rect:this.getBoundingClientRect()});
				//console.log(this.getBoundingClientRect());
			 });
		 }
	  }


	  this.viewUp = function(e) {
		 var playWoosh = function(target) {
			// logic to play sound when choice flies back to word bank 
			//play sound only if choice has been dragged by more than a min. value
			var inst = viewGbl.instructionsEl[0];
			var rectInstructions = inst.getBoundingClientRect();
			var rect = target.getBoundingClientRect();
			var left = rect.left-rectInstructions.left + styles.instructions.marginLeft;
			var top = rect.top-rectInstructions.top + viewGbl._positionFor('instructions');
			var dx = Math.abs(left - parseInt(choicesLocation[target.id].left));
			var dy = Math.abs(top - parseInt(choicesLocation[target.id].top));
			if (dx + dy > 75) viewGbl.playSound('arrow');  
			clearActiveDrops();
		 }

		 var target = $(e.target).closest('.dragclone')[0];
		 var id = target.id;
		 if (!dropActiveEl) {
			animationInProgress = true;
			playWoosh(target);
			//setTimeout(function(){DomHelper.remove(target); }, 1000);
			target.style.transition = 'left 0.12s, top 0.12s';
			target.style.transitionTimingFunction = 'ease-in';
			target.style.top =  choicesLocation[target.id].top;
			target.style.left = choicesLocation[target.id].left;
		    setTimeout(function() {DomHelper.remove(target); document.getElementById(id).style.visibility = 'visible'; animationInProgress = false}, 120);
            dragTargetEl = null;
		 } else {  // dropping!
			viewGbl.playSound('snapTo');
			DomHelper.setStyleDeep(target, 'backgroundColor', getDropBackColNormal());
			DomHelper.setStyleDeep(target, 'color', styles.distractor.color);
			target.style.position = 'static';
			target.style.textDecoration = "underline";
			DomHelper.insertBefore(target, dropActiveEl.el);
			DomHelper.removeClass(target, 'dragclone');
            DomHelper.addClass(target, 'dragit-again');
			dropActiveEl.el.style.display = "none";
			cloneEl = null;
			viewGbl.answerList[dropActiveEl.el.id].answer =  target;
			viewGbl.answerList[dropActiveEl.el.id].checkedFlag =  false;
			viewGbl.invanswerList[target.id] =  dropActiveEl.el;
			dropActiveEl = null;			
         }        
		 $(document.body).css('cursor','default');
      } 

	 this.viewUpDoc = function(e) {       //catch-all--should never be called.
         if (cloneEl && !animationInProgress && !dropActiveEl) {
			 //+++DomHelper.remove(cloneEl);
			 setTimeout(function(){if (cloneEl) DomHelper.remove(cloneEl);}, 120);
		     setTimeout(function() {if (dragTargetEl) dragTargetEl.style.visibility = 'visible'; }, 120);
			 setTimeout(function(){cloneEl = null; dragTargetEl = null;}, 120);           
         }
      } 

	  this.viewMove = function(e) {
         if (cloneEl && !animationInProgress) {
			  var xDrag = e.clientX;
		      var yDrag = e.clientY;
              cloneEl.style.left = xDrag + dxDrag + 'px';
			  cloneEl.style.top = yDrag + dyDrag + 'px';
			  e.stopPropagation();
              e.preventDefault();
			  var ad = activeDrop(e.pageX, e.pageY);
              if(ad) {
				 cloneEl.style.backgroundColor = styles.distractor.cloneDropBackColor;
				 $(cloneEl).find('*').css('backgroundColor', styles.distractor.cloneDropBackColor);
				 DomHelper.setStyleDeep(cloneEl, 'color',  styles.distractor.color);
				 ad.el.style.backgroundColor = styles.text.dropActiveBackColor;
				 prevAd.push(ad);
              } else {
                 cloneEl.style.backgroundColor = styles.distractor.cloneBackColor;
				  $(cloneEl).find('*').css('backgroundColor', styles.distractor.cloneBackColor);
				  DomHelper.setStyleDeep(cloneEl, 'color',  'white');
				  if (prevAd) {
					clearActiveDrops();
				  }
			  }
			  
         }
      }


	  $(document.body).on("mouseover", ".dragit", this.viewOver);
	  $(document.body).on("mouseleave", ".dragit", this.viewLeave);
	  $(document.body).on("mousedown", ".dragit", this.viewDown);
	  $(document.body).on("mouseup", ".dragclone", this.viewUp);
	  $(document.body).on("mouseup", this.viewUpDoc);
      $(document.body).on("mousemove", this.viewMove);
	  $(document.body).on("mousedown", ".dragit-again", this.viewDownAgain);
	  $(document.body).on("mouseover", ".dragit-again", this.viewOverAgain);
	  $(document.body).on("mouseleave", ".dragit-again", this.viewLeaveAgain);
	}
      
    function getDropBackColor(tagId) {
	var isCorrect  = viewGbl.answerList[viewGbl.invanswerList[tagId].id].isCorrect;
	var checked  = viewGbl.answerList[viewGbl.invanswerList[tagId].id].checkedFlag;
	   var col = getDropBackColNormal();
	   if (viewGbl.answersChecked && checked) {
         isCorrect ? col = styles.text.dropBackColCorrect : col = styles.text.dropBackColIncorrect;
	   }
       return col;
	}

	function getDropBackColNormal() {
		var color;
        viewGbl.game.startingState ? color = styles.text.dropBackColNormalReview : color = styles.text.dropBackColNormal;
		return color;
    }
	
	View.prototype.updateFields = function() {
		DomHelper.setStyleDeep($(".dragit"), "backgroundColor", getDropBackColNormal()); 
		$(".corranswer").each( function(el) {
			    DomHelper.setStyleDeep($(this), 'backgroundColor',  styles.text.dropBackColCorrect);
        });
		$(".incorrect").each( function(el) {
			    DomHelper.setStyleDeep($(this), 'backgroundColor',  styles.text.dropBackColIncorrect);
				DomHelper.setStyleDeep($(this),"text-decoration", "line-through" );
		});
	}

	View.prototype.displayCorrect = function() {
		 viewGbl.dismissPopups();
		 viewGbl.answersChecked = true;
         $.each(viewGbl.answerList, function(key, item) {
			item.checkedFlag = false;
            if (!item.answer) {
              DomHelper.setStyleDeep($("#"+key), 'backgroundColor', styles.text.dropBackColIncorrect);  // answer blanks
            } else {
			  item.checkedFlag = true;
              DomHelper.setStyleDeep(item.answer, 'backgroundColor', getDropBackColor(item.answer.id));			
			  if (item.isCorrect) {  //hide answer field and show correct answer one--static
                 $("#"+item.answer.id).css("display", "none");
				 $("#"+key+"_correct").css("display", "");
				 DomHelper.setStyleDeep($("#"+key+"_correct"), 'backgroundColor',  styles.text.dropBackColCorrect);
			  } else {
                 //$("#"+item.answer.id).css("text-decoration", "line-through");
				 DomHelper.setStyleDeep($("#"+item.answer.id),"text-decoration", "line-through" );
			  }
		    }
	       });
	}

	View.prototype.displayAnswers = function() {
		 viewGbl.dismissPopups();
         $(".dragit-again").css("display", "none");
		 $(".drop-target").css("display", "none");
		 $(".corranswer").css("display", "");
		 $(".corranswer").each( function(el) {
			 DomHelper.setStyleDeep($(this), 'backgroundColor',  styles.text.dropBackColCorrect);
         });
		 $(".answer").css("visibility", "hidden");
		 $(".distractor").css("visibility", "visible");
	}

	View.prototype.clearAnswers = function() {
		viewGbl.dismissPopups();
		viewGbl.answersChecked = false;
         $.each(viewGbl.answerList, function(key, item) {
            if (!item.answer) {
              $("#"+key).css('backgroundColor', styles.text.answerBlankBackColor);  // answer blanks
			  item.checkedFlag = false;
            } else if (!item.isCorrect) {  
              DomHelper.remove(item.answer);    //remove answer
			  item.checkedFlag = false;
              $("#"+key).css("display", "");  //show answerblank
			  $("#"+key).css("background-color", styles.text.answerBlankBackColor);  //show answerblank
			   $("#"+item.answer.id).css("visibility", "visible");   //show choice in word bank
			   item.answer = null;
			} 
		 });
	}

    View.prototype.displayInstructions = function (content) {
      var $instructions = this.instructionsEl  = $('<div class="noselect"></div>').append(Util.newLineHtml(content.instructions)).addClass('text-piece fm-instructions').css({
        top: this._positionFor('instructions') + 'px',
        position: 'absolute',
        textAlign: content.instructions_align || 'center',
        color: 'rgb(13, 36, 246)',
        fontSize: (content.instructions_font_size ||'20') + 'px',
        fontFamily: 'Verdana',
        margin: 'auto',
        right: '0',
        left: '0',
        marginLeft: styles.instructions.marginLeft + 'px',
        marginRight: styles.instructions.marginRight + 'px',
        padding: '5px'
      });
	  $(this.containerEl).append($instructions);
	  this.manager.trackUi($instructions);
    };

    View.prototype.displayPrompt = function (content) {
       var promptImgAlign = styles.prompt.margin;
       if (content.instructions_img && content.prompt && content.prompt.align == "left") {
		   promptImgAlign = "0px";
       } 
       var instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
          maxHeight          = styles.game.height - instructionsHeight - styles.title.height - styles.offsets.promptTop - 5,
          //*** promptEl           = DomHelper.createEl(content.instructions_img ? 'img' : 'div', {
		  promptEl           = DomHelper.createEl('div', { //***
            style: {
              maxHeight: maxHeight + 'px',
              //***top: (instructionsHeight + styles.instructions.top + styles.offsets.promptTop) + 'px',
              //***position: styles.prompt.position,
              left: styles.prompt.left + 'px',
              right: styles.prompt.right + 'px',
              margin: promptImgAlign,
              fontSize: styles.prompt.fontSize + 'px',
              color: styles.prompt.color, //***
			  marginRight: '10px', //***
              paddingTop: '20px' //***
            },
            attachTo: this.containerEl
          });

      this.promptEl = promptEl;
      if (content.instructions_img) {
		promptEl.innerHTML = "<img src='data:image/png;base64, " + content.instructions_img +  "'>" //***
		promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center'; //***
        //*** promptEl.src = 'data:image/png;base64, ' + content.instructions_img;
      } else {
        promptEl.innerHTML = content.prompt && content.prompt.content ? content.prompt.content : '';
		if ((!content.prompt || !content.prompt.content) && !content.instructions_img){ //***
			promptEl.style.paddingTop = '0px';
		}
        promptEl.style.textAlign = content.prompt ? content.prompt.align || 'center' : 'center';
        if (promptEl.style.textAlign === 'left') {
          promptEl.style.marginLeft = styles.prompt.marginLeft + 'px';
        }
      }
       
      $(this.instructionsEl).append(promptEl); //***
      this.manager.trackUi(promptEl);
    };


     View.prototype.displayText = function (text, content) {
       var instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
		  promptHeight = DomHelper.height(this.promptEl) + 10,
          maxHeight          = styles.game.height - instructionsHeight - promptHeight - styles.title.height - styles.offsets.promptTop - 5,
          textEl           = DomHelper.createEl('div', {
            style: {
              maxHeight: maxHeight + 'px',
              //***top: (instructionsHeight + styles.instructions.top + 2 * styles.offsets.promptTop + promptHeight) + 'px',
              //***position: styles.text.position,
              left: styles.text.left + 'px',
			  right: styles.text.right + 'px',
			  color: styles.text.color,
              fontSize: (content.text_font_size  || styles.text.fontSize) + 'px',
			  fontFamily: 'Verdana',
			  marginRight: '10px', //***
              paddingTop: '20px'
            },
            attachTo: this.containerEl
          });
        viewGbl.text_font_size = (content.text_font_size  || styles.text.fontSize) + 'px';
        this.textEl = textEl;
		var textStr = "";
		this.answerList = {};
		if (text) { 
	     text.forEach(function(txt) {
          var style, drop;
          if (txt.id){
              style = txt.correct ? "display:none" : "text-decoration: underline; background-color:" + styles.text.answerBlankBackColor;
			  drop = txt.correct ? "corranswer" : "drop-target";
			  if (txt.correct) {
                 viewGbl.answerList[txt.id.split('_correct')[0]] = {answer:null, correctVal: txt.value.trim(), isCorrect: false, checkedFlag: false};
			  }
          }
          //var style = txt.id ? "text-decoration: underline" : "";
		  //var drop = txt.id ? "x-lvl-drop-target" : "";
           textStr = textStr + "<span id='" + txt.id + "'" + "style='" + style + "'" + "class='" + drop + "'>" + txt.value + "</span>"; 
	     });
        }
        textEl.innerHTML = textStr ? textStr : '';
        textEl.style.textAlign =  'left';
		textEl.style.marginLeft = styles.text.marginLeft + 'px';
       
	   //
		
		
		$(this.instructionsEl).append(textEl); //***
        this.manager.trackUi(textEl);
    };




	View.prototype.displayDistractors = function (distractors, content) {  //displays ALL choices, including Distractors!
       var view = this;
	   var punctuationList = ".,;:!?'\"";
       var instructionsHeight = DomHelper.height(this.instructionsEl) + 10,
		  promptHeight = DomHelper.height(this.promptEl) + 10,
		  textHeight = DomHelper.height(this.textEl) + 10,
          maxHeight          = styles.game.height - instructionsHeight - promptHeight - textHeight - styles.title.height - styles.offsets.promptTop - 5,
          distEl           = DomHelper.createEl('div', {
            style: {
			  color: styles.distractor.color,
			  //color: 'rgba(0, 0, 0, 0)',
              backgroundColor: styles.distractor.backgroundColor,
			  //backgroundColor: 'rgba(255, 255, 255, 0)',
              fontSize: (content.text_font_size || styles.distractor.fontSize) + 'px',
			  fontFamily: styles.distractor.fontFamily,
              padding: 10 + 'px',
			  marginTop: 50 + 'px',
			  lineHeight: '200%'
            },
            attachTo: this.containerEl
          });
        //distEl.innerHTML = content.distractors_content ? content.distractors_content : '';
		var distArr = [];
		var distStr = "";
		var drag = "draggable='true'";
		if (distractors) { 
	     distractors.forEach(function(dist) {
		   var distValue = dist.value.trim();	 
		   if (punctuationList.indexOf(distValue) >= 0) {   //make punctuation distractors "fat"
			   distValue = "&nbsp;" + distValue + "&nbsp;";
		   }	 
           distArr.push(distValue); 
		   var classAnswer;
		   dist.answer ? classAnswer = 'answer' : classAnswer = 'distractor';
		   distStr = distStr + "<span class='dragit noselect nobr " + classAnswer +"' style='cursor:move; background-color:" + getDropBackColNormal() +"' id='" + dist.id + "' "  + ">"  + distValue + "</span><span>&nbsp;&nbsp;&nbsp;</span> ";
	     });
       }

		distEl.innerHTML = distStr ? distStr : '';
		//fade in if NOT in review mode
		if (!viewGbl.game.startingState) {
		   distEl.style.transform = 'scale(0.2, 0.2)'
		   distEl.style.transition = 'all 1s ease-in-out',
		   setTimeout(function() {distEl.style.transform = 'scale(1.0, 1.0)';}, 0);
        }

        distEl.style.textAlign =  content.distractors_align || 'center';
		distEl.style.marginLeft = styles.distractor.marginLeftRight + 'px';
		distEl.style.marginRight = styles.distractor.marginLeftRight + 'px';
       
		//
		// Handle review Mode for Distractors
		var state = viewGbl.game.startingState;		
		if (state){
		   $(".dragit").css("cursor", "default");
           for (var i = 0; i<state[0].length ; i++ ){
			   if (state[0][i].targetId) {
                   $('#' + state[0][i].id).css('visibility', 'hidden');
			   }
           }
		}
		// end review mode

		// Handle review Mode for Text
		var state = viewGbl.game.startingState;		
		if (state){
           for (var i = 1; i<state.length ; i++ ){
			   if (state[i].choiceId) {
                   if (state[i].isCorrect){  // correct answer
					   DomHelper.setStyleDeep($("#"+state[i].targetId + "_correct"), 'display', ''); 
					   DomHelper.setStyleDeep($("#"+state[i].targetId + "_correct"), 'backgroundColor', styles.text.dropBackColCorrect);  
                       DomHelper.setStyleDeep($("#"+state[i].targetId), 'display', 'none');  
                   } else { // incorrect answer
					    var choice =  $('#' + state[i].choiceId);
				        var choiceClone = $('#' + state[i].choiceId)[0].cloneNode(true);
						var target = $("#"+state[i].targetId)[0];
						DomHelper.insertBefore(choiceClone, target);
						DomHelper.setStyleDeep($("#"+state[i].targetId), 'display', 'none');
						DomHelper.setStyleDeep(choiceClone, 'visibility', 'visible');
						DomHelper.removeClass(choiceClone, 'dragit');
						DomHelper.addClass(choiceClone, 'incorrect');
                        DomHelper.setStyleDeep(choiceClone, 'backgroundColor', styles.text.dropBackColIncorrect);
						DomHelper.setStyleDeep(choiceClone,"text-decoration", "line-through" );
				   }
			   } else {  // answer blanks 
                  DomHelper.setStyleDeep($("#"+state[i].targetId), 'backgroundColor', styles.text.dropBackColIncorrect);  
               }
           }
		}
		// end review mode

      $(this.instructionsEl).append(distEl); //***
      this.manager.trackUi(distEl);


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
        case 'answers':
          return $container.find('.dragger:last').position().top + 60;
        default:
          return '';
      }
    };

    View.prototype.displayChoices = function (content) {
      //Sortable
      //Draggable
    };

    View.prototype.afterMathJax = function () {
      //angular.forEach(this.choices, function (choice) {
      //  choice.recordUiState();
      //});
    };

    View.prototype.dismissPopups = function () {
      this.manager.dismissPopups();
    };

    View.prototype.reset = function () {
      this.manager.cleanUi();
      this.manager.dismissPopups();
	  $(document.body).off("mouseover", ".dragit", this.viewOver);
	  $(document.body).off("mouseleave", ".dragit", this.viewLeave);
	  $(document.body).off("mousedown", ".dragit", this.viewDown);
	  $(document.body).off("mouseup", ".dragclone", this.viewUp);
	  $(document.body).off("mouseup", this.viewUpDoc);
      $(document.body).off("mousemove", this.viewMove);
	   $(document.body).off("mousedown", ".dragit-again", this.viewDownAgain);
	  $(document.body).off("mouseover", ".dragit-again", this.viewOverAgain);
	  $(document.body).off("mouseleave", ".dragit-again", this.viewLeaveAgain);
    };
    View.prototype.transition = function () {

    };

    View.prototype.popup = function (options) {
	  options.className += ' game-popup no-arrow';
      options.remove = 'click';
      options.clickAnywhere = ('clickAnywhere' in options) ? options.clickAnywhere : true;
      return this.manager.popup.apply(this.manager, arguments);
    };
    View.prototype.playSound = function () {
      return this.manager.playSound.apply(this.manager, arguments);
    };
    View.prototype.showAnswers = function () {
      //
    };
    View.prototype.rewind = function () {
      //
    };

    View.prototype.objectState = function () {
      var obj = [viewGbl.game.choices];
      angular.forEach(viewGbl.answerList, function(item, key ){        
        obj.push(angular.extend({}, {targetId:key}, {checkedFlag:item.checkedFlag, isCorrect: item.isCorrect, choiceId:item.answer ? item.answer.id : null}));
		for (var i = 0; i<obj[0].length; i++){
			item.answer && (obj[0][i]['id'] == item.answer.id) ? obj[0][i].targetId = key : null;
		}
      });
	  return obj;
    };

    View.prototype.buildAnswerArray = function () {
      var choices = viewGbl.game.choices;
	  var obj = [];
      angular.forEach(viewGbl.answerList, function(item, key ){ 
        var content;
		for (var i = 0; i<choices.length; i++){
			item.answer && (choices[i]['id'] == item.answer.id) ? content = choices[i].value : content = '';
			if (content) break;
		}
        obj.push({id: key, content:content , feedback: '', correct: item.isCorrect}); 
      });
	  return obj;
    };
    
    return View;
  }
})();
