angular.module('place_holder_widget', ['angularWidget']);

angular.module('place_holder_widget').controller("phctl",[ "$scope", "interactiveData", function($scope, interactiveData) {  //interactiveData factory shared from modulette!
   $scope.title = interactiveData.interactive;
}]);
 