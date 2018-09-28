/* global angular */
(function () {
  'use strict';

  var gameExample = angular.module('perfect_word_widget', [
    'angularWidget',
    'ngAnimate',
    'juice.games'
  ]);
  gameExample.controller('PerfectWordCtrl', [PerfectWordController]);
  function PerfectWordController() {}
})();