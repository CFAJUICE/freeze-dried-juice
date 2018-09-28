/* global angular, createjs, juice */
(function () {
  'use strict';

  var tumbler = angular.module('tumbler');
  tumbler.factory('TumblerGame', ['GameResolver', 'Log', function (GameResolver, Log) {
    GameResolver.register('tumbler', Game, {
      logo: '',
      backgrounds: {
        info: '',
        game: ''
      }
    });

    function Game() {
      Log.info('tumbler', 'inside `tumbler` constructor');
    }

    return Game;
  }]);
})();