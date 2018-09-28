// Karma configuration
// Generated on Tue Dec 08 2015 08:33:18 GMT-0500 (EST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'public/components/configs/configs.js',
      'public/bower_components/angular/angular.js',

      'public/bower_components/angular-mocks/angular-mocks.js',

      'public/bower_components/angular-bind-html-compile/angular-bind-html-compile.js',
      'public/bower_components/angular-route/angular-route.min.js',
      'public/bower_components/angular-sanitize/angular-sanitize.min.js',
      'public/bower_components/angular-resource/angular-resource.min.js',
      'public/bower_components/angular-bind-html-compile/angular-bind-html-compile.js',
      'public/bower_components/angular-animate/angular-animate.min.js',
      'public/bower_components/angular-widget/angular-widget.js',
      'public/bower_components/angular-ui-router/release/angular-ui-router.min.js',
      'public/bower_components/angular-sanitize/angular-sanitize.min.js',
      'public/bower_components/angular-bootstrap/ui-bootstrap.min.js',
      'public/bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'public/bower_components/ckeditor/ckeditor.js',
      'public/bower_components/ng-ckeditor/ng-ckeditor.min.js',
      'public/javascripts/vendor/lvl-drag-drop.js',
      'public/javascripts/vendor/textFit.js',
      'public/bower_components/lvl-drag-drop/script/lvl-uuid.js',

      'public/javascripts/juice.js',
      'public/components/clicks/clicks.js',
      'public/components/services/services.js',

      //!JP temporarily adding here until we include it as a widget
      'http://code.jquery.com/jquery-2.1.4.min.js',
      'public/bower_components/EaselJS/lib/easeljs-0.8.1.min.js',
      'public/bower_components/PreloadJS/lib/preloadjs-0.6.1.min.js',
      'public/bower_components/SoundJS/lib/soundjs-0.6.1.min.js',
      'public/bower_components/TweenJS/lib/tweenjs-0.6.1.min.js',

      'public/bower_components/Sortable/Sortable.min.js',
      'public/bower_components/draggabilly/dist/draggabilly.pkgd.min.js',

      'public/javascripts/vendor/Box2dWeb-2.1.a.3.min.js',
      //'public/javascripts/box2d-html5.min.js',
      //'public/javascripts/b2DebugDraw.js',
      //'public/bower_components/box2d-html5/package/box2d-html5.js',
      'public/javascripts/game/base.js',
      'public/components/js-helpers/js-helpers.js',
      'public/javascripts/game/services.js',
      'public/javascripts/game/controllers.js',
      'public/javascripts/game/directives.js',
      'public/javascripts/game/framework.js',
      'public/javascripts/game/puzzler/view.js',
      'public/javascripts/game/puzzler/physics.js',
      'public/javascripts/game/puzzler/game.js',
      'public/javascripts/game/sorter/view.js',
      'public/javascripts/game/sorter/physics.js',
      'public/javascripts/game/sorter/game.js',
      'public/javascripts/game/stacker/game.js',
      'public/javascripts/game/stacker/view.js',
      'public/javascripts/game/fridge_magnets/game.js',
      'public/javascripts/game/fridge_magnets/view.js',
      'public/javascripts/game/tumbler/game.js',
      'public/javascripts/game/balancer/game.js',
      'public/javascripts/game/balancer/view.js',
      'public/javascripts/game/pick_and_stack/game.js',
      'public/javascripts/game/pick_and_stack/view.js',
      'public/javascripts/game/quick_pick/game.js',
      'public/javascripts/game/quick_pick/view.js',

      'public/components/filters/filters.js',
      'public/components/authoring/game/authoring.js',
      'public/components/progress/progress.js',
      'public/components/home/home.js',
      'public/components/notify/notify.js',
      'public/components/resource-helper/resource-helper.js',

      'public/components/module/module.js',
      'public/components/test_post/test_post.js',
      'public/components/test_widget/test_widget.js',
      'public/components/modulette/modulette.js',
      'public/components/audio-controller/audio-controller.js',
      'public/components/breadcrumbs/breadcrumbs.js',
      'public/components/data-store-api/data-store-api.js',
      'public/javascripts/dd_main.js',
      '/widgets/guided_practice_widget/guided_practice_widget.directives.js',
      'public/components/preview/preview.js',
      'public/javascripts/author.js',
      'http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=AM_HTMLorMML-full',
      '/main-app.js',

      //'public/*.js',
      'test/**/*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: Infinity
  })
}
