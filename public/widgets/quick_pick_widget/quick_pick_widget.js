var quickPick = angular.module('quick_pick_widget', [
  'angularWidget',
  'ngAnimate',
  'juice.games'
]);
quickPick.controller('QuickPickCtrl', [QuickPickController]);
function QuickPickController() {}
