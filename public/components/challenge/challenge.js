(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'challenge';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      directive('challenge', [Directive]);

  function Directive() {
    return {
      restrict: 'E',
      templateUrl:'/components/'+moduleName+'/'+moduleName+'.html'+hashAppend,
      scope: {
      },
      link:function tooltipLink($scope, element, attrs){
        $('#loading').hide();
      
      }
    };
  }
})();