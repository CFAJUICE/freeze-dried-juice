/* global angular */
(function () {
  'use strict';

  var gameExample = angular.module('game_example_widget', [
    'angularWidget',
    'ngAnimate',
    'juice.games'
  ]);
  gameExample.controller('GameExampleCtrl', [GameExampleController]);
  function GameExampleController() {}
})();