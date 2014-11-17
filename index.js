'use strict';
var _            = require('underscore');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;
var through      = require('through2');
var path         = require('path');

var PLUGIN_NAME  = 'gulp-rev-collector';

var defaults = {
    revSuffix: '-[0-9a-f]{8}-?'
};

function _getManifestData(file, opts) {
    var data;
    var ext = path.extname(file.path);
    if (ext === '.json') {
        var json = {};
        try {
            var content = file.contents.toString('utf8');
            if (content) {
                json = JSON.parse(content);
            }
        } catch (x) {
            this.emit('error', new PluginError(PLUGIN_NAME,  x));
            return;
        }
        if (_.isObject(json)) {
            var isRev = 1;
            Object.keys(json).forEach(function (key) {
                if ( path.basename(json[key]).replace(new RegExp( opts.revSuffix ), '' ) !==  path.basename(key) ) {
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
    opts = _.defaults((opts || {}), defaults);
    
    var manifest  = {};
    var mutables = [];
    return through.obj(function (file, enc, cb) {
        if (!file.isNull()) {
            var mData = _getManifestData.call(this, file, opts);
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

        for (var key in manifest) {
            var patterns = [ escPathPattern(key) ];
            if (opts.replaceReved) {
                patterns.push( escPathPattern( (path.dirname(key) === '.' ? '' : key.slice(0, key.lastIndexOf(path.basename(key)))) + path.basename(key, path.extname(key)) ) 
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
