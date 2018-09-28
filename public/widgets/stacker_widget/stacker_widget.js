/* global angular */
(function () {
  'use strict';

  var stacker = angular.module('stacker_widget', [
    'angularWidget',
    'ngAnimate',
    'juice.games'
  ]);
  stacker.controller('StackerCtrl', [StackerController]);
  function StackerController() {}
})();