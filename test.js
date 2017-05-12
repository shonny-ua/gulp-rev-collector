'use strict';
var assert              = require('assert');
var gutil               = require('gulp-util');
var revCollector        = require('./index');
var path                = require('path');
var isEqual             = require('lodash.isequal');

var cssManifestBody     = '{"style.css":"style-1d87bebe.css"}';
var jsManifestBody      = '{"script1.js": "script1-61e0be79.js", "script2.js": "script2-a42f5380.js"}';
var imgManifestBody     = '{"image.gif": "image-35c3af8134.gif"}';
var htmlFileBody        = '<html><head><link rel="stylesheet" href="/css/style.css" /><script src="/js/script1.js"></script><script src="/scripts/script2.js"></script></head><body><img src="cdn/image.gif" /></body></html>';
var htmlRevedFileBody   = '<html><head><link rel="stylesheet" href="/css/style-af457da8.css" /><script src="/js/script1-ce78a5c3.js"></script><script src="/js/script2.js"></script></head><body><img src="cdn/image-35c3af8134.gif" /></body></html>';

var unresolvedHtmlFileBody = '<html><head><style>body { background-image: url(image.gif); }</style></head><body></body></html>';
var unquotedHtmlFileBody   = '<html><head></head><body><img src=image.gif></body></html>';

var cssSortManifestBody     = '{"style.css":"style-1d87bebe.css", "style.css.css":"style-ebeb78d1.css.css"}';
var jsSortManifestBody      = '{"script1.js": "script1-61e0be79.js", "script2.js": "script2-a42f5380.js", "script1.js.js": "script1-98eb0e16.js.js", "script2.js.js": "script2-0835f24a.js.js"}';
var imgSortManifestBody     = '{"image.gif": "image-35c3af8134.gif", "image.gif.gif": "image-4318fa3c53.gif"}';
var htmlSortFileBody        = '<html><head><link rel="stylesheet" href="/css/style.css.css" /><script src="/js/script1.js.js"></script><script src="/scripts/script2.js.js"></script></head><body><img src="cdn/image.gif.gif" /></body></html>';

var cssSfxManifestBody     = '{"style.css":"style-1d87bebe-rev.css"}';
var jsSfxManifestBody      = '{"script1.js": "script1-61e0be79-rev.js", "script2.js": "script2-a42f5380-rev.js"}';
var htmlSfxRevedFileBody   = '<html><head><link rel="stylesheet" href="/css/style-af457da8-rev.css" /><script src="/js/script1-ce78a5c3-rev.js"></script><script src="/js/script2.js"></script></head><body></body></html>';

var doubleCssManifestBody  = '{"style.css":"style-1d87bebe.css", "bebe.css":"bebe-c4092d8d.css"}';
var doubleHtmlFileBody     = '<html><head><link rel="stylesheet" href="/css/style.css" /><link rel="stylesheet" href="/css/bebe.css" /></head><body></body></html>';

var collectedManifestStandard = {
    'style.css': 'style-1d87bebe.css',
    'script1.js': 'script1-61e0be79.js',
    'script2.js': 'script2-a42f5380.js'
};

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
        path: 'rev/img/rev-manifest.json',
        contents: new Buffer(imgManifestBody)
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

        assert(
            !/image\.gif/.test(contents),
            'The image file name should be replaced'
        );

        assert(
            /cdn\/image-35c3af8134\.gif/.test(contents),
            'The image file name should be correctly replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

it('should replace asset links which are not wrapped in quotes', function (cb) {
    var stream = revCollector();

    stream.write(new gutil.File({
        path: 'rev/img/rev-manifest.json',
        contents: new Buffer(imgManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(unquotedHtmlFileBody)
    }));

    stream.on('data', function (file) {
        var contents = file.contents.toString('utf8');

        assert(
            !/image\.gif/.test(contents),
            'The image file name should be replaced'
        );

        assert(
            /image-35c3af8134\.gif/.test(contents),
            'The unquoted image file name should be correctly replaced'
        );
    });

    stream.on('end', cb);

    stream.end();
});

it('should generate correct collected manifest file', function (cb) {
    var stream = revCollector({
        collectedManifest: 'collectedManifest.json'
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

    stream.on('data', function (file) {
        var fpath = file.path;
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');
        var collectedManifest = JSON.parse(contents);

        assert(isEqual(collectedManifest, collectedManifestStandard), 'The collected manifest content should be correct');

        assert.equal(fpath, 'collectedManifest.json', 'Only collectedManifest.json file should pass through the stream');

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

// https://github.com/shonny-ua/gulp-rev-collector/issues/30
it('should generate correct collected manifest file, even if the map includes different extensions', function (cb) {
    var stream = revCollector({
        // collectedManifest: 'collectedManifest.json'
    });
    var fileCount = 0;
    var revisionMap = {
        "assets/less/common.less": "assets/css/common-2c0d21e40c.css"
    };

    var htmlFileBody        = '<html><head><link rel="stylesheet" href="/assets/less/common.less" /></head><body><img src="cdn/image.gif" /></body></html>';
    var htmlRevedFileBody   = '<html><head><link rel="stylesheet" href="/assets/css/common-2c0d21e40c.css" /></head><body><img src="cdn/image.gif" /></body></html>';

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(JSON.stringify(revisionMap))
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlFileBody)
    }));

    stream.on('data', function (file) {
        var fpath = file.path;
        var contents = file.contents.toString('utf8');
        var ext = path.extname(file.path);

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/assets\/less\/common\.less/.test(contents),
            'The LESS file name should be replaced'
        );

        assert(
            /assets\/css\/common-2c0d21e40c\.css/.test(contents),
            'The LESS 2 CSS file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});
// https://github.com/shonny-ua/gulp-rev-collector/issues/32
it('should generate correct collected manifest file, even if f the name of the JS file contains “-”', function (cb) {
    var stream = revCollector({
        // collectedManifest: 'collectedManifest.json'
    });
    var fileCount = 0;
    var revisionMap = {
        "assets/js/com-mon.js": "assets/js/com-mon-2c0d21e40c.js"
    };

    var htmlFileBody        = '<html><head><script src="/assets/js/com-mon.js"></head><body><img src="cdn/image.gif" /></body></html>';
    var htmlRevedFileBody   = '<html><head><script src="/assets/js/com-mon.js": "assets/js/common-2c0d21e40c.js"></head><body><img src="cdn/image.gif" /></body></html>';

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(JSON.stringify(revisionMap))
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlFileBody)
    }));

    stream.on('data', function (file) {
        var fpath = file.path;
        var contents = file.contents.toString('utf8');
        var ext = path.extname(file.path);

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/assets\/js\/com-mon\.js/.test(contents),
            'The JS file name should be replaced'
        );

        assert(
            /assets\/js\/com-mon-2c0d21e40c.js/.test(contents),
            'The JS file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

// https://github.com/shonny-ua/gulp-rev-collector/issues/33
it('should generate correct collected manifest file, even if the map includes multiple extensions', function (cb) {
    var stream = revCollector({
        collectedManifest: 'collectedManifest.json'
    });
    var fileCount = 0;
    var revisionMap = {
        "js/app.js": "js/app-aaaaaaaaaa.js",
        "maps/js/app.js.map": "maps/js/app-aaaaaaaaaa.js.map"
    };

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(JSON.stringify(revisionMap))
    }));

    stream.on('data', function (file) {
        var fpath = file.path;
        var contents = file.contents.toString('utf8');
        var collectedManifest = JSON.parse(contents);

        assert(isEqual(collectedManifest, revisionMap), 'The collected manifest content should match the found one');

        assert.equal(fpath, 'collectedManifest.json', 'Only collectedManifest.json file should pass through the stream');

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

it('should match longer rev patterns before shorter ones', function (cb) {
    var stream = revCollector();
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(cssSortManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(jsSortManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlSortFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style\.css\.css/.test(contents),
            'The CSS file name should be replaced'
        );

        assert(
            /\/css\/style-ebeb78d1\.css\.css/.test(contents),
            'The CSS file name should be correct replaced'
        );

        assert(
            !/script1\.js\.js/.test(contents),
            'The JS#1 file name should be replaced'
        );

        assert(
            /\/js\/script1-98eb0e16\.js\.js/.test(contents),
            'The JS#1 file name should be correct replaced'
        );

        assert(
            !/script2\.js\.js/.test(contents),
            'The JS#2 file name should be replaced'
        );

        assert(
            /\/scripts\/script2-0835f24a\.js\.js/.test(contents),
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
            '/js/': '/dist/',
            'cdn/': function(manifest_value) {
                return '//cdn' + (Math.floor(Math.random() * 9) + 1) + '.' + 'example.dot' + '/img/' + manifest_value;
            }
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
        path: 'rev/img/rev-manifest.json',
        contents: new Buffer(imgManifestBody)
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

        assert(
            !/image\.gif/.test(contents),
            'The ING file name should be replaced'
        );

        assert(
            /\/\/cdn[0-9]\.example\.dot\/img\/image-35c3af8134\.gif/.test(contents),
            'The IMG file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});

it('should replace reved links in .html file with "revSuffix" and "replaceReved" param', function (cb) {
    var stream = revCollector({
        replaceReved: true,
        revSuffix: '-[0-9a-f]{8}-rev'
    });
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(cssSfxManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'rev/js/rev-manifest.json',
        contents: new Buffer(jsSfxManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(htmlSfxRevedFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style-af457da8-rev\.css/.test(contents),
            'The CSS file name should be replaced'
        );

        assert(
            /\/css\/style-1d87bebe-rev\.css/.test(contents),
            'The CSS file name should be correct replaced'
        );

        assert(
            !/script1-ce78a5c3-rev\.js/.test(contents),
            'The JS#1 file name should be replaced'
        );

        assert(
            /\/js\/script1-61e0be79-rev\.js/.test(contents),
            'The JS#1 file name should be correct replaced'
        );

        assert(
            !/script2\.js/.test(contents),
            'The JS#2 file name should be replaced'
        );

        assert(
            /\/js\/script2-a42f5380-rev\.js/.test(contents),
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

it('should replace all links in .html file once', function (cb) {
    var stream = revCollector();
    var fileCount = 0;

    stream.write(new gutil.File({
        path: 'rev/css/rev-manifest.json',
        contents: new Buffer(doubleCssManifestBody)
    }));

    stream.write(new gutil.File({
        path: 'index.html',
        contents: new Buffer(doubleHtmlFileBody)
    }));

    stream.on('data', function (file) {
        var ext = path.extname(file.path);
        var contents = file.contents.toString('utf8');

        assert.equal(ext, '.html', 'Only html files should pass through the stream');

        assert(
            !/style\.css/.test(contents),
            'The CSS#1 file name should be replaced'
        );

        assert(
            /\/css\/style-1d87bebe\.css/.test(contents),
            'The CSS#1 file name should be correct replaced'
        );

        assert(
            !/[^7]bebe\.css/.test(contents),
            'The CSS#1&&#2 file name should be replaced once'
        );

        assert(
            !/\/css\/style-1d87bebe-c4092d8d\.css/.test(contents),
            'The CSS#1 file name should be replaced once'
        );

        assert(
            /\/css\/bebe-c4092d8d\.css/.test(contents),
            'The CSS#2 file name should be correct replaced'
        );

        fileCount++;
    });

    stream.on('end', function() {
        assert.equal(fileCount, 1, 'Only one file should pass through the stream');
        cb();
    });

    stream.end();
});
