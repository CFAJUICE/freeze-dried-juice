angular.module('choice_widget', ['angularWidget']);

angular.module('choice_widget').controller("choiceCtl",[ "$scope", "interactiveData", function($scope, interactiveData) {
   $scope.links = interactiveData.interactive;
}]);