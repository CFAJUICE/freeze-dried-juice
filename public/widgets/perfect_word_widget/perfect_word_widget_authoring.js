/* global angular */
(function () {
  'use strict';
  var authoring = angular.module('perfect_word_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'perfect_word',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'NotificationModal', 'GameData', 'FileService', 'TextParser', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, NotificationModal, GameData, FileService, TextParser) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'perfect_word',
      gameTitle: 'Perfect Word',
      gameDescription: 'Drag and Drop Game',
      feedbackType: '',
      header: 'Perfect Word Authoring',
      data: GameData.section('content').data
    });

	var vm = this;
    vm.fontSizes = [12, 14, 16];
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;
	vm.deleteImg = deleteImg;
    vm.changeRound(0);

    function createRound(id) {
      return {
        id: id,
        instructions: '',
        instructions_align: 'center',
        distractors_align: 'center',
        example: '',
        example_align: 'center',

        values: [],
        distractors: [],

        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }


    $scope.fileChanged = function (fileInput) {
      FileService.inputAsBase64(fileInput, function (base64Data) {
        vm.round.instructions_img = base64Data;
        $scope.$apply();
      });
    };


    function changeRoundData() {
      //vm.round.example = Util.newLineInput(vm.round.example);

      vm.round.values = vm.round.values || [];
      //vm.round.answers = vm.round.answers || [];
      //vm.round.answer_sets = vm.round.answer_sets || [];
      vm.round.feedback = vm.round.feedback || [{}];

      vm.values = vm.round.values;
      //vm.answers = vm.round.answers;
      vm.answer_sets = vm.round.answer_sets;
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

    function chunkAndUpdate(content, values) {
      var chunked = TextParser.tokenize(content),
          chunk;

      if (chunked.length < values.length) {
        values.splice(chunked.length, values.length - chunked.length); //remove extras from values array
      }

      for (var i = 0; i < chunked.length; i++) {
        chunk = chunked[i];
		chunk.text = chunk.text.replace('{{','[').replace('}}',']');
        if (i === values.length) {
          values.push({
            id: GameData.generateId(),
            content: chunk.text
          });
        } else {
          values[i].content = chunk.text; //chunked[i].text; !PM 10/06/2017
        }
      }
    }

	

	vm.updateDistractors = function () {
	  function replaceEmbeddedBrackets(strIn) {
		var str = strIn
		var str1 = str.replace(/\[[^\]]*\[/g, '$&{{').replace(/\][^\[]*\]/g, '}}$&');
		str1 = str1.replace(/\[{{/g, '{{').replace(/}}\]/g, '}}');
		return str1;
	  }
      var distractorContent = "";
      if (!vm.round.distractors) {
        vm.round.distractors = [];
      }
	  if (vm.round.distractors_content){
        distractorContent = replaceEmbeddedBrackets(vm.round.distractors_content);     
	  }
      chunkAndUpdate(distractorContent, vm.round.distractors);
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
      distractors: {
          editing: false
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