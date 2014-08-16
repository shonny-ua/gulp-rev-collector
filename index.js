'use strict';
var _            = require('underscore');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;
var through      = require('through2');
var path         = require('path');

var PLUGIN_NAME  = 'gulp-rev-collector';

function _getManifestData(file) {
    var json;
    try {
        json = JSON.parse(file.contents.toString('utf8'));
    } catch (x) {
        this.emit('error', new PluginError(PLUGIN_NAME,  x));
        return;
    }
    if (!_.isObject(json)) {
        this.emit('error', new PluginError(PLUGIN_NAME, "expected " + file.path + " to be contain a js-object (manifest file)."));
    }
    return  json;
}

function escPathPattern(pattern) {
    return pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\^\$\|\/\\]/g, "\\$&");
}

function closeDirBySep(dirname) {
    return dirname + (!dirname || new RegExp( escPathPattern(path.sep) + '$' ).test(dirname) ? '' : path.sep);
}

function revCollector(opts) {
    var manifest  = {};
    var mutables = [];
    var defaults = {
        revSuffix: '-[0-9a-f]{8}-?',
        manifestFilename: "rev-manifest.json"
    };
    opts = _.defaults(defaults, opts);

    return through.obj(function (file, enc, cb) {
        if (!file.isNull()) {
            if (path.basename(file.path) === opts.manifestFilename) {
                _.extend(manifest, _getManifestData(file, opts.manifestFilename));
            } else {
                mutables.push(file);
            }
        }
        cb();
    }, function (cb) {
        var changes = [];
        var dirReplacements = [];
        if ( _.isObject(opts.dirReplacements) ) {
            Object.keys(opts.dirReplacements).forEach(function (srcDirname) {
                dirReplacements.push({
                    dirRX:  escPathPattern( closeDirBySep(srcDirname) ),
                    dirRpl: closeDirBySep(opts.dirReplacements[srcDirname])
                });
            });
        }

        _.each(manifest, function(value, key) {
            var patterns = [ escPathPattern(key) ];
            if (opts.replaceReved) {
                patterns.push( escPathPattern( (path.dirname(key) === '.' ? '' : closeDirBySep(path.dirname(key)) ) + path.basename(key, path.extname(key)) )
                            + opts.revSuffix
                            + escPathPattern( path.extname(key) )
                        );
            }

            if ( dirReplacements.length ) {
                dirReplacements.forEach(function (dirRule) {
                    patterns.forEach(function (pattern) {
                        changes.push({
                            regexp: new RegExp(  dirRule.dirRX + pattern, 'g' ),
                            replacement: dirRule.dirRpl + manifest[key]
                        });
                    });
                });
            } else {
                patterns.forEach(function (pattern) {
                    changes.push({
                        regexp: new RegExp( pattern, 'g' ),
                        replacement: manifest[key]
                    });
                });
            }
        });

        mutables.forEach(function (file){
            if (!file.isNull()) {
                var src = file.contents.toString('utf8');
                changes.forEach(function (r) {
                    src = src.replace(r.regexp, r.replacement);
                });
                file.contents = new Buffer(src);
            }
            this.push(file);
        }, this);

        cb();
    });
}

module.exports = revCollector;
