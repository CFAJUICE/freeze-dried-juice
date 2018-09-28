/* globals angular */
'use strict';

var authoring = angular.module('sorter_widget_authoring', [
  'angularWidget',
  'ngAnimate',
  'sorter',
  'juice',
  'juice.authoring',
  'juice.games'
]);
authoring.controller('GameContentCtrl', ['$scope', '$timeout', 'Util', 'ConfirmModal', 'NotificationModal', 'GameData', 'TextParser', 'FileService', GameContentController]);

function GameContentController($scope, $timeout, Util, ConfirmModal, NotificationModal, GameData, TextParser, FileService) {
  var vm         = this,
      data       = GameData.section('content'),
      maxBuckets = 4;

  //data api
  vm.data = data.data;
  vm.gameName = 'sorter';
  vm.gameTitle = 'Sorter';
  vm.gameDescription = '';
  vm.feedbackType = 'immediate';
  vm.header = 'Sorter Authoring';
  vm.deleteImg = deleteImg;

  $scope.fileChanged = function (fileInput) {
    FileService.inputAsBase64(fileInput, function (base64Data) {
      vm.round.prompt_img = base64Data;
      $scope.$apply();
    });
  };

  $scope.$on('authoring.saveModal.open', function () { //this is here to allow for data migrations more easily. before saving, make sure any data modifications take place
    //didn't originally put ids on different items in the puzzler authoring tool. this is here to migrate to the new format before saving.
    addIds(vm.data.rounds, function (round) {
      addIds(round.buckets, noop);
      addIds(round.answers, noop);
      addIds(round.feedback, noop);
    });
    function addIds(array, callback) {
      if (!array) { return; }
      array.forEach(function (item) {
        if (!item.id) {
          item.id = GameData.generateId();
        }
        callback(item);
      });
    }
    function noop() {}
  });

  vm.changeRound = function (index) {
    vm.round = vm.data.rounds[index];

    vm.round.buckets = vm.round.buckets || [];
    vm.round.answers = vm.round.answers || [];
    vm.round.feedback = vm.round.feedback || [{}];

    vm.buckets = vm.round.buckets;
    vm.answers = vm.round.answers;
    vm.feedback = vm.round.feedback;

    vm.currentRound = index;
  };

  vm.addRound = function () {
    vm._addRound();
  };
  vm.copyRound = function (toCopy) {
    vm._addRound(toCopy);
  };
  vm._addRound = function (toCopy) {
    var id = GameData.generateId(),
        toAdd;

    if (toCopy) {
      toAdd = JSON.parse(JSON.stringify(toCopy));
      toAdd.id = id;
    } else {
      toAdd = {
        id: id,
        instructions: '',
        instructions_align: 'center',
        prompt_img: '',
        buckets: [],
        answers: [],
        general_correct: '',
        general_incorrect: '',
        feedback: []
      };
    }
    vm.data.rounds.push(toAdd);
    //vm.data.number_rounds = vm.data.rounds.length;
    vm.changeRound(vm.data.rounds.length - 1);
    vm.currentRound = vm.data.rounds.length - 1;
  };













  vm.deleteRound = function (round) {
    ConfirmModal.show({
      yesClass: 'btn-danger',
      content: 'Are you sure you want to delete this round?',
      callback: function (confirmed) {
        if (!confirmed) { return; }
        var round = vm.currentRound === 0 ? vm.currentRound + 1 : vm.currentRound - 1;
        vm.data.rounds.splice(vm.currentRound, 1);

        if (vm.data.rounds[round]) {
          vm.changeRound(round);
        } else {
          vm.addRound();
        }
      }
    });
  };
  vm.changing = function () {
    vm.changeRound(vm.currentRound);
  };


  vm.changeRound(0);


  //ui sections
  vm.sections = {
    buckets: {
      editing: false,
      _canAddMore: function () { return vm.buckets.length < maxBuckets; },
      add: function () {
        if (!this._canAddMore()) {
          return NotificationModal.show({
            message: 'You can\'t have more than 3 buckets'
          });
        }

        vm.buckets.push({
          id: GameData.generateId(),
          name: 'Bucket ' + (vm.buckets.length + 1)
        });
      },
      remove: function (item) {
        ConfirmModal.show({
          yesClass: 'btn-danger',
          content: 'Are you sure you want to remove this bucket?',
          callback: function (confirmed) {
            if (!confirmed) { return; }
            vm.buckets.splice(vm.buckets.indexOf(item), 1);
          }
        });
      }
    },
    answers: {
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
            //data.remove('feedback', item);
          }
        });
      }
    }
  };

  //ui controls
  vm.add = function (section) {
    vm.sections[section].add();
  };
  vm.remove = function (section, item) {
    vm.sections[section].remove(item);
  };
  vm.toggleEdit = function (section) {
    vm.sections[section].editing = !vm.sections[section].editing;
  };
  vm.updateAnswers = function () {
    var chunkedContent = TextParser.parse(vm.round.answer_content);
    //create a version of the content where the replacement text is replaced by generated ids?

    var liveText = chunkedContent.filter(function (content) { return content.isLive; });
    liveText.forEach(function (content, i) {
      if (content.isLive) {
        if (vm.answers[i]) {
          vm.answers[i].content = content.text;
        } else {
          vm.answers.push({
            id: GameData.generateId(),
            content: content.text
          });
        }
      }
    });
    vm.answers.splice(liveText.length);

    if (vm.timedMathJax) {
      $timeout.cancel(vm.timedMathJax);
    }

    vm.timedMathJax = $timeout(function () {
      Util.runMathJax(function () {});
    }, 200);
  };

  function deleteImg() {
    ConfirmModal.show({
      yesClass: 'btn-danger',
      content: 'Are you sure you want to remove this image?',
      callback: function (confirmed) {
        if (!confirmed) { return; }
        vm.round.prompt_img = '';
      }
    });
  }
}