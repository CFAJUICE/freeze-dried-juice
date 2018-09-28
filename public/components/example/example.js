(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'example';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        config(['$stateProvider', RouterConfig]).
        directive(moduleName, ['$location', Directive]).
        factory(moduleName + 'Service', ['ResourceHelperService', Service]).
        controller(moduleName + 'Ctrl', ['$scope', '$stateParams', Controller]);

    function Service(ResourceHelperService){
        var service = ResourceHelperService.createResources({
            exampleEndpoint: {
                url: '/some/path',
                method: 'GET',
                isArray: false
            },
        });
        service.bla = function(){/*example additional service*/};
        return service;
    }

    function RouterConfig($stateProvider){
        $stateProvider.state({
            name: moduleName,
            url: '/'+moduleName,
            templateUrl: '/components/'+moduleName+'/'+moduleName+'.html'+hashAppend,
            controller: Controller
        });
    }

    function Directive($location) {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: '/components/' + moduleName + '/' + moduleName + '.html'+hashAppend,
            scope: {
                somePassedParameter: '=' //this would be some-passed-parameter="something"
            },
            link: function directiveLink($scope, element, attrs) {
                $scope.instanceType = 'This is a directive!';
            }
        };
    }

    function Controller($scope, $stateParams){
        $scope.instanceType = 'This is as a controller!';
    }

})();