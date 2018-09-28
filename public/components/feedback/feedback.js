(function() {
  'use strict';
  var mainApp = 'juice';
  var moduleName = 'feedback';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('FeedbackService', ['ResourceHelperService', FeedbackService]).
      directive('feedback', ['FeedbackService', '$timeout', feedback]);

  function FeedbackService(ResourceHelperService) {
    var service = ResourceHelperService.createResources({
      postFeedback: {
        url: '/juice/feedback',
        method: 'POST',
        isArray: false
      },
    });
    return service;
  }

  function feedback(FeedbackService, $timeout) {
    return {
      restrict: 'E',
      templateUrl:'/components/'+moduleName+'/'+moduleName+'.html'+hashAppend,
      scope: {
      },
      link:function tooltipLink($scope, element, attrs){
        $scope.sent = false;
        var timeoutPromise = null;
        $scope.resetFeedback = function(){
          $scope.sent = false;
          $scope.sentError = null;
          $('#feedback-form').hide();
          $('#feedback-textarea').val('');
          if(timeoutPromise){
            console.log(timeoutPromise);
            $timeout.cancel(timeoutPromise);
            console.log(timeoutPromise);
          }
        };
        $scope.resetFeedback();
        $scope.submit = function(){
          console.log('submit');
          console.log('feedback service:',FeedbackService);
          $scope.sent = true;
          $scope.sentError = null;
          var text = $('#feedback-textarea').val();
          timeoutPromise  = $timeout($scope.resetFeedback, 4000);
          FeedbackService.postFeedback({text:text, url:window.location.href}, function(result){
            if(result.success === false){
              $scope.sentError = result.message;
            }
          });
        };
      }
    };
  }
})();