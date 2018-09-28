(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'test_post';
  helpers.addModuleToApp(mainApp, moduleName);
  var pages = [
    moduleName
  ];
  var pagesWithControllers = [
    moduleName
  ];

  angular.module(mainApp + '.' + moduleName, []).
      config(['$stateProvider', config]).
      controller('TestPostCtrl', ['$scope', TestPostCtrl]);

  function config($stateProvider) {
    helpers.addPagesAndControllers($stateProvider, pages, pagesWithControllers, moduleName+'/');
  }
  function TestPostCtrl($scope) {

  }
})();