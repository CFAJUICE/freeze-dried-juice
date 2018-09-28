(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'topnav';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('TopnavService', [TopnavService]).
      directive('topnav', ['UserService', '$location', '$stateParams', '$rootScope', 'TopnavService', topnav]);


  function TopnavService(){
    var service = {};

    //make it so external modules can update the search box text
    service.searchBoxText = null;

    return service;
  }
  function topnav(UserService, $location, $stateParams, $rootScope, TopnavService) {
    return {
      templateUrl:'/components/topnav/topnav.html'+hashAppend,
      link:function topnavLink($scope, element, attrs){
        $scope.location = $location;
        $scope.user = UserService.getUser();
        $scope.user_display_name = UserService.getUserDisplayName();
        $scope.$location = $location;

        //make it so search page can manipulate searchbox text and it will update
        $scope.$watch(function () { return TopnavService.searchBoxText; }, function (newVal, oldVal) {
          if (typeof newVal !== 'undefined') {
            $scope.searchBoxText = TopnavService.searchBoxText;
          }
        });

        $scope.searchButtonClick = function(){
          $location.path('/search/').search('q', $scope.searchBoxText);
          window.recordPageView('get');
          console.log('here');
          if(typeof(TopnavService.onQueryUpdate)==='function'){
            TopnavService.onQueryUpdate($scope.searchBoxText);
          }
        }

		$scope.showSkipLink = function () {
            $("#skiplink").removeClass("screen-reader-only");
		}

		$scope.hideSkipLink = function () {
            $("#skiplink").addClass("screen-reader-only");
		}

		$scope.initRefresherTab = function() {
            $rootScope.$broadcast("initRefresherTab");
		}

        $scope.go = function(path){
          $location.path(path);
        };
      }
    };
  }
})();