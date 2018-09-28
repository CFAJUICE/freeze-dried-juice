var puzzler = angular.module('puzzler_widget', [
  'angularWidget',
  'ngAnimate',
  'juice.games'
]);
puzzler.controller('PuzzlerCtrl', ['interactiveData', PuzzlerController]);
function PuzzlerController(interactiveData) {}