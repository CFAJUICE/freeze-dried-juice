angular.module('refresher_a_widget', ['angularWidget', "ngAnimate"]);

angular.module('refresher_a_widget').controller("refresherCtl",[ "$scope", "interactiveData", "$timeout", "$animate", "$location", "$anchorScroll", "audio", 
	function($scope, interactiveData, $timeout, $animate, $location, $anchorScroll, audio) {  //interactiveData factory shared from modulette!
   
   gotoBottom = function() {
     $timeout(function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('bottom');
        // call $anchorScroll()
        $anchorScroll();
     }, 10)
   };


   gotoBottom();
   $scope.lclData = {};
   

   $scope.$on("audioEnded", function() {
	  //alert("Ended!"); 
   });

   $scope.next1 = function() {
      $scope.lclData.step2 = true;
	  gotoBottom();
	  delay = 2000;
	  (function(i, delay) {$timeout(function(){$scope.lclData["delay"+i] = true; gotoBottom()}, delay);})(0, delay);
   };

   $scope.playNarration = function(url) {
      console.log(url);
      audio.play(url)
   }

   $scope.next2 = function() {
      $scope.lclData.step3 = true;
	  gotoBottom();
	  var delays = [3, 3, 3, 3, 3];
      var delay = 0; 
      for (var i=1; i < 6; i++){
	    delay = delay + delays[i-1] * 1000;
       (function(i, delay) {$timeout(function(){$scope.lclData["delay"+i] = true; gotoBottom()}, delay);})(i, delay);
      } 
	  $timeout(function(){$scope.lclData.tr2td = true}, 1500);
   };

   $scope.next5 = function() {
      $scope.lclData.step6 = true;
	  gotoBottom();
	  //delay = 2000;
	  //(function(i, delay) {$timeout(function(){$scope.lclData["delay"+i] = true; gotoBottom()}, delay);})(0, delay);
   };

   $scope.next6 = function() {
      $scope.lclData.step7 = true;
	  gotoBottom();
	  //delay = 2000;
	  //(function(i, delay) {$timeout(function(){$scope.lclData["delay"+i] = true; gotoBottom()}, delay);})(0, delay);
   };

}]);