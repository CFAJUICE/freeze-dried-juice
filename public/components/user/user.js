(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'user';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('UserService', ['ResourceHelperService', UserService]);



  function UserService(ResourceHelperService){

    var service = ResourceHelperService.createResources({
      getViewedUser: {
        url: '/juice/viewed_user',
        method: 'GET',
        isArray: false
      }
    });

    function getAttribute(attr){
      if(paramsFromServer.user){
        return paramsFromServer.user[attr];
      }
    }
    service.show_user = true;
    service.getUserDisplayName = function() {
      var name = getAttribute('display_name');

      if(!name) {
        name = getAttribute('lis_person_name_full');
      }

      if(!name){
        name = getAttribute('user_id');
      }

      return name;
    };
    service.getRoles = function() {
      return getAttribute('roles');
    };

    service.getUser = function(){
      if(paramsFromServer.user) {
        return paramsFromServer.user;
      }
    };

    service.getProgramPath = function() {
      var programId = service.getProgramId();
      if(!programId || (programId==='juice')) {
        return '';
      }
      return "programs/" + programId + "/";
    }

    service.getProgramId = function(){
      return paramsFromServer.program_id;
    }


    return service;
  }
})();