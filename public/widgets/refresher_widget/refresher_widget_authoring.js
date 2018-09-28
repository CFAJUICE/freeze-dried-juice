angular.module('refresher_widget_authoring', ['angularWidget', "ngAnimate", "ngSanitize", 'ui.bootstrap', 'ngCkeditor']);

angular.module('refresher_widget_authoring').controller("refresher_authoringCtl",[ "$scope", "interactiveData", "$timeout", "$animate", "$location", "$anchorScroll", "audio", "$modal", "$http", 
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

   // add external path for CKEDITOR custom plugins
   (function() {
	   var basePath = CKEDITOR.basePath;
       basePath = basePath.substr(0, basePath.indexOf("bower_components/"));
	   CKEDITOR.plugins.addExternal('nbsp', basePath + 'components/nbsp/', 'plugin.js');
   })();
	   
	   $scope.lclData = {};
	   $scope.lclData.metadata = {};
	   $scope.lclData.steps = [{settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, fullWhiteboard:0}}];

	   if (interactiveData.interactive.steps) {
		   $scope.lclData.steps = interactiveData.interactive.steps;
           $scope.lclData.metadata.objective = interactiveData.interactive.metadata.objective;
	       $scope.lclData.metadata.lastStepAudioPath ? $scope.lclData.metadata.lastStepAudioPath = interactiveData.interactive.metadata.lastStepAudioPath : $scope.lclData.metadata.lastStepAudioPath = "summary";
           $scope.lclData.overviewHeader = "Overview";
		   $scope.lclData.metadata.audioPath = interactiveData.interactive.metadata.audioPath;
		   var fileName;
		   interactiveData.fileName ? fileName = interactiveData.fileName : fileName = interactiveData.refKey.replace(/\./g, "/");
		   var arr = fileName.split("/");
		   if (arr.length > 1){ //if there are one or more "/" in the name
			   var audioPath;
			   for (var i=0; i<arr.length - 1 ; i++){
				   audioPath ? audioPath = audioPath + arr[i] + "/" : audioPath = arr[i] + "/"; 
			   }
               if (!$scope.lclData.metadata.audioPath) $scope.lclData.metadata.audioPath = audioPath + "Refresher";
           }
		   console.log("path = ", $scope.lclData.metadata.audioPath)

	   }


	   $scope.addStep = function(){
          $scope.lclData.steps.push({settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, fullWhiteboard:0}});
          gotoBottom();
	   }

	   $scope.insertStep = function(index){
          $scope.lclData.steps.splice(index+1, 0, {settings:{showAudio:1, showNext:1, showHeader:0, hideRightPanel:0, showNext:1, delayStep:0, delayRight:0, fullWhiteboard:0}});
	   }

	   $scope.removeStep = function(index){
          $scope.lclData.steps.splice(index, 1);
	   }


	   $scope.save = function () {
          var modalInstance = $modal.open({
            animation: false,
            templateUrl: 'saveModal.html',//+hashAppend,
            controller: 'saveModalCtl',
            size: "",
            resolve: {
              fname: function () {
                return interactiveData.fileName; 
              },
              fdata: function () {
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
	  $scope.editorOptions = {
		 skin: 'kama',
	     preset: 'standard',
         language: 'en',
		 toolbar: '',
	     allowedContent: true,
         extraPlugins: 'indent,indentblock,dialogadvtab,nbsp',
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

angular.module('refresher_widget_authoring').controller('saveModalCtl', ["$scope", "$modalInstance", "fname", "fdata", "$http", "refKey", "tableId", "rid", function ($scope, $modalInstance, fname, fdata, $http, refKey, tableId, rid) {

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

/*  Code below replaced by ngCkeditor module PM 08-09-2015

angular.module('refresher_widget_authoring').directive('ckEditor', [function () {
    return {
        require: '?ngModel',
        link: function ($scope, elm, attr, ngModel) {
            
            var ck = CKEDITOR.replace(elm[0]);
            
            ck.on('pasteState', function () {
                $scope.$apply(function () {
                    ngModel.$setViewValue(ck.getData());
                });
            });
            
            ngModel.$render = function (value) {
                ck.setData(ngModel.$modelValue);
            };
        }
    };
}])
*/