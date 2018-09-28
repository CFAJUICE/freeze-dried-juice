(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'img-with-fallback';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        directive('imgWithFallback', ['$location', Directive]);


    function Directive($location) {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: '/components/' + moduleName + '/' + moduleName + '.html'+hashAppend,
            scope: {
                src: '=',
                fallback: '=',
                imgclass: '='
            },
            link: function directiveLink($scope, element, attrs) {
                $scope.onImageError = function(a, b, c) {
                    if(a.attr('src') == a.attr('alt-src')){
                        a.attr('src', '/components/img-with-fallback/generic.png');
                    }else {
                        a.attr('src', a.attr('alt-src'));
                    }
                };
            }
        };
    }


})();