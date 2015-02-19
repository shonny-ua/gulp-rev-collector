[![Build Status](https://travis-ci.org/shonny-ua/gulp-rev-collector.svg)](https://travis-ci.org/shonny-ua/gulp-rev-collector)
[![Dependencies](https://david-dm.org/shonny-ua/gulp-rev-collector.svg)](https://david-dm.org/shonny-ua/gulp-rev-collector)
[![devDependencies](https://david-dm.org/shonny-ua/gulp-rev-collector/dev-status.svg)](https://david-dm.org/shonny-ua/gulp-rev-collector#info=devDependencies&view=table)
[![NPM version](https://badge.fury.io/js/gulp-rev-collector.svg)](http://badge.fury.io/js/gulp-rev-collector)

# [gulp](https://github.com/wearefractal/gulp)-rev-collector

[![NPM](https://nodei.co/npm/gulp-rev-collector.png?downloads=true&stars=true)](https://nodei.co/npm/gulp-rev-collector/)

> Static asset revision data collector from manifests, generated from different streams, and replace their links in html template.

## Install

```sh
$ npm install --save-dev gulp-rev-collector
```

## Usage

We can use [gulp-rev](https://github.com/sindresorhus/gulp-rev) to cache-bust several assets and generate manifest files for them. Then using gulp-rev-collector we can collect data from several manifest files and replace lincks to assets in html templates.

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
        .pipe( revCollector({
            replaceReved: true,
            dirReplacements: {
                'css': '/dist/css',
                '/js/': '/dist/js/'
            },
            'cdn' : {
                'subdomain' : '//cdn',
                'domain': 'domain.com',
                'limit': 4
            }
        }) )
        .pipe( minifyHTML({
                empty:true,
                spare:true
            }) )
        .pipe( gulp.dest('dist') );
});
```

### Options

#### replaceReved

Type : `Boolean`

You set a flag, replaceReved, which will replace alredy replaced links in template's files. Default value is `false`.

#### dirReplacements

Specifies a directories replacement set. [gulp-rev](https://github.com/sindresorhus/gulp-rev) creates manifest files without any info about directories. E.c. if you use dirReplacements param from [Usage](#usage) example, you get next replacement:

```
"/css/style.css" => "/dist/css/style-1d87bebe.css"
```

#### revSuffix

Type : `String`

It is pattern for define reved files suffixes. Default value is '-[0-9a-f]{8}-?'. This is necessary in case of e.c. [gulp-rename](https://github.com/hparra/gulp-rename) usage. If reved filenames had different from default mask.

#### cdn

Specifies a cdn to prepend to replacement set.  Must be used in conjunction with dirReplacement.
Optional ```limit```: CDN subdomains will be created in a random numbered order (up to limit) to facilitate using multiple cdn cnames.

```
"/css/style.css" => "//cdn[1-4].domain.com/dist/css/style-1d87bebe.css"
```

### Works with gulp-rev-collector

- [gulp-rev](https://github.com/sindresorhus/gulp-rev)

## License

[MIT](http://opensource.org/licenses/MIT) © [Oleksandr Ovcharenko](mailto:shonny.ua@gmail.com)
