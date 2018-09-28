//initialize google analytics

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
ga('create', public_configs.ga_tracking_code, 'auto');

window.recordPageView = function(url, allow_repeat){
    if(url==='get'){
        url = window.location.pathname;
    }
    if(window.location.search){
        url+=window.location.search;
    }
    url =url.replace('/juice', '');
    if(!allow_repeat) {
        if (window.previousTrackingUrl == url) {
            return; //nothing has changed
        }
    }
    window.previousTrackingUrl = url;

    var ignoreWhenValueInUserFields = public_configs.test_user_filters;
    for(var value in ignoreWhenValueInUserFields){
        var field = ignoreWhenValueInUserFields[value];
        if( (typeof(paramsFromServer)==='undefined') || !paramsFromServer.user){
            console.log('ERROR: No user in params from server');
        }else if(paramsFromServer.user[field] == value){
            if(paramsFromServer.server_instance!=='prod'){
                console.log('Would have skipped GA for field value match, but is on '+ paramsFromServer.server_instance+'. Skip reason:', field, value);
            }else{
                return console.log('Skipping GA for field value match: ', field, value);
            }
            break;
        }
    }

    console.log('GATRACKING:', url);
    ga('send', 'pageview', { page: url });
}

window.GARecordPictureIt = function(picture_it_url){
    var url = '/picture_it' + (picture_it_url.split('amazonaws.com')[1]);
    window.recordPageView(url, true);
}

if(typeof(force_ga)==='undefined') {
    window.recordPageView('get', true);//true because this would be a reload
}else{
    //record a specific page specified by the global variable force_ga
    window.recordPageView(force_ga);
}