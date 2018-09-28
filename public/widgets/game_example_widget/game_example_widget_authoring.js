/* global angular */
(function () {
  'use strict';
  var authoring = angular.module('game_example_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'game_example',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'NotificationModal', 'GameData', 'FileService', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, NotificationModal, GameData, FileService) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'game_example',
      header: 'Game Example Authoring',
      data: GameData.section('content').data
    });

    var vm = this;
    vm.fontSizes = [12, 14, 16];

    vm.sections = {
      values: {
        editing: false,
        add: function () {
          vm.round.values = vm.values = vm.values || [];
          vm.values.push({
            id: GameData.generateId(),
            weight: 2
          });
        },
        remove: function (item) {
          ConfirmModal.show({
            yesClass: 'btn-danger',
            content: 'Are you sure you want to remove this value?',
            callback: function (confirmed) {
              if (!confirmed) { return; }
              vm.values.splice(vm.values.indexOf(item), 1);
            }
          });
        }
      },
      feedback: {
        editing: false,
        add: function () {
          vm.feedback.push({
            id: GameData.generateId()
          });
        },
        remove: function (item) {
          ConfirmModal.show({
            yesClass: 'btn-danger',
            content: 'Are you sure you want to remove this feedback?',
            callback: function (confirmed) {
              if (!confirmed) { return; }
              vm.feedback.splice(vm.feedback.indexOf(item), 1);
            }
          });
        }
      }
    };
  }
})();