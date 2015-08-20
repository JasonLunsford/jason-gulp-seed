// Based on Paislee's Healthy-Gulp-Angular project
// https://github.com/paislee/healthy-gulp-angular

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var es = require('event-stream');
var bowerFiles = require('main-bower-files');
var print = require('gulp-print');
var Q = require('q');
var Server = require('karma').Server;

// == PATH STRINGS ========

var paths = {
    scripts: 'app/**/*.js',
    styles: ['./app/**/*.css', './app/**/*.scss'],
    images: './images/**/*',
    index: './app/index.html',
    partials: ['app/**/*.html', '!app/index.html'],
    distDev: './dist.dev',
    scriptsServer: 'devServer/**/*.js'
};

// == PIPE SEGMENTS ========

var pipes = {};

pipes.orderedVendorScripts = function() {
    return plugins.order(['angular.js']);
};

pipes.orderedAppScripts = function() {
    return plugins.angularFilesort();
};

pipes.minifiedFileName = function() {
    return plugins.rename(function (path) {
        path.extname = '.min' + path.extname;
    });
};

pipes.validatedAppScripts = function() {
    return gulp.src(paths.scripts)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'));
};

pipes.builtAppScripts = function() {
    return pipes.validatedAppScripts()
        .pipe(gulp.dest(paths.distDev));
};

pipes.builtVendorScripts = function() {
    return gulp.src(bowerFiles())
        .pipe(gulp.dest('dist.dev/bower_components'));
};

pipes.validatedServerScripts = function() {
    return gulp.src(paths.scriptsServer)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'));
};

pipes.validatedPartials = function() {
    return gulp.src(paths.partials)
        .pipe(plugins.htmlhint({'doctype-first': false}))
        .pipe(plugins.htmlhint.reporter());
};

pipes.builtPartials = function() {
    return pipes.validatedPartials()
        .pipe(gulp.dest(paths.distDev));
};

pipes.scriptedPartials = function() {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: "jasonGulpSeedApp"
        }));
};

pipes.builtStyles = function() {
    return gulp.src(paths.styles)
        .pipe(plugins.sass())
        .pipe(gulp.dest(paths.distDev));
};

pipes.processedImages = function() {
    return gulp.src(paths.images)
        .pipe(gulp.dest(paths.distDev + '/images/'));
};

pipes.validatedIndex = function() {
    return gulp.src(paths.index)
        .pipe(plugins.htmlhint())
        .pipe(plugins.htmlhint.reporter());
};

pipes.builtIndex = function() {

    var orderedVendorScripts = pipes.builtVendorScripts()
        .pipe(pipes.orderedVendorScripts());

    var orderedAppScripts = pipes.builtAppScripts()
        .pipe(pipes.orderedAppScripts());

    var appStyles = pipes.builtStyles();

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distDev)) // write first to get relative path for inject
        .pipe(plugins.inject(orderedVendorScripts, {relative: true, name: 'bower'}))
        .pipe(plugins.inject(orderedAppScripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(gulp.dest(paths.distDev));
};

pipes.builtApp = function() {
    return es.merge(pipes.builtIndex(), pipes.builtPartials(), pipes.processedImages());
};

// == TASKS ========

// removes all compiled files
gulp.task('clean', function() {
    var deferred = Q.defer();
    del(paths.distDev, function() {
        deferred.resolve();
    });
    return deferred.promise;
});

// checks html source files for syntax errors
gulp.task('validate-partials', pipes.validatedPartials);

// checks index.html for syntax errors
gulp.task('validate-index', pipes.validatedIndex);

// moves html source files into the build environment
gulp.task('build-partials', pipes.builtPartials);

// converts partials to javascript using html2js
gulp.task('convert-partials-to-js', pipes.scriptedPartials);

// runs jshint on the server scripts
gulp.task('validate-server-scripts', pipes.validatedServerScripts);

// runs jshint on the app scripts
gulp.task('validate-app-scripts', pipes.validatedAppScripts);

// moves app scripts into the build environment
gulp.task('build-app-scripts', pipes.builtAppScripts);

// compiles app sass and moves to the build environment
gulp.task('build-styles', pipes.builtStyles);

// moves vendor scripts into the build environment
gulp.task('build-vendor-scripts', pipes.builtVendorScripts);

// validates and injects sources into index.html and moves it to the build environment
gulp.task('build-index', pipes.builtIndex);

// builds a complete environment
gulp.task('build-app', pipes.builtApp);

// cleans and builds a complete environment
gulp.task('clean-build-app', ['clean'], pipes.builtApp);

// clean, build, and watch live changes
gulp.task('watch', ['clean-build-app', 'validate-server-scripts'], function() {

    // start nodemon to auto-reload the server
    plugins.nodemon({ script: 'server.js', ext: 'js', watch: ['devServer/'], env: {NODE_ENV : 'development'} })
        .on('change', ['validate-server-scripts'])
        .on('restart', function () {
            console.log('[nodemon] restarted server');
        });

    // start live-reload server
    plugins.livereload.listen({ start: true });

    // watch index
    gulp.watch(paths.index, function() {
        return pipes.builtIndex()
            .pipe(plugins.livereload());
    });

    // watch app scripts
    gulp.watch(paths.scripts, function() {
        return pipes.builtAppScripts()
            .pipe(plugins.livereload());
    });

    // watch html partials
    gulp.watch(paths.partials, function() {
        return pipes.builtPartials()
            .pipe(plugins.livereload());
    });

    // watch styles
    gulp.watch(paths.styles, function() {
        return pipes.builtStyles()
            .pipe(plugins.livereload());
    });

});