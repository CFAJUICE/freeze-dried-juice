/* global angular */
(function () {
  'use strict';
  var juice = angular.module('juice', [
    'ngRoute',
    'ngResource',
    'juice.clicks',
    'juice.services',
    'juice.progress',
    'ui.router',
    'ui.bootstrap'
  ]);

  juice.config(['$logProvider', function ($logProvider) {
    $logProvider.debugEnabled(false);
  }]);
  juice.run(function (Log) {
    Log.enableContext(['*']);
  });

  juice.filter('range', function() {
    return function(input, total) {
      total = parseInt(total, 10);
      for (var i = 1; i <= total; i++) {
        input.push(i);
      }
      return input;
    };
  });
})();