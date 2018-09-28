angular.module('guided_practice_widget.directives',[]);


angular.module('guided_practice_widget.directives').directive('juLabels', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juExamples', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juArchDaughter', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juSmallExamples', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juNormal', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juCktitle', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juDoubleSpace', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.removeAttr("style");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juPowertip', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.attr("role", "none");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juSummary', function() {
  return {
      restrict: 'C',
	  replace: false,
	  link: function(scope, elem, attrs) {
          elem.attr("role", "none");
      }
  }
});

angular.module('guided_practice_widget.directives').directive('juGreencheckph', function () {
    return {
        restrict: 'AC',
        template: "<span class='fa fa-check-circle fa-lg ju-greencheck' aria-label='Correct'> </span><span class='screen-reader-only'>&nbsp;,&nbsp;</span>"
    }
});

angular.module('guided_practice_widget.directives').directive('juOrangetimesph', function () {
    return {
        restrict: 'AC',
        template: "<span class='fa fa-times-circle fa-lg ju-orangetimes' aria-label='Incorrect'> </span><span class='screen-reader-only'>&nbsp;,&nbsp;</span>"
    }
});

angular.module('guided_practice_widget.directives').directive('juBlank', function () {
    return {
        restrict: 'AC',
        template: "<span aria-hidden = 'true'>________</span><span class='screen-reader-only'>,&nbsp;blank&nbsp;,</span>",
        link: function(scope, elem, attrs) {
          elem.removeAttr("style");
        }
    }
});

//
//*** Progress Dots directive 
//
angular.module('guided_practice_widget.directives').directive('juDots', function() {
  return {
      restrict: 'E',
	  replace: true,
      scope: true,
	  controller: ['$scope', function($scope) {

      }],
      template:'<div ng-repeat="dot in lclData.progressDots.dots track by $index" class="ju-dot" ng-class="{\'ju-dot-on\':dot==1, \'ju-dot-off\':dot==0, \'ju-dot-current\':dot==2&&dot!=3, \'ju-dot-last\':dot==3 }"><div ng-show=dot==3 class="ju-dot ju-dot-last-inner"></div></div>',
      link: function(scope, elem, attrs) {

      }
  }
});

//
//*** Internal hyperlink directive 
//
angular.module('guided_practice_widget.directives').directive('juLink', function() {
  return {
      restrict: 'E',
	  replace: true,
      scope: true,
	  transclude: true,
	  controller: ['$scope', '$timeout', function($scope, $timeout) {
        // internal hyperlink
		$scope.gotoStep = function() {
           $scope.expandAll();
		   var headerOffset, isPreviewMode;
		   $('#widget-wrapper')[0] ? isPreviewMode = false : isPreviewMode = true;
           isPreviewMode ? headerOffset = 0 : headerOffset = 105; 
		   if (window.innerWidth < 701) headerOffset = 0;  //for mobile mode
           $timeout(function() {$('html, body').animate({scrollTop: $("#step_"+($scope.linkStep-1)).offset().top - headerOffset}, 500);
		   $("#step_"+($scope.linkStep-1)+"_hdr").focus();}, 300);
		     
		}
      }],
      template:'<span ng-click="gotoStep()" role="link"><span ng-transclude class="ju-link"></span><img style="padding-left:4px" src="/images/go_arrow.png" alt=" &nbsp;,&nbsp; in page"/></span>',
      link: function(scope, elem, attrs) {
         scope.linkStep = attrs.linkstep;
      }
  }
});




//
//*** Multiple Choice / Multi-select directive
//
angular.module('guided_practice_widget.directives').directive('juMc', [juMc]);

function juMc() {
  return {
      restrict: 'AC',
      replace: false,
	  scope: true,
      controller: ['$scope', '$window', '$rootScope', function($scope, $window, $rootScope) {
      

      function arrayShuffle(array) {
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
      }

         $scope.shuffle = function(id) {
            var shuffledArray = [1,2,3,4,5];
			var tempArray = [];
            var noChoices = $scope.lclData.inputData[id].noOfChoices;
			for (var i=0; i<noChoices ; i++){
               if (!$scope.lclData.inputData[id].choices[i].fixed){
                  tempArray.push(i+1);
               }
			}
			if (tempArray.length > 1) {
               tempArray = arrayShuffle(tempArray);
			    j = 0;
			    for (var i=0; i < noChoices ; i++){
                  if (!$scope.lclData.inputData[id].choices[i].fixed) {
                    shuffledArray[i] = tempArray[j];
				    j = j+1;
                  }
			    }
			}
			return shuffledArray;
		 }
		 

         $scope.checkAnswer = function(stepNo) {			  
			  var answerObject = $scope.answerIsCorrect($scope.answer, $scope.answersMS);
			  if (!$scope.showCheckAnswer(stepNo)) return;  //to prevent checking answer if Correct image is displayed for FillIn  
			  if (!$scope.hasLeftInput(stepNo) )  {
				  $('#row_' + stepNo + '_feedback').focus(); //set focus on feedback--for screen reader
			  } else {
                  setTimeout(function() {$('#row_' + stepNo + '_feedbackscrdr').focus()}, 100); //set focus on screen-reader-only feedback
			  }
			  //reset More Info settings;
			  $scope.lclData.moreInfo = ""
              $scope.lclData.showMoreInfo = false;
			  
              var answer = $scope.answer;
			  var answersMS = $scope.answersMS;
			  if (answerObject.answered) {
 			    if (!$scope.unlimitedTries) $scope.setNoOfTries(stepNo, $scope.id);				 
              }
			  $scope.hideImageFI = true;
			  //timeout + scope.apply needed to update image position
              setTimeout(function(){ 
				              var el = document.getElementById($scope.id+"_answer");
							  $scope.hideImageFI = false;
							  $scope.$apply();
							  //console.log("in SetTimeout", el.getBoundingClientRect().width);
                }, 100);

		   $scope.maxTries(stepNo, $scope.id);
           
		   //build correct answers array for MS type
		   var correctMS = [false, false, false, false, false];
            if ($scope.getDisplayType() == "MS"){
			    for (i=0; i<5 ;i++ ){
                   if ($scope.lclData.inputData[$scope.id].choices[i].correct)  correctMS[i] = true;
			    }
            }

          if (answerObject.correct  || $scope.alwaysCorrect){
			  //setTimeout(function(){$('#row_' + stepNo + '_next').focus()}, 1000); //set focus on next arrow--for screen reader
			  $scope.lclData.inputs[stepNo][$scope.id]["correct"] = true;
			  $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"] = true;
			  $scope.elemIsDisabled = true;
			  $scope.lclData.feedbackText = $scope.lclData.inputData[$scope.id].correctFeedback;
			  var prefix = $scope.getPrefix($scope.correctFeedbackPrefixes);
              if (!$scope.lclData.feedbackText){
                 $scope.lclData.feedbackText = "You answered correctly";
              }
			  $scope.lclData.feedbackText = prefix + $scope.lclData.feedbackText;
			  $scope.setCorrectActiveFeedbackDisplayStep(stepNo);
			  //set correct answer for Fill Ins, and disable focus and aria on Check Answer
			  if ($scope.getDisplayType() == "FI") {
				  $scope.answer =  $scope.shuffledIndexes[$scope.lclData.inputData[$scope.id].correct]-1;
				  var checkAnswerImg = $('#' + $scope.id ).parent().find('img');
				  checkAnswerImg.attr('tabindex', '-1');
				  setTimeout(function() {checkAnswerImg.attr('aria-hidden', 'true')}, 150);
              }
			  if ($scope.alwaysCorrect) {
				  // check correct answer
				  if ($scope.getDisplayType() == "MC"){ 
				     var rb = document.getElementById($scope.id+'_choice'+($scope.lclData.inputData[$scope.id].correct+1));
				     rb.checked = true;
                  }
				  if ($scope.getDisplayType() == "MS"){ 
					   var rb = [];
					   for (var i=0; i<$scope.lclData.inputData[$scope.id].noOfChoices ;i++ ){
				           rb[i] = document.getElementById($scope.id+'_choice_ms'+(i+1));
						   if (correctMS[i]) {$scope.answersMS[i] = true} else {$scope.answersMS[i] = false}
						   //console.log(rb[i].id, rb[i].checked);
					   }
                  }
			  }

          } else {
			  $scope.lclData.inputs[stepNo][$scope.id]["correct"] = false;			  
			  if ($scope.maxTries(stepNo, $scope.id)) {  // if last try...
				  $scope.setMoreInfo($scope.getMoreInfo());
				  $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"] = true;
				  $scope.elemIsDisabled = true;
				  var incFeedback = answerObject.incFeedback;
				  if (!incFeedback){ 
				      incFeedback = $scope.lclData.inputData[$scope.id].incorrectFeedback;
                  }
				  if (!incFeedback) incFeedback = "";  
			      $scope.lclData.feedbackText = "Oops, you didn't get this one right. "+ incFeedback + " We're showing you the correct answer. ";
				  // check correct answer
				  if ($scope.getDisplayType() == "MC"){ 
					  rb = document.getElementById($scope.id+'_choice'+($scope.lclData.inputData[$scope.id].correct+1));
				      rb.checked = true;
                  } else if ($scope.getDisplayType() == "MS"){ 
					  var rb = [];
					  for (var i=0; i<$scope.lclData.inputData[$scope.id].noOfChoices ;i++ ){
				           rb[i] = document.getElementById($scope.id+'_choice_ms'+(i+1));
						   if (correctMS[i]) {$scope.answersMS[i] = true} else {$scope.answersMS[i] = false}
						   //console.log(rb[i].id, rb[i].checked);
					   }
				  } else {
				      $scope.answer =  $scope.shuffledIndexes[$scope.lclData.inputData[$scope.id].correct]-1;
                  }
		      } else {  //if not last try...
				  var prefix = $scope.getPrefix($scope.incorrectFeedbackPrefixes);
				  $scope.lclData.feedbackText = "";
			      if(answerObject.answered) $scope.lclData.feedbackText = answerObject.incFeedback;;
			      if (!$scope.lclData.feedbackText){ 
				      $scope.lclData.feedbackText = $scope.lclData.inputData[$scope.id].incorrectFeedback;
                  }
                  if (!$scope.lclData.feedbackText){
                     $scope.lclData.feedbackText = "Your answer is not correct";
                  }
				  $scope.lclData.feedbackText = prefix + $scope.lclData.feedbackText + " Please try again.";
			  }
			  if (answerObject.answered) {
				  $scope.setIncorrectActiveFeedbackDisplayStep(stepNo);
              } else {
                  $scope.lclData.feedbackText = "Please select or enter an answer.";
				  $scope.setIncorrectActiveFeedbackDisplayStep(stepNo);
			  }
              
		  }	
          

          /*if ($scope.getDisplayType() == "FI") {
               setTimeout(function() {MathJax.Hub.Queue(["Typeset",MathJax.Hub], [function(id, style, value){$("#"+id).css(style, value); $("#"+id).find('*').css(style, value);}, $scope.answerIdFI, "backgroundColor", "blue"]);}); 
          }*/
		  
		  //data logging
		     //data logging
             if ($scope.getDisplayType() != "MS") {
				var answerText = "";
                if ($scope.lclData.inputData[$scope.id].choices[answer]) answerText = $scope.lclData.inputData[$scope.id].choices[answer].text;
				$scope.questionRecord.tries.push({correct: answerObject.correct, answer: answer, answer_text: answerText, feedback:  $scope.lclData.feedbackText});
			 } else {
                var correctData = [];
			    var answerData = [];
				var answerText = [];
			    for (var k=0; k < $scope.lclData.inputData[$scope.id].noOfChoices ;k++ ){
                    correctData.push(answerObject.answerIsCorrect[k]); 
					if (answerObject.answersMS[k]) {
						answerData.push(k);
						answerText.push($scope.lclData.inputData[$scope.id].choices[k].text);
                    }
			    }
                 $scope.questionRecord.tries.push({correct: correctData, answer: answerData, answer_text: answerText, feedback:  $scope.lclData.feedbackText});
			 }
             if ($scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"]) {
				// console.log("QUESTION LOGGING", $scope.questionRecord);
				 $scope.dataRecord.steps[stepNo].questions.push($scope.questionRecord);
             }
		  //

         }

         $scope.buildCorrectMS = function(id) {
             var correct = "";
			 for (var i=0; i<5 ;i++ ){
                if ($scope.lclData.inputData[id].choices[i].correct)  correct = correct + " " + (i+1);
			 }
			 return correct
		 }
         
		 $scope.answerIsCorrect = function(answer, answersMS) {  
			 var answerObject = {};
			 var typeIsMS = $scope.getDisplayType() == "MS";
			 if (typeIsMS){
                answerObject.answersMS = answersMS.slice();
                answerObject.answered = true;
				if (answersMS[0]==0 && answersMS[1]==0 && answersMS[2]==0 && answersMS[3]==0 && answersMS[4]==0) answerObject.answered = false;	                
				//build correct answers array for MS type
		        var correctMS = [false, false, false, false, false];
			    for (var i=0; i<5 ;i++ ){
                   if ($scope.lclData.inputData[$scope.id].choices[i].correct)  correctMS[i] = true;
			    }
				answerObject.answerIsCorrect = [true, true, true, true, true];
				answerObject.correct = true;
				for (var i=0; i<$scope.lclData.inputData[$scope.id].noOfChoices ;i++ ){
				    if (correctMS[i] != answersMS[i]) {
						answerObject.correct = false;
						answerObject.answerIsCorrect[i] = false;
                    }
			    }
				
				//Incorret feedback selection
				var allCorrectAnswersIncluded = true;
				var allAnswersCorrect = true;
				var noAnswerCorrect = true;
				for (var i=0; i<$scope.lclData.inputData[$scope.id].noOfChoices ;i++ ){
				    if (correctMS[i] && !answersMS[i]) allCorrectAnswersIncluded = false;
					if (answersMS[i] && !correctMS[i]) allAnswersCorrect = false;
					if (correctMS[i] && answersMS[i]) noAnswerCorrect = false;
			    }
                answerObject.incFeedback = "";
				if (allCorrectAnswersIncluded)  answerObject.incFeedback = $scope.lclData.inputData[$scope.id].incorrectFeedback_allCorrPlusInc;
				if (!allCorrectAnswersIncluded && allAnswersCorrect)  answerObject.incFeedback = $scope.lclData.inputData[$scope.id].incorrectFeedback_not_complete;
				if (!allCorrectAnswersIncluded && !allAnswersCorrect)  answerObject.incFeedback = $scope.lclData.inputData[$scope.id].incorrectFeedback_missCorrPlusInc;
				if (noAnswerCorrect)  answerObject.incFeedback = $scope.lclData.inputData[$scope.id].incorrectFeedback_allIncorrect;
			 } else {  //if type is MC or FI
                answerObject.answer= answer;
                answerObject.answered = answer || answer == 0;
				answerObject.correct = answer == $scope.lclData.inputData[$scope.id].correct;
                answerObject.incFeedback = answer || answer==0 ? $scope.lclData.inputData[$scope.id].choices[answer].incFeedback : "";
			 }
			 return answerObject;
         }


         $scope.showCheckAnswer = function(stepNo) {
            if (!$scope.maxTries(stepNo, $scope.id) && !$scope.lclData.inputs[stepNo][$scope.id]["correct"]){
               return true;
            } else {
			   return false;
			}			
		 }

		 $scope.showCorrect = function(stepNo) {
            if (!$scope.overMaxTries(stepNo, $scope.id) && $scope.lclData.inputs[stepNo][$scope.id]["correct"]){
				$scope.imageFI = "correct_check.png";
               return true;
            } else {
			   return false;
			}			
		 }

		 $scope.isDisabled = function(stepNo) {
            var disabled = $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"];
            return disabled;
		 }

		 $scope.getMoreInfo = function() {
			var info = "";
			$scope.lclData.moreInfo = "";
            info = $scope.lclData.inputData[$scope.id].moreInfo;
			//console.log("info = ", info);
			if (info) info = info.trim();
            return info
		 } 

         $scope.toggleDropUp = function(event) {
            var dropdownContainer = event.currentTarget;
            var position = dropdownContainer.getBoundingClientRect().top;
            var buttonHeight = dropdownContainer.getBoundingClientRect().height;        
            var dropdownMenu = $(dropdownContainer).find('.dropdown-menu');
			var index = 0;
			if ($scope.fiSelectedIndex >= 0) index = $scope.fiSelectedIndex;
			setTimeout(function() {$('#' + $scope.id + '_' + index).focus()}, 150);
			//$('#' + $scope.id + '_0').focus();
            var menuHeight = dropdownMenu.outerHeight();  
            var $win = $(window);
            //alert('Position: ' + position + '. MenuHeight: ' )           
            if (position < menuHeight) {
              $scope.dropUp = false;
            }
            else {
              $scope.dropUp = true;
            }
		 }


		angular.element($window).bind('resize', function () {
           console.log('resized');
		   $rootScope.$digest();
		}); 
		

      
		  
		
      }],  
      templateUrl: '/widgets/guided_practice_widget/mc_template.html'+hashAppend,
	  link: function(scope, elem, attrs) {
         var id = attrs.juMc;
		 var rightpanelRight, elementLeft, elementWidth, answerWidth = 0, answerOffsetVert = "-3px";
		 //console.log("feedbackReviewFlag", scope.feedbackReviewFlag);
		 scope.id = id;
		 scope.answerIdFI = id + "_answer";
		 scope.hideImageFI = false;
		 scope.imageFI = "check_arrow.png";
		 scope.answersMS = [0,0,0,0,0,];
		 scope.elemIsDisabled = false;
		 scope.stylesFISubmit = {position:"absolute", bottom:"0px", left:"0px" };
		 scope.feedbackReviewFlag ? scope.shuffledIndexes = [1,2,3,4,5] : scope.shuffledIndexes = scope.shuffle(id);
		 //scope.shuffledChoices = [1,2,3,4,5];
		 scope.shuffledChoices = [];
		 for (var i=1; i<5 ; i++){
			 if (i <= scope.lclData.inputData[id].noOfChoices) scope.shuffledChoices.push(i);  //updated later...
		 }
		 scope.fiSelectedItemText = "<span class='caret'></span>&nbsp; Click to select &nbsp;&nbsp;&nbsp;&nbsp;";
		 scope.selectedNodeIndex = 0;
		 scope.fiSelectedIndex = -1;
		 elem.removeAttr("style");
		 //console.log("XXXXXXXXX", elem[0].getBoundingClientRect());
		 scope.isTouchMode = window.USER_IS_TOUCHING;


         scope.showChoice = function(index) {
            if (scope.shuffledIndexes[index] <= scope.lclData.inputData[id].noOfChoices){
				return true;
            } else {
                return false;
			}
		 }

           
		 scope.msKeyDown = function(e, index) {			  
			  if (e.keyCode == 40) {
			    if(index < scope.lclData.inputData[id].noOfChoices - 1) {
					$('#' + id  + '_choice_ms' + scope.shuffledIndexes[index+1]).focus();
					e.preventDefault();
                    e.stopPropagation();
                }
			  }			  
			  if (e.keyCode == 38){
                if(index > 0) {
					$('#' + id  + '_choice_ms' + scope.shuffledIndexes[index-1]).focus();
					e.preventDefault();
                    e.stopPropagation();
				}
			  }
			  if (e.keyCode == 9){
			    	$('#' + id  + '_checkanswer').focus();
					e.preventDefault();
                    e.stopPropagation();
			  }
			  if (e.keyCode == 13){ //NVDA captures Enter key before we can get to it!
			    	//setTimeout(function() {$('#' + id  + '_checkanswer').click()}, 0);  //test for auto-check on Enter
					setTimeout(function() {$('#' + id  + '_choice_ms' + scope.shuffledIndexes[index]).click()}, 0);
					e.preventDefault();
                    e.stopPropagation();
			  }			  
		 }
         
		  scope.fiKeyDown = function(e, index) {
			  e.preventDefault();
              e.stopPropagation();
			  if (e.keyCode == 40) {
			    if(index < scope.lclData.inputData[id].noOfChoices - 1) {
					$('#' + id  + '_' + (index+1)).focus();
				    scope.fiItemSelected(index+1);
                }
			  }			  
			  if (e.keyCode == 38){
                if(index > 0) {
					$('#' + id  + '_' + (index-1)).focus();
				    scope.fiItemSelected(index-1);
				}
			  }
			  
			  if (e.keyCode == 13){ 
                scope.fiItemSelected(index);
				setTimeout(function() {$('#' + id + '_' + index).click()}, 0);
                setTimeout(function() {$('#' + id ).parent().find('button')[0].focus();}, 0);    
			  }  
		 }

		 

		 scope.fiItemSelected = function(index) {
            scope.fiSelectedIndex = index;
			scope.fiSelectedItemText = "<span class='caret'></span>&nbsp;&nbsp;" + scope.shuffledChoices[index];
			scope.answer = scope.shuffledIndexes[index]-1;
		 }

		 scope.getDisplayType = function()  {
            if (scope.lclData.inputData[id].displayType && scope.lclData.inputData[id].displayType == "FI") {
               return "FI";
			} else if (scope.lclData.inputData[id].displayType && scope.lclData.inputData[id].displayType == "MS"){
               return "MS";
			} else {
			   return "MC";
			}
         }

		 for (i=0; i<scope.lclData.inputData[id].noOfChoices ;i++ ){ //map shuffled content -- was 5
			 //scope.shuffledChoices[i] = "<div>" + scope.lclData.inputData[id].choices[scope.shuffledIndexes[i]-1].text + "</div>";  //PM! 10/20/2017
			 scope.shuffledChoices[i] = scope.lclData.inputData[id].choices[scope.shuffledIndexes[i]-1].text;
			 if (scope.getDisplayType() == "FI") scope.shuffledChoices[i] = scope.lclData.inputData[id].choices[scope.shuffledIndexes[i]-1].text;
		 }


		// $window.onResize = function(){scope.$apply()};

         //get coordinates of Fill In element
		 scope.getElementDimensions = function () {
            return {'w':elem[0].getBoundingClientRect().width, 'l':elem[0].getBoundingClientRect().left };
         };

         scope.$watch(scope.getElementDimensions, function (newValue, oldValue) {
			  elementLeft = newValue.l;
			  elementWidth = newValue.w;
			  scope.imageOffset = rightpanelRight - elementLeft + 0; //was 5
			  scope.stylesFISubmit.left= scope.imageOffset + "px";
			  if (scope.elemIsDisabled) scope.stylesFISubmit.bottom = answerOffsetVert;
         }, true);


		 //get coordinates of right panel
		 scope.getPanelDimensions = function () {		
		   var el = document.getElementById("rightpanel");
		   if (el) {
		   	 var obj = {'w':el.getBoundingClientRect().width, 'r':el.getBoundingClientRect().right };
             return obj;
		   } 
         };


         scope.$watchCollection(scope.getPanelDimensions, function (newValue, oldValue, scope) {
			  if (newValue) {
			    rightpanelRight =  newValue.r;
				rightpanelWidth =  newValue.w;
			    scope.imageOffset = rightpanelRight - elementLeft + 0; //was 5
			    scope.stylesFISubmit.left= scope.imageOffset + "px";
			    if (scope.elemIsDisabled) scope.stylesFISubmit.bottom = answerOffsetVert;
			  }
         }); 

/*		 angular.element($(window)).bind('resize', function () {
            //console.log($(window).innerWidth());
			rightpanelRight =  scope.getPanelDimensions.r;
			elementLeft = scope.getElementDimensions.l;
			//elementWidth = scope.getElementDimensions.w;
			scope.imageOffset = rightpanelRight - elementLeft + 0; //was 5
            scope.stylesFISubmit.left= scope.imageOffset + "px";
			if (scope.elemIsDisabled) scope.stylesFISubmit.bottom = answerOffsetVert;
          });*/

		 //structure for data logging
         scope.questionRecord = {id: id, type: scope.getDisplayType(), tries: []};
		 //


	  }
  };

};








//
//*** Short Answer directive
//
angular.module('guided_practice_widget.directives').directive('juSa', function() {
  return {
      restrict: 'AC',
      replace: false,
	  scope: true,
	  transclude: true,
      controller: ['$scope', '$document', function($scope, $document) {
         $scope.checkAnswer = function(stepNo) {
			 //needed to update image position
              setTimeout(function(){ 
							  $scope.$apply();
                }, 100);
			  if (!$scope.hasLeftInput(stepNo) )  {
				  $('#row_' + stepNo + '_feedback').focus(); //set focus on feedback--for screen reader
			  } else {
                  setTimeout(function() {$('#row_' + stepNo + '_feedbackscrdr').focus()}, 100); //set focus on screen-reader-only feedback
			  }
			  //reset More Info settings;
			  $scope.lclData.moreInfo = ""
              $scope.lclData.showMoreInfo = false;
			  $scope.answerRule = {"inputType": $scope.lclData.inputData[$scope.id].inputType, "rule": $scope.lclData.inputData[$scope.id].answerRule, "caseSensitive": $scope.lclData.inputData[$scope.id].caseSensitive, "ignoreSpaces": $scope.lclData.inputData[$scope.id].ignoreSpaces};
              var answer = ["", "", "", "", ""];
              for (i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
					var el = document.getElementById($scope.id+"_"+i);
					answer[i] = el.value;
			  }
              //console.log("answer", answer);
			  if (answer[0].length > 0 || answer[1].length > 0 || answer[2].length > 0|| answer[3].length > 0 || answer[4].length > 0) {  
			    if (!$scope.unlimitedTries) $scope.setNoOfTries(stepNo, $scope.id);				 
              }
			  $scope.maxTries(stepNo, $scope.id);
              var answerObject = $scope.answerIsCorrect(answer);
			  if (answerObject.correct) {  //answer is correct
				  //console.log('correct!');
				  //setTimeout(function(){$('#row_' + stepNo + '_next').focus()}, 1000); //set focus on next arrow--for screen reader
			      $scope.lclData.inputs[stepNo][$scope.id]["correct"] = true;
			      $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"] = true;
				  var prefix = $scope.getPrefix($scope.correctFeedbackPrefixes);
		          $scope.lclData.feedbackText = $scope.lclData.inputData[$scope.id].correctFeedback;
		          if (!$scope.lclData.feedbackText){
                     $scope.lclData.feedbackText = "You answered correctly";
                  } 
		          $scope.lclData.feedbackText = prefix + $scope.lclData.feedbackText;
		          $scope.setCorrectActiveFeedbackDisplayStep(stepNo);
				  if ($scope.alwaysCorrect) {
				   for (i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
					   var el = document.getElementById($scope.id+"_"+i);
					   $scope.lclData.inputData[$scope.id].correct ? el.setAttribute("value", $scope.lclData.inputData[$scope.id].correct[0][i]) : el.setAttribute("value", $scope.lclData.inputData[$scope.id].inputs[i].correct);
					   $scope.lclData.inputData[$scope.id].correct ? el.value = $scope.lclData.inputData[$scope.id].correct[0][i] : el.value = $scope.lclData.inputData[$scope.id].inputs[i].correct;
                   }
			     }

 			  } else {   //answer is incorrect
                  //console.log('incorrect');
				  $scope.lclData.inputs[stepNo][$scope.id]["correct"] = false;
				  if ($scope.maxTries(stepNo, $scope.id)) {  // if last try...
				     $scope.setMoreInfo($scope.getMoreInfo());
				     $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"] = true;
			         $scope.lclData.feedbackText = "Oops, you didn't get this one right. We're showing you the correct answer. ";
				     // display correct answer
				     for (i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
					   var k = answerObject.closestAnswer;
					   var el = document.getElementById($scope.id+"_"+i);
					   if (!answerObject.correctAnswers[i]){
					     $scope.lclData.inputData[$scope.id].correct ? el.setAttribute("value", $scope.lclData.inputData[$scope.id].correct[k][i]) : el.setAttribute("value", $scope.lclData.inputData[$scope.id].inputs[i].correct);
					     $scope.lclData.inputData[$scope.id].correct ? el.value = $scope.lclData.inputData[$scope.id].correct[k][i] : el.value = $scope.lclData.inputData[$scope.id].inputs[i].correct;
                       }
                     }
			      } else {  //if not last try...
                      var prefix = $scope.getPrefix($scope.incorrectFeedbackPrefixes);
			          //$scope.lclData.feedbackText = $scope.lclData.inputData[$scope.id].choices[answer].incFeedback;
					  $scope.lclData.feedbackText = "";
                      $scope.lclData.feedbackText = $scope.getSpecificIncorrectFeedback(answer);
			          if (!$scope.lclData.feedbackText){ 
				          $scope.lclData.feedbackText = $scope.lclData.inputData[$scope.id].incorrectFeedback;
                      }
                      if (!$scope.lclData.feedbackText){
                         $scope.lclData.feedbackText = "Your answer is not correct";
                      }
				      $scope.lclData.feedbackText = prefix + $scope.lclData.feedbackText + " Please try again.";   
				 }				  
				 if (answer[0].length > 0 || answer[1].length > 0 || answer[2].length > 0|| answer[3].length > 0 || answer[4].length > 0) {
					  $scope.setIncorrectActiveFeedbackDisplayStep(stepNo);
                 } else {
                      $scope.lclData.feedbackText = "Please select or enter an answer.";
				      $scope.setIncorrectActiveFeedbackDisplayStep(stepNo);
				 }

		    } 
			
			//data logging
			 var correctData = [];
			 var answerData = [];
			 for (k=0; k < $scope.lclData.inputData[$scope.id].noOfInputs ;k++ ){
                    correctData.push(answerObject.correctAnswers[k]); 
					answerData.push(answer[k]);
			 }
             $scope.questionRecord.tries.push({correct: correctData, answer: answerData, feedback:  $scope.lclData.feedbackText});
             if ($scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"]) {
				 //console.log("QUESTION LOGGING", $scope.questionRecord);
				 $scope.dataRecord.steps[stepNo].questions.push($scope.questionRecord);
             }
		    //
        }

         function hasSimilarForm(answer, correctAnswer) {
             var operators = ["+", "*", "-", "/"];
			 var opCounts = function(op, exp) {
			       var arr = exp.match(new RegExp("\\"+op, "g"));
				   var lt;
				   arr ? lt = arr.length : lt = 0;
				   return lt;
			   }
			 var answerCounts = operators.map(function(op){return opCounts(op, answer)});
			 var correctAnswerCounts = operators.map(function(op){return opCounts(op, correctAnswer)});
			 var isSimilar = true;
			 //console.log('counts', answerCounts, correctAnswerCounts );
			 for (var i = 0; i<operators.length ;i++ ) {
				 if (answerCounts[i] != correctAnswerCounts[i]) isSimilar = false;
				 //console.log(isSimilar); 
			 }
			 return isSimilar;
		 }

		 function individualAnswerCheck(answer, correctAnswer, answerRule) {
			 answer = answer.trim();
			 var correct = true;
			 if (!answerRule.inputType) answerRule.inputType = "text";
			 switch (answerRule.inputType) {
			 case 'text':
				 if (answerRule.ignoreSpaces) {
				    answer = answer.replace(/ /g, "");
					correctAnswer = correctAnswer.replace(/ /g, "");
				 }
				 if (!answerRule.caseSensitive) {
				    answer = answer.toLowerCase();
					correctAnswer = correctAnswer.toLowerCase();
				 }
				 if (answer != correctAnswer) correct = false;
			     return correct;
             case 'numeric':
				if (!answerRule.rule) answerRule.rule = "Similar Form";
			    answer = answer.replace(/ /g, "");
				correctAnswer = correctAnswer.replace(/ /g, "");
			    switch (answerRule.rule) {
			    case "Exact Answer":					
					if (answer != correctAnswer) correct = false;
			        return correct;
				case "Any Equivalent Answer":
                  try {
					if (eval(answer) != eval(correctAnswer))  correct = false;  //TO DO--need to increase robustness
                  }
                  catch (err) {  // if invalid format, try comparing as text
                    if (answer != correctAnswer) correct = false;
                  }
				return correct;
				case "Similar Form":
				  try {
					if (eval(answer) != eval(correctAnswer))  correct = false;  //TO DO--need to increase robustness
                  }
                  catch (err) {// if invalid format, try comparing as text
                    if (answer != correctAnswer) correct = false;
					return correct;
                  }
                    if (eval(answer) != eval(correctAnswer)) {
					  correct = false;  //TO DO--need to increase robustness
					  return correct;
				    } else {
                       //console.log('hasSimilarForm',hasSimilarForm(answer, correctAnswer));
                      if (!hasSimilarForm(answer, correctAnswer)) correct = false;
					  return correct;
				    }
			    }
			 }	
			 return correct;
		 } 


         $scope.answerIsCorrect = function(answer) {  
			 var answerObject = {};
			 answerObject.errorDistance = 1000;
			 var correctAnswersNo = $scope.lclData.inputData[$scope.id].correct.length;
			 var j;
			 for (j=0; j<correctAnswersNo ;j++ ){
			     var correct = true;
				 var errorDistance = 0;
				 var bestAnswerIndex = -1;
				 var correctAnswers = [false, false, false, false, false];
			     for (var i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
					correctAnswers[i] = true;
                    if (!individualAnswerCheck(answer[i], $scope.lclData.inputData[$scope.id].correct[j][i], $scope.answerRule ) && !$scope.alwaysCorrect) {
					   //console.log(answer[i], $scope.lclData.inputData[$scope.id].correct[j][i]);
                       correct = false;
					   correctAnswers[i] = false;
					   errorDistance = errorDistance + 1;
                    }
			     }
				 if (errorDistance < answerObject.errorDistance) {					 
				     answerObject.errorDistance = errorDistance;
					 answerObject.closestAnswer = j;
					 answerObject.correctAnswers = correctAnswers;
                 }
				 if (correct) break;
             }
			 answerObject.correct = correct;
			 return answerObject;
		 }

         

		 $scope.getSpecificIncorrectFeedback = function(answer) {
			 var feedback = "";
			 if ($scope.lclData.inputData[$scope.id].specificIncFeedback) {
				 var lt = $scope.lclData.inputData[$scope.id].specificIncFeedback.length;
				 if (lt > 0 && $scope.lclData.inputData[$scope.id].specificIncFeedback[0].length == 0 ) {  //to fix transient screw-up in the authoring tool...
                      $scope.lclData.inputData[$scope.id].specificIncFeedback.shift();
					  lt = lt -1;
				 }
				 if (lt > 0) {
					 //handle generic ~Incorrect case
					 var isGeneric = [];
					 for (j = 0; j < lt ; j++){
						 var match = [true, true, true, true, true];
						 isGeneric.push(false);
						 for (i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
							 if ($scope.lclData.inputData[$scope.id].specificIncFeedback[j][i]) {
                               if ($scope.lclData.inputData[$scope.id].specificIncFeedback[j][i].trim()[0] == "~") isGeneric[j] = true;  
							 }  
                         }
						 if (isGeneric[j]) {
                            for (i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
							  if ($scope.lclData.inputData[$scope.id].specificIncFeedback[j][i])
                                 match[i] = individualAnswerCheck(answer[i], $scope.lclData.inputData[$scope.id].specificIncFeedback[j][i], $scope.answerRule); 
							     if ($scope.lclData.inputData[$scope.id].specificIncFeedback[j][i].trim() == "~Incorrect") {
                                    var corAnswers  = $scope.answerIsCorrect(answer).correctAnswers;
									match[i] = !corAnswers[i];
							     }
							}   
                            if (match[0] && match[1] &&match[2] && match[3] && match[4]) feedback = $scope.lclData.inputData[$scope.id].specificIncFeedback[j][5]; 
						 }
						 
                     }
					 //console.log("isGeneric", isGeneric);
					 //handle specific feedback
					 for (j = 0; j < lt ; j++){
                       if (!isGeneric[j]) {
						 var match = [true, true, true, true, true];
						 for (var i=0;i<$scope.lclData.inputData[$scope.id].noOfInputs ;i++ ) {
							 if ($scope.lclData.inputData[$scope.id].specificIncFeedback[j][i])
                                 match[i] = individualAnswerCheck(answer[i], $scope.lclData.inputData[$scope.id].specificIncFeedback[j][i], $scope.answerRule); 
                         }
						 if (match[0] && match[1] &&match[2] && match[3] && match[4]) feedback = $scope.lclData.inputData[$scope.id].specificIncFeedback[j][5];
                       } 
                     }
				 }
			 }
             return feedback;
		 }


         $scope.showCheckAnswer = function(stepNo) {
            if (!$scope.maxTries(stepNo, $scope.id) && !$scope.lclData.inputs[stepNo][$scope.id]["correct"]){
               return true;
            } else {
			   return false;
			}			
		 }

		 $scope.showCorrect = function(stepNo) {
            if (!$scope.overMaxTries(stepNo, $scope.id) && $scope.lclData.inputs[stepNo][$scope.id]["correct"]){
               return true;
            } else {
			   return false;
			}			
		 }

		 $scope.isDisabled = function(stepNo) {
            return $scope.lclData.inputs[stepNo][$scope.id]["inputCompleted"];
		 }

		 $scope.getMoreInfo = function() {
			var info = "";
			$scope.lclData.moreInfo = "";
            info = $scope.lclData.inputData[$scope.id].moreInfo;
			//console.log("info = ", info);
			if (info) info = info.trim();
            return info
		 } 

         $scope.lastField = function(fieldId, id) {
            if (fieldId.slice(-1) == $scope.lclData.inputData[id].noOfInputs-1) {  
				return true;
		    } else {
                return false;
		    }
		 }

		 $scope.getInputSize = function() {
            return $scope.lclData.inputData[$scope.id].inputs[$scope.fieldId.slice(-1)].size;
		 }

		 $scope.buildCorrectSA = function(a){
			 var s = "";
			 var sep = "";
             for (i=0 ;i<5 ;i++ ){
				a[i] ? s = s + sep + a[i] : s=s;
				sep = " | ";
             }
			 return s;
		 }

		 $scope.buildFeedbackSA = function(a){
			 var s = "<i>";
			 var sep = "";
             for (i=0 ;i<5 ;i++ ){
				a[i] ? s = s + sep + a[i] : s=s;
				sep = " | ";
             }
			 s = s + "</i> : ";
			 s = s + a[5];
			 return s;
		 }

		 $scope.checkArrowOffset = function(stepNo) {
             var row = $("#row_" + stepNo);
			 var sa = $("#"+$scope.fieldId);
			 if (row && sa && row.offset() && sa.offset()){
				 return {'top': (sa.offset().top - row.offset().top - 9) + "px"};  //was -25
			 } else {
                 return {'top': '0px'};
			 }
		 }
 
      }],  
      templateUrl: '/widgets/guided_practice_widget/sa_template.html'+hashAppend,
	  link: function(scope, elem, attrs) {
         var id = attrs.juSa;
		 scope.fieldId = id;
		 //scope.value = "";
		 id = id.slice(0, id.length-2);
		 scope.id = id;
		 scope.hideImageSA = false;
		 scope.inputWidthStyle = {width: scope.getInputSize()};
		 elem.removeAttr("style");
		 //console.log("input width",scope.inputWidthStyle );

		 //structure for data logging
         scope.questionRecord = {id: id, type: "Short Answer", tries: []};
		 //

	  }
  };

});