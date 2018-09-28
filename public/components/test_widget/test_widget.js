(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'test_widget';
  helpers.addModuleToApp(mainApp, moduleName);
  var pages = [
    moduleName
  ];
  var pagesWithControllers = [
    moduleName
  ];
  angular.module(mainApp + '.' + moduleName, []).
      config(['$stateProvider', configRouting]).
      controller('TestWidgetCtrl', ['$scope', TestWidgetCtrl]).
      config(['widgetsProvider', initializemanifestGenerator]).
      //config(['$stateProvider', pathConfig]).
      factory('interactiveData', function() {
        return {interactive: '---'};
      }).
      config(['widgetsProvider', widgetProviderConfig]);

  function widgetProviderConfig(widgetsProvider) {
    widgetsProvider.addServiceToShare('interactiveData');
  }

  function initializemanifestGenerator(widgetsProvider) {
    widgetsProvider.setManifestGenerator(function () {
      return function (name) {
        var dir = '/widgets/' + name + '/';
        return {
          module: name,
          html: dir + name + '.html',
          files: [
            dir + name + '.js',
            dir + name + '.css'
          ]
        };
      };
    });
  }

  function configRouting($stateProvider){
    //helpers.addPagesAndControllers($stateProvider, pages, pagesWithControllers, moduleName+'/');
  }

  function pathConfig($stateProvider){
    var widgetName = 'my_widget';
    var page = 'test_widget';
    var extraViewPath='test_widget/';
    setTimeout(function(){console.log(interactiveData)}, 2000);
    var obj = {
      name: "test_widget",
      url: '/' + page,
      template: '<ng-widget src="\'my_widget\'" delay="0" options="{test:\'asdf\'}"></ng-widget>',
      controller: function(interactiveData, wazzup){
        interactiveData.interactive = 123;
        console.log('in new controller', interactiveData, wazzup);
      },
      controllerAs: 'vm'
    };
    console.log(obj);

    $stateProvider.state(obj);
    /*

    var obj = {

      url: "/test_widget/",
      template: "<ng-widget  src=\"'"+widgetName+"'\" options=\"{}\"></ng-widget>",
      controller: function(interactiveData, file, $state, $stateParams){  //injects file service from resolve
        interactiveData.refKey = refKey;
        interactiveData.fileName = fileName;
        if (file) {
          interactiveData.interactive = file.data;
        } else {
          interactiveData.interactive = JSON.parse(authorTemplate);
        }
      },
      resolve: { //asynch load of the file done here
        file :  function($http, interactiveData, $stateParams, pathConstants, authorConstants){
          if (fileName) {
            if (fileName == "-") {
              return "";
            } else return $http.get(pathConstants.pathFiles + fileName +".txt", {cache: false})
          } else return "";
        }
      },
      data: {}
    };
*/
  }


  function TestWidgetCtrl($scope) {
    console.log('In TestWidgetCtrl');
  }


})();