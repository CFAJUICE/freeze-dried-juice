//module declaration for hosting page.  'Intercatives' modules is injected to pass data from server (see dd_main.jade)
//
angular.module('dd_main', ['angularWidget', 'Interactives']);


//***** config (required to initialize the widget provider in angularWidget module)
angular.module('dd_main').config(["widgetsProvider", function initializemanifestGenerator(widgetsProvider) {
    widgetsProvider.setManifestGenerator(function () {
      return function (name) {
        return {
          module: name,
          html: '/widgets/' + name+'/' + name + '.html',
          files: [
            '/widgets/' + name+'/' + name + '.js'
            //'../widgets/' + name+'/' + '.css'
          ]
        };
      };
    });
  }]);


//***** additional config section to define services to share with, and events to forward to the widget
//  IMPORTANT--this is the way we can pass  data between the hosting app and the widget!
//
angular.module('dd_main').config([ "widgetsProvider", function(widgetsProvider) {
  widgetsProvider.addEventToForward("reloadWidget");
  widgetsProvider.addServiceToShare("interactiveData");
}]);



//***** controller 
//
   angular.module('dd_main').controller("ctl1", ["$scope", "$rootScope", "$http", "$window", "$location", "widgets", "interactiveData", "getInteractive"  ,"constants", function($scope, $rootScope, $http, $window, $location, widgets, interactiveData, getInteractive  ,constants ) {

  // initialize content values
  interactiveData.interactive = JSON.parse(constants.inter1);   // widget content
  $scope.lclData = {rawText: constants.rawText};        // authoring area content
 
  //posts edited content back to server
  $scope.postItems = function()  {
	 $http.post('/dand', {data: document.getElementById('ta').value}).success(function(data){
			var url = 'http://' +  $location.host() + ':' + $location.port() + '/dand/temp';
			$window.location.href = url;			
     });
  }
  
  //reloads page with original content
  $scope.reset = function() {
	 var url = "http://" + $location.host() + ':' + $location.port() + '/dand/meal';
     $window.location.href = url;
  }

  //back to home page
  $scope.goHome = function() {
	 var url = 'http://' + $location.host() + ':' + $location.port();
     $window.location.href = url; 
  }

  //reloads the widget with new content (provided by 'getInteractive' factory), 
  $scope.reLoad = function() {
	  interactiveData.interactive = getInteractive.interactive;
	  $scope.lclData.rawText = interactiveData.interactive.content.text;  //extract text from content to feed to authoring area
 	  $rootScope.$broadcast("reloadWidget");
  }
}]);


//***** factory shared with the widget-used to pass intercative content (JSON string)to widget
//
angular.module("dd_main").factory("interactiveData", function() {
	  return {interactive: "---"};
});


//**** factory returning new intercative content (called on 'Load Another Question' button click).  See config section above 
//
angular.module("dd_main").factory("getInteractive", function() {
	  var feedback = {correctFeedback:"Great job!", incorrectFeedback:"Sorry, this is not correct (placeholder--will be answer-specific)."};
	  var interactive = {content: {text : "[[Alpha]] is for A, [[Bravo]] is for B, and [[Zulu]] is for Z."}, feedback : feedback};
	  return {interactive: interactive};
});
