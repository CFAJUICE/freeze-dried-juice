'use strict';

(function() {
  angular.module('my_widget', [
    'angularWidget'
  ]).
      controller('MyCtrl', ['interactiveData', WidgetController]);
  console.log('my widget loaded');
  function WidgetController(interactiveData) {
    console.log('in my_widget', interactiveData);
  }
})();
