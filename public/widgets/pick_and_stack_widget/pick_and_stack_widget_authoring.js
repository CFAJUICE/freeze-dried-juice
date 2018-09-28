/* global angular */
(function () {
  'use strict';

  var authoring = angular.module('pick_and_stack_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'pick_and_stack',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  angular.module('pick_and_stack_constants').value('ASSETS', {'logo' : 'PickandStack_title_fin.png', 'infoBackground': 'PicknStack_background_grayscale.png', 'gameBackground' : 'PicknStack_background_darker.png'});
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'GameData', 'FileService', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, GameData, FileService) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'pick_and_stack',
      header: 'Pick And Stack Authoring',
      data: GameData.section('content').data
    });

    var vm          = this,
        MAX_ANSWERS = 10;
    vm.customFeedbackAuthoring = true;
    vm.feedbackType = 'immediate';
    vm.fontSizes = [12, 14, 16];
    vm.valueSizes = ['small', 'medium', 'med-large', 'large'];
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;
    vm.deleteImg = deleteImg;
    vm.changeRound(0);

    $scope.fileChanged = function (fileInput) {
      FileService.inputAsBase64(fileInput, function (base64Data) {
        vm.round.instructions_img = base64Data;
        $scope.$apply();
      });
    };

    vm.sections = {
      values: {
        editing: false,
        add: function () {
          vm.round.values = vm.values = vm.values || [];
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
            }
          });
        }
      },
      answers: {
        editing: false,

        _canAddMore: function () { return (vm.round.answers ? vm.round.answers.length: 0) < MAX_ANSWERS; },
        add: function () {
          if (!this._canAddMore()) {
            return NotificationModal.show({
              message: 'You can\'t have more than ' + MAX_ANSWERS + ' answers'
            });
          }

          vm.round.answers = vm.answers = vm.answers || [];
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
      },
      feedbackPick: {
        add: function () {
          vm.feedback.push({
            id: GameData.generateId(),
            type: 'pick'
          });
        }
      },
      feedbackStack: {
        add: function () {
          vm.feedback.push({
            id: GameData.generateId(),
            type: 'stack'
          });
        }
      }
    };

    function createRound(id) {
      return {
        id: id,
        instructions: {
          content: '',
          align: 'center',
          fontSize: ''
        },
        prompt: {
          content: '',
          align: 'center'
        },
        titles: {
          pick: '',
          stack: ''
        },
        values: [],
        disregard_order: false,
        answers: [],
        general_correct: '',
        general_stack_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }

    function changeRoundData() {
      vm.round.values = vm.round.values || [];
      vm.round.answers = vm.round.answers || [{}];
      vm.round.feedback = vm.round.feedback || [{}];
      vm.values = vm.round.values;
      vm.answers = vm.round.answers;
      vm.feedback = vm.round.feedback;
    }

    function deleteImg() {
      ConfirmModal.show({
        yesClass: 'btn-danger',
        content: 'Are you sure you want to remove this image?',
        callback: function (confirmed) {
          if (!confirmed) { return; }
          vm.round.instructions_img = '';
        }
      });
    }
  }
})();