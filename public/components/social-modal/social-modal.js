(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'socialModal';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        directive(moduleName, ['UserSettingsService', Directive]);


    function Directive(UserSettingsService) {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: '/components/' + 'social-modal' + '/' + 'social-modal' + '.html'+hashAppend,
            link: function directiveLink($scope, element, attrs) {
                $scope.doSocialAgree = function(){
                    $scope.showSocialModal = false;
                    UserSettingsService.set('social_welcome_viewed', true);
                    console.log('here');
                };
            }
        };
    }
})();