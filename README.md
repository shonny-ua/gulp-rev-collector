# [gulp](https://github.com/wearefractal/gulp)-rev-collector

> Static asset revision data collector from manifests, with was generated from different streams and replace they's links in html template.

## Install

```sh
$ npm install --save-dev gulp-rev-collector
```

## Usage

We can use [gulp-rev](https://github.com/sindresorhus/gulp-rev) to cache-bust several assets and generate manifest files for them. Then using gulp-rev-collector we can collect data from several manifest files and replace lincks to assets in html trmplates.

```js
var gulp         = require('gulp');
var rev = require('gulp-rev');

gulp.task('css', function () {
    return gulp.src('src/css/*.css')
        .pipe(rev())
        .pipe(gulp.dest('dist/css'))
        .pipe( rev.manifest() )
        .pipe( gulp.dest( 'rev/css' ) );
});

gulp.task('scripts', function () {
    return gulp.src('src/js/*.js')
        .pipe(rev())
        .pipe(gulp.dest('dist/js'))
        .pipe( rev.manifest() )
        .pipe( gulp.dest( 'rev/js' ) );
});

...

var revCollector = require('gulp-rev-collector');
var minifyHTML   = require('gulp-minify-html');

gulp.task('rev', function () {
    return gulp.src(['rev/**/*.json', 'templates/**/*.html'])
        .pipe( revCollector() )
        .pipe( minifyHTML({
                empty:true,
                spare:true
            }) )
        .pipe( gulp.dest('dist') );
});
```

*Options are intentionally missing as the default should work in most cases.*

### Works with gulp-rev-collector

- [gulp-rev](https://github.com/sindresorhus/gulp-rev)

## License

[MIT](http://opensource.org/licenses/MIT) © [Oleksandr Ovcharenko](mailto:shonny.ua@gmail.com)
