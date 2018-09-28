/* global angular */
(function () {
  'use strict';
  var authoring = angular.module('fridge_magnets_widget_authoring', [
    'angularWidget',
    'ngAnimate',
    'fridge_magnets',
    'juice',
    'juice.authoring',
    'juice.games'
  ]);
  authoring.controller('GameContentCtrl', ['$scope', '$controller', 'ConfirmModal', 'GameData', 'TextParser', 'Util', GameContentController]);

  function GameContentController($scope, $controller, ConfirmModal, GameData, TextParser, Util) {
    angular.extend(this, $controller('GameContentAuthoringMixin', {$scope: $scope}), {
      gameName: 'fridge_magnets',
      gameTitle: 'Fridge Magnets',
      gameDescription: '',
      feedbackType: '',
      header: 'Fridge Magnets Authoring',
      data: GameData.section('content').data
    });

    var vm = this;
    vm.createRound = createRound;
    vm.changeRoundData = changeRoundData;

    vm.changeRound(0);





    function createRound(id) {
      return {
        id: id,
        instructions: '',
        instructions_align: 'center',
        example: '',
        example_align: 'center',

        values: [],
        distractors: [],

        general_correct: '',
        general_incorrect: '',
        feedback: [{}]
      };
    }

    function changeRoundData() {
      vm.round.example = Util.newLineInput(vm.round.example);
      vm.round.feedback = vm.round.feedback || [{}];
      putValuesIntoValueSets(vm.round);
      vm.value_sets = vm.round.value_sets;
      setValuesContentFromValueSets();
      //vm.answers = vm.round.answers;
      vm.answer_sets = vm.round.answer_sets;
      vm.feedback = vm.round.feedback;
    }


    function setValuesContentFromValueSets(){
      var values_content = '';
      vm.round.value_sets.forEach(function(set){
        if(set.length) {
          if (values_content) {
            values_content += '\n';
          }
        }
        set.forEach(function(value){
          if(value.content.indexOf(' ') === -1){
            values_content+=''+value.content+' ';
          }else {//contains a space, wrap in brackets
            values_content += '[' + value.content + '] ';
          }
        });
      });
      vm.values_content = vm.round.values_content = values_content;
    }

    // this is to fix old data where there was only one set of answers
    function putValuesIntoValueSets(round){
      if(!round.value_sets){
        round.value_sets = [[]];
        if(round.values){
          round.values.forEach(function(value){
            round.value_sets[0].push(value);
          });
        }
      }
      delete round.values;
    }

    vm.sections = {
      values: {
        editing: false
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

    function chunkAndUpdate(content, values) {
      var chunked = TextParser.tokenize(content),
          chunk;

      if (chunked.length < values.length) {
        values.splice(chunked.length, values.length - chunked.length); //remove extras from values array
      }

      for (var i = 0; i < chunked.length; i++) {
        chunk = chunked[i];
        if (i === values.length) {
          values.push({
            id: GameData.generateId(),
            content: chunk.text
          });
        } else {
          values[i].content = chunked[i].text;
        }
      }
    }

    function sortByKey(array, key) {
      return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
      });
    }

    vm.arrayContentMatch = function(arr1, arr2){
      var a = sortByKey(arr1.concat([]), 'content');//clone array so not messing with it
      var b = sortByKey(arr2.concat([]), 'content');
      if(a.length != b.length) return false;
      for(var i = 0; i < a.length; i++){
        if(a[i].content != b[i].content){
          console.log(i, a[i], b[i], a[i]==b[i])
          return false;
        }
      }

      return true;
    }

    vm.updateValues = function () {
      vm.round.value_sets = [];
      var split_content = vm.round.values_content.split('\n');
      for(var i=0; i < split_content.length; i++){
        var values_arr = [];
        var content_line = split_content[i];
        chunkAndUpdate(content_line, values_arr);
        vm.round.value_sets.push(values_arr);
      }
      console.log('asfsd',vm.round.value_sets);
      //chunkAndUpdate(vm.round.values_content, vm.round.values);
    };

    vm.updateDistractors = function () {
      if (!vm.round.distractors) {
        vm.round.distractors = [];
      }
      chunkAndUpdate(vm.round.distractors_content, vm.round.distractors);
    };
  }
})();