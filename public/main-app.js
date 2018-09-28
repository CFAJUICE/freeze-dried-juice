var onFirstTouch = function() {
    $('body').addClass('user-is-touching');
    window.USER_IS_TOUCHING = true;
    // we only need to know once that a human touched the screen, so we can stop listening now
    window.removeEventListener('touchstart', onFirstTouch, false);
};

function rescaleGameBackground(){
    if($('.modal-body')[0]){
      $('#canvas-container, .feedback-view').height($('.modal-body')[0].scrollHeight);
    }
    setTimeout(function(){
      if($('.modal-body')[0]){
        $('#canvas-container, .feedback-view').height($('.modal-body')[0].scrollHeight);
      }
    }, 1000)
    console.log('rescale');
  }

(function () {
    'use strict';
    console.log('TEST', (helpers.getAppModules('juice')));
    $(window).resize(function() { calcAdjustSizes(); });

    $(document).ready(function () {
        window.addEventListener('touchstart', onFirstTouch, false);
    });
    angular.module('mainApp', [
            'ui.router',
            'ngResource',
            'juice.home',
            'juice.services',
            'juice.modulette',
            'ngCacheBuster'
        ].concat(helpers.getAppModules('juice'))
    )
        .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$sceDelegateProvider', config])
        .config(function (httpRequestInterceptorCacheBusterProvider) {
            httpRequestInterceptorCacheBusterProvider.setMatchlist([/.*html/, /.*txt/]);
        })
        .factory('MainAppService', ['ResourceHelperService', MainAppService])
        .controller('MainAppCtrl', ['$scope', '$rootScope', '$location', 'NotifyService', '$timeout', '$window', 'MainAppService', 'ProgramValueService', MainAppCtrl]);

    function config($stateProvider, $urlRouterProvider, $locationProvider, $sceDelegateProvider) {
        //$urlRouterProvider.otherwise('/home');
        $locationProvider.html5Mode(true);
        $sceDelegateProvider.resourceUrlWhitelist(['**']);
    }

    function MainAppService(ResourceHelperService) {
        var service = {};
        return service;
    }

    function MainAppCtrl($scope, $rootScope, $location, NotifyService, $timeout, $window, MainAppService, ProgramValueService) {
        ProgramValueService.setProgramData();
        $rootScope.ferpa = false;
        ProgramValueService.runAfterLoaded(function (data) {
            var ferpa_agree = paramsFromServer.user_settings ? paramsFromServer.user_settings.ferpa_agree : false;
            $scope.pageTitle = data.site_title;
            $scope.siteIcon = data.site_icon;
            $rootScope.ferpa = data.require_ferpa ? !ferpa_agree : false;
            if (paramsFromServer.user && paramsFromServer.user.login_type == 'social') {
                $rootScope.ferpa = false;
                $rootScope.showSocialModal = paramsFromServer.user_settings ? !paramsFromServer.user_settings.social_welcome_viewed : true;
            }

        });
        function setCookie(cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        }

        setCookie('user_has_logged_in', 1, 100);
        $('#loading').hide();
        $rootScope.$on('pageComplete', function (event) {
            //things to do when all the data is successfully loaded into a page
            //re-run mathjax
            setTimeout(function () {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            }, 400);
        });
        $scope.$on('$viewContentLoaded', function (event) {
        });

        function gaTrack() {

            var url = window.location.pathname;
            var removeThese = ['#bottom', '/chooser'];
            removeThese.forEach(function (rem) {
                url = url.replace(rem, '');
            })

            url = url.replace('refresher', 'refresher/1').replace('/1/1', '/1');

            //the base modulette url is a redirect and shouldn't be counted
            //it can be identified by the fact that it has just 3 slashes in the url
            if (url.indexOf('modulette') !== -1) {
                var url_without_last_character = url.substr(0, url.length - 1);
                var numberOfSlashes = url_without_last_character.split("/").length - 1;
                if (numberOfSlashes < 4) {
                    return;//don't track it.
                }
            }

            if (url === '/juice/') {
                return;
            }

            //exceptions for items to track
            var track_this = true;
            var skip_ones_with_these_substrings = ['/challenge/'];
            skip_ones_with_these_substrings.forEach(function (skip) {
                if (url.indexOf(skip) !== -1) {
                    track_this = false;
                }
            });

            if (track_this) {
                $window.recordPageView(url);
            }
        };

        $scope.$on('$locationChangeSuccess', function (event) {
            gaTrack();
            $scope.top_path = $location.path().split('/')[1];
            if ($scope.top_path === '') {
                $scope.top_path = 'home';
            }

            var query = $location.search();
            if (query.notify) {
                NotifyService.showMessage(query.notify);
                $location.search('notify', null);
                $timeout(function () {
                    $('.modal-backdrop').remove();
                }, 300);
            }

            $('#loading').hide();
            calcAdjustSizes();
        });
    }
}());

function calcAdjustSizes(){
    $('.modal-dialog').attr('data-height-from-100', 30);
    $('.auto-calc-height').each(function(){
        var parent_height = $(this).parent().height();
        var parent_width = $(this).parent().width();
        if($(this).attr('data-height-from-100')){
            $(this).height(parent_height - $(this).attr('data-height-from-100'));
        }
        if($(this).attr('data-width-from-100')){
            $(this).width(parent_width - $(this).attr('data-width-from-100'));
        }
    });
}