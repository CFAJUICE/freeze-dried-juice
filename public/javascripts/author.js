//module declaration for hosting page.  'Intercatives' modules is injected to pass data from server (see dd_main.jade)
//
angular.module('author', ['angularWidget', 'authorConstants', 'ui.router']);


//angular.module('author').constant('pathConstants', {'pathWidgets':'/widgets/', 'pathFiles': '/juice/files/'}); //local path
//angular.module('author').constant('pathConstants', {'pathWidgets':'/widgets/', 'pathFiles': configs.file_path}); //mixed path
angular.module('author').constant('pathConstants', {'pathWidgets':'/widgets/', 'pathFiles': configs.dev_file_path}); //ALWAYS authoring from dev!
//angular.module('author').constant('pathConstants', {'pathWidgets':configs.file_path, 'pathFiles': configs.file_path });  //S3 path

//***** config (required to initialize the widget provider in angularWidget module)
angular.module('author').config(["widgetsProvider", "pathConstants", function initializemanifestGenerator(widgetsProvider, pathConstants) {
    widgetsProvider.setManifestGenerator(function () {
      return function (name) {
		  var dirName = name.replace("_authoring", "");
         return {		  	  
          module: name,
          //html: '/widgets/' + name+'/' + name + '.html',
		  html: pathConstants.pathWidgets + dirName+'/' + name + '.html',
          files: [
            pathConstants.pathWidgets + dirName+'/' + name + '.js',
            //pathConstants.pathWidgets + name+'/' + name + '.css'
          ]
         };
      };
    });
  }]);



//***** config to initializing routing (ui-router)
angular.module('author').config(['$stateProvider', 'authorConstants', 'pathConstants', function ($stateProvider, authorConstants, pathConstants) {
  var widgetName = authorConstants.widgetName+"_authoring";
  var fileName = authorConstants.fileName;
  var refKey =  authorConstants.refKey;
  var tableId =  authorConstants.tableId;
  var rid =  authorConstants.rid;
  var programPrefix =  authorConstants.programPrefix;


  //build states and add to stateProvider
  var authorTemplate = '{"metadata":{"objective":"","lastStepAudioPath":""},"steps":[{"headerText":"","leftText":"<p>Left pane.</p><p>&nbsp;</p>","rightText":"<p>Right pane</p>","settings":{"showHeader":1,"showAudio":1,"audioPath":"","hideRightPanel":0,"showNext":1,"delayStep":"0","delayRight":"0"}}],"overviewHeader":"Overview"}';
  obj = { name: "author",
	      url: "/",
	      template: "<ng-widget  src=\"'"+widgetName+"'\" options=\"{}\"></ng-widget>",  
	      controller: function(interactiveData, file, $state, $stateParams){  //injects file service from resolve 
	                    interactiveData.refKey = refKey;
						interactiveData.fileName = fileName;
						interactiveData.tableId = tableId;
						interactiveData.rid = rid;
						if (programPrefix  && programPrefix != 'undefined'){
                            if (fileName.indexOf(programPrefix + "/") < 0) {
                                interactiveData.fileName = "programs/" + programPrefix + "/" + fileName;
                            }
						}	
                        if (file) {
							interactiveData.interactive = file.data;
						} else { 
							interactiveData.interactive = JSON.parse(authorTemplate);
						}	
                      },
		   resolve: { //asynch load of the file done here
		             file :  function($http, interactiveData, $stateParams, pathConstants, authorConstants){
						             if (fileName) {  
										   if (fileName == "-") {
	                                           return "";
										   } else return $http.get(pathConstants.pathFiles + fileName +".txt?t=" + new Date().getTime(), {cache: false}) 		   
					                 } else return "";
							 }
				    },
           data: {}
        };

   $stateProvider.state(obj);
}]);

angular.module('author').run(['$state', function ($state) {
   $state.go('author');
}])


//***** additional config section to define services to share with, and events to forward to the widget
//  IMPORTANT--this is the way we can pass  data between the hosting app and the widget!
//
angular.module('author').config([ "widgetsProvider", function(widgetsProvider) {
  widgetsProvider.addEventToForward("reloadWidget");
  widgetsProvider.addServiceToShare("interactiveData");
  widgetsProvider.addServiceToShare("audio");
}]);


//***** controller 
//
angular.module('author').controller("ctlAuthor", ["$scope", "$rootScope", "$window", "$location", "widgets", "authorConstants", "$state", "$stateParams", function($scope, $rootScope, $window, $location, widgets, authorConstants, $state, $stateParams) {
     
  $scope.widgetName = authorConstants.widgetName;
  //resets page 
  $scope.reset = function() {
     //var index =$stateParams.index;
	 $state.go($state.current.name, {} , {reload: true});
  }  
  window.document.title = "Edit " + authorConstants.fileName;  //set tab name

}]);




//***** factory shared with the widget-used to pass intercative content (JSON string)to widget
//
angular.module('author').factory("interactiveData", function() {
	  return {interactive: "---"};
});

//****** audio factory
angular.module('author').factory('audio', ["$document", "$rootScope",  function ($document, $rootScope) {
  var audioElement = $document[0].createElement('audio'); // <-- Magic trick here
  audioElement.onended = function() {
      $rootScope.$broadcast("audioEnded");
  }
  return {
    audioElement: audioElement,

    play: function(filename) {
        audioElement.src = filename;
        audioElement.play();     
    }
	// other actions here
	
  }
}]);

//
//**************** Global variables to store input data
//
juGlobal_inputData = {};
juGlobal_frameId = 0; 
juGlobal_currentInputId = 0;
juGlobal_mcType = 'MC';
