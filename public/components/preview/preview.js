'use strict';
angular.module('previewConstants',[]).constant('previewConstants', {'widgetName':paramsFromServer.widgetName, 'fileName':paramsFromServer.fileName});
//angular.module('moduletteStructure',[]).constant('structureConstants', {'modStructure':paramsFromServer.modStructure});
//console.log(paramsFromServer.modStructure);
(function() {
    angular.module('preview', ['angularWidget', 'previewConstants', 'ui.router', 'juice.audio-controller', 'juice.data-store-api', 'juice.user']).
        constant('pathConstants', {
            'pathWidgets': '/widgets/',
            'pathFiles': configs.file_path
        }).
        config(["widgetsProvider", "pathConstants", config]).
        config(['$stateProvider', 'previewConstants', 'pathConstants', routerConfig]).
        config(["widgetsProvider", configEventsAndServices]).
        run(['$state', run]).
        controller("ctlPreview", ["$scope", "$rootScope", "$window", "$location", "widgets", "previewConstants", "$state", "$stateParams",  "DataStoreService", 'interactiveData', ctlPreview]).
        factory('interactiveData', interactiveData).
        factory('audio', ["$document", "$rootScope", audio]).
		factory('widgetNavigation', widgetNavigation);

    function getFileName($stateParams, fileNameList){
        var fileName = '';
        if (fileNameList) {
            var fileNameArr = fileNameList.split(",");

            var index;
            if (!$stateParams.index) {
                index = 0;
            } else {
                index = $stateParams.index;
            }
            fileName = fileNameArr[index];
        }
        return fileName;
    }

    function routerConfig($stateProvider, previewConstants, pathConstants) {
        var widgetName = previewConstants.widgetName;
        var fileNameList = previewConstants.fileName;
        if (fileNameList) {
            previewConstants.fileNameListLength = fileNameList.split(",").length;
        } else previewConstants.fileNameListLength = 0;
        //build states and add to stateProvider
        var obj = {
            name: "preview",
            url: "/:index",
            template: "<ng-widget  src=\"'" + widgetName + "'\" options=\"{}\"></ng-widget>",
            controller: function (interactiveData, file, manifest, $state, $stateParams) {  //injects file service from resolve
                if (file) {
                   // file path substitution!!
                   interactiveData.interactive = helpers.replaceS3BucketInData(file.data);
		           //
				   //interactiveData.interactive = file.data;
				}
				if (manifest) interactiveData.manifest = manifest.audioFiles;
            },
            resolve: { //asynch load of the file done here
                file: function ($http, interactiveData, $stateParams, pathConstants, previewConstants, $q) {
                    if (fileNameList) {
                        var fileName = getFileName($stateParams, fileNameList);
                        if (fileName.indexOf('!') == 0) {  //used for placeholder widget--if filename starts with !, use it as the placeholder title
                            return {data: fileName.substring(1, fileName.length)};
                        }
                        if (fileName == widgetName) {
                            return $http.get(pathConstants.pathWidgets + fileName + "/" + fileName + ".txt", {cache: false})
                        } else {
                            //filePath is now in previewConstants to support multiple buckets
							if (previewConstants.filePath){
								var ret = $q.defer();
							    $http.get(previewConstants.filePath + fileName.replace(/\./g, "/") + ".txt?t=" + new Date().getTime(), {cache: false}).then(function(resp){ret.resolve(resp)});
                                return ret.promise;
                            } else {
                               return $http.get(pathConstants.pathFiles + fileName.replace(/\./g, "/") + ".txt", {cache: false})
							}
                        }
                    } else return "";
                },
                manifest: function ($http, interactiveData, $stateParams, pathConstants, previewConstants, $q, $rootScope, UserService) {
                    if (fileNameList) {
                        var fileName = getFileName($stateParams, fileNameList);
                        if (fileName.indexOf('!') == 0) {  //used for placeholder widget--if filename starts with !, use it as the placeholder title
                            return "";
                        }
                        if (fileName == widgetName) {
                            return ""
                        } else {
                            //filePath is now in previewConstants to support multiple buckets
							if (previewConstants.filePath){
								var man = $q.defer();
								var prog =  fileName.indexOf('programs.') == -1 ? UserService.getProgramPath() : '';
								$http.get(configs.narration_path + prog + fileName.replace(/\./g, "/") + "_audio-manifest.txt", {cache: false}).then(function(resp){man.resolve(resp.data)}, function(resp){man.resolve("{}")});
							   return man.promise;
                            } else return "{}";
                        }
                   } else return "";					
                }
            },
            data: {fileIndex: 0}
        };

        $stateProvider.state(obj);
    }


    function config(widgetsProvider, pathConstants) {
        widgetsProvider.setManifestGenerator(function () {
            return function (name) {
                return {
                    module: name,
                    //html: '/widgets/' + name+'/' + name + '.html',
                    html: pathConstants.pathWidgets + name + '/' + name + '.html',
                    files: [
                        pathConstants.pathWidgets + name + '/' + name + '.js',
                        //pathConstants.pathWidgets + name+'/' + name + '.css'
                    ]
                };
            };
        });
    }


//***** additional config section to define services to share with, and events to forward to the widget
//  IMPORTANT--this is the way we can pass  data between the hosting app and the widget!
//
    function configEventsAndServices(widgetsProvider) {
        widgetsProvider.addEventToForward("reloadWidget");
		widgetsProvider.addEventToForward("globalAudioON");
		widgetsProvider.addEventToForward("globalAudioOFF");
		widgetsProvider.addEventToForward("audioEnded");
		widgetsProvider.addEventToForward("audioLoaded");
		widgetsProvider.addEventToForward("unlimitedTries");
		widgetsProvider.addEventToForward("alwaysCorrect");
		widgetsProvider.addEventToForward("expandAll");
        widgetsProvider.addServiceToShare("interactiveData");
        widgetsProvider.addServiceToShare("audio");
        widgetsProvider.addServiceToShare('AudioControllerService');
		widgetsProvider.addServiceToShare('widgetNavigation');
        //widgetsProvider.addEventToForward("removeClass");
        //widgetsProvider.addEventToForward("addClass");
        //widgetsProvider.addEventToForward("animate");
    }


    function run($state) {
        $state.go('preview');
    }


    function ctlPreview($scope, $rootScope, $window, $location, widgets, previewConstants, $state, $stateParams, DataStoreService, interactiveData) {
        console.log('e');
        var widgetName = previewConstants.widgetName;
        var fileNameList = previewConstants.fileName;
        var fileName = getFileName($stateParams, fileNameList);
		 console.log('feedbackReviewFlag0', previewConstants.feedbackReviewFlag);
		interactiveData.feedbackReviewFlag = previewConstants.feedbackReviewFlag;
        interactiveData.widgetSession = DataStoreService.createSession(widgetName, fileName, 'modulette_preview', 'tab_preview', 'track_id_preview');
        interactiveData.widgetSession.save({initialized:true}, false);//auto save on start
        $scope.disabledButton = {next: false, previous: true};
        $scope.hiddenButton = {next: true, previous: true};
		$scope.audioButton = {turnOn: true, turnOff: false};
        $scope.widgetName = previewConstants.widgetName;
        $scope.guidedPractice = false;
		$scope.unlimitedTries = false;
		$scope.alwaysCorrect = false;
        if (previewConstants.widgetName == "guided_practice_widget") {
            $scope.guidedPractice = true;
        }
        if (previewConstants.fileNameListLength > 1) $scope.hiddenButton = {next: false, previous: false};

        //handle Reload from browser here... (TBD)
        window.document.title = "Preview " + previewConstants.fileName;  //set tab name

        //resets page
        $scope.reset = function () {
            var index = $stateParams.index;
			$scope.audioButton = {turnOn: true, turnOff: false};
			$scope.unlimitedTries = false;
			$scope.alwaysCorrect = false;
            $state.go($state.current.name, {}, {reload: true});
        }

        //Next
        $scope.next = function () {
            var maxIndex = previewConstants.fileNameListLength - 1;
            if ($state.current.data.fileIndex < maxIndex) {
                $state.current.data.fileIndex = $state.current.data.fileIndex + 1;
                $state.go("preview", {index: $state.current.data.fileIndex});
                $scope.disabledButton.previous = false;
                if ($state.current.data.fileIndex == maxIndex) $scope.disabledButton.next = true;
            }
        }

        //Previous
        $scope.previous = function () {
            if ($state.current.data.fileIndex > 0) {
                $state.current.data.fileIndex = $state.current.data.fileIndex - 1;
                $state.go("preview", {index: $state.current.data.fileIndex});
                $scope.disabledButton.next = false;
                if ($state.current.data.fileIndex == 0) $scope.disabledButton.previous = true;
            }
        }


        //expandAll
		$scope.expandAll = function() {
			$rootScope.$broadcast("expandAll");
		}

        //audioOff
		$scope.audioOff = function() {
			$scope.audioButton = {turnOn: true, turnOff: false};
			$rootScope.$broadcast("globalAudioOFF");
		}
		
		//audioOn
		$scope.audioOn = function() {
		   $scope.audioButton = {turnOn: false, turnOff: true};
		   $rootScope.$broadcast("globalAudioON");
		}

		//Unlimited tries allowed
		$scope.clickUnlimitedTries = function() {
		   console.log("unlimited tries ", $scope.unlimitedTries);
		   $rootScope.$broadcast("unlimitedTries");
		}

		//Unlimited tries allowed
		$scope.clickAlwaysCorrect = function() {
		   console.log("always correct ", $scope.unlimitedTries);
		   $rootScope.$broadcast("alwaysCorrect");
		}

		
    }


    function interactiveData() {
        //***** factory shared with the widget-used to pass intercative content (JSON string)to widget
        //
        return {interactive: "---"};
    }


    function audio($document, $rootScope) {
        var audioElement = $document[0].createElement('audio'); // <-- Magic trick here
        audioElement.onended = function () {
            $rootScope.$broadcast("audioEnded");
		}
        var ngAudioEl = angular.element(audioElement);    
        return {
            audioElement: audioElement,
            time: 0,

            play: function (filename) {
                if (filename != audioElement.src){
				   audioElement.src = filename;
                }                
                audioElement.play();
            },

            pause: function () {
                audioElement.pause();
                return  audioElement.currentTime;
            }

        }
    }

    //shared factory providing hook for navigation from Refresher and Try It  !PM
	//
	function widgetNavigation() {
       return {
	     tryIt: function() {
			 alert("Go to TryIt!");
		 },
         challenge: function() {
             alert("Go to Challenge!");
		 },
         otherLesson: function(){
             alert("Go to Other Mini Lesson!");
		 }
	   }
    }

}());
