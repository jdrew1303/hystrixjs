var gulp = require('gulp');
var babel = require('gulp-babel');
var plumber = require('gulp-plumber');
var jasmine = require('gulp-jasmine');

var path = require('path');

var paths = {
    es6: ['src/**/*.js'],
    es5: 'lib',
    // Must be absolute or relative to source map
    sourceRoot: path.join(__dirname, 'es6'),
};

gulp.task('babel', function (cb) { // (A)
    gulp.src(paths.es6)
        .pipe(plumber())
        .pipe(babel())
        .pipe(gulp.dest(paths.es5));
    cb();
});

gulp.task('test', function () {
    return gulp.src('test/**/*.spec.js')
        .pipe(jasmine({
            verbose:true,
            includeStackTrace:true
        })
    );
});

gulp.task('watch', function() { // (D)
    gulp.watch(paths.es6, ['babel']);
    gulp.watch(['test/**/*','lib/**/*'], ['test']);
});

gulp.task('default', ['watch']); // (E)