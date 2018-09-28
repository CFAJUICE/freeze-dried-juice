(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'author-program';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        config(['$stateProvider', RouterConfig]).
        factory('AuthorProgramService', ['ResourceHelperService', Service]).
        controller(moduleName + 'Ctrl', ['$scope', '$stateParams', 'AuthorProgramService', '$rootScope', 'ProgramValueService', Controller]);

    function Service(ResourceHelperService){
        var service = ResourceHelperService.createResources({
            save: {
                url: '/juice/s3save',
                method: 'POST',
                isArray: false
            },
        });
        service.bla = function(){/*example additional service*/};
        return service;
    }

    function RouterConfig($stateProvider){
        $stateProvider.state({
            name: 'author-program-no-program-id',
            url: '/'+moduleName,
            templateUrl: '/components/'+moduleName+'/author-program-no-program-id.html'+hashAppend,
            controller: Controller
        }).state({
            name: moduleName,
            url: '/' + moduleName + '/:programId',
            templateUrl: '/components/'+moduleName+'/'+moduleName+'.html'+hashAppend,
            controller: Controller
        });
    }

    function Controller($scope, $stateParams, AuthorProgramService, $rootScope, ProgramValueService){
        $scope.form = [];
        $scope.outputData = null;
        var programDefaults = null;
        $scope.submit = function(){
            var formData = $('#author-program-form').serializeArray();
            formData.forEach(function(element){
               deepSet($scope.outputData, element.name, element.value);
            });
            console.log('saving', $scope.outputData);
            AuthorProgramService.save({fname:'programs/'+$stateParams.programId+'/program.json', data:JSON.stringify($scope.outputData, null, 2)}, function(response){
                $('#top-path-author-program').scrollTop();
                $scope.response = response;
            });
        };
        
        $scope.close = function(){
            $scope.form = [];
            setValues();
            $scope.response = null;
        }

        function deepSet(object, path, value){
            path = path.split('.');
            var target_ptr = object;
            if(value==='true') value = true;
            if(value==='false') value = false;

            for(var i = 0; i<path.length; i++) {
                if (path.length === i + 1) {
                    target_ptr[path[i]] = value;
                }else{
                    target_ptr = target_ptr[path[i]];
                }
            }
        }
        function setValues() {
            ProgramValueService.getProgramDefaults(function (data) {
                programDefaults = JSON.parse(JSON.stringify(data));
                ProgramValueService.getProgramData($stateParams.programId, data, function (data) {
                    $scope.outputData = data;
                    delete data.help.form_hidden_help_options;
                    objectToFormArray($scope.form, data);
                });
            });
        }
        setValues();
    }

    function objectToFormArray(arr, obj, current_path){
        var path = '';
        for(var key in obj){
            var val = obj[key];
            if(current_path) {
                path = current_path + '.' + key;
            }else{
                path = key;
            }
            var indent = path.split('.').length;
            var record = {path:path, display:key, type:typeof(val), val:val, indent:indent}
            var descend = false;
            if(typeof(val)==='object'){
                if(helpers.isArray(val)){
                    record.val = val.join('');
                }else{
                    descend = true;
                    delete record.val;
                }
            }
            if(key.indexOf('_html')!==-1){
                record.type='textarea';
            }
            if(key=='help_type'){
                record.type='select';
                record.options = [
                    {val:'CfA JUICE'},
                    {val:'Generic JUICE'},
                    {val:'Generic unbranded'},
                    {val:'Custom'}
                ];
            }
            if(key==='path'){
                record.display = 'path (used for Custom help type)';
            }

            arr.push(record);
            if(descend) {
                objectToFormArray(arr, val, path);
            }
        }
    }

})();