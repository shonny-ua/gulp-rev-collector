'use strict';
var _            = require('underscore');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;
var through      = require('through2');
var path         = require('path');

var PLUGIN_NAME  = 'gulp-rev-collector';

var revSuffixStr = '-[0-9a-f]{8}-?';
var revSuffixRX  = new RegExp( revSuffixStr );

function _getManifestData(file) {
    var data;
    var ext = path.extname(file.path);
    if (ext === '.json') {
        var json = {};
        try {
            json = JSON.parse(file.contents.toString('utf8'))
        } catch (x) {
            this.emit('error', new PluginError(PLUGIN_NAME,  x));
            return;
        }
        if (_.isObject(json)) {
            var isRev = 1;
            Object.keys(json).forEach(function (key) {
                if ( path.basename(json[key]).replace(revSuffixRX, '' ) !==  path.basename(key) ) {
                    isRev = 0;
                }
            });
            
            if (isRev) {
                data = json;
            }
        }
        
    }
    return data;
}

function escPathPattern(pattern) {
    return pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\^\$\|\/\\]/g, "\\$&");
}

function closeDirBySep(dirname) {
    return dirname + (!dirname || new RegExp( escPathPattern(path.sep) + '$' ).test(dirname) ? '' : path.sep);
}

function revCollector(opts) {
    if (!opts) {
        opts = {};
    }
    
    var manifest  = {};
    var mutables = [];
    return through.obj(function (file, enc, cb) {
        if (!file.isNull()) {
            var mData = _getManifestData(file);
            if (mData) {
                _.extend( manifest, mData );
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

        for (var k in manifest) {
            var pattern = k;
            if (opts.replaceReved) {
                pattern = escPathPattern( (path.dirname(k) === '.' ? '' : closeDirBySep(path.dirname(k)) ) + path.basename(k, path.extname(k)) ) 
                            + revSuffixStr 
                            + escPathPattern( path.extname(k) );
            } else {
                pattern = escPathPattern(k);
            }

            if ( dirReplacements.length ) {
                dirReplacements.forEach(function (dirRule) {
                    changes.push({
                        regexp: new RegExp(  dirRule.dirRX + pattern, 'g' ),
                        replacement: dirRule.dirRpl + manifest[k]
                    });
                });
            } else {
                changes.push({
                    regexp: new RegExp( pattern, 'g' ),
                    replacement: manifest[k]
                });
            }
        }

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
