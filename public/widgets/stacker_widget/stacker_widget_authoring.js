/* global angular */
(function () {
  'use strict';

  var authoring = angular.module('stacker_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'stacker',
    'juice',
    'juice.authoring',
    'juice.games',
    'juice.services'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'GameData', 'FileService', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, GameData, FileService) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'stacker',
      header: 'Stacker Authoring',
      data: GameData.section('content').data
    });

    var vm = this;
    vm.fontSizes = [14, 16, 18, 20, 22];
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;
    vm.deleteImg = deleteImg;
    vm.changeRound(0);

    vm.sections = {
      values: {
        editing: false,
        add: function () {
          vm.values.push({
            id: GameData.generateId()
          });
        },
        remove: function (item) {
          ConfirmModal.show({
            yesClass: 'btn-danger',
            content: 'Are you sure you want to remove this value?',
            callback: function (confirmed) {
              if (!confirmed) { return; }
              vm.values.splice(vm.values.indexOf(item), 1);
              //  data.remove('values', item);
            }
          });
        }
      },
      answers: {
        editing: false,
        add: function () {
          vm.answers.push({
            id: GameData.generateId()
          });
        },
        remove: function (item) {
          ConfirmModal.show({
            yesClass: 'btn-danger',
            content: 'Are you sure you want to remove this answer?',
            callback: function (confirmed) {
              if (!confirmed) { return; }
              vm.answers.splice(vm.answers.indexOf(item), 1);
              //  data.remove('answers', item);
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

    $scope.fileChanged = function (fileInput) {
      FileService.inputAsBase64(fileInput, function (base64Data) {
        vm.round.instructions_img = base64Data;
        $scope.$apply();
      });
    };

    function deleteImg() {
      ConfirmModal.show({
        yesClass: 'btn-danger',
        content: 'Are you sure you want to remove this image?',
        callback: function (confirmed) {
          if (!confirmed) { return; }
          vm.round.instructions_img = null;
        }
      });
    }

    function createRound(id) {
      return {
        id: id,
        directions: '',

        scale_top: '',
        scale_bottom: '',
        values: [],
        answers: [],

        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }

    function changeRoundData() {
      vm.round.values = vm.round.values || [];
      vm.round.answers = vm.round.answers || [];
      vm.round.feedback = vm.round.feedback || [{}];

      vm.values = vm.round.values;
      vm.answers = vm.round.answers;
      vm.feedback = vm.round.feedback;
    }
  }
})();