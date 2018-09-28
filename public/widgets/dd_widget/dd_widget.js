angular.module('dd_widget', ['lvl.directives.dragdrop', 'angularWidget'])


//***controller***
//NOTE:  GETTING UGLY--most of this should be moved to factory/services
//
angular.module('dd_widget').controller("ddctl",[ "$scope", "$rootScope", "widgetConfig", "interactiveData", function($scope, $rootScope, widgetConfig, interactiveData) {  //interactiveData factory shared from dd_main!
 
 function getChoiceIndex(choice, choices) {
  for (i=0; i<choices.length ; i++){
	  if (choice==choices[i]) return i;
  }
 }

//to randomize the choices
function shuffle(array) {
    var counter = array.length, temp, index;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
 }

//returns choice word, with correct capitalization (stored in 'text' attribute of choice td element)
$scope.getChoice = function(index) { return $scope.lclData.choicesClean[index]}

//calculates the value of x-lvl-drop-target
$scope.dropIsTrue = function(index) { 
	if ($scope.lclData.indexArr[index] >= 0) {
		return 'true'
    } else {
        return '' 
	}
}

//returns id for drop element
$scope.getDropIndex = function(index) { return "answer_" + $scope.lclData.indexArr[index]}

//returns id for drag element
$scope.getDragIndex = function(index) { return "choice_" + index}

//main logic to handle drop action--correctness, feedback display
$scope.dropped = function() {
      var drag = angular.element($rootScope.dragEl);
      var drop = angular.element($rootScope.dropEl);
      dragId = drag.attr("id");
      dropId = drop.attr("id");
      dragNo = dragId.split("_")[1];
      dropNo = dropId.split("_")[1];
      if (dragNo == dropNo){
        drop.text(drag.attr("text"));
        drag.attr("style", "visibility:hidden");
        drop.addClass("drag-style");
		$scope.$apply( $scope.lclData.correct = true);  //doesn't update the DOM without $apply for some reason
      } else {
        drag.addClass("dd-wrong-choice");
        drop.addClass("dd-wrong");
		$scope.$apply( $scope.lclData.incorrect = true);
	  }
  }

  // Clean-up feedback upon dragging a new choice
  $rootScope.$on("LVL-DRAG-START", function() {
     $scope.$apply( $scope.lclData.incorrect = false);
	 $scope.$apply( $scope.lclData.correct = false);
  });


    //get data passed from container page (JSON string)
    $scope.passedData = widgetConfig.getOptions();
	if (interactiveData.interactive != "") {
	   $scope.passedData = interactiveData.interactive;
	}

	//parse JSON data.  Identify choices.  Split text into static spans and drop-element spans  
    var rawText = $scope.passedData.content.text;
	var choicesClean = [];
	var choicesDisplay = [];
	var choices = rawText.match(/\[\[[^\[]+\]\]/g);
 if (choices) { 
	choices = shuffle(choices);
	choices.forEach(function(choice) {
	  var choiceClean = choice.replace('[[', '').replace(']]','');	 
      choicesClean.push(choiceClean);
	  choicesDisplay.push(choiceClean.toLowerCase());
	});
 }
	var dArr = rawText.split("[[");
	var dataArr = []
	var indexArr = [];
	j = 0;
	dArr.forEach(function(elem) {
		var n = elem.search(']]');
		if (n > 0){
			var st = elem.substr(0, n);
			index = getChoiceIndex(st, choicesClean);
			indexArr.push(index);
			dataArr.push("_______");
			st = elem.split("]]");
			dataArr.push(st[1]);
			indexArr.push(-1);
		} else {
            indexArr.push(-1);
			dataArr.push(elem);
        }
	});
 


	$scope.lclData = {choicesClean : choicesClean, choicesDisplay: choicesDisplay, dataArr: dataArr, indexArr: indexArr};
	$scope.lclData.correct = false;
    $scope.lclData.incorrect = false;

}]);


