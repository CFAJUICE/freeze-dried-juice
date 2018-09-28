angular.module('showme_widget', ['ngAnimate']);

angular.module('showme_widget').controller("smctl",[ "$scope", "$timeout", "$animate", "$rootScope", function($scope, $timeout, $animate, $rootScope) {  //interactiveData factory shared from modulette!
   //$scope.title = interactiveData.interactive;
   $rootScope.testData = "test"
   $scope.lclData = {};
   $scope.lclData.tr1 = true;
   $scope.lclData.tr2 = false;
   $scope.lclData.tr1td = false;
   $scope.lclData.tr2td = false;
   $scope.lclData.button = false;
   $timeout(function(){$scope.lclData.tr1td = true; $timeout(function() {$scope.lclData.button = true;}, 1000)}, 1500);

   $scope.next = function() {
	  console.log($animate.enabled());
	  console.log(angular.element(document.getElementById('id2')).text());
      $scope.lclData.button = false; 
      $scope.lclData.tr2 = true;
	  $timeout(function(){$scope.lclData.tr2td = true}, 1500);
   };

}]);