/* global angular */
(function () {
  'use strict';
  var module_name = 'highlighter_widget_authoring';
  var authoring = angular.module(module_name, [
    'angularWidget',
    'ngAnimate',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'GameData', 'FileService', 'NotificationModal', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, GameData, FileService, NotificationModal) {

    var game_name = module_name.replace('_widget_authoring', '');
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: game_name,
      header: game_name.split('_').join(' ').capitalize()+' Authoring',
      data: GameData.section('content').data
    });

    var vm          = this,
        MAX_CHOICES = 4;
    var MAX_ANSWERS = 10;
    vm.fontSizes = [12, 14, 16];
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;
    vm.deleteImg = deleteImg;
    $scope.onCsvParse = onCsvParse;
    vm.changeRound(0);


    $scope.fileChanged = function (fileInput) {
      var value;
      if (fileInput.getAttribute('data-type') === 'round-img') {
        if (!vm.round.instructions) {
          vm.round.instructions = {};
        }
        value = vm.round.instructions;
      } else {
        vm.round.icon = vm.round.icon || {};
        value = vm.round.icon;
      }

      FileService.inputAsBase64(fileInput, function (base64Data) {
        value.img = base64Data;
        $scope.$apply();
      });
    };

    vm.sections = {
      values: {
        editing: false,
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
    for(var key in vm.sections){
      if(vm.sections[key].initialize){
        vm.sections[key].initialize();
      }
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

    function onCsvParse(result) {
      console.log('parsed file', result);
    }

    function createRound(id) {
      return {
        id: id,
        instructions: {
          content: '',
          img: '',
          align: 'center'
        },
        text_display: 'bubble',
        prompt: {
          content: '',
          align: 'center'
        },
        icon: {
          img: ''
        },
        values: [],
        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }
    //
    function changeRoundData() {
      vm.round.instructions = typeof vm.round.instructions === 'string' ? {} : vm.round.instructions;
      vm.round.values = vm.round.values || [];
      vm.round.feedback = vm.round.feedback || [{}];
      vm.values = vm.round.values;
      vm.feedback = vm.round.feedback;
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