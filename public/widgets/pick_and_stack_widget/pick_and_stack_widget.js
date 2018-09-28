//angular.module('pick_and_stack_constants').value('ASSETS', {'logo' : 'PickandStack_title_fin.png', 'infoBackground': 'PicknStack_background_grayscale.png', 'gameBackground' : 'PicknStack_background_darker.png'});
var pickAndStack = angular.module('pick_and_stack_widget', [
  'angularWidget',
  'ngAnimate',
  'juice.games'
]);
pickAndStack.controller('PickAndStackCtrl', ['ASSETS', PickAndStackController]);
function PickAndStackController(ASSETS) {
}

pickAndStack.run(['ASSETS', function(ASSETS){
   ASSETS.logo = 'PickandStack_title_fin.png';
   ASSETS.infoBackground = 'PicknStack_background_grayscale.png';
   ASSETS.gameBackground =  'PicknStack_background_darker.png';
}]);
