/*
 Provides an easy resource object creator
 */
(function() {
  'use strict';
  var moduleName = 'resource-helper';
  angular.module(moduleName, ['ngResource']).
      factory('ResourceHelperService', ['$resource', '$location', ResourceHelperService]);

  function ResourceHelperService($resource, $location) {
    var overrideObject = function (obj, overrides) {
      if ((!overrides) || (typeof(overrides) != 'object')) {
        return obj;
      }
      for (var key in overrides) {
        obj[key] = overrides[key];
      }
      return obj;
    }

    var ResourceHelperService = {
      createResources: function (resources) {
        var resourceObj = {};
        for (var key in resources) {
          var resource = resources[key];
          var overrides = resource.overrides ? resource.overrides : {};
          for(var key2 in resource){
            if((key2 != 'method') && (key2 != 'url') && (key2 != 'overrides')){
              overrides[key2] = resource[key2];
            }
          }
          if(resource.paramsList){
            if(!resource.params){
              resource.params = {};
            }
            resource.paramsList.forEach(function(param){
              resource.params[param] = '@' + param;
            });
          }
          resourceObj[key] = ResourceHelperService.createResource(resource.method, resource.url, overrides);
        }
        return $resource('', {}, resourceObj);
      },
      createResource: function (method, url, overrides) {
        if (method == 'GET') {
          return ResourceHelperService.resourceGet(url, overrides);
        } else {
          return ResourceHelperService.resourcePost(url, overrides);
        }
      },
      resourceGet: function (url, overrides) {
        var out =
        {
          method: 'GET',
          url: url,
          isArray: false,
          interceptor: {
            response: function (response) {
              var data = response.data;
              if (data.redirect) {
                $location.path(data.redirect + '?redirect_from=' + window.encodeURIComponent($location.path()));
              }
              return response.data;
            },
            responseError: function (rejection) {
              console.log(rejection);
            }
          }
        };
        var out = overrideObject(out, overrides);
        return out;
      },

      resourcePost: function (url, overrides) {
        var out = ResourceHelperService.resourceGet(url);
        out.method = "POST";
        out.headers = {'content-type': 'application/x-www-form-urlencoded'};
        out.transformRequest = $.param;
        out = overrideObject(out, overrides);
        return out;
      }
    }
    return ResourceHelperService;
  };
})();