/* global angular */
(function () {
  'use strict';

  var authoring = angular.module('tumbler_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'tumbler',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'GameData', GameContentController]);

  function GameContentController($scope, $controller, GameData) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'tumbler',
      gameTitle: 'Tumbler',
      gameDescription: '',
      feedbackType: '',
      header: 'Tumbler Authoring',
      data: GameData.section('content').data
    });
  }
})();