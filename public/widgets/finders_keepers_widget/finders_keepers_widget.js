//
// FINDERS KEEPERS USES PICK-AND-STACK game.js AND view.js FILES!!!
//
//angular.module('pick_and_stack_constants').value('ASSETS', {'logo' : 'finderkeeper_logo.png', 'infoBackground': 'finderkeeper_background_gray.png', 'gameBackground' : 'finderkeeper_background.png'});
var findersKeepers = angular.module('finders_keepers_widget', [
  'angularWidget',
  'ngAnimate',
  'juice.games'
]);
findersKeepers.controller('FindersKeepersCtrl', ['ASSETS', FindersKeepersCtrl]);
function FindersKeepersCtrl(ASSETS) {
}

findersKeepers.run(['ASSETS', function(ASSETS){
    ASSETS.logo = 'finderkeeper_logo.png';
   ASSETS.infoBackground = 'finderkeeper_background_gray.png';
   ASSETS.gameBackground =  'finderkeeper_background.png';
}]);
