/* global angular */
(function () {
  'use strict';

  var authoring = angular.module('juice.authoring', [
    'ui.bootstrap',
    'ui.router',
    'ui.bootstrap',
    'juice.clicks',
    'juice.services'
  ]);
  authoring.directive('authoringSaveModal', ['$modal', '$rootScope', 'interactiveData', 'GameData', authoringSaveModal]);
  authoring.directive('gameEditor', [gameEditor]);
  function gameEditor() {
    return {
      restrict: 'E',
      templateUrl: '/components/authoring/game/editor.html'+hashAppend,
      transclude: true,
      bindToController: true,
      controller: '@',
      name: 'contentController'
    };
  }

  function authoringSaveModal($modal, $rootScope, interactiveData, GameData) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        element.bind('click', function (e) {
          $rootScope.$broadcast('authoring.saveModal.open');

          $modal.open({
            animation: false,
            templateUrl: '/components/authoring/save-modal.html'+hashAppend,
            controller: ['$modalInstance', 'AuthoringService', 'fname', 'fdata', 'refKey', 'tableId', 'rid', SaveModalCtrl],
            controllerAs: 'saveModal',
            resolve: {
              fname: function () {
                return interactiveData.fileName;
              },
              refKey: function() {
                return interactiveData.refKey;
              },
              fdata: function () {
                return JSON.stringify(GameData);
              },
              tableId: function() {
				return interactiveData.tableId;   
              },
			  rid: function() {
				return interactiveData.rid;   
              }
            }
          });
        });

        function SaveModalCtrl($modalInstance, AuthoringService, fname, fdata, refKey, tableId, rid) {
          var vm = this;
          vm.showSave = true;

          vm.fname = fname || refKey;
          vm.fdata = fdata;
		  vm.tableId = tableId;
		  vm.rid = rid;
		  vm.disableInput = tableId == "" ? false : true;


          $rootScope.$broadcast('authoring.beforeSave');
          vm.ok = function () {
            vm.saving = true;
            AuthoringService.post({
              fname: vm.fname,
              data: vm.fdata,
              refKey: refKey,
			  tableId: vm.tableId,
              rid: vm.rid
            }, function (responseData) {
              vm.saving = false;
              $modalInstance.close();
            }, function (err) {
              vm.showSave = false;
              vm.saving = false;
            });
          };

          vm.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      }
    };
  }

  authoring.controller('GameContentAuthoringMixin', ['$scope', 'ConfirmModal', 'GameData', '$location', GameContentAuthoringMixin]);
  authoring.controller('GameAuthoringCtrl', ['GameData', 'interactiveData', GameAuthoringController]);
  authoring.controller('GameSplashCtrl', ['$scope', 'GameData', 'FileService', GameSplashController]);
  authoring.controller('GameInstructionCtrl', ['$scope', 'GameData', 'FileService', GameInstructionController]);
  authoring.controller('GameFeedbackCtrl', ['GameData', GameFeedbackController]);

  function GameContentAuthoringMixin($scope, ConfirmModal, GameData, $location) {
    this.openFile = function () {
      $('#file-import').click();
    };
    $scope.is_challenge_wheel = ($location.absUrl().indexOf('challenge_wheel') !== -1);
    $scope.importFile = function (fileInput) {
      if (!fileInput.files[0]) {
        return;
      }

      var self = this;
      Papa.parse(fileInput.files[0], {
        complete: function (result) {
          self.onCsvParse && self.onCsvParse(result);
        }
      });
    };

    this.addRound = function () {
      this._addRound();
    };
    this.copyRound = function (toCopy) {
      this._addRound(toCopy);
    };
    this.deleteRound = function (round) {
      var self = this;
      ConfirmModal.show({
        yesClass: 'btn-danger',
        content: 'Are you sure you want to delete this round?',
        callback: function (confirmed) {
          if (!confirmed) { return; }
          var round = self.currentRound === 0 ? self.currentRound + 1 : self.currentRound - 1;
          self.data.rounds.splice(self.currentRound, 1);

          if (self.data.rounds[round]) {
            self.changeRound(round);
          } else {
            self.addRound();
          }
        }
      });
    };
    this.changeRound = function (index) {
      this.round = this.data.rounds[index];
      this.currentRound = index;

      if (!this.changeRoundData) {
        throw 'You must implement the method #changeRoundData';
      }
      this.changeRoundData(); //implemented by child class
    };
    this.changing = function () {
      this.changeRound(this.currentRound);
    };
    this._addRound = function (toCopy) {
      var id = GameData.generateId(),
          toAdd;

      if (toCopy) {
        toAdd = JSON.parse(JSON.stringify(toCopy));
        toAdd.id = id;
      } else {
        if (!this.createRound) {
          throw 'You must implement the method #createRound(id)';
        }
        toAdd = this.createRound(id); //implemented by child class
      }
      this.data.rounds.push(toAdd);
      //vm.data.number_rounds = vm.data.rounds.length;
      this.changeRound(this.data.rounds.length - 1);
      this.currentRound = this.data.rounds.length - 1;
    };

    //ui controls
    this.add = function (section) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.sections[section].add.apply(this.sections[section], args);
    };
    this.remove = function (section) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.sections[section].remove.apply(this.sections[section], args);
    };
    this.isEditing = function (section, item) {
      return this.sections[section].isEditing(item);
    };
    this.toggleEdit = function (section, item) {
      if (this.sections[section].setEditing) {
        this.sections[section].setEditing(item, !this.sections[section].isEditing(item));
      } else {
        this.sections[section].editing = !this.sections[section].editing;
      }
      if(!this.sections[section].editing){
        if(this.sections[section].onDoneEditing){
          this.sections[section].onDoneEditing();
        }
      }
    };
    this.addCondition = function (feedback) {
      feedback.conditions = feedback.conditions || [];
      feedback.conditions.push({});
    };
    this.removeCondition = function (feedback, condition) {
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

  function GameAuthoringController(GameData, interactiveData) {
    var vm = this;

    //vm.activeTab = 'instructions';
    vm.activeTab = 'gameplay';
    //vm.activeTab = 'feedback';
    //vm.activeTab = 'splash';
    interactiveData.interactive = { //!JPC CLEAN UP NEEDED - need to overwrite interactive data so we can live update preview in authoring
      general: GameData.section('general').data,
      splash: GameData.section('splash').data,
      instructions: GameData.section('instructions').data,
      content: GameData.section('content').data,
      feedback: GameData.section('feedback').data,
      activeTab: vm.activeTab
    };
	
    vm.tab = function (tab) {
      vm.activeTab = tab;
      interactiveData.interactive.activeTab = tab;
    };
  }

  function GameSplashController($scope, GameData, FileService) {
    var vm   = this,
        data = GameData.section('splash');
    vm.data = data.data;

    $scope.fileChanged = function (fileInput) {
      FileService.inputAsBase64(fileInput, function (base64Data) {
        vm.data.image = base64Data;
        $scope.$apply();
      });
    };
  }

  function GameInstructionController($scope, GameData, FileService) {
    var vm   = this,
        data = GameData.section('instructions');
    vm.data = data.data;
    $scope.fileChanged = function (fileInput) {
      FileService.inputAsBase64(fileInput, function (base64Data) {
        vm.data.image = base64Data;
        $scope.$apply();
      });
    };
  }

  function GameFeedbackController(GameData) {
    var vm   = this,
        data = GameData.section('review');
    vm.data = data.data;
  }
})();