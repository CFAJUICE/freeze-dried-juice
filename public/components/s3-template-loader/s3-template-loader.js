(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 's3-template-loader';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        directive('s3TemplateLoader', ['$location', Directive]);

    function Directive($location) {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: function(elem,attrs) {
                return configs.file_path + attrs.path || '/components/' + moduleName + '/' + moduleName + '.html'+hashAppend;
            }
        };
    }

})();