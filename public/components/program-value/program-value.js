(function () {
    'use strict';
    var mainApp = 'juice';
    var moduleName = 'program-value';
    helpers.addModuleToApp(mainApp, moduleName);

    angular.module(mainApp + '.' + moduleName, []).
        factory('ProgramValueService', ['ResourceHelperService', '$rootScope', 'UserService', '$http', ProgramValueService]).
        directive('program-value', ['ProgramValueService', programValue]);


    function ProgramValueService(ResourceHelperService, $rootScope, UserService, $http) {
        var service = ResourceHelperService.createResources({
            getProgramDefaults: {
                //url: configs.file_path + 'programs/:program_id/program.json',
                url: '/components/program-value/program-value-defaults.json',
                method: 'GET',
                isArray: false,
            }
        });

        service.getProgramData = function(program_id, current_data, callback){
            if(program_id.indexOf('/')===-1){
                program_id+='/';
            }
            if(program_id.indexOf('programs/')===-1){
                program_id = 'programs/'+program_id;
            }

            var url = configs.file_path + program_id+'program.json';
            console.log('pogram url'+ url)
            $http.get(url).
                success(function(data, status, headers, config) {
                    fixHtmlArrays(data);
                    mergeDataIntoProgram(data, current_data, '', callback);
                }).
                error(function(data, status, headers, config) {
                    callback(current_data);
                    console.log('error loading program data from '+url);
                });
        };


        var dataLoaded = false;
        service.setProgramData = function() {
            $rootScope.programValues = service.data = programValues;
            var program_id = UserService.getProgramPath();
            //program = true;
            if(!program_id){
                service.data.done = dataLoaded = true;
                afterDataLoad(service.data);
            }else{
                service.getProgramData(program_id, service.data, afterDataLoad);
            }
            fixHtmlArrays(service.data);
        }

        function mergeDataIntoProgram(from, to, path_so_far, callback){
            for(var key in from){
                var new_path = path_so_far+'.'+key;
                var from_value = from[key];
                var to_value = to[key];
                if(typeof(to[key])==='undefined'){
                    continue;
                }
                if(typeof(from_value)!=='object'){
                    to[key] = from_value;
                }else{//from is an object
                    if(typeof(to_value)!=='object'){
                        console.log('from', from, 'to', to)
                        console.log('ERROR: from value an object but to value is not for path '+new_path);
                        to[key] = {};
                    }
                    mergeDataIntoProgram(from_value, to_value, new_path);
                }
            }
            if(callback){
                callback(to);
            }
        }

        function afterDataLoad(data){
            dataLoaded = true;
            afterLoadedList.forEach(function(callback){
                callback(data);
            });
            afterLoadedList = [];
            service.data.done = true;
        }

        var afterLoadedList = [];

        service.runAfterLoaded = function(callback){
            if(dataLoaded){
                callback(service.data);
            }else {
                afterLoadedList.push(callback);
            }
        }

        //Strings of html are easier to write in json using arrays, but ultimately we need to smash them together
        //If something has a key that ends with _html and is an array, it will be turned into a string here
        function fixHtmlArrays(obj){
            for(var key in obj){
                var value = obj[key];
                if((key.indexOf('_html') !== -1) && (helpers.isArray(value))){
                    obj[key] = value.join('');//smash it
                }else if(typeof(value)==='object'){
                    fixHtmlArrays(value);//go deeper in the structure
                }
            }
        }


        return service;
    }

    function programValue(ProgramValueService) {
        return {
            templateUrl: '/components/program-value/program-value.html'+hashAppend,
            link: function programValueLink($scope, element, attrs) {

            }
        };
    }
})();