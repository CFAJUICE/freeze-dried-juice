'use strict';
var notifyGlobal = {};
(function() {
  var mainApp = 'juice';
  var moduleName = 'notify';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      directive('notify', ['$location', 'NotifyService', '$timeout', notify]).
      factory('NotifyService',  ['$timeout', NotifyService]);

  function NotifyService($timeout){
    var service = {};
    service.message = '';
    service.showMessage = function(msg){
      console.log('did it')
      service.message = msg;
      console.log(msg, 'msg');
      /*
      $timeout(function(){

        if(service.message == msg){
          service.message = '';
        }
      }, 5000);
      */
    };

    setInterval(showGlobalNotify, 500);
    function showGlobalNotify(){
      if(!notifyGlobal.message){
        return;
      }
      service.showMessage(notifyGlobal.message);
      notifyGlobal.message = null;
    }

    service.getMessage = function(){
      console.log('message:', service.message);
      return service.message;
    }
    
    return service;
  }

  function notify($location, NotifyService, $timeout) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl:'/components/notify/notify.html'+hashAppend,
      scope: {
        hoverTarget: '='
      },
      link:function notifyLink($scope, element, attrs){
        $scope.service = NotifyService;
        $scope.showNotifyModal = function(update){
          if(update===false){
            $scope.service = null;
          }
        };
      }
    };
  }
})();