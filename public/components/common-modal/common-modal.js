(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'commonModal';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      directive('commonModal', ['$location', commonModal]);


  function commonModal($location) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl:'/components/common-modal/common-modal.html'+hashAppend,
      scope: {
        showModal: '&'
      },
      link:function commonModalLink($scope, element, attrs){
        // do nothing
      }
    };
  }
})();