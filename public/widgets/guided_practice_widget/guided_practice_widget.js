angular.module('guided_practice_widget', ['angularWidget', "ngAnimate", "ngSanitize", "angular-bind-html-compile", "ui.bootstrap", "guided_practice_widget.directives", "ngAria"]);

angular.module('guided_practice_widget').controller("guidedPracticeCtl",["$window", "$scope", "interactiveData", "$timeout", "$animate", "$location", "$anchorScroll", "audio", "$sce", "$modal", "widgetNavigation",
	function($window, $scope, interactiveData, $timeout, $animate, $location, $anchorScroll, audio, $sce, $modal, widgetNavigation) {  //interactiveData factory shared from modulette!
   //data logging
   $scope.dataRecord = {"startedAt": new Date()};
   var steps = [];
   $scope.dataRecord["steps"] = steps;
   //
   var scrollStepNo = 0;
   //console.log('feedbackReviewFlag', interactiveData.feedbackReviewFlag);
   $scope.feedbackReviewFlag = interactiveData.feedbackReviewFlag == 'true';

  /* gotoBottom = function() {
     $timeout(function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('bottom');
        // call $anchorScroll()
        $anchorScroll();
     }, 10)
   }; */
   

// Expand All image click action
   var expandAll = function() {
      for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
         $scope.lclData.steps[i].settings.showStep = true; 
		 $scope.lclData["delayRight"+i] = true;
		 $scope.lclData.steps[i].settings.showNext = false;
		 $scope.lclData.steps[i].settings.showNextAccess = false; //structure for accesibility
	  }
	  for (var i=0; i < $scope.lclData.progressDots.dots.length; i++ ){
		  $scope.lclData.progressDots.dots[i] = 1;
	  }
	  $scope.lclData.lastRefresherStep = true;
	  $scope.lclData.progressDots.dots[$scope.lclData.progressDots.dots.length - 1] = 3;
	  $scope.lclData.showRFB = true;
   }


   gotoBottom = function(stepNo) {
     $timeout(function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('bottom');
		var h = 0;
		if (!(scrollStepNo > $scope.lclData.steps.length -1)) h = $("#bottom").offset().top - $('#step_'+scrollStepNo).offset().top; //if not last step... was >=
        //$anchorScroll();
		var wOffset = $("#bottom")[0].getBoundingClientRect().top; console.log(wOffset, $("#bottom").offset().top, window.innerHeight);
		$window.scrollBy(0, wOffset - window.innerHeight); //replaces following line--needed for mobile RFB behavior
		//$("#bottom")[0].scrollIntoView();
		var headerOffset, isPreviewMode;
		$('#widget-wrapper')[0] ? isPreviewMode = false : isPreviewMode = true;
        isPreviewMode ? headerOffset = 35 : headerOffset = 140; 
		if (h > (window.innerHeight-headerOffset)) {
		   var mobileHeaderCorrection = 0; 
		   if (window.innerWidth < 701 && stepNo == 0) isPreviewMode ? mobileHeaderCorrection = 0 : mobileHeaderCorrection = -65;  //mobile mode --> no header 100
		   if (window.innerWidth < 701 && stepNo > 0) isPreviewMode ? mobileHeaderCorrection = 0 : mobileHeaderCorrection = 95;  // to adjust for new headers for mobile
           $timeout(function() {$window.scrollBy(0, (window.innerHeight - headerOffset + mobileHeaderCorrection) - h)}, 300); 
		   //$timeout(function() {$window.scrollBy(0, (window.innerHeight - headerOffset ) - h)}, 300); 
		}
        if (stepNo <= $scope.lclData.steps.length -1) scrollStepNo = stepNo + 1;
     }, 100)
   }; 
   
   $scope.lclData = {};
   $scope.lclData.progressDots = {counter:-1, dots:[], oldStepNo: 0};

    function updatePictureItLink(textBlob){
        if(!textBlob){
            return textBlob;
        }
        var a = 'window.open(this.href';
        var b = 'window.GARecordPictureIt(this.href); '+ a;
        return textBlob.split(a).join(b);
    }

   //Prepare helper structure for striping and progress dots and picture it linking
   var stepStriping = [];
   var stepStripingCounter = -1;
   for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
       var step = interactiveData.interactive.steps[i];
       step.leftText = updatePictureItLink(step.leftText);
       step.rightText = updatePictureItLink(step.rightText);
       if (i > 0 && step.settings.showHeader) {
           $scope.lclData.progressDots.dots.push(0);  //build initial array of Progress Dots
       }
	   stepStripingCounter = stepStripingCounter + 1;
      if (i > 0 && !interactiveData.interactive.steps[i-1].settings.showNext) {
		   stepStripingCounter = stepStripingCounter - 1;
      }
	  stepStriping.push(stepStripingCounter);
   }
  
   $scope.lclData.stripes = [];
   $scope.lclData.steps = interactiveData.interactive.steps;
   $scope.lclData.objective = interactiveData.interactive.metadata.objective;
   $scope.lclData.overviewHeader = interactiveData.interactive.overviewHeader;
   $scope.lclData.inputData = interactiveData.interactive.inputData;
   $scope.lclData.rightFloatText = interactiveData.interactive.rightFloatText;
   $scope.lclData.inputs = getInputs($scope.lclData.steps); // contains list of inputs organized by step, and also student performance data
   $scope.lclData.feedbackText = "";
   $scope.lclData.activeCorrectFeedbackDisplayStep = -1;
   $scope.lclData.activeIncorrectFeedbackDisplayStep = -1;
   $scope.correctFeedbackPrefixes = ["Cool! ", "Fantastic! ", "Way to go! ", "You've got it! ", "That's right! ", "Excellent! ", "Correct! ", "Terrific! ",
	   "Marvelous! ", "Great! ", "Wonderful! ", "Outstanding! ", "Awesome work! ", "Congratulations! "];
   $scope.incorrectFeedbackPrefixes = ["Oops, not yet. ", "Oops, that is not quite right. ", "Oops. "];
   $scope.lclData.moreInfo = ""
   $scope.lclData.showMoreInfo = false;
   $scope.unlimitedTries = false;
   $scope.alwaysCorrect = false;
   $scope.lclData.onInitialStep = true;
   $scope.lclData.showMobileRFB = false;

   $scope.isMac = navigator.appVersion.indexOf("Mac")!=-1; 
   $scope.hasListOnMac = function(text) {
	  return $scope.isMac && text.indexOf("<ul")!=-1;
   }
  
   //--
  
    for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
      if (stepStriping[i] % 2) {
		  $scope.lclData.stripes[i] = 'ju-even';
      }  else $scope.lclData.stripes[i] = 'ju-odd';
	  $scope.lclData.steps[i].settings.showNextAccess = $scope.lclData.steps[i].settings.showNext;  //Initialize showNext structure for Accessibility
   }

   /*if ($scope.lclData.steps.length % 2){
      $scope.lclData.lastStepColor = 'ju-even';
   } else {
      $scope.lclData.lastStepColor = 'ju-odd';
   }*/
   
   if ($scope.lclData.stripes[$scope.lclData.stripes.length-1] == 'ju-odd'){
      $scope.lclData.lastStepColor = 'ju-even';
   } else {
      $scope.lclData.lastStepColor = 'ju-odd';
   } //----

   $scope.$on("unlimitedTries", function() {
       $scope.unlimitedTries = !$scope.unlimitedTries;
   })

   $scope.$on("alwaysCorrect", function() {
       $scope.alwaysCorrect = !$scope.alwaysCorrect;
   })

   $scope.$on("audioEnded", function() {
	  //alert("Ended!"); 
   });  

   $scope.$on("expandAll", function() {
	   expandAll();
   });


      $scope.popupRightFloat = function(e) {
	   var baseURL = $location.protocol() + "://" + $location.host()
       console.log(baseURL);
	   var content = '<p> Opened in a new window </p>' + $scope.lclData.rightFloatText.replace(/\'/g, "\\'" );
	   var win = window.open("", "", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=300,height=500");
	   var s = '<html>  <head>   <title> Try It information box</title>  <script> (function () {var head = document.getElementsByTagName("head")[0], script; script = document.createElement("script"); script.type = "text/x-mathjax-config"; script.text = "MathJax.Hub.Config({     \'HTML-CSS\': {webFont: [\'STIX-Web\'], scale: 88}, \'AssistiveMML\': {disabled: false} })"; head.appendChild(script); script = document.createElement("script"); script.type = "text/javascript"; script.src = "//cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=AM_HTMLorMML-full"; head.appendChild(script);})() </script> <link rel="stylesheet" href="' + baseURL + "/main.css"  +'"><script>setTimeout(function(){document.getElementById("begin").innerHTML = \'' + content + '\'}, 3000);  setTimeout(function() {MathJax.Hub.Queue(["Typeset",MathJax.Hub])},3200 );setTimeout(function() { document.getElementById("begin").focus()}, 4000); </script>  </head>   <body><h1 tabindex=0 style="font-size:15px"> Beginning of Try It information </h1> <div id="begin" tabindex=0> &nbsp; </div></body> </html>';
       win.document.write(s);
	   win.document.close();
	   /*node.setAttribute("rel", "stylesheet");
	   node.setAttribute("href", baseURL + "/main.css");
	   //setTimeout(function() {win.document.getElementsByTagName("head")[0].appendChild(node)}, 50);
	   var node_s = win.document.createElement("script");
	   node_s.text = "(function () {setTimeout(function() { console.log('MATHJAX');MathJax.Hub.Queue(['Typeset',MathJax.Hub]) },400) })();";
       setTimeout(function() {win.document.getElementsByTagName("head")[0].appendChild(node); 
	         win.document.getElementsByTagName("head")[0].appendChild(node_s)}, 50);
       setTimeout(function() {win.document.body.innerHTML = $scope.lclData.rightFloatText; }, 300);	*/	   
   }


   $scope.fixupHeader = function(headerText) {
      if (headerText) {
		  //return headerText.replace(/ /g, "&nbsp;" );  // to prevent wrapping
		  return headerText;
      } else {
          return headerText;
      }
   }

   $scope.increment = function(i) {
      return parseInt(i) + 1;
   }

   $scope.isMobileMode = function() {
       if (window.innerWidth < 701) {
	       return true;
        } else {
           return false; 
		}
   }

   $scope.showMobileFloat = function() {
       $scope.lclData.showMobileRFB = true;
	   $timeout(function() {$('html, body').animate({scrollTop: $("#bottomFB").offset().top}, 1000)}, 150); 
	   //$timeout(function() {$("#bottomFB")[0].scrollIntoView()}, 150);
   }
   
   //data logging
   $window.addEventListener('beforeunload', function() {
	   MathJax.Hub.queue.queue = [];  //clean-up MathJax Queue!!
//console.log('MathJax Queue GP aftr cleanup-beforeunload', MathJax.Hub.queue.queue);
       if ($scope.dataRecord.endedAt) {
           return;
       }
       $scope.dataRecord.endedAt = new Date();
	   interactiveData.widgetSession.save($scope.dataRecord, false);
   });
   //

   $scope.$on('$locationChangeStart', function(event, next, current) {
	   console.log("in location  change TRY IT");
	   MathJax.Hub.queue.queue = [];
//console.log('MathJax Queue GP aftr cleanup-$locationChangeStart', MathJax.Hub.queue.queue);
       if ($scope.dataRecord.endedAt) {
           return;
       }
       if ($scope.dataRecord.steps.length > 0) {
		   var date = new Date();
		   console.log("deltat", date - $scope.dataRecord["startedAt"]);
           if (date - $scope.dataRecord["startedAt"] > 2000){  //to eliminate recording end time upon initial load  (which triggers the event)
              $scope.dataRecord["endedAt"] = date;
	          interactiveData.widgetSession.save($scope.dataRecord, false);
           }
       }
   });

   function playStep(stepNo) {
	    //delay processing for step
	   (function(i, delay) {$timeout(function(){
//console.log('MathJax Queue', MathJax.Hub.queue.queue);
          // $scope.lclData.showMobileRFB = false;
		  if (stepNo > 0 && (stepNo != $scope.lclData.progressDots.oldStepNo) && $scope.lclData.steps[stepNo].settings.showHeader){  // update Progress Dots structure
			 $scope.lclData.progressDots.counter +=1; 
             $scope.lclData.progressDots.dots[$scope.lclData.progressDots.counter] = 2; 
			 if ($scope.lclData.progressDots.counter > 0) $scope.lclData.progressDots.dots[$scope.lclData.progressDots.counter - 1] = 1; 
			 $scope.lclData.onInitialStep = false;
          }  
		  
           
		  if (stepNo == 0 || (stepNo > 0 && stepNo != $scope.lclData.progressDots.oldStepNo)) {	 // needed to only log starting time once--similar to progress dots fix.
			 //data logging
			 $scope.dataRecord.steps.push({stepNo: stepNo + 1, startedAt: new Date(), questions: []});
			 if (stepNo > 0) {
				 $scope.dataRecord.steps[stepNo-1].endedAt = $scope.dataRecord.steps[stepNo].startedAt;
             }
			 interactiveData.widgetSession.save($scope.dataRecord, false);
			    //console.log("STARTED:", $scope.dataRecord.steps[stepNo].startedAt);
			 //
		  }

		  $scope.lclData.progressDots.oldStepNo = stepNo;

		     $scope.lclData.steps[stepNo].settings.showStep = true;  //show step after delay
			 
             
			 if ($scope.lclData.steps[stepNo].settings.showRFB != null) {
			     $scope.lclData.showRFB = $scope.lclData.steps[stepNo].settings.showRFB;
			 } else {
                 $scope.lclData.showRFB = true;
			 }
		     //gotoBottom(stepNo);

             // delay processing for right panel in step
			 (function(i, delay) {$timeout(function(){
		        $scope.lclData["delayRight"+i] = true; //show right panel
				if ($scope.lclData.steps[stepNo +1] && !$scope.lclData.steps[stepNo].settings.showNext){ //if no Next arrow and there is another step, play automatically
					 playStep(stepNo+1);
	            } else  gotoBottom(stepNo);
		       }, delay);  // end processing inner (right panel) delay

	         })(stepNo, $scope.lclData.steps[stepNo].settings.delayRight*1000);

			 
		  }, delay); //end processing step delay
	   })(stepNo, $scope.lclData.steps[stepNo].settings.delayStep*1000);
   }

   $scope.$watch('$viewContentLoaded', function() {
      playStep(0);
	  setTimeout(function() {
		  MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
		  $("a[onclick*='GARecordPictureIt']").each(function() { 
                   if ($(this).parent().html().indexOf("picture_it.png") >= 0){
				      var htm = $(this).html();
                      $(this).html("<span class='screen-reader-only'>Visual resource, opens in a new window,&nbsp;</span>" + $(this).html());
                   }
                }); 
	      setTimeout(function(){$("#step_0_hdr").focus()}, 1000);     
	  }); // Neded to update MathJax expressions after html is loaded
   });

   $scope.trustAsHtml = function(string) {  // needed to prevent ng-sanitize to remove style attributes from steps html   
    return $sce.trustAsHtml("<div>"+string+"</div>");
   };

   $scope.playNarration = function(index) {
	   if (index == 'lastStep'){
		   var url = interactiveData.interactive.metadata.lastStepAudioPath;
	   } else {
	       var url = $scope.lclData.steps[index].settings.audioPath;
       }
      audio.play(url)
   }

   $scope.next = function(stepNo) {
	  $scope.resetActiveFeedbackDisplayStep(stepNo);  //hide all feedback messages for this step
      $scope.lclData.steps[stepNo].settings.showNext = false;
      if (stepNo < $scope.lclData.steps.length -1){  //if current step not last step 
        playStep(stepNo+1);
		var s1 = stepNo + 1;
		setTimeout(function() {$('#step_'+ s1 +'_screenreader').focus()}, 500);
		$('#rightpanel-' + stepNo + '-child').attr('tabindex', '0');  //reset tab order for right panel 
		$timeout(function() {$scope.lclData.steps[stepNo].settings.showNextAccess = false}, 5000);
      }
	  if (stepNo == $scope.lclData.steps.length - 1){  //if current step is last step
           $scope.lclData.lastRefresherStep = true;
		   $scope.lclData.progressDots.dots[$scope.lclData.progressDots.dots.length - 1] = 3;
		  
		  //data logging
          $scope.dataRecord.steps.push({stepNo: "last", startedAt: new Date()});
		  $scope.dataRecord.steps[stepNo].endedAt = $scope.dataRecord.steps[stepNo+1].startedAt;
		  $scope.dataRecord.endedAt = new Date();
		  interactiveData.widgetSession.save($scope.dataRecord, true);
		  gotoBottom(stepNo);
		  setTimeout(function() {$('#laststep').focus()}, 500);
		  $timeout(function() {$scope.lclData.steps[stepNo].settings.showNextAccess = false}, 5000);
		  //
      }	  
	  //gotoBottom(stepNo);
   };

   /*
   $scope.hasInput = function(stepNo){
      if ($scope.lclData.steps[stepNo].rightText.indexOf("jumc") > 0 || $scope.lclData.steps[stepNo].rightText.indexOf("jusa") > 0)  {
		  return true
      } else {
          return false
      }
   };*/

   $scope.hasLeftInput = function(stepNo){
      if ($scope.lclData.steps[stepNo].leftText.indexOf("jumc") > 0 || $scope.lclData.steps[stepNo].leftText.indexOf("jusa") > 0)  {
		  return true
      } else {
          return false
      }
   }
   

    function getInputs(steps){  //collects inputs, organized by steps
       var inputs = [];
       for (i=0; i < steps.length; i++){
		  var st;

		  steps[i].leftText ? st = steps[i].leftText.match(/(ju-mc|ju-sa)=\"+[^\"]+\"/g) : st="";  //check for inputs of left side first 
		  if (!st || st.length == 0){
			  steps[i].rightText && !steps[i].settings.hideRightPanel? st = steps[i].rightText.match(/(ju-mc|ju-sa)=\"+[^\"]+\"/g) : st="";
          } //if no inputs on left side, check on right side
		  if (!st || st.length == 0){
			  inputs.push({});
		  } else {
			  var obj = {};
              for (j=0; j < st.length; j++) {
				  var id = st[j].match(/\"+[^\"]+\"/); 
				  sid = id[0].substring(1, id[0].length-1)
				  if (sid.slice(0, 2) == 'sa') sid = sid.slice(0, sid.length-2);
				  var inputType = st[j].substr(0, st[j].search("="));
				  obj[sid] = {"type":inputType, "noOfTries":0, "correct":false, "studentAnswer":"", "inputCompleted":false};
              }
			  inputs.push(obj);
		  }
       }
	   return inputs;
	};

	$scope.inputsCompleted = function(stepNo) {
       //$scope.lclData.inputs[stepNo][]
	   //if () {
	   //} 
	   var completed = true;
	   var inputsObj = $scope.lclData.inputs[stepNo];
	   for (var key in inputsObj) {
          if (inputsObj.hasOwnProperty(key)) {
             completed = completed && inputsObj[key].inputCompleted;
          }
       }
       
       if (stepNo > 1 && !$scope.lclData.steps[stepNo-1].settings.showNext){  //to handle combo steps with inputs in first step.
          completed = completed && $scope.inputsCompleted(stepNo-1);
       }
       
	   return completed;
    }

	$scope.setNoOfTries = function(stepNo, inputId) {
		if ($scope.lclData.inputs[stepNo][inputId]){
          $scope.lclData.inputs[stepNo][inputId]["noOfTries"] = $scope.lclData.inputs[stepNo][inputId]["noOfTries"] + 1;
		}
	}

	$scope.maxTries = function(stepNo, inputId) {
	   if (!$scope.lclData.inputData[inputId].selectedTry) {$scope.lclData.inputData[inputId].selectedTry = 2};
	   if (!$scope.lclData.inputData[inputId].selectedColumns) {$scope.lclData.inputData[inputId].selectedColumns = 1};
       if ($scope.lclData.inputs[stepNo][inputId]["noOfTries"] >= $scope.lclData.inputData[inputId].selectedTry){
           return true;
       } else {
           return false;
	   }
	}

	$scope.overMaxTries = function(stepNo, inputId) {
	   if (!$scope.lclData.inputData[inputId].selectedTry) {$scope.lclData.inputData[inputId].selectedTry = 2};
	   if (!$scope.lclData.inputData[inputId].selectedColumns) {$scope.lclData.inputData[inputId].selectedColumns = 1};
       if ($scope.lclData.inputs[stepNo][inputId]["noOfTries"] > $scope.lclData.inputData[inputId].selectedTry){
           return true;
       } else {
           return false;
	   }
	}

	$scope.setCorrectActiveFeedbackDisplayStep = function(stepNo) {
       $scope.lclData.activeCorrectFeedbackDisplayStep = stepNo;
	   $scope.lclData.activeIncorrectFeedbackDisplayStep = -1;
	}

	$scope.setIncorrectActiveFeedbackDisplayStep = function(stepNo) {
       $scope.lclData.activeIncorrectFeedbackDisplayStep = stepNo;
	   $scope.lclData.activeCorrectFeedbackDisplayStep = -1;
	}

	$scope.resetActiveFeedbackDisplayStep = function(stepNo) {
       $scope.lclData.activeCorrectFeedbackDisplayStep = -1;
	   $scope.lclData.activeIncorrectFeedbackDisplayStep = -1;
	}

	$scope.showCorrectFeedback = function(stepNo) {
		var result;
       stepNo == $scope.lclData.activeCorrectFeedbackDisplayStep ? result = true: result = false;
	   //MathJax.Hub.Queue(["Typeset",MathJax.Hub])
	   setTimeout(function() {MathJax.Hub.Queue(["Typeset",MathJax.Hub])});
	   return result;
	}

	$scope.showIncorrectFeedback = function(stepNo) {
		var result;
       stepNo == $scope.lclData.activeIncorrectFeedbackDisplayStep ? result = true: result = false;
	   //MathJax.Hub.Queue(["Typeset",MathJax.Hub])
	   setTimeout(function() {MathJax.Hub.Queue(["Typeset",MathJax.Hub])});
	   return result;
	}

	$scope.inputClick = function(stepNo) {
       $scope.resetActiveFeedbackDisplayStep(stepNo);
	}

	$scope.captureTab = function(e) {
       if (!e.shiftKey) {
          e.preventDefault();
		  e.stopPropagation();
	   }
	}

	$scope.corrFeedbackTab = function($event, stepNo) {
      // setTimeout(function() {$('#rightpanel-' + stepNo + '-child').attr('tabindex', '0')}, 500);   //reset right panel tab order 
	}

	$scope.getPrefix = function (words) {
       var index = Math.floor(Math.random() * words.length );
	   return words[index];
	}

    $scope.displayMoreInfo = function() {
      var modalInstance = $modal.open({
        template: "<div class='modal-header'><h3 class='modal-title'>Need More Info?</h3></div><div class='modal-body'>{{moreInfo}}</div>"
		        +  "<div class='modal-footer'> <img src='/images/got_it.png' ng-click='dismiss()'/></div>",
        controller: 'modalMoreInfoCtl',
        resolve: {
              moreInfo: function () {
                return $scope.lclData.moreInfo; 
              }
		}
      });
    }

	  /*$scope.feedbackKeydown = function(e, index) {
		if (e.keyCode == 9 && $scope.hasLeftInput(index) && (!$scope.inputsCompleted(index) || index != $scope.lclData.activeCorrectFeedbackDisplayStep)){
			setTimeout(function() {$('#row_' + index + ' > div:first-child').focus()}, 100);
			//e.preventDefault();  
           // e.stopPropagation();
	   }
	 }*/

	$scope.setMoreInfo = function(info) {
       if (info) {
          $scope.lclData.moreInfo = info;
          $scope.lclData.showMoreInfo = true;
       } else {
          $scope.lclData.showMoreInfo = false;
       } 
	}

     $scope.gotoGP = function() {
     widgetNavigation.tryIt();
   }

   $scope.gotoOC = function() {
     widgetNavigation.challenge();
   }

   $scope.gotoML = function() {
     widgetNavigation.otherLesson();
   }

	}]);





angular.module('guided_practice_widget').controller('modalMoreInfoCtl', ['$scope', '$modalInstance', 'moreInfo', function ($scope, $modalInstance, moreInfo) {
   $scope.moreInfo = moreInfo;

   $scope.dismiss = function() {
         $modalInstance.dismiss('cancel');
   }
}]);



