'use strict';

(function () {
    var mainApp = 'juice';
    var moduleName = 'help';
    helpers.addModuleToApp(mainApp, moduleName);
    var pages = [
        moduleName
    ];
    var pagesWithControllers = [
        moduleName
    ];
    angular.module(mainApp + '.' + moduleName, ['resource-helper', 'juice.progress']).
        config(['$stateProvider', routerConfig]).
        factory('HelpService', ['ResourceHelperService', HelpService]).
        controller('HelpCtrl', ['$scope', 'HelpService', 'BreadcrumbsService', 'ProgramValueService', HelpCtrl]);

    function HelpService(ResourceHelperService) {
        var out = {};
        return out;
    }

    function routerConfig($stateProvider) {
        $stateProvider.state({
            name: 'help',
            url: '/help',
            controller: HelpCtrl,
            templateUrl: '/components/help/help.html'
            /*templateUrl: function(){
                var path = programValues.help.path;
                if(programValues.help.help_type!=='Custom'){
                    path = programValues.help.form_hidden_help_options[programValues.help.help_type];
                }
                //return configs.file_path + 'docs/help/help.html';
                console.log('HELP URL:', path.replace('S3_FILE_PATH/', configs.file_path) + '?gitHash='+paramsFromServer.gitHash);
                return path.replace('S3_FILE_PATH/', configs.file_path) + '?gitHash='+paramsFromServer.gitHash;
            }*/
        });
    }

    function HelpCtrl($scope, HelpService, BreadcrumbsService, ProgramValueService) {
        $scope.programLoaded = false;

        function helpUrl(){
            var path = programValues.help.path;
            if(programValues.help.help_type!=='Custom'){
                path = programValues.help.form_hidden_help_options[programValues.help.help_type];
            }
            console.log('ORIGINAL PATH (before S3_FILE_PATH/ substituation)', path);
		    console.log('HELP URL:-:', path.replace('S3_FILE_PATH/', public_configs.fileResources) + '?gitHash='+paramsFromServer.gitHash);
		
            return path.replace('S3_FILE_PATH/', public_configs.fileResources) + '?gitHash='+paramsFromServer.gitHash;
        }

        ProgramValueService.runAfterLoaded(function(){
            $scope.programLoaded = true;
            $scope.helpContent = helpUrl();

            $scope.topics = [];
            $scope.fileResources = public_configs.fileResources;
            BreadcrumbsService.appendUniqueToList([
                {
                    'text':'Help',
                    'icon_url': '/components/topnav/images/help-icon.png',
                    'link': '/juice/help'
                }
            ]);

            $scope.modalImage = 'none.png';
            $scope.shouldShowModal = false;
            $scope.showModal = function(show){
                if(typeof(show)!='undefined'){
                    $scope.shouldShowModal = show;
                }
                return $scope.shouldShowModal;
            }

            setTimeout(function() {
                $('.thumb').each(function () {
                    var wrapper = $('<div class="thumb-wrapper"></div>');
                    $(this).wrap(wrapper);
                    var img_url = $(this).attr('src').replace('_thumb', '');
                });

            }, 1000);
            $scope.showImage = function(event){
                //return;
                $scope.shouldShowModal = true;
                console.log( event.target.src);
                $scope.modalImage = event.target.src.replace('_thumb', '');
                console.log($scope.shouldShowModal, $scope.modalImage);
            }
            $('.thumb-wrapper').append('<span class="icon-popup"></span>');



            var prepDone = false;
            setTimeout(prepPage, 500);
            setTimeout(prepPage, 1000);
            setTimeout(prepPage, 3000);
            setTimeout(prepPage, 5000);
            setTimeout(prepPage, 10000);//yay for slow networks
            
            function prepPage() {
                if(prepDone) return;
                $('#page-help section').each(function () {
                    prepDone = true;
                    var section = $(this);
                    var section_object = {name: '', title: ''};
                    section_object.title = section.find('h3').text();
                    section_object.name = section.find('a[name]').attr('name');
                    $scope.topics.push(section_object);
                });

                $('.expando').click(function () {
                    prepDone = true;
                    $(this).parent().find('.expand-target').toggle('slow');
                });
                $scope.$apply();
            }
        });


    }
})();
