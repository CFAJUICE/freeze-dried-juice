'use strict';

(function() {
  var mainApp = 'juice';
  var moduleName = 'filters';
  helpers.addModuleToApp(mainApp, moduleName);


  angular.module(mainApp + '.' + moduleName, []).
      filter("trustHTML", ['$sce', function trustHTML($sce) {
        return function (htmlCode) {
          htmlCode = helpers.replaceS3BucketVariables(htmlCode);
          return $sce.trustAsHtml(htmlCode);
        };
      }]).filter("round", function() { // register new filter
        return function(num, places) { // filter arguments
            if(!num) return '0';
            return num.toFixed(places); // implementation
        };
      });
})();