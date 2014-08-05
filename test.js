'use strict';
var assert              = require('assert');
var gutil               = require('gulp-util');
var revCollector        = require('./index');
var path                = require('path');

var cssManifestBody     = '{"style.css":"style-1d87bebe.css"}';
var jsManifestBody      = '{"script1.js": "script1-61e0be79.js", "script2.js": "script2-a42f5380.js"}';
var htmlFileBody        = '<html><head><link rel="stylesheet" href="/css/style.css" /><script src="/js/script1.js"></script><script src="/scripts/script2.js"></script></head><body></body></html>';
var htmlRevedFileBody   = '<html><head><link rel="stylesheet" href="/css/style-af457da8.css" /><script src="/js/script1-ce78a5c3.js"></script><script src="/js/script2.js"></script></head><body></body></html>';

it('should replace links in .html file wo params', function (cb) {
    var stream = revCollector();
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(cssManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(jsManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style\.css/.test(contents),
            'The CSS file name should be replaced'
        );

        assert(
            /\/css\/style-1d87bebe\.css/.test(contents),
            'The CSS file name should be correct replaced'
        );

        assert(
            !/script1\.js/.test(contents),
            'The JS#1 file name should be replaced'
        );

        assert(
            /\/js\/script1-61e0be79\.js/.test(contents),
            'The JS#1 file name should be correct replaced'
        );

        assert(
            !/script2\.js/.test(contents),
            'The JS#2 file name should be replaced'
        );

        assert(
            /\/scripts\/script2-a42f5380\.js/.test(contents),
            'The JS#2 file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

it('should replace reved links in .html file with "replaceReved" param', function (cb) {
    var stream = revCollector({
        replaceReved: true
    });
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(cssManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(jsManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlRevedFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style-af457da8\.css/.test(contents),
            'The CSS file name should be replaced'
        );

        assert(
            /\/css\/style-1d87bebe\.css/.test(contents),
            'The CSS file name should be correct replaced'
        );

        assert(
            !/script1-ce78a5c3\.js/.test(contents),
            'The JS#1 file name should be replaced'
        );

        assert(
            /\/js\/script1-61e0be79\.js/.test(contents),
            'The JS#1 file name should be correct replaced'
        );

        assert(
            !/script2\.js/.test(contents),
            'The JS#2 file name should be replaced'
        );

        assert(
            /\/js\/script2-a42f5380\.js/.test(contents),
            'The JS#2 file name should be correct replace'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

it('should replace links in .html file with "dirReplacements"', function (cb) {
    var stream = revCollector({
        dirReplacements: {
            '/css': '/dist/styles',
            '/js/': '/dist/'
        }
    });
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(cssManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(jsManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style\.css/.test(contents),
            'The CSS file name should be replaced'
        );

        assert(
            /\/dist\/styles\/style-1d87bebe\.css/.test(contents),
            'The CSS file name should be correct replaced'
        );

        assert(
            !/script1\.js/.test(contents),
            'The JS#1 file name should be replaced'
        );

        assert(
            /\/dist\/script1-61e0be79\.js/.test(contents),
            'The JS#1 file name should be correct replaced'
        );

        assert(
            /\/scripts\/script2\.js/.test(contents),
            'The JS#2 file name should be replaced'
        );

        assert(
            !/\/script2-a42f5380\.js/.test(contents),
            'The JS#2 file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});