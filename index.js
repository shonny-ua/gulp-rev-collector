var _           = require('underscore');
var gutil       = require('gulp-util');
var PluginError = gutil.PluginError;
var through     = require('through2');
var path        = require('path');

function revCollector() {
    var manifest  = {};
    var templates = [];
    return through.obj(function (file, enc, cb) {
        if (!file.isNull()) {
            var ext = path.extname(file.path);
            if (ext === '.json') {
                var json = {};
                try {
                    json = JSON.parse(file.contents.toString('utf8'))
                } catch (x) {
                    // TODO log catched throw
                }
                _.extend( manifest, json );
            } else if (ext === '.html') {
                templates.push(file);
            }
        }
        cb();
    }, function (cb) {
        templates.forEach(function (file){
            if (!file.isNull()) {
                var src = file.contents.toString('utf8');
                for (var k in manifest) {
                    src = src.replace(k, manifest[k]);
                }
                file.contents = new Buffer(src);
            }
            this.push(file);
        }, this);
        cb();
    });
}

module.exports = revCollector;