var tempMcData = {};

angular.module('jumc',['ui.bootstrap', 'lvl.services']);
angular.module('jumc').controller('mc_authoringCtl', ['$scope', 'uuid', function ($scope, uuid) {
  window.parent.juGlobal_frameId = window.frameElement.id;
  $scope.mcData = {};
  $scope.mcData.content = {};
  $scope.mcData.content.displayType = "MC";
  $scope.mcData.content.noOfChoices = 2;
  $scope.mcData.content.selectdTry = 2;
  $scope.mcData.content.selectedColumn = 1;
  $scope.mcData.content.choices = [{"text":"Yes", "fixed":false, "correct":false}, {"text":"No", "fixed":false, "correct":false}, {"fixed":false, "correct":false}, {"fixed":false, "correct":false}, {"fixed":false, "correct":false}];
  (window.parent.juGlobal_currentInputId) ? $scope.mcData.mcid = window.parent.juGlobal_currentInputId : $scope.mcData.mcid = "mc_"+uuid.new();
  $scope.mcData.content.selectedTry = 2;
  $scope.mcData.content.selectedColumns = 1;
  //console.log($scope.mcData.mcid);
  if ($scope.mcData.mcid && window.parent.juGlobal_inputData[$scope.mcData.mcid]) $scope.mcData.content = window.parent.juGlobal_inputData[$scope.mcData.mcid];
 
  
  $scope.listChoices = [2, 3, 4, 5];
  //$scope.selectedChoice = 2;
  $scope.dropboxChoiceSelected = function (item) {
        $scope.mcData.content.noOfChoices = item;
   }

  $scope.listColumns = [1, 2];
  $scope.selectedColumns = 1;
  $scope.dropboxColumnsSelected = function (item) {
        $scope.mcData.content.selectedColumns = item;
   }

  $scope.listTries = [1, 2, 3, 4, 5];
  $scope.selectedTry = 2;
  $scope.dropboxTrySelected = function (item) {
        $scope.mcData.content.selectedTry = item;
   }
 


  $scope.$watch(function(scope) { 
	              return scope.mcData;
                },
                function(newVal) { 
				  window.parent.juGlobal_mcType = newVal.content.displayType;
                  window.parent.juGlobal_currentInputId = newVal.mcid;
                  tempMcData.content = newVal.content;
				  console.log("watch", newVal)
	            }, true                
              );

}]);

//called from the OK button in jumultchoice CKEditor plugin 
saveMC = function() {
  //tempMcData.content.correct = 1;
  //console.log(window.parent.juGlobal_inputData, window.parent.juGlobal_currentInputId,  tempMcData.content);
  window.parent.juGlobal_inputData[window.parent.juGlobal_currentInputId] = tempMcData.content;  
  console.log(tempMcData.content);
}