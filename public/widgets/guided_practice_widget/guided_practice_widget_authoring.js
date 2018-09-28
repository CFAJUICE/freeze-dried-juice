angular.module('guided_practice_widget_authoring', ['angularWidget', "ngAnimate", "ngSanitize", 'ui.bootstrap', 'ngCkeditor']);

angular.module('guided_practice_widget_authoring').controller("guidedPractice_authoringCtl",[ "$scope", "interactiveData", "$timeout", "$animate", "$location", "$anchorScroll", "audio", "$modal", "$http", 
	function($scope, interactiveData, $timeout, $animate, $location, $anchorScroll, audio, $modal, $http) {  //interactiveData factory shared from modulette!

    gotoBottom = function() {
         $timeout(function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('bottom');
        // call $anchorScroll()
        $anchorScroll();
     }, 10)
   };
    
	$scope.$watch('$viewContentLoaded', function() {
      gotoBottom();
   });

    // add external path for CKEDITOR custom plugins, as well as custom styles
   (function() {
	   var basePath = CKEDITOR.basePath;
       basePath = basePath.substr(0, basePath.indexOf("bower_components/"));
	   var stylesPath = basePath + "stylesheets/ck_styles.js";
       CKEDITOR.plugins.addExternal('jumultchoice', basePath + 'components/jumultchoice/', 'plugin.js');
	   CKEDITOR.plugins.addExternal('jushortanswer', basePath + 'components/jushortanswer/', 'plugin.js');
	   CKEDITOR.plugins.addExternal('nbsp', basePath + 'components/nbsp/', 'plugin.js');
   })();
	   
	   $scope.lclData = {};
	   $scope.lclData.metadata = {};
	   $scope.lclData.steps = [{settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, showRuler:0, showRFB:1}}];

	   if (interactiveData.interactive.steps) {
		   $scope.lclData.steps = interactiveData.interactive.steps;

           //initialize Show Right Float Box settings to true (default value)
           var noSteps = $scope.lclData.steps.length;
		   for (var i=0; i<noSteps ; i++){
              if ($scope.lclData.steps[i].settings.showRFB == null){
                  $scope.lclData.steps[i].settings.showRFB = 1;
              }
		   }

           $scope.lclData.metadata.objective = interactiveData.interactive.metadata.objective;
	       $scope.lclData.metadata.lastStepAudioPath = interactiveData.interactive.metadata.lastStepAudioPath;
           $scope.lclData.overviewHeader = "Overview";
           $scope.lclData.inputData = interactiveData.interactive.inputData;
		   $scope.lclData.rightFloatText = interactiveData.interactive.rightFloatText;
		   if ($scope.lclData.inputData) juGlobal_inputData = $scope.lclData.inputData;  //initialize global input object
	   }


	   $scope.addStep = function(){
          $scope.lclData.steps.push({settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, showRuler:0, showRFB:1}});
          gotoBottom();
	   }

	   $scope.insertStep = function(index){
          $scope.lclData.steps.splice(index+1, 0, {settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, showRuler:0, showRFB:1}});
	   }

	   $scope.removeStep = function(index){
          $scope.lclData.steps.splice(index, 1);
	   }


	   $scope.save = function () {
          var modalInstance = $modal.open({
            animation: false,
            templateUrl: 'saveModal.html', //+hashAppend,
            controller: 'saveModalCtl',
            size: "",
            resolve: {
              fname: function () {
                return interactiveData.fileName; 
              },
              fdata: function () {
                $scope.lclData.inputData = juGlobal_inputData;  //add multiple-choice data to lclData
				console.log(juGlobal_inputData);
                return JSON.stringify($scope.lclData);
              },
              refKey: function() {
                return interactiveData.refKey; 
              },
			  tableId: function() {
				return interactiveData.tableId;   
              },
			  rid: function() {
				return interactiveData.rid;   
              }
            }
          });

 
		  modalInstance.result.then(function(item) {
               // nothing to do here
           });
       };
     
	 var basePath = CKEDITOR.basePath;
	 basePath = basePath.substr(0, basePath.indexOf("bower_components/"));
     var stylesPath = basePath + "stylesheets/ck_styles.js";
	 console.log(stylesPath);
	 $scope.editorOptions = {
		 skin: 'kama',
	     preset: 'standard',
         language: 'en',
		 toolbar: '',
         extraPlugins: 'indent,indentblock,dialogadvtab,iframedialog,jumultchoice,jushortanswer,nbsp',
         allowedContent: true,
         height: '250px',
		 stylesSet: 'juicestyles:' + stylesPath
     };
     
	 CKEDITOR.on('dialogDefinition', function( ev ) {  //modify image dialog to change alt text field from text to textarea !PM 12/08/2016
		 var dialogName = ev.data.name;
         var dialogDefinition = ev.data.definition;
		 console.log(dialogDefinition);
		  if ( dialogName == 'image' ) {
			  dialogDefinition.contents[0].elements[1].type = "textarea";
		  }
     });


}]);

angular.module('guided_practice_widget_authoring').controller('saveModalCtl', ["$scope", "$modalInstance", "fname", "fdata", "$http", "refKey", "tableId", "rid", function ($scope, $modalInstance, fname, fdata, $http, refKey, tableId, rid) {

  $scope.fname = fname;
  $scope.fdata = fdata;
  $scope.showSave = true;
  $scope.refKey = refKey;
  if (!fname)  {
    $scope.fname = refKey; 
  }
  $scope.disableInput = tableId == "" ? false : true;
  //posts back to server
  post = function()  {
	     $scope.fname = $scope.fname.replace(/ /g, "_")
	     $http.post('/juice/author', {data: {fname: $scope.fname, data: $scope.fdata, refKey: refKey, tableId: tableId, rid: rid}}).success(function(data){
			if (data == "OK"){
				$scope.$close();
			} else {
               $scope.showSave = false;
            }
         });
  }

  $scope.ok = function () {
    post();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}]);


