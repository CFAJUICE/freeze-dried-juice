'use strict';

(function () {
    var mainApp = 'juice';
    var moduleName = 'logout-user';
    helpers.addModuleToApp(mainApp, moduleName);
    var pages = [
        moduleName
    ];
    var pagesWithControllers = [
        moduleName
    ];
    angular.module(mainApp + '.' + moduleName, []).
        config(['$stateProvider', routerConfig]).
        controller('LogoutUserCtrl', ['$scope',  LogoutUserCtrl]);

    function routerConfig($stateProvider) {
        $stateProvider.state({
            name: 'logout-user',
            url: '/logout-user',
            controller: LogoutUserCtrl,
            templateUrl: '/components/logout-user/logout-user.html'+hashAppend
        });
    }

    function LogoutUserCtrl($scope) {
        setTimeout(
            function(){
                $.get('/juice/logout', function(){
                    window.location.href = 'logout';
                });
            }, 300);
    }
})();