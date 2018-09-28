(function() {

//helpers.addModuleToApp('dashboard', 'directives');

angular.module('dashboard.directives',[]);
angular.module('dashboard.directives').directive('dashboardModule', [dashboardModule]);
angular.module('dashboard.directives').directive('dashboardGoal', [dashboardGoal]);
//angular.module('dashboard.directives').directive('dashboardRecent', [dashboardRecent]);

/*function dashboardRecent() {
  return {
      restrict: 'E',
      replace: true,
	  scope: true,
	  controller: ['$scope', '$document', '$timeout', '$location', function($scope, $document, $timeout, $location) {
   
      }],
	  template: "<div style='padding:20px;'> <span style='background-color: yellow;'> THIS IS A PLACEHOLDER </span></div>",
      link: function(scope, elem, attrs) {
         scope.indexRecent = attrs.index;
		 scope.element = elem;
      }
  }
}*/


function dashboardModule() {
  return {
      restrict: 'E',
      replace: true,
	  scope: true,
	  controller: ['$scope', '$document', '$timeout', '$location', function($scope, $document, $timeout, $location) {
         $scope.makeHtmlId = helpers.makeHtmlId;

         $scope.isOverflowed = function() {
			 var elem = $('#module-inner-' + $scope.prefix + $scope.index);
			 return elem[0] ? elem[0].scrollHeight > elem[0].clientHeight + 2 : 0;
		 }
        

		 $scope.innerHeight = function() {
			 //return {height:'300px'};
			 var elem = $('#module-inner-' +  $scope.prefix + $scope.index);
			 return $scope.expanded? {height: elem[0].scrollHeight} : {} 
		 }

		 $scope.outerBox = function() {
             return $scope.expanded ? {position:'absolute', 'z-index':'500', background:'white', opacity:'1'} : {};
		 }

         $scope.iconDepth = function() {
             return $scope.expanded ? {'z-index':'600', 'top':'-17px', 'left':'188px'} : {};
		 }

		 $scope.boxExpand = function() {
            $scope.expanded = true;
			event.stopPropagation();
	        event.preventDefault();
			$scope.gotoBottom();
		 }

		 $scope.boxClose = function(event) {
			event.stopPropagation();
	        event.preventDefault();
            $scope.expanded = false;
		 }

		 $scope.isExpanded = function (event) {
             return $scope.expanded;
		 }

		 $scope.standardHeight = function() {
			 // var elem = $('#module-inner-' + $scope.index);
             return {  };  // float:'left', display:'inline-block',  padding:'10px',height:'188px',  width:'230px',background: 'yellow'
		 }

		 $scope.gotoBottom = function() {
            $timeout(function() {
		      var h = 0;
		      h = $('#expando-' + $scope.prefix + $scope.index).offset().top; //- $('#step_'+scrollStepNo).offset().top; //if not last step...
			    console.log("h= ", h, window.pageYOffset, window.innerHeight );
		      if (h > window.pageYOffset + window.innerHeight - 5){
				  $('#expando-' + $scope.prefix + $scope.index)[0].scrollIntoView(false);
		      }
          }, 10)
         }

		  $scope.filterModulettes = function(mod) {
             return parseInt(mod.order);
		  }

		  $scope.showReadOnly = function(v){
			  if (v==1) $scope.variables.showReadOnlyMessage = true; 
			  if (v==0) $scope.variables.showReadOnlyMessage = false; 

		  }

		  $scope.variables ={showReadOnlyMessage: false};

          $scope.hideFromDashboard = function(modulette) {
             return (modulette.hide_from_dashboard && modulette.hide_from_dashboard == 1) ? true : false;
          }

      }],
	  templateUrl: '/components/dashboard/module_template.html'+hashAppend,
      link: function(scope, elem, attrs) {
         scope.index = attrs.index;
		 scope.arialevel = parseInt(attrs.arialevel);
		 scope.ariasetsize = attrs.ariasetsize;
		 if (attrs.modid) scope.modid = attrs.modid.replace(/\./g, "_");
		 scope.ariaPosinset = parseInt(scope.index)+1;
		 scope.element = elem;
		 if(attrs.timeframe) scope.timeFrame = attrs.timeframe;
         scope.prefix = attrs.timeframe ? attrs.timeframe +"-" : ""; 
      }
  }
}

function dashboardGoal() {
  return {
      restrict: 'E',
      replace: true,
	  scope: true,
	  controller: ['$scope', '$document', '$timeout', '$location', function($scope, $document, $timeout, $location) {
		 $scope.projectExpanded = {};
		 $scope.projectExpand = function(index, event) {
		  if (!$scope.isAnyprojectExpanded()) {
			 $scope.common.anyprojectExpandedFlag = false;
			//$scope.clearModuleList();
			$scope.projectExpanded = {};
            $scope.projectExpanded[index] = true;
			$scope.common.anyprojectExpandedFlag = true;
			event.stopPropagation();
	        event.preventDefault();
			$scope.moduleListStyles = {};
			$scope.gotoBottom();
		  }  else if ($scope.projectExpanded[index]) {
             $scope.clearModuleList();
			 event.stopPropagation();
	         event.preventDefault();
		  }
		 }

		 $scope.isprojectExpanded = function (index) {
            return $scope.projectExpanded[index];
		 }

		 $scope.isAnyprojectExpanded = function() {
            return $scope.common.anyprojectExpandedFlag;
		 }


		 $scope.clearModuleList = function() {
            $scope.projectExpanded = {};
			$scope.common.anyprojectExpandedFlag = false;
			//$scope.gotoBottom();
		 }

		 $scope.moduleListWidth = function(length, goal, index) {
			var w = 270 * length + 25;
			while (w > window.innerWidth - 50) {
               w = w - 270;
			} 
			w = Math.max(w, 295); //minimum one column!!
			var elem = '#project-'+ goal + '-' + index;
			var left = $(elem).offset().left;
			var right = left + w; 
			var xTrans = 0;
            if (right > window.innerWidth){
               xTrans = window.innerWidth - right -50;
			   if (w < 370) xTrans = xTrans + 30;
            }
			return {'width': w+'px', 'left': xTrans+'px'}; 
		 }

		 $scope.disabledGoals = function(index) {
            return $scope.isAnyprojectExpanded() && !$scope.isprojectExpanded(index) ? {'background': '#CCCCCC' } : {};
		 }

		 $scope.gotoBottom = function() {
            $timeout(function() {
		      var h = 0;
		      h = $('#bottom').offset().top; 
			  console.log("h= ", h, window.pageYOffset, window.innerHeight );
		      if (h > window.pageYOffset + window.innerHeight - 5){
				  $('#bottom')[0].scrollIntoView(false);
		      }
          }, 100) 
         }

		  $scope.$on('$locationChangeStart', function(event, next, current) {
	         $scope.common.anyprojectExpandedFlag = false;
          });

          $scope.getModuleIndex = function(moduleId) {
			  for (var i=0; i < $scope.modules.length ; i++ ){
				  if ($scope.modules[i].id == moduleId) return i;
			  }
		   }

		   $scope.getProjectId = function(goal, index) {
              return 'project-'+goal+ '-' +index;
		   }

		   $scope.doNothing = function(event) {
             event.stopPropagation();
	         event.preventDefault();
		   }

      }], 
	  templateUrl: '/components/dashboard/goal_template.html'+hashAppend,
      link: function(scope, elem, attrs) {
         scope.indexGoal = attrs.index;
		 scope.element = elem;
      }
  }
}


})();