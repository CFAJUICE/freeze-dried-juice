'use strict';

(function() {
  var mainApp = 'juice';
  var moduleName = 'walkthrough-tooltip';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('WalkthroughTooltipService', ['ResourceHelperService', 'UserSettingsService', WalkthroughTooltipService]).
      directive('walkthroughTooltip', ['WalkthroughTooltipService',  '$window', '$timeout',  walkthroughTooltip]);

  function WalkthroughTooltipService(ResourceHelperService, UserSettingsService) {
    var service = {};
    service.current_step = 0;
    service.walkthrough_name = null;

    service.pageChange = function(){
      service.current_step = 0;
    }

    service.initalize = function(walkthrough_name){
      service.walkthrough_name = walkthrough_name;
      service.current_step = 0;
      UserSettingsService.get('walkthrough_completed_'+walkthrough_name, function(value){
        if((value===true)||(value==='true')){
          service.current_step = 0;
        }else{
          service.current_step = 1;
          service.scrollToCurrentStep();
        }
      });
    };

    service.play = function(walkthrough_name, step){
      if(!walkthrough_name){
        walkthrough_name = service.walkthrough_name;
      }
      service.current_step = typeof(step)==='undefined' ? 1 : step;
      if(service.current_step===0){
        UserSettingsService.set('walkthrough_completed_'+walkthrough_name, true);
      }else{
        UserSettingsService.set('walkthrough_completed_'+walkthrough_name, false);
      }
      service.scrollToCurrentStep();
    };

    service.stop = function(walkthrough_name){
      service.play(walkthrough_name, 0);
    }

    service.scrollToCurrentStep =  function(){
      var skip = false;
      var current = $('#walkthrough-'+service.current_step);
      var current_exists = current.length;
      var next_exists = $('#walkthrough-'+(1+service.current_step)).length;

      if(current_exists){
        var required_element = current.attr('data-required-element');
        if(required_element) {
          if(!$(required_element).is(':visible')){
            skip = true;
          }
          if($(required_element).css('visibility')==='hidden'){
            skip = true;
          }
        }
      }

      if((service.current_step !== 0) && (!current_exists) && (next_exists)) {
        skip = true;
      }
      if(skip) {
        service.current_step++;//skip over a missing step
        return service.scrollToCurrentStep();
      }else {
        setTimeout(function () {
          scrollToElement('#walkthrough-' + service.current_step);
        }, 300);
      }

    }
    function scrollToElement(id){
      var target = $(id);
      if(target.offset && target.offset() && target.offset().top) {
        $('html, body').animate({
          scrollTop: target.offset().top -300
        }, 100);
      }
    }
    return service;
  }

  function walkthroughTooltip(WalkthroughTooltipService, $window, $timeout) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl:'/components/walkthrough-tooltip/walkthrough-tooltip.html'+hashAppend,
      scope: {
        pointerBottom: '@',
        order: '@',
        position: '@',
        last: '@',
        leanLeft: '@',
        leanRight: '@',
        relativeTo: '@',
        leftAdjust: '@',
        topAdjust: '@',
        requiredElement: '@'
      },
      link:function tooltipLink($scope, element, attrs){
        $scope.service = WalkthroughTooltipService;
        $scope.button_text = $scope.last ? 'Done' : 'Next >';
        $timeout(adjustRelativeTo, 1000);
        angular.element($window).on('resize', adjustRelativeTo);
        angular.element($window).on('scroll', adjustRelativeTo);
        function adjustRelativeTo(){
          if($scope.relativeTo){
            var el = jQuery($scope.relativeTo);
            var offset = el.offset();
            if(!offset){
              return;
            }
            offset.left += Math.round(el.width()/2);
            offset.top += Math.round(el.height()/2);
            if($scope.leftAdjust){
              offset.left += Number($scope.leftAdjust);
            }
            if($scope.topAdjust){
              offset.top += Number($scope.topAdjust);
            }
            $scope.position = 'top:'+offset.top+'px; left:'+offset.left+'px;';
          }
        }

        $scope.next = function(button_text){
          if(button_text=='Done'){
            $scope.stop();
          }else{
            $scope.service.current_step++;
          }
          WalkthroughTooltipService.scrollToCurrentStep();
        }

        $scope.stop = function(){
          WalkthroughTooltipService.stop();
        }

        $scope.pointerBottomClass = helpers.strToBoolean($scope.pointerBottom) ? 'pointer-bottom' : '';
        $scope.leanLeftClass = helpers.strToBoolean($scope.leanLeft) ? 'lean-left' : '';
        $scope.leanRightClass = helpers.strToBoolean($scope.leanRight) ? 'lean-right' : '';
      }
    };
  }
})();