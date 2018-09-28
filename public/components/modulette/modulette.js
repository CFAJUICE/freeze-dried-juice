(function () {
    'use strict';
    var mainApp = 'juice',
        moduleName = 'modulette';

    angular.module('previewConstants', []).constant('previewConstants', {
        'widgetName': paramsFromServer.widgetName,
        'fileName': paramsFromServer.fileName
    });
    angular.module('moduletteStructure', []).constant('structureConstants', {'modStructure': paramsFromServer.modStructure});
    angular.module(mainApp + '.' + moduleName, ['angularWidget', 'moduletteStructure', 'ui.router', 'juice.audio-controller', 'juice.progress', 'ngSanitize']).
        factory('moduletteStructureData', function () {
            return {modStructure: '---'};
        }).
        factory('interactiveData', function () {
            return {interactive: '---'};
        }).
        constant('pathConstants', {'pathWidgets': '/widgets/', 'pathFiles': configs.file_path}).
        config(['widgetsProvider', 'pathConstants', initializemanifestGenerator]).
        config(['$stateProvider', routerConfig]).
        config(['widgetsProvider', widgetProviderConfig]).
        factory('ModuletteService', ['$http', 'UserService', ModuletteService]).
        factory('audio', ["$document", "$rootScope", audioFactory]).
        factory('widgetNavigation', ['$location', 'BreadcrumbsService', widgetNavigation]);

    function audioFactory($document, $rootScope) {
        var audioElement = $document[0].createElement('audio'); // <-- Magic trick here
        //handle not having audio widget functions (for casperjs testing)
        if (!audioElement.play) {
            audioElement.play = audioElement.pause = function () {
                console.log('NO AUDIO PLAYER AVAILABLE')
            };
        }


        audioElement.onended = function () {
            $rootScope.$broadcast("audioEnded");
        }
        var ngAudioEl = angular.element(audioElement);
        return {
            audioElement: audioElement,
            time: 0,

            play: function (filename) {
                if (filename && filename != audioElement.src) {
                    audioElement.src = filename;
                }
                audioElement.play();
            },

            pause: function () {
                audioElement.pause();
                return audioElement.currentTime;
            }
        };
    }

    function widgetNavigation($location, BreadcrumbsService) {
        function navigateTo(tab) {
            var path = $location.path().split('/').slice(0, 3).join('/') + '/' + tab;
            $location.path(path);
        }

        return {
            tryIt: function () {
                navigateTo('guided_practice');
            },
            challenge: function () {
                navigateTo('challenge');
            },
            otherLesson: function () {
                $location.path(BreadcrumbsService.getList()[2].link.replace('/juice/', ''));
            }
        };
    }


    function initializemanifestGenerator(widgetsProvider, pathConstants) {
        widgetsProvider.setManifestGenerator(function () {
            return function (name) {
                return {
                    module: name,
                    //html: '/widgets/' + name+'/' + name + '.html',
                    html: pathConstants.pathWidgets + name + '/' + name + '.html',
                    files: [
                        pathConstants.pathWidgets + name + '/' + name + '.js',
                        pathConstants.pathWidgets + name + '/' + name + '.css'
                    ]
                };
            };
        });
    }

    function ModuletteService($http, UserService) {
        var service = {};
        service.getWidgetDataFile = function (widget_name, filename, callback) {
            if (!filename) {
                return callback('');
            }

            var path = configs.file_path + filename.replace(/\./g, "/") + ".txt";
            if (filename == widget_name) {
                path = configs.widget_path + filename + "/" + filename + ".txt";
            }
            $http.get(path).then(function (resp) {
                setTimeout(function () {
                    callback(resp.data)
                }, 0)
            });
        };
        service.getAudioManifest = function (filename, callback) {
            if (!filename) {
                return callback('{}');
            }
            var prog = filename.indexOf('programs.') == -1 ? UserService.getProgramPath() : '';
            var path = configs.narration_path + prog + filename.replace(/\./g, "/") + "_audio-manifest.txt";  // !PM to add support for Programs
            $http.get(path).then(function (resp) {
                callback(resp.data)
            }, function (resp) {
                callback('{}')
            });
        }
        return service;
    }

    function widgetProviderConfig(widgetsProvider) {
        widgetsProvider.addEventToForward("reloadWidget");
        widgetsProvider.addEventToForward("globalAudioON");
        widgetsProvider.addEventToForward("globalAudioOFF");
        widgetsProvider.addEventToForward("audioEnded");
        widgetsProvider.addEventToForward("audioLoaded");
        widgetsProvider.addServiceToShare("interactiveData");
        widgetsProvider.addServiceToShare("audio");
        widgetsProvider.addServiceToShare('moduletteStructureData');
        widgetsProvider.addServiceToShare('AudioControllerService');
        widgetsProvider.addServiceToShare('widgetNavigation');
    }

    function routerConfig($stateProvider) {
        $stateProvider.state({
            name: "modulette",
            url: '/modulette/:modulette_id',
            templateUrl: '/components/modulette/modulette.html' + hashAppend,
            controller: ModuletteCtrl
        }).state({
            name: "modulette_in_tab",
            url: '/modulette/:modulette_id/:tab',
            templateUrl: '/components/modulette/modulette.html' + hashAppend,
            controller: ModuletteCtrl
        }).state({
            name: "modulette_in_widget",
            url: '/modulette/:modulette_id/:tab/:track',
            templateUrl: '/components/modulette/modulette.html' + hashAppend,
            controller: ModuletteCtrl
        }).state({
            name: "modulette_none given",
            url: '/modulette',
            templateUrl: '/components/modulette/no_modulette_id_error.html' + hashAppend
        });
    }


    function ModuletteCtrl($stateParams, $scope, $http, interactiveData, ModuletteService, $location, $state, BreadcrumbsService, ModuleService, DataStoreService, $window, ProgressService, WalkthroughTooltipService, UserService, $rootScope) {
        $rootScope.slim = paramsFromServer.slim ? 'slim' : '';


        delete interactiveData.previousFeedback;
        WalkthroughTooltipService.pageChange();
        $scope.moduletteData = {};
        $scope.full_s3_path = configs.file_path + UserService.getProgramPath() + ($stateParams.modulette_id.split('.').slice(0, -1).join('/') ) + '/';  // !PM to add support for Programs
        $scope.fallback_s3_path = configs.file_path + ($stateParams.modulette_id.split('.').slice(0, -1).join('/') ) + '/';
        $scope.image_path = '/components/modulette/images/';
        interactiveData.interactive = 123;
        var tabs_dom = $('.tab-set-container')
        $scope.$watch(function () {
            return $window.scrollY;
        }, function (scrollY) {
            if (scrollY > 50) {
                tabs_dom.addClass('fixed');
            } else {
                tabs_dom.removeClass('fixed');
            }
        });

        BreadcrumbsService.hide();

        if (!$stateParams.modulette_id) {
            helpers.err('no modulette_name given');
        } else {
            var baseLocation = 'modulette/' + $stateParams.modulette_id + '/';
            if ($stateParams.modulette_id == 'preview') {
                handleModuletteData($window, $scope, $state, $stateParams, interactiveData, ModuletteService, $location, baseLocation, ModuleService, BreadcrumbsService, paramsFromServer.modStructure, DataStoreService, ProgressService, WalkthroughTooltipService, UserService, $rootScope);
            } else {
                $http.get($scope.full_s3_path + 'modulette.txt').
                    then(function (response) {
                        handleModuletteData($window, $scope, $state, $stateParams, interactiveData, ModuletteService, $location, baseLocation, ModuleService, BreadcrumbsService, response.data, DataStoreService, ProgressService, WalkthroughTooltipService, UserService, $rootScope);
                    });
            }
        }
    }

    function handleModuletteData($window, $scope, $state, $stateParams, interactiveData, ModuletteService, $location, baseLocation, ModuleService, BreadcrumbsService, moduletteData, DataStoreService, ProgressService, WalkthroughTooltipService, UserService, $rootScope) {
        if (!moduletteData.title) {
            moduletteData.title = moduletteData.name.split('.').slice(-1)[0];
        }

        var modulette_tab_mapping = {
            'refresher': 'Overview',
            'guided_practice': 'Try It',
            'challenge': 'Challenge Games'
        }
        moduletteData.tabs.forEach(function (tab) {
            if (tab) tab.display_name = modulette_tab_mapping[tab.id];
        })
        interactiveData.moduletteData = $scope.moduletteData = moduletteData;
        var modulette_id_parts = $stateParams.modulette_id.split('.')
        var module_id = modulette_id_parts[0];
        var modulette_id = modulette_id_parts[0] + '.' + modulette_id_parts[1];
        $scope.module_id = module_id;
        $scope.modulette_id = modulette_id;
        $scope.progress = ProgressService;
        if (module_id == 'preview') {
            $scope.loaded = true;
        } else {
            ModuleService.getModule({module_id: module_id}, function (module) {
                BreadcrumbsService.updateList([
                    {

                        'text': module.title,
                        'link': '/juice/module/' + module.id,
                        'fallback_icon_url': configs.file_path + module_id + '/module.png',
                        'icon_url': configs.file_path + UserService.getProgramPath() + module_id + '/module.png'
                    },
                    {
                        'text': moduletteData.title,
                        'link': baseLocation
                    }
                ]);
                $scope.loaded = true;
                BreadcrumbsService.show();
                if ($scope.tab_id === 'refresher') {
                    WalkthroughTooltipService.initalize('modulette');
                    $scope.restartTour = function () {
                        WalkthroughTooltipService.play('modulette', 1);
                    }
                }
            }, function () {
                helpers.err('Unable to get parent module data');
                $scope.loaded = true;
            });
        }
        var sep = '/';
        $scope.tab_id = $stateParams.tab;
        var tab_names = {'refresher': 'Overview', 'guided_practice': 'Try It', 'challenge': 'Challenge Game'};
        $scope.tab_name = tab_names[$scope.tab_id];

        //check to see if current tab exists
        var tab_exists = false;
        var first_tab = null;
        moduletteData.tabs.forEach(function (tab) {
            if (!first_tab) {
                first_tab = tab.id;
            }
            if (tab.id === $scope.tab_id) {
                tab_exists = true;
            }
        });
        if (!tab_exists) {
            $location.path(baseLocation + first_tab);
            return;
        }

        $scope.track_id = $stateParams.track;
        var tab = getCurrentTabObj();
        $scope.tracks = null;
        function initializeTabAndTrack() {
            if (!$scope.tab_id) {
                return initializeDefaultTabId();
            }
            if ((!($scope.track_id >= 0)) && ($scope.track_id != 'chooser')) {
                return initializeDefaultTrackId();
            }
            initializeWidget();
        }

        //if it can't be determined by path
        function initializeDefaultTabId() {
            $scope.tab_id = moduletteData.tabs[0].id;
            if (!$scope.tab_id) return null;
            initializeDefaultTrackId();
        }

        function getDefaultTrackId() {
            if (!$scope.tab_id) return helpers.err('tried to set track with no tab set');
            var currentTab = getCurrentTabObj();
            var default_track_id = null;
            if ((currentTab.tracks.length > 2) || (currentTab.id === 'challenge')) {
                default_track_id = 'chooser';
            }

            forEach(currentTab.tracks, function (track, index) {
                if (default_track_id !== null) {
                    return;//continue... we already have a current track id
                }
                if (track) {
                    default_track_id = index;
                }
            });
            //just always default for chooser
            return default_track_id;
        }

        function initializeDefaultTrackId() {
            $location.path(baseLocation + $scope.tab_id + sep + getDefaultTrackId());
            $location.replace();
        }

        initializeTabAndTrack();// do on initial load

        $scope.tabClick = function (tab_id) {
            //$scope.tab_id = tab_id;
            $scope.$evalAsync(function () {
                $location.path(baseLocation + tab_id)
            });
        };

        $scope.$on("initRefresherTab", function () {
            $scope.tabClick("refresher");
            setTimeout(function () {
                $("#tab-refresher").focus()
            }, 500);

        });

        $scope.trackClick = function (track_id, tab_id) {
            if (tab_id === 'challenge') {
                $('#loading').show();
            }
            $scope.$evalAsync(function () {
                $location.path(baseLocation + $scope.tab_id + sep + track_id)
            });
            //refresh the page so that the challenge widget will do the popup again.
            if ($scope.track_id == track_id) {
                $state.go($state.current, {}, {reload: true});
            }
            getAndSetCurrentTabTracks();
        };


        $scope.tab_arrowKeys = function (key, tabId) {
            var nextTab;
            if (key == 39) {
                if (tabId == $scope.moduletteData.tabs[0].id) nextTab = $scope.moduletteData.tabs[1].id;
                if (tabId == $scope.moduletteData.tabs[1].id) nextTab = $scope.moduletteData.tabs[2].id;
                if (tabId == $scope.moduletteData.tabs[2].id) nextTab = $scope.moduletteData.tabs[0].id;
            }
            if (key == 37) {
                if (tabId == $scope.moduletteData.tabs[2].id) nextTab = $scope.moduletteData.tabs[1].id;
                if (tabId == $scope.moduletteData.tabs[1].id) nextTab = $scope.moduletteData.tabs[0].id;
                if (tabId == $scope.moduletteData.tabs[0].id) nextTab = $scope.moduletteData.tabs[2].id;
            }
            if (key == 37 || key == 39) {
                $scope.tabClick(nextTab);
                setTimeout(function () {
                    $("#tab-" + nextTab).focus()
                }, 500);
            }
            if (key == 13) {
                $scope.tabClick(tabId);
                setTimeout(function () {
                    $("#tab-" + tabId).focus()
                }, 500);
            }
        }


        function getCurrentTabObj() {
            var currentTab = null;
            forEach(moduletteData.tabs, function (tab) {
                if (tab.id == $scope.tab_id) {
                    currentTab = tab;
                }
            });
            $scope.currentTab = currentTab;
            return currentTab;
        }

        function getAndSetCurrentTabTracks() {
            var currentTab = getCurrentTabObj();
            $scope.tracks = currentTab.tracks;
            return $scope.tracks;
        }

        function getCurrentTrackObj() {
            var currentTab = getCurrentTabObj();
            if ($scope.track_id === 'chooser') {
                return 'chooser';
            }
            return currentTab.tracks[$scope.track_id];
        }

        function initializeChooser() {
            $scope.track_id = 'chooser';
            getAndSetCurrentTabTracks();
        }

        //called only from setValuesFromHash. Load widget values.
        function initializeWidget() {
            var currentTrack = getCurrentTrackObj();
            $scope.showReportLink = false;
            if ($scope.track_id === 'chooser') {
                return initializeChooser();
            }
            if ($scope.tab_id == 'challenge') {
                $('#loading').show();
                getAndSetCurrentTabTracks();
            }
            if (currentTrack.files && currentTrack.files.length) {
                if (($scope.tab_id == 'guided_practice') && (paramsFromServer.user.roles === 'Admin')) {
                    $scope.showReportLink = true;
                }
                $scope.trackFilename = currentTrack.files[0];
                ModuletteService.getWidgetDataFile(currentTrack.widget_name, currentTrack.files[0], afterFileLoad);
                ModuletteService.getAudioManifest(currentTrack.files[0], afterManifestLoad);
            } else {
                afterFileLoad(null);
            }


            function afterFileLoad(fileData) {
                interactiveData.interactive = helpers.replaceS3BucketInData(fileData)
                var filename = 'none';
                if (fileData && currentTrack.files.length) {
                    filename = currentTrack.files[0];
                }

                interactiveData.widgetSession = DataStoreService.createSession(currentTrack.widget_name, filename, moduletteData.name, $scope.tab_id, $scope.track_id, module_id, modulette_id);
                if ($scope.tab_id != 'refresher') {
                    interactiveData.widgetSession.save({initialized: true}, false);//auto save on start
                }
                if ($scope.tab_id == 'challenge') {
                    delayedJavascript.callbackWhenLoaded(function () {
                        var scaleable_widgets = [
                            'highlighter_widget'
                        ]
                        $scope.showScaleableChallengeGame = false;
                        if(window.location.hostname === '127.0.0.1'){
                            $scope.showScaleableChallengeGame = scaleable_widgets.indexOf(currentTrack.widget_name) !== -1;
                        }
                        $scope.challenge_widget_name = currentTrack.widget_name;
                    });
                    $window.recordPageView('get', true);
                } else {
                    delayedJavascript.callbackWhenLoaded(function () {
                        $scope.widget_name = currentTrack.widget_name;
                    });
                }
                //$("#tab-" + $scope.tab_id).focus();
                $("#skiplink").attr("href", "#tab-refresher");
                $("#pagetitle").html("JUICE mini-lesson " + moduletteData.title);
                $("#pagetitle").focus();
            }

            function afterManifestLoad(manifest) {
                interactiveData.manifest = manifest.audioFiles;
                $scope.manifest_loaded = true;
            }
        }

    }
})();


