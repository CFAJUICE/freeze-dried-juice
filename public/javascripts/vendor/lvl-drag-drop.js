var module = angular.module("lvl.directives.dragdrop", ['lvl.services']);

module.directive('lvlDraggable', ['$rootScope', 'uuid', function($rootScope, uuid) {
	    return {
	        restrict: 'A',
	        link: function(scope, el, attrs, controller) {
	        	angular.element(el).attr("draggable", "true");
				angular.element(el).addClass("drag-style");
	            var id = angular.element(el).attr("id");
	            if (!id) {
	                id = uuid.new()
	                angular.element(el).attr("id", id);
	            }
	            
	            el.bind("dragstart", function(e) {
					id = angular.element(el).attr("id");   //!PM need to update id on-the-fly
	                e.dataTransfer.setData('Text', id);
	                $rootScope.$emit("LVL-DRAG-START");
	            });
	            
	            el.bind("dragend", function(e) {
	                $rootScope.$emit("LVL-DRAG-END");
	            });
	        }
    	}
	}]);

module.directive('lvlDropTarget', ['$rootScope', 'uuid', function($rootScope, uuid) {
	    return {
	        restrict: 'A',
	        scope: {
	            onDrop: '&',
                cleanFeedback: '&'
	        },
	        link: function(scope, el, attrs, controller) {
	            var id = angular.element(el).attr("id");
             var dropFlag = attrs.lvlDropTarget;
			 if (dropFlag == 'true'){     //!PM Activate drop-target functionality ONLY if x-lvl-drop-target='true' 
                           
	            if (!id) {
	                id = uuid.new()
	                angular.element(el).attr("id", id);    
	            }
	                       
	            el.bind("dragover", function(e) {
	              if (e.preventDefault) {
	                e.preventDefault(); // Necessary. Allows us to drop.
	              }
	              
	              e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
	              return false;
	            });
	            
	            el.bind("dragenter", function(e) {
	              // this / e.target is the current hover target.
	              angular.element(e.target).addClass('lvl-over');
				   e.preventDefault();   //!PM   Needed for IE.
				   e.stopPropagation();  //!PM   Needed for IE.
	            });
	            
	            el.bind("dragleave", function(e) {
	              angular.element(e.target).removeClass('lvl-over');  // this / e.target is previous target element.
	            });
	            
	            el.bind("drop", function(e) {
	              if (e.preventDefault) {
	                e.preventDefault(); // Necessary. Allows us to drop.
	              }

	             if (e.stopPropagation) {
	                e.stopPropagation(); // Necessary. Allows us to drop.
	              }
	            	var data = e.dataTransfer.getData("Text");
					id = angular.element(el).attr("id");      //!PM need to update id on-the-fly
	                var dest = document.getElementById(id);
	                var src = document.getElementById(data);
					$rootScope.dragEl = src;   //!PM  assign value on $rootScope 
					$rootScope.dropEl = dest;  //!PM
					scope.onDrop();
	            });

	            $rootScope.$on("LVL-DRAG-START", function() {
	                var el = document.getElementById(id);
	                angular.element(el).addClass("lvl-target");
					angular.element($rootScope.dragEl).removeClass("dd-wrong-choice");
                    angular.element($rootScope.dropEl).removeClass("dd-wrong");
	            });
	            
	            $rootScope.$on("LVL-DRAG-END", function() {
	                var el = document.getElementById(id);
	                angular.element(el).removeClass("lvl-target");
	                angular.element(el).removeClass("lvl-over");
	            });
	        }  //!PM  close of... if (dropFlag == "x-lvl-drop-target='true'")
		  }
    	}
	}]);


