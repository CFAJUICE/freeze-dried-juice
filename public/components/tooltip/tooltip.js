(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'tooltip';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      directive('tooltip', ['$location', tooltip]);


  function tooltip($location) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl:'/components/tooltip/tooltip.html'+hashAppend,
      scope: {
        hoverTarget: '='
      },
      link:function tooltipLink($scope, element, attrs){
        // do nothing
      }
    };
  }
})();