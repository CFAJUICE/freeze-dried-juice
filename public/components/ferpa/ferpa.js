(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'ferpa';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        directive(moduleName, ['UserSettingsService', Directive]);


    function Directive(UserSettingsService) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                ferpa: '='
            },
            templateUrl: '/components/' + moduleName + '/' + moduleName + '.html'+hashAppend,
            link: function directiveLink($scope, element, attrs) {
                $scope.ferpaAgree = false;
                $scope.doFerpaAgree = function(){
                    if(!$scope.ferpaAgree){
                        return false;//not checked
                    }
                    $scope.ferpa = false;
                    UserSettingsService.set('ferpa_agree', true);
                };
            }
        };
    }
})();