/* global angular */
(function () {
  'use strict';

  var fridgeMagnets = angular.module('fridge_magnets_widget', [
    'angularWidget',
    'ngAnimate',
    'juice.games'
  ]);
  fridgeMagnets.controller('FridgeMagnetsCtrl', [FridgeMagnetsController]);
  function FridgeMagnetsController() {}
})();