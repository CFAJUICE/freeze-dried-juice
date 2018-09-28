/* global angular */
(function () {
  'use strict';

  var authoring = angular.module('balancer_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'balancer',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'GameData', 'FileService', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, GameData, FileService) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'balancer',
      feedbackType: 'immediate',
      header: 'Balancer Authoring',
      data: GameData.section('content').data
    });

    var vm = this;
    vm.weights = [
      {id: 1, name: 'Lighter'},
      {id: 2, name: 'Equal'},
      {id: 3, name: 'Heavier'}
    ];
    vm.valueSizes = ['small', 'medium', 'large'];
    vm.fontSizes = [12, 14, 16];
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;
    vm.deleteImg = deleteImg;
    vm.updateAnswer = updateAnswer;
    vm.changeRound(0);

    $scope.fileChanged = function (fileInput) {
      var value;
      if (fileInput.getAttribute('data-is-comparison')) {
        if (!vm.round.comparison) {
          vm.round.comparison = {};
        }
        value = vm.round.comparison;
      } else if (fileInput.getAttribute('data-is-prompt')) {
        if (!vm.round.prompt) {
          vm.round.prompt = {};
        }
        value = vm.round.prompt;
      } else {
        value = _valueById(fileInput.getAttribute('data-value-id'));
      }

      FileService.inputAsBase64(fileInput, function (base64Data) {
        value.img = base64Data;
        $scope.$apply();
      });
    };

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

    function createRound(id) {
      return {
        id: id,
        comparison: {
          id: GameData.generateId(),
          weight: 1
        },
        instructions: {
          content: '',
          align: 'center'
        },
        prompt: {
          align: 'center',
          img: ''
        },
        values: [],
        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }

    function changeRoundData() {
      vm.round.instructions = typeof vm.round.instructions === 'string' ? {} : vm.round.instructions;

      vm.round.comparison = vm.round.comparison || {id: GameData.generateId()};
      vm.round.values = vm.round.values || [];
      vm.round.feedback = vm.round.feedback || [{}];

      vm.values = vm.round.values;
      vm.feedback = vm.round.feedback;
      vm.authoring_answer_display = _valueById(vm.round.answer);
    }

    function updateAnswer(valueId) {
      var value = _valueById(valueId);
      vm.authoring_answer_display = value;
      _markCorrect(value);
    }

    function deleteImg(value) {
      ConfirmModal.show({
        yesClass: 'btn-danger',
        content: 'Are you sure you want to remove this image?',
        callback: function (confirmed) {
          if (!confirmed) { return; }
          value.img = '';
        }
      });
    }

    function _valueById(valueId) {
      var value;
      for (var i = 0; i < vm.values.length; i++) {
        value = vm.values[i];
        if (value.id === valueId) {
          return value;
        }
      }
      return value;
    }
    function _markCorrect(value) {
      for (var i = 0; i < vm.values.length; i++) {
        vm.values[i].correct = vm.values[i] === value;
      }
    }
  }
})();
