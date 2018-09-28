'use strict';

(function () {
    var mainApp = 'juice';
    var moduleName = 'try-it-report';
    helpers.addModuleToApp(mainApp, moduleName);
    var pages = [
        moduleName
    ];
    var pagesWithControllers = [
        moduleName
    ];
    angular.module(mainApp + '.' + moduleName, ['resource-helper', 'juice.progress']).
        config(['$stateProvider', routerConfig]).
        factory('TryItReportService', ['ResourceHelperService', TryItReportService]).
        controller('TryItReportCtrl', ['$scope', 'TryItReportService', '$stateParams', '$timeout', '$window', TryItReportCtrl]);

    function TryItReportService(ResourceHelperService) {
        var out = ResourceHelperService.createResources({
            getFile: {
                url: configs.file_path + ':filePath',
                method: 'GET',
                params: {filePath: '@filePath'}
            },
            getReportData: {
                url: '/juice/try_it_report_data',
                method: 'GET',
                isArray: false,
            }
        });
        return out;
    }

    function routerConfig($stateProvider) {
        $stateProvider.state({
            name: 'try-it-report',
            url: '/try-it-report/:filePath',
            controller: TryItReportCtrl,
            templateUrl: '/components/try-it-report/try-it-report.html'+hashAppend
        });
    }

    function TryItReportCtrl($scope, TryItReportService, $stateParams, $timeout, $window) {
        $scope.filePath = $stateParams.filePath;
        $scope.fileData = null;
        $scope.tryIndexes = [0,1,2];
        $scope.record_fields = [];
        $scope.filters = {custom_field:'user_id', context_id:'', roles:'Student', tool_consumer_instance_guid:''};
        if(paramsFromServer.server_instance === 'prod'){
            $scope.filters.context_id = 'juiceresearchstudy';
        }
        ["_id", "short_user_id", "user_id", "custom_source", "complete"].forEach(function(option){
           $scope.record_fields.push({value:option, text:option});
        });

        $scope.toggle = function(id){
            $('#'+id).toggle();
        }

        $scope.updateData = function(){
            $scope.reportData = null;
            $scope.filters.filePath = $scope.filePath;
            TryItReportService.getReportData($scope.filters, function(data){
                $scope.reportData = data;

                setTimeout(function () {
                    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
                }, 1000);
            });
        }
        $scope.updateData();

        $scope.generateUserReport = function(){
            var url = '/juice/try_it_user_report?';
            var amp = '';
            for(var key in $scope.filters){
                url += amp + key + '=' + encodeURIComponent($scope.filters[key]);
                amp = '&';
            }
            console.log(url);
            window.location.href = url;
        }

        var s3FilePath = $scope.filePath.replaceAll('.', '/') + '.txt';
        TryItReportService.getFile({filePath:s3FilePath}, function(fileData){
            fileData.steps.forEach(function(step){
                step.stepText = '';
                var questionTextFields = ['headerText', 'leftText', 'rightText'];
                questionTextFields.forEach(function(field){
                    if(step[field]){
                        step.stepText+= step[field];
                    }
                })


                //ju-mc="mc_2f51a4ee-a972-070a-d126-44db7490bc28"
                var pattern = /ju-[a-z][a-z]\=\"([a-z0-9\_\-]+)/g
                var results = step.stepText.match(pattern);
                if(results){
                    results.forEach(function(result){
                        if(!result) return;
                        var question_id = result.split('"')[1].substr(0, 39);
                        var question = fileData.inputData[question_id];
                        if(!question){
                            return console.log('No question id found for '+question_id);
                        }

                        question.id = question_id;
                        question.short_id = question_id.substr(0,7);
                        if(!step.questions){
                            step.questions = [];
                        }
                        var question_already_there = false;
                        step.questions.forEach(function(q){
                            if(q.id == question.id){
                                question_already_there = true;
                            }
                        })
                        if(!question_already_there) {
                            step.questions.push(question);
                        }
                    });
                }

                step.stepText =
                    helpers.decodeEntities(step.stepText).
                        replace(/<(?:.|\n)*?>/gm, '').
                        replace('MC PlaceholderID:', '').
                        substr(0, 180);
            });

            $scope.fileData = fileData;
            $timeout(function() {
                console.log('did it work', $scope.reportData.steps[1].questions);
            }, 2000);
        });
        $('.date-input').datetimepicker();
    }
})();