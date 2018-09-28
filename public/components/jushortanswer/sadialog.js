var tempsaData = {};

angular.module('jusa',['ui.bootstrap', 'lvl.services']);
angular.module('jusa').controller('sa_authoringCtl', ['$scope', 'uuid', function ($scope, uuid) {
  window.parent.juGlobal_frameId = window.frameElement.id;
  $scope.saData = {};
  $scope.saData.content = {};
  $scope.saData.content.noOfInputs = 1;
  $scope.saData.content.selectedTry = 3;
  $scope.saData.content.inputs = [{'size':'75px'}, {'size':'75px'}, {'size':'75px'}, {'size':'75px'}, {'size':'75px'}];
  $scope.saData.insertMode = true;
  $scope.saData.content.correct = [["","","","",""]];
  $scope.saData.content.specificIncFeedback = [];
  console.log($scope.saData.content.correct);
  if (window.parent.juGlobal_currentInputId) {
	  $scope.saData.said = window.parent.juGlobal_currentInputId;
	  $scope.saData.insertMode = false;
  } else {
	  $scope.saData.said = "sa_"+uuid.new(); 
  }
  //$scope.saData.content.selectedColumns - 1;
  //console.log($scope.saData.said);
  if ($scope.saData.said && window.parent.juGlobal_inputData[$scope.saData.said]) {
	  $scope.saData.content = window.parent.juGlobal_inputData[$scope.saData.said];
	 if (!$scope.saData.content.correct) {  //fix for intial oversight--correct must be an array for short answers.
		  var ta = [];
		  $scope.saData.content.correct = [];
	      for (var i=0; i<5; i++ ){
				ta.push($scope.saData.content.inputs[i].correct);
          }
          ($scope.saData.content.correct).push(ta);
	  }
  }

  if (!$scope.saData.content.specificIncFeedback){
      $scope.saData.content.specificIncFeedback = [[]];   
  }
  
  $scope.listInputs = [1, 2, 3, 4, 5];
  //$scope.selectedChoice = 2;
  $scope.dropboxInputsSelected = function (item) {
        $scope.saData.content.noOfInputs = item;
   }

  /*$scope.listColumns = [1, 2];
  $scope.selectedColumns = 1;
  $scope.dropboxColumnsSelected = function (item) {
        $scope.saData.content.selectedColumns = item;
   }*/

  $scope.listTries = [1, 2, 3, 4, 5];
  $scope.dropboxTrySelected = function (item) {
        $scope.saData.content.selectedTry = item;
   }

  $scope.listInputTypes = ["text", "numeric"];
  $scope.dropboxInputTypeSelected = function (item) {
        $scope.saData.content.inputType = item;
   }

  $scope.listAnswerRules = ["Similar Form", "Exact Answer", "Any Equivalent Answer"]; //removed , "Fully Reduced Form"
  $scope.dropboxAnswerRuleSelected = function (item) {
        $scope.saData.content.answerRule = item;
   }

  $scope.saInputId = function(said, index) {
	  //console.log("input ID: ", said+"_"+index)
     $scope.saData.content.inputs[index].id = said+"_"+index; 
	 return said+"_"+index;  
  }

  $scope.addCorrectAnswer = function(){
	  var ta = ["", "", "", "", ""];
      $scope.saData.content.correct.push(ta);
  }

  $scope.removeCorrectAnswer = function(){
      $scope.saData.content.correct.pop();
  }

  $scope.addIncFeedback = function(){
	  var ta = ["", "", "", "", "",""];
      $scope.saData.content.specificIncFeedback.push(ta);
  }

  $scope.removeIncFeedback = function(){
      $scope.saData.content.specificIncFeedback.pop();
  }


  $scope.$watch(function(scope) { 
	              return scope.saData;
                },
                function(newVal) { 
                  window.parent.juGlobal_currentInputId = newVal.said;
                  tempsaData.content = newVal.content;
				  console.log("watch", newVal)
	            }, true);

}]);

//called from the OK button in jumultchoice CKEditor plugin 
saveSA = function() {
  //tempsaData.content.correct = 1;
  //console.log(window.parent.juGlobal_inputData, window.parent.juGlobal_currentInputId,  tempsaData.content);
  window.parent.juGlobal_inputData[window.parent.juGlobal_currentInputId] = tempsaData.content;  
  console.log(window.parent.juGlobal_inputData[window.parent.juGlobal_currentInputId]);
  console.log("in saveSA", tempsaData.content);
  window.parent.juGlobal_inputData[window.parent.juGlobal_currentInputId];
}