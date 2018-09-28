angular.module('refresher_widget', ['angularWidget', "ngAnimate", "ngSanitize", "angular-bind-html-compile", "guided_practice_widget.directives", "ngAria", "juice.user-settings", 'juice.user']);

/*angular.module('refresher_widget').directive('juGreencheckph', function () {
    return {
        restrict: 'AC',
        template: "<span class='fa fa-check-circle fa-lg ju-greencheck'> </span>"
    }
});

angular.module('refresher_widget').directive('juOrangetimesph', function () {
    return {
        restrict: 'AC',
        template: "<span class='fa fa-times-circle fa-lg ju-orangetimes'> </span>"
    }
});*/

angular.module('refresher_widget').run(['$anchorScroll', function ($anchorScroll) {
    $anchorScroll.yOffset = 0;   // always scroll by 50 extra pixels
}])

//'audio' factory is in modulette.js
angular.module('refresher_widget').controller("refresherCtl", ["$window", "$scope", "AudioControllerService", "interactiveData", "$timeout", "$animate", "$location", "$anchorScroll", "audio", "$sce", "widgetNavigation", "UserSettingsService", "UserService", "$rootScope",
    function ($window, $scope, AudioControllerService, interactiveData, $timeout, $animate, $location, $anchorScroll, audio, $sce, widgetNavigation, UserSettingsService, UserService, $rootScope) {  //interactiveData, widgetNavigation factories shared from modulette!
        $scope.moduletteData = interactiveData.moduletteData;
        $scope.moduletteData = interactiveData.moduletteData;
        //var audioEl = audio.audioElement;
        // data logging
        var dataRecord = {"startedAt": new Date()};
        var steps = [];
        dataRecord["steps"] = steps;
        //
        $scope.lclData = {};
        $scope.lclData.isPreviewMode = false;
		
		$scope.isMac = navigator.appVersion.indexOf("Mac")!=-1; 
		$scope.hasListOnMac = function(text) {
		    return $scope.isMac && text && text.indexOf("<ul")!=-1;
		}

        if ($location.$$absUrl.split("/")[4] == "preview")  $scope.lclData.isPreviewMode = true;

        var idFromPath = function () {
            if ($scope.lclData.isPreviewMode) return "";
            var path = $location.$$path;
            var name = path.split("/")[2];
            var n = name.lastIndexOf(".");
            var id = name.substring(0, n).replace(/\./g, '_');
            return id;
        }

        if (typeof(programValues) != 'undefined') {
            $scope.programValues = programValues;
        }
        var scrollStepNo = 0;
        var audioObject = {};
        AudioControllerService.audioObject = audioObject;
        var url;
        audioObject.globalPlayAudio = false;
        audioObject.audioInProgress = false;
        audioObject.audioEndedFlag = false;
        audioObject.audioPlayingStep = -1;
        audioObject.currentPlayTime = 0;
        audioObject.hasNext = [];
        audioObject.controllingAudioGuy = [];
        audioObject.chainAudio = [];  //=1 if next step audio must be chained automaticaly
        audioObject.lastStepDisplayed = -1;
        var stepStriping = [];
        var stepStripingCounter = -1;
        $scope.lclData.progressDots = {counter: -1, dots: []};
        $scope.lclData.allowExpandAll = false;
        $scope.lclData.expandAllFlag = false;
        var key = 'allowExpandAllRefresher_' + idFromPath();
        if (!$scope.lclData.isPreviewMode) {
            UserSettingsService.get(key, function (value) {
                if (value) {
                    $scope.lclData.allowExpandAll = true;
                }
            });
        } else $scope.lclData.allowExpandAll = true;


        function updatePictureItLink(textBlob) {
            if (!textBlob) {
                return textBlob;
            }
            var a = 'window.open(this.href';
            var b = 'window.GARecordPictureIt(this.href); ' + a;
            return textBlob.split(a).join(b);
        }

        /* EXAMPLE OF HOW TO IMPLEMENT WIDGET SESSION
         console.log('success??', interactiveData.widgetSession);
         interactiveData.widgetSession.save({test:"did this work"}, true);
         */


        //Prepare a few helper structures
        for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
            var step = interactiveData.interactive.steps[i];
            step.leftText = updatePictureItLink(step.leftText);
            step.rightText = updatePictureItLink(step.rightText);

            if (interactiveData.interactive.steps[i].settings.showHeader) $scope.lclData.progressDots.dots.push(0);  //build initial array of Progress Dots
            stepStripingCounter = stepStripingCounter + 1;
            audioObject.hasNext.push(interactiveData.interactive.steps[i].settings.showNext);
            audioObject.controllingAudioGuy.push(i);
            audioObject.chainAudio.push(0);
            if (i > 0 && !audioObject.hasNext[i - 1]) {
                audioObject.controllingAudioGuy[i] = audioObject.controllingAudioGuy[i - 1];
                audioObject.chainAudio[i - 1] = 1;
                stepStripingCounter = stepStripingCounter - 1;
            }
            stepStriping.push(stepStripingCounter);
        }


     /*   angular.element($window).bind('resize', function(){
          console.log("WINDOW RESIZED", window.innerHeight);
       }); */

        gotoBottom = function (stepNo) {
			//$scope.$digest();
            $timeout(function () {
                // set the location.hash to the id of
                // the element you wish to scroll to.
                //$location.hash('bottom');
                var h = 0;
                if (!(scrollStepNo > $scope.lclData.steps.length - 1)) h = $("#bottom").offset().top - $('#step_' + scrollStepNo).offset().top; //if not last step... was>=
                //h is the height of the steps displayed but not yet read (usually the current step, but will include previous ones if their Next arrow is hidden) 
            //$("#bottom")[0].scrollIntoView();
			//$('html, body').scrollTop( $(document).height() );
			$('html, body').scrollTop( 100000 );  //alternative to scrool to bottom -- brute force!
                var headerOffset, isPreviewMode;
				$('#widget-wrapper')[0] ? isPreviewMode = false : isPreviewMode = true;
                isPreviewMode ? headerOffset = 50 : headerOffset = 165; 
				var mobileHeaderCorrection = 0; 
				if (window.innerWidth < 701) isPreviewMode ? mobileHeaderCorrection = 0 : mobileHeaderCorrection = 85;  //mobile mode --> no header 125
                if (stepNo > 0 && h > (window.innerHeight - headerOffset)) {					
                    $timeout(function() {$window.scrollBy(0, (window.innerHeight - headerOffset + mobileHeaderCorrection) - h)}, 300);  //bring top of step in view
                }
                if (stepNo <= $scope.lclData.steps.length - 1) scrollStepNo = stepNo + 1;
				if (stepNo == 0 && window.innerWidth < 701){
				   //$timeout(function() {$window.scrollBy(0, (window.innerHeight - headerOffset + mobileHeaderCorrection) - h)}, 300); 
				   $timeout(function() {$window.scrollBy(0, (window.innerHeight - headerOffset - 55) - h)}, 300); 
				   //$window.scrollBy(0, (window.innerHeight - headerOffset + 120) - h);
				}
            }, 150)  //was 150
        };

        //gotoBottom(0);
        $scope.lclData.stripes = [];
        $scope.lclData.steps = interactiveData.interactive.steps;
        $scope.lclData.objective = interactiveData.interactive.metadata.objective;
        $scope.lclData.audioPath = interactiveData.interactive.metadata.audioPath;
        $scope.lclData.audioManifest = interactiveData.manifest;
        //$scope.lclData.overviewHeader = interactiveData.overviewHeader;
        $scope.lclData.overviewHeader = "Overview";
        $scope.lclData.playAudioGeneral = interactiveData.playAudio;
        $scope.lclData.controllingAGIndex = audioObject.controllingAudioGuy;
        //console.log($scope.lclData.controllingAGIndex);


        for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
            if (stepStriping[i] % 2) {
                $scope.lclData.stripes[i] = 'ju-even';
            } else $scope.lclData.stripes[i] = 'ju-odd';
			$scope.lclData.steps[i].settings.showNextAccess = $scope.lclData.steps[i].settings.showNext;  //Initialize showNext structure for Accessibility
        }

        /*if ($scope.lclData.steps.length % 2){
         $scope.lclData.lastStepColor = 'ju-even';
         } else {
         $scope.lclData.lastStepColor = 'ju-odd';
         }*/

        if ($scope.lclData.stripes[$scope.lclData.stripes.length - 1] == 'ju-odd') {
            $scope.lclData.lastStepColor = 'ju-even';
        } else {
            $scope.lclData.lastStepColor = 'ju-odd';
        }

        //data logging
        $window.addEventListener('beforeunload', function () {
            audio.pause();
            if (dataRecord.endedAt) {
                return;
            }
            if (dataRecord.steps.length > 1 || $scope.lclData.lastRefresherStep) { //past firts step, manually or through Expand All
                dataRecord.endedAt = new Date();
                interactiveData.widgetSession.save(dataRecord, false);
            }
        });
        //

        $scope.windowWidth = function() {
            return (window.innerWidth - 120) + "px";
		}

        $scope.$on('$locationChangeStart', function (event, next, current) {
			console.log("in location change REFRESHER");
            audio.pause();
            if (dataRecord.endedAt) {
                return;
            }
            if (dataRecord.steps.length > 1 || $scope.lclData.lastRefresherStep) { //past firts step, manually or through Expand All
                dataRecord["endedAt"] = new Date();
                interactiveData.widgetSession.save(dataRecord, false);
            }
        });


        $scope.$on("audioEnded", function () {
            audioObject.audioEndedFlag = true;
            audioObject.currentPlayTime = 0;
            audioObject.audioInProgress = false;
            console.log("last step displayed", audioObject.lastStepDisplayed);

            //if step in a sequence ("chained"), play next step automatically
            if (audioObject.chainAudio[audioObject.audioPlayingStep]) {
                if (!$scope.lclData.steps[audioObject.audioPlayingStep + 1].settings.showStep) {
                    audioObject.audioInProgress = true; //needed to prevent audioGuy to flash pause for a brief moment
                    playStep(audioObject.audioPlayingStep + 1, 0);
                } else {
                    playNarrationCore(audioObject.audioPlayingStep + 1);
                }
            } else {
                audioObject.audioPlayingStep = -1;
                audioObject.audioInProgress = false;
            }

            //if the audio that just ended is NOT part of a "in progress" sequence, we need to complete the sequence!
            if (audioObject.chainAudio[audioObject.lastStepDisplayed] && !$scope.audioguyPaused(audioObject.controllingAudioGuy[audioObject.lastStepDisplayed])) {
                audioObject.audioInProgress = true;
                playStep(audioObject.lastStepDisplayed + 1, 0)
            }
        });

        $scope.$on("globalAudioOFF", function () {
            audio.pause();
            audioObject.globalPlayAudio = false;
            audioObject.audioInProgress = false;
            if (audioObject.chainAudio[audioObject.audioPlayingStep] && !$scope.lclData.steps[audioObject.audioPlayingStep + 1].settings.showStep) {  //if next step audio chained and step not already shown...
                playStep(audioObject.audioPlayingStep + 1, 0);
            }
            audioObject.currentPlayTime = 0;
            audioObject.audioPlayingStep = -1;
            audio.audioElement.src = ""; //need to reload the file to start at t=0 (Firefox fix)

            //if the audio that was just interrupted is NOT part of a "in progress" sequence, we need to complete the sequence!
            if (audioObject.chainAudio[audioObject.lastStepDisplayed] && !$scope.audioguyPlaying(audioObject.controllingAudioGuy[audioObject.lastStepDisplayed])) {
                //audioObject.audioInProgress = true;
                playStep(audioObject.lastStepDisplayed + 1, 0)
            }
        })

        $scope.$on("globalAudioON", function () {
            audioObject.globalPlayAudio = true;
            if (!audioObject.audioInProgress) {
                playNarrationCore(audioObject.lastStepDisplayed);
            }
        })

        function displayLastRefresherStep() {
            $scope.lclData.lastRefresherStep = true;
            $scope.lclData.progressDots.dots[$scope.lclData.progressDots.dots.length - 1] = 3;
            //if global pplay audio, play audio for last step
            if (audioObject.globalPlayAudio) {
                $scope.playNarration('lastStep');
            }
        }

        // Expand All image click action
        $scope.expandAll = function () {
            audioObject.globalPlayAudio = false;
            for (var i = 0; i < interactiveData.interactive.steps.length; i++) {
                $scope.lclData.steps[i].settings.showStep = true;
                $scope.lclData["delayRight" + i] = true;
                $scope.lclData.steps[i].settings.showNext = false;
				$scope.lclData.steps[i].settings.showNextAccess = false; //structure for accessibility
            }
            for (var i = 0; i < $scope.lclData.progressDots.dots.length; i++) {
                $scope.lclData.progressDots.dots[i] = 1;
            }
            //$scope.lclData.lastRefresherStep = true;
            displayLastRefresherStep();
            //data logging
            dataRecord.expandAllClickedAt = new Date();
            interactiveData.widgetSession.save(dataRecord, false);

        }

		

        function chainingAndNoDelay(stepNo) {
            if (audioObject.chainAudio[stepNo - 1] && $scope.lclData.steps[stepNo].settings.delayStep == 0) {
                return true
            } else {
                return false
            }
            ;
        }

        function playStep(stepNo, delayMultiplier) {
            //delay processing for step
            (function (i, delay) {
                $timeout(function () {
                    if ($scope.lclData.steps[stepNo].settings.showHeader) {  // update Progress Dots structure
                        $scope.lclData.progressDots.counter += 1;
                        $scope.lclData.progressDots.dots[$scope.lclData.progressDots.counter] = 2;
                        if ($scope.lclData.progressDots.counter > 0) $scope.lclData.progressDots.dots[$scope.lclData.progressDots.counter - 1] = 1;
                    }

                    if (stepNo == $scope.lclData.steps.length - 1 && !$scope.lclData.isPreviewMode) {
                        UserSettingsService.set('allowExpandAllRefresher_' + idFromPath(), true);
                    }

                    // do not play step if audio is playing for another step in the sequence (use case: gobal audio is off, and controlling audioguy has been clicked while step was waiting to play)
                    // do play if request comes from audioEnded event.
                    if (!($scope.audioguyPlaying(audioObject.controllingAudioGuy[stepNo])) || audioObject.audioEndedFlag || audioObject.globalPlayAudio) {// begin outer if

                        //data logging
                        if (dataRecord.steps.length == 0 || (dataRecord.steps.length >= 1 && dataRecord.steps[dataRecord.steps.length - 1].stepNo != (stepNo + 1))) {
                            dataRecord.steps.push({stepNo: stepNo + 1, startedAt: new Date()});
                        }
                        dataRecord.steps[stepNo].globalAudioPlay = audioObject.globalPlayAudio;
                        dataRecord.steps[stepNo].audioPlay = false;
                        if (stepNo > 0) {
                            dataRecord.steps[stepNo - 1].endedAt = dataRecord.steps[stepNo].startedAt;
                            interactiveData.widgetSession.save(dataRecord, false);
                        }
                        //

                        audioObject.audioEndedFlag = false;  //reset flag
                        $scope.lclData.steps[stepNo].settings.showStep = true;  //show step after delay
						//if (stepNo > 0) setTimeout(function() {$('#step_'+stepNo+'_screenreader').focus()}, 150);
                        audioObject.lastStepDisplayed = stepNo;
                        //scroll if Next arrow or step delay > 0
                        if (audioObject.hasNext[stepNo] || $scope.lclData.steps[stepNo].settings.delayStep != 0) {
                            //gotoBottom(stepNo);  !PM
                        }

                        // Play narration if global audio is ON, OR if the previous step is chained and audio was playing (because audioguy was clicked)
                        if (audioObject.globalPlayAudio || (audioObject.chainAudio[stepNo - 1] && audioObject.audioPlayingStep == stepNo - 1 && audioObject.audioInProgress)) { //**
                            if (!chainingAndNoDelay(stepNo)) {
                                $scope.playNarration(stepNo);
                            }
                        } else {
                            if (audioObject.controllingAudioGuy[audioObject.audioPlayingStep] != audioObject.controllingAudioGuy[stepNo]) {
                                resetAudio();
                            }

                        }
                        
                           

                        // delay processing for right panel in step
                        (function (i, delay) {
                            $timeout(function () {
                                $scope.lclData["delayRight" + i] = true; //show right panel
                                if ($scope.lclData.steps[stepNo + 1] && !audioObject.hasNext[stepNo]) { //if no Next arrow and there is another step, play automatically
                                    if ((!audioObject.globalPlayAudio && !($scope.audioguyPlaying(audioObject.controllingAudioGuy[stepNo]))) || $scope.lclData.steps[stepNo + 1].settings.delayStep == 0) { //if audio not playing for the sequence, OR delay for next step is 0
                                        playStep(stepNo + 1, 1);
                                    }
                                }
                                if (audioObject.hasNext[stepNo] || $scope.lclData.steps[stepNo].settings.delayStep != 0) {
                                    gotoBottom(stepNo);  //!PM

                                }
                            }, delay);  // end processing inner (right panel) delay

                        })(stepNo, $scope.lclData.steps[stepNo].settings.delayRight * 1000);

                    } // end outer if
                }, delay); //end processing step delay
            })(stepNo, $scope.lclData.steps[stepNo].settings.delayStep * 1000 * delayMultiplier);
        }

        $scope.fixupHeader = function (headerText) {
            if (headerText) {
                //return headerText.replace(/ /g, "&nbsp;");  //disallow wrapping
				return headerText;
            } else {
                return headerText;
            }
        }

		$scope.whiteboardStyle = function(wb) {
           if(wb) {
              return {'padding-left':'25px','padding-right':'25px'}
           } else {
              return {}
		   }
		}

        $scope.$watch('$viewContentLoaded', function () {
            playStep(0, 1);
            $timeout(function () {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub])
                $("a[onclick*='GARecordPictureIt']").each(function() { 
                   if ($(this).parent().html().indexOf("picture_it.png") >= 0){
				      var htm = $(this).html();
                      $(this).html("<span class='screen-reader-only'>Visual resource, opens in a new window,&nbsp;</span>" + $(this).html());
                   }
                });              
            }, 150); // Needed to update MathJax expressions after html is loaded

        });

        $scope.trustAsHtml = function (string) {  // needed to prevent ng-sanitize to remove style attributes from steps html
            return $sce.trustAsHtml(string);
        };


        // show audioguy in idle state
        $scope.audioguyIdle = function (index) {
            return interactiveData.interactive.steps[index].settings.showAudio && !audioIsDeleted(index) && !(audioObject.controllingAudioGuy[audioObject.audioPlayingStep] == index)
        }

        // show audioguy in playing state
        $scope.audioguyPlaying = function (index) {
            return interactiveData.interactive.steps[index].settings.showAudio && !audioIsDeleted(index) && (audioObject.controllingAudioGuy[audioObject.audioPlayingStep] == index) && audioObject.audioInProgress
        }

        // // show audioguy in paused state
        $scope.audioguyPaused = function (index) {
            return interactiveData.interactive.steps[index].settings.showAudio && !audioIsDeleted(index) && (audioObject.controllingAudioGuy[audioObject.audioPlayingStep] == index) && !audioObject.audioInProgress;
        }

        $scope.playNarration = function (index) {
            if (audioObject.audioInProgress) {  //narration in progress
				$timeout(function () {$("#audiopause_"+index).focus()},0);  //for accessibility behavior
                audioObject.currentPlayTime = audio.pause();
                audioObject.audioInProgress = false;
                if (audioObject.controllingAudioGuy[audioObject.audioPlayingStep] != index) {
                    audioObject.currentPlayTime = 0;
                    playNarrationCore(index);
                }

            } else {  //either paused or stopped
                if (audioObject.currentPlayTime > 0) { // paused
					$timeout(function () {$("#audioprog_"+index).focus()},0);   //for accessibility behavior
                    if (audioObject.controllingAudioGuy[audioObject.audioPlayingStep] == index) {
                        playNarrationCore(audioObject.audioPlayingStep);
                    } else {
                        resetAudio();
                        playNarrationCore(index);
                    }
                } else { //stopped, or new step
					 $timeout(function () {$("#audioprog_"+index).focus()},0);  //for accessibility behavior
                    resetAudio();
                    playNarrationCore(index);
                }
            }
        }

        function playNarrationAuto(stepNo) {
            playNarrationCore(stepNo);
        }

        function resetAudio() {
            audio.pause();
            audioObject.audioInProgress = false;
            audioObject.currentPlayTime = 0;
            audioObject.audioPlayingStep = -1;
        }

        function constructUrl(stepNo) {  //construct audio file url taking into account the mapping in manifest file
            var returnUrl;
            var url;
            if (stepNo == 'lastStep') {
                url = interactiveData.interactive.metadata.lastStepAudioPath;
            } else {
                url = $scope.lclData.steps[stepNo].settings.audioPath;
            }
            if (url && url.indexOf("http") != 0 && $scope.lclData.audioPath) {
                var audioPath = $scope.lclData.audioPath + "_";
                if ($scope.lclData.audioManifest) {
                    var defaultName = (audioPath + url).replace(/\//g, ".");
                    if ($scope.lclData.audioManifest[defaultName]) {  //if there is a entry in the audio manifest that corrsponds to the default file name...
                        if ($scope.lclData.audioManifest[defaultName] == "deleted") {
                            returnUrl = "deleted";
                            return returnUrl;
                        } else {
                            var urlTmp;
                            urlTmp = $scope.lclData.audioManifest[defaultName];
                            var arr = urlTmp.split(".");
                            returnUrl = "";
                            for (var i = 0; i < arr.length - 1; i++) {
                                returnUrl = returnUrl ? returnUrl + "/" + arr[i] : arr[0];
                            }
                            returnUrl = returnUrl + "." + arr[arr.length - 1];
                            return returnUrl;
                        }
                    }
                }
                returnUrl = audioPath + url + ".mp3";
            } else {
                returnUrl = url;
            }
            return returnUrl;
        }

        function audioIsDeleted(stepNo) {
            var deleted;
            deleted = constructUrl(stepNo) == "deleted";
            deleted ? deleted = deleted : deleted = false;
            return deleted;
        }

        function playNarrationCore(stepNo) {
            audioObject.audioEndedFlag = false;  //reset flag
            path = constructUrl(stepNo);
            console.log("IN PLAY CORE", path)
            console.log("PROGRAM from Refresher", UserService.getProgramPath())
            var url = configs.narration_path + path;
            if (UserService.getProgramPath() && path.indexOf("programs/") < 0) {
                url = configs.narration_path + UserService.getProgramPath() + path;  //add program prefix to url
            }
            audioObject.audioInProgress = true;
            audioObject.audioPlayingStep = stepNo;
            if (url == null || url == "") {
                $timeout(function () {
                    $scope.$broadcast("audioEnded")
                });
                audio.audioElement.src = "";
            } else {
                if (audioObject.currentPlayTime > 0) {  //current audio is paused
                    audio.play()
                } else {
                    if (url.indexOf("programs/") >= 0) {  //if in a program, we'll try the program specific file first
                        $.ajax({
                            type: "GET",
                            url: url,
                        }).done(function () {
                            audio.play(url);
                        }).fail(function () {
                            audio.play(configs.narration_path + path);   //revert to core file
                        });
                    } else audio.play(url);

                }

                //data logging--skip last step
                if (stepNo != 'lastStep') {
                    dataRecord.steps[stepNo].audioPlay = true;
                    dataRecord.steps[stepNo].globalAudioPlay = audioObject.globalPlayAudio;
                }
                //
            }
        }

        $scope.next = function (stepNo) {
            $scope.lclData.steps[stepNo].settings.showNext = false;
            if (stepNo < $scope.lclData.steps.length - 1) {  //if current step not last step
                audioObject.audioInProgress = false;
                playStep(stepNo + 1, 1);
				var s1 = stepNo + 1;
		        setTimeout(function() {$('#step_'+ s1 +'_screenreader').focus()}, 500);
		        $timeout(function() {$scope.lclData.steps[stepNo].settings.showNextAccess = false}, 5000);
                resetAudio();
            } else {
                //$scope.lclData.lastRefresherStep = true;
                displayLastRefresherStep();
                //data logging
                dataRecord.steps.push({stepNo: "last", startedAt: new Date()});
                dataRecord.steps[stepNo].endedAt = dataRecord.steps[stepNo + 1].startedAt;
                dataRecord.endedAt = new Date();
                interactiveData.widgetSession.save(dataRecord, true);
                gotoBottom(stepNo);
				setTimeout(function() {$('#laststep').focus()}, 500);
		        $timeout(function() {$scope.lclData.steps[stepNo].settings.showNextAccess = false}, 5000);
                //
            }
            //resetAudio();  moved into first clause of if to handle last step audio (auto-play only)
            //gotoBottom();
        };

        $scope.gotoGP = function () {
            widgetNavigation.tryIt();
        }

        $scope.gotoOC = function () {
            widgetNavigation.challenge();
        }

        $scope.gotoML = function () {
            widgetNavigation.otherLesson();
        }

    }]);