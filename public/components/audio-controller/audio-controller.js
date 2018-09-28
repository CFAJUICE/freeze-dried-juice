'use strict';

(function() {
  var mainApp = 'juice';
  var moduleName = 'audio-controller';
  helpers.addModuleToApp(mainApp, moduleName);

  angular.module(mainApp + '.' + moduleName, []).
      factory('AudioControllerService', ['$rootScope', '$interval', AudioControllerService]).
      directive('audioController', ['AudioControllerService', '$rootScope', audioController]);

  function AudioControllerService($rootScope, $interval){
    var audioElement = document.createElement('audio');

    //handle not having audio widget functions (for casperjs testing)
    if(!audioElement.play){
      audioElement.play = audioElement.pause = function(){console.log('NO AUDIO PLAYER AVAILABLE')};
    }

    var service = {
      audioOn: false,
      turnOff:function(){
        service.audioOn = false;
        $rootScope.$broadcast('globalAudioOFF');
      },
      turnOn:function(){
        console.log('here2');
        service.audioOn = true;
        $rootScope.$broadcast('globalAudioON');
      },
      toggle:function(){
        if(service.audioOn){
          service.turnOff();
        }else{
          service.turnOn();
        }
      },
      play:function(filename, currentlyPlayingId){
        if (filename != audioElement.src){
          audioElement.src = filename;
        }
        audioElement.play();
        if(currentlyPlayingId){
          service.currentlyPlayingId = currentlyPlayingId;
        }
        service.audioOn = true;
      },
      pause: function () {
        audioElement.pause();
        service.audioOn = false;
        return  audioElement.currentTime;
      },
      stop: function() {
        audioElement.pause();
        audioElement.src = '';
        service.audioOn = false;
        service.currentlyPlayingId = 0;
      },
      onEnd: function(src){console.log('audio ended');},//this will be replaced by module using this service
      currentlyPlayingId: 0,
      audioObject:{} //this is set by the widget which uses the audio
    };

    audioElement.addEventListener('ended',function(){
      service.onEnd(audioElement.src);
      service.currentlyPlayingId = 0;
    });

    $interval(function(){
      if(service.audioObject){
        service.audioOn = service.audioObject.audioInProgress;
      }else{
        service.audioOn = false;
      }
    }, 500);
    //These next two lines might not be needed. Having them here
    //incase there is somewhere in a widget that calls them
    $rootScope.$on('globalAudioOFF', function(){
      service.globalAudio = false;
      service.audioOn = false;
    });
    $rootScope.$on('globalAudioON', function(){
      service.globalAudio = true;
      service.audioOn = true;
    });
    $rootScope.$on('audioEnded', function(){service.audioOn = false});
    return service;
  }

  function audioController(AudioControllerService) {

    return {
      templateUrl:'/components/audio-controller/audio-controller.html'+hashAppend,
      link:function AudioControllerDirectiveLink($scope, element, attrs){
        $scope.audioService = AudioControllerService;
        $scope.audioOff = function() {
          AudioControllerService.turnOff();
        };

        $scope.audioOn = function() {
          AudioControllerService.turnOn();
        };

        $scope.audioToggle = function(){
          AudioControllerService.toggle();
        }

        $scope.$on('$destroy', function() {
          AudioControllerService.turnOff();
        });


      }
    };
  }
})();