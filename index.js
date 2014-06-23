'use strict';
var _           = require('underscore');
var gutil       = require('gulp-util');
var PluginError = gutil.PluginError;
var through     = require('through2');
var path        = require('path');

var PLUGIN_NAME = 'gulp-rev-collector';

function revCollector() {
    var manifest  = {};
    var mutables = [];
    return through.obj(function (file, enc, cb) {
        if (!file.isNull()) {
            var ext = path.extname(file.path);
            if (ext === '.json') {
                var json = {};
                try {
                    json = JSON.parse(file.contents.toString('utf8'))
                } catch (x) {
                    this.emit('error', new PluginError(PLUGIN_NAME,  x));
                }
                _.extend( manifest, json );
            } else if (~['.js', '.css', '.html', '.htm', '.phtml', '.shtml', '.php'].indexOf(ext)) {
                mutables.push(file);
            }
        }
        cb();
    }, function (cb) {
        mutables.forEach(function (file){
            if (!file.isNull()) {
                var src = file.contents.toString('utf8');
                for (var k in manifest) {
                    var re = new RegExp(find, 'g');
                    src = src.replace(re, manifest[k]);
                }
                file.contents = new Buffer(src);
            }
            this.push(file);
        }, this);
        cb();
    });
}

module.exports = revCollector;
