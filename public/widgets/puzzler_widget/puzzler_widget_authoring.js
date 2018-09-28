var authoring = angular.module('puzzler_widget_authoring', [
  'angularWidget',
  'ngAnimate',
  'puzzler',
  'juice',
  'juice.authoring',
  'juice.games'
]);
authoring.controller('GameContentCtrl', ['$scope', '$timeout', 'ConfirmModal', 'GameData', GameContentController]);

function GameContentController($scope, $timeout, ConfirmModal, GameData) {
  'use strict';

  var vm   = this,
      data = GameData.section('content');

  //data api
  vm.data = data.data;
  vm.gameName = 'puzzler';
  vm.gameTitle = 'Puzzler';
  vm.gameDescription = '';
  vm.feedbackType = '';
  vm.header = 'Puzzler Authoring';


  //
  //Upgrade Data Format
  //
  angular.forEach(vm.data.rounds, function (round) {
    if (!round.answers) {
      return;
    }

    var answers = round.answers;
    round.answer_sets = [{
      answers: answers
    }];

    delete round.answers;
  });




  $scope.$on('authoring.saveModal.open', function () { //this is here to allow for data migrations more easily. before saving, make sure any data modifications take place
    //didn't originally put ids on different items in the puzzler authoring tool. this is here to migrate to the new format before saving.
    addIds(vm.data.rounds, function (round) {
      addIds(round.values, noop);
      addIds(round.answer_sets, function (answerSet) {
        addIds(answerSet.answers, noop);
      });
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

    vm.round.values = vm.round.values || [];
    //vm.round.answers = vm.round.answers || [];
    vm.round.answer_sets = vm.round.answer_sets || [];
    vm.round.feedback = vm.round.feedback || [{}];

    vm.values = vm.round.values;
    //vm.answers = vm.round.answers;
    vm.answer_sets = vm.round.answer_sets;
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
        question: '',
        question_align: 'center',
        equation: '',
        equation_align: 'center',
        values: [],
        answer_sets: [],
        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }
    vm.data.rounds.push(toAdd);
    //vm.data.number_rounds = vm.data.rounds.length;
    vm.changeRound(vm.data.rounds.length - 1);
    vm.currentRound = vm.data.rounds.length - 1;
  };
  vm.deleteRound = function (round) {
    console.log(arguments);

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
	$timeout(function() {vm.round.feedback = vm.data.rounds[vm.currentRound].feedback || [{}]}, 1000);
  };

  vm.changeRound(0);

  //ui sections
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
    answerSets: {
      add: function (answerSet) {
        var currentSet = this._get(answerSet);
        if (currentSet) {
          currentSet.answers.push({
            id: GameData.generateId()
          });
          return;
        }

        vm.answer_sets.push({
          id: GameData.generateId(),
          answers: [{
            id: GameData.generateId()
          }]
        });
      },
      remove: function (answerSet, answer) {
        var currentSet = this._get(answerSet);

        if (!currentSet) {
          return;
        }

        ConfirmModal.show({
          yesClass: 'btn-danger',
          content: 'Are you sure you want to remove this?',
          callback: function (confirmed) {
            if (!confirmed) { return; }

            if (answer) {
              currentSet.answers.splice(currentSet.answers.indexOf(answer), 1);
            } else {
              vm.answer_sets.splice(vm.answer_sets.indexOf(answerSet), 1);
            }
          }
        });
      },
      _get: function (answerSet) {
        return vm.answer_sets[vm.answer_sets.indexOf(answerSet)];
      },
      isEditing: function (answerSet) {
        this.editing = this.editing || {};
        return this.editing[answerSet.id];
      },
      setEditing: function (answerSet, isEditing) {
        this.editing = this.editing || {};
        this.editing[answerSet.id] = isEditing;
      }
    },
    feedback: {
      editing: false,
      add: function () {
        vm.feedback.push({
          id: GameData.generateId()
        });
        //data.add('feedback');
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

  //ui controls
  vm.add = function (section) {
    var args = Array.prototype.slice.call(arguments, 1);
    vm.sections[section].add.apply(vm.sections[section], args);
  };
  vm.remove = function (section) {
    var args = Array.prototype.slice.call(arguments, 1);
    vm.sections[section].remove.apply(vm.sections[section], args);
  };
  vm.isEditing = function (section, item) {
    return vm.sections[section].isEditing(item);
  };

  vm.toggleEdit = function (section, item) {
    if (vm.sections[section].setEditing) {
      vm.sections[section].setEditing(item, !vm.sections[section].isEditing(item));
    } else {
      vm.sections[section].editing = !vm.sections[section].editing;
    }
  };
  vm.addCondition = function (feedback) {
    feedback.conditions = feedback.conditions || [];
    feedback.conditions.push({});
  };
  vm.removeCondition = function (feedback, condition) {
    ConfirmModal.show({
      yesClass: 'btn-danger',
      content: 'Are you sure you want to remove this condition?',
      callback: function (confirmed) {
        if (!confirmed) { return; }
        feedback.conditions.splice(feedback.conditions.indexOf(condition), 1);
      }
    });
  };
}