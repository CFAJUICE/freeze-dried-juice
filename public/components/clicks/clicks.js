(function () {
  var clicks = angular.module('juice.clicks', [
    'ui.bootstrap',
    'juice.games'
  ]);
  clicks.directive('cancelClick', ['preventClick', cancelClickDirective]);
  clicks.directive('clickSound', ['Sounds', clickSoundDirective]);

  function cancelClickDirective(preventClick) {
    return function (scope, element) {
      element.bind('click', function (e) {
        preventClick(e);
      });
    };
  }
  function clickSoundDirective(Sounds) {
    return function (scope, element) {
      element.bind('click', function (e) {
        Sounds.play(juice.sounds.click);
      });
    };
  }
})();