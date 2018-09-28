(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'user-settings';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, ['juice.services', 'resource-helper']).
      factory('UserSettingsService', ['ResourceHelperService', UserSettingsService]);

  function UserSettingsService(ResourceHelperService) {
    var service = ResourceHelperService.createResources({
      getSettings: {
        url: '/juice/user_settings',
        method: 'GET',
        isArray: false
      },
      postSettings: {
        url: '/juice/user_settings',
        method: 'POST',
        isArray: false
      },
    });

    service.get = function(key, callback){
      service.getSettings(function(settings){
        return callback(settings[key]);
      });
    };

    service.set = function(key, val){
      service.postSettings({key:key, value:val}, function(settings){
        //do nothing?
      });
    };

    return service;
  };
})();