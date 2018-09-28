var delayedJavascript = {
    loaded: false,
    listeners: [],
    hasLoaded: function (){
        delayedJavascript.loaded = true;
        delayedJavascript.listeners.forEach(function(callback){
            callback(true);
        });
    },
    callbackWhenLoaded: function(callback){
        if(delayedJavascript.loaded){
            callback();
        }else{
            delayedJavascript.listeners.push(callback);
        }
    },
    loadDelayedScripts: function(index){
        var script = document.createElement('script');
        script.src = '/compiled_delayed.js';
        script.onload = function(){
            var script = document.createElement('script');
            script.src = '/components/delayed-javascript/loaded.js';
            document.getElementsByTagName('head')[0].appendChild(script);
        }
        document.getElementsByTagName('head')[0].appendChild(script);
    }
};

