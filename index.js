'use strict';
var _            = require('underscore');
var gutil        = require('gulp-util');
var PluginError  = gutil.PluginError;
var through      = require('through2');
var path         = require('path');

var PLUGIN_NAME  = 'gulp-rev-collector';

var defaults = {
    revSuffix: '-[0-9a-f]{8,10}-?',
    extMap: {
        '.scss': '.css',
        '.less': '.css',
        '.jsx': '.js'
    }
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
                if (!_.isString(json[key])) {
                    isRev = 0;
                    return;
                }
                var cleanReplacement =  path.basename(json[key]).replace(new RegExp( opts.revSuffix ), '' );
                if (!~[
                        path.basename(key),
                        _mapExtnames(path.basename(key), opts)
                    ].indexOf(cleanReplacement)
                ) {
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

// Issue #30 extnames normalisation
function _mapExtnames(filename, opts) {
    var fileExt = path.extname(filename);
    Object.keys(opts.extMap).forEach(function (ext) {
        if (fileExt === ext) {
            filename = filename.replace(new RegExp( '\\' + ext + '$' ), opts.extMap[ext]);
        }
    });
    return filename;
}

function escPathPattern(pattern) {
    return pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\^\$\|\/\\]/g, "\\$&");
}

function closeDirBySep(dirname) {
    return dirname + (!dirname || new RegExp( escPathPattern('/') + '$' ).test(dirname) ? '' : '/');
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
                    dirRpl: opts.dirReplacements[srcDirname]
                });
            });
        }

        if (opts.collectedManifest) {
            this.push(
                new gutil.File({
                    path: opts.collectedManifest,
                    contents: new Buffer(JSON.stringify(manifest, null, "\t"))
                })
            );
        }

        for (var key in manifest) {
            var patterns = [ escPathPattern(key) ];
            if (opts.replaceReved) {
                var patternExt = path.extname(key);
                if (patternExt in opts.extMap) {
                    patternExt = '(' + escPathPattern(patternExt) + '|' + escPathPattern(opts.extMap[patternExt]) + ')';
                } else {
                    patternExt = escPathPattern(patternExt);
                }
                patterns.push( escPathPattern( (path.dirname(key) === '.' ? '' : closeDirBySep(path.dirname(key)) ) )
                            + path.basename(key, path.extname(key))
                                .split('.')
                                .map(function(part){
                                    return escPathPattern(part) + '(' + opts.revSuffix + ')?';
                                })
                                .join('\\.')
                            + patternExt
                        );
            }

            if ( dirReplacements.length ) {
                dirReplacements.forEach(function (dirRule) {
                    patterns.forEach(function (pattern) {
                        changes.push({
                            regexp: new RegExp(  dirRule.dirRX + pattern, 'g' ),
                            patternLength: (dirRule.dirRX + pattern).length,
                            replacement: _.isFunction(dirRule.dirRpl)
                                            ? dirRule.dirRpl(manifest[key])
                                            : closeDirBySep(dirRule.dirRpl) + manifest[key]
                        });
                    });
                });
            } else {
                patterns.forEach(function (pattern) {
                    // without dirReplacements we must leave asset filenames with prefixes in its original state
                    var prefixDelim = '([\/\\\\\'"';
                    // if dir part in pattern exists, all exsotoic symbols should be correct processed using dirReplacements
                    if (/[\\\\\/]/.test(pattern)) {
                        prefixDelim += '\(=';
                    } else {
                        if (!/[\(\)]/.test(pattern)) {
                            prefixDelim += '\(';
                        }
                        if (!~pattern.indexOf('=')) {
                            prefixDelim += '=';
                        }
                    }
                    prefixDelim += '])';
                    changes.push({
                        regexp: new RegExp( prefixDelim + pattern, 'g' ),
                        patternLength: pattern.length,
                        replacement: '$1' + manifest[key]
                    });
                });
            }
        }

        // Replace longer patterns first
        // e.g. match `script.js.map` before `script.js`
        changes.sort(
            function(a, b) {
                return b.patternLength - a.patternLength;
            }
        );

        // concat path config
        var concatPrefixes = _.isObject(opts.concatPrefixes) ? opts.concatPrefixes : false;
        var concatPrefixMap = getConcatPrefixMap(concatPrefixes);

        mutables.forEach(function (file){
            if (!file.isNull()) {
                var src = file.contents.toString('utf8');
                changes.forEach(function (r) {
                    src = src.replace(r.regexp, r.replacement);
                });

                // deal concat path
                if(concatPrefixMap && concatPrefixMap.length){
                    src = replaceAllConcat(src, concatPrefixMap, changes);
                }

                file.contents = new Buffer(src);
            }
            this.push(file);
        }, this);

        cb();
    });
}

/**
 * getConcatPrefixMap
 * @param {object} concatPrefixes
 * @return {[{k: string, v: string}]}
 */
function getConcatPrefixMap(concatPrefixes){
    var arr = [];
    if(_.isObject(concatPrefixes)){
        arr = Object.keys(concatPrefixes).map(function(k){
            return {
                k: k,
                v: concatPrefixes[k]
            };
        });
        arr.length && arr.sort(function(a, b){
            return b.length -a.length;
        });
    }
    return arr;
}

/**
 * replaceAllConcat
 * @param {string} src
 * @param {array} concatPrefixMap
 * @param {array} changes
 * @returns {string}
 */
function replaceAllConcat(src, concatPrefixMap, changes){
    if(!_.isString(src) || !(_.isArray(concatPrefixMap) && concatPrefixMap.length) || !_.isArray(changes)){
        return src;
    }
    // url path doesn't include quotes & space inner :
    //  [√] js/a/b/c.js
    //  [×] js/'a/"b/c.js
    //  [×] js/  a/b/c.js
    var normalPathPettern = '[^\\f\\n\\r\\t\\v\'"`]';
    concatPrefixMap.forEach(function(cpfObj){
        var cpfKey = cpfObj.k;
        var cpfValue = cpfObj.v;
        if(!_.isString(cpfKey) || !_.isString(cpfValue)){
            return false;
        }
        var cpfPattern = escPathPattern(cpfKey);
        // start with prefix and end with quotes
        var concatPattern = cpfPattern + '(' + normalPathPettern + '+,' + normalPathPettern + '+)+[\'`"]';
        var concatRegEx = new RegExp(concatPattern, 'g');
        var concatArr = src.match(concatRegEx);
        // console.log('\nRegex:' + concatRegEx + '  Matched-length: ' + (concatArr && concatArr.length || 0));
        // concatArr && console.log(JSON.stringify(concatArr, null, 2));
        if(concatArr && concatArr.length){
            // format & unique
            concatArr = _.uniq(concatArr.map(function(s){
                return s.replace(/(^['"`])|(['"`]$)/g, '').trim();
            }));
            // longer first
            concatArr.sort(function(a, b){
                return b.length - a.length;
            });
            // console.log('After: Format & Unique & Sort:  Format-length: ' + concatArr.length);
            // console.log(JSON.stringify(concatArr, null, 2));

            concatArr.forEach(function(s){
                var cRevInfo = getConcatRevInfo(s, {
                    cpfKey: cpfKey,
                    cpfValue: cpfValue,
                    changes: changes
                });
                if(cRevInfo.regexp){
                    // console.log(cRevInfo.regexp + '  ->  ' + cRevInfo.replacement);
                    src = src.replace(cRevInfo.regexp, cRevInfo.replacement);
                }else{
                    // console.log('Skip replace: ' + s);
                }
            });
        }
    });
    return src;
}

/**
 *
 * @param str
 * @param opts
 *        opts.cpfKey   {string}
 *        opts.cpfValue {string}
 *        opts.changes  {array}
 * @returns {{regexp: RegExp|null, replacement: string}}
 */
function getConcatRevInfo(str, opts){
    opts = _.isObject(opts) ? opts : {};
    var cpfKey = opts.cpfKey || '';
    var cpfValue = opts.cpfValue || '';
    var changes = opts.changes || [];
    if(!_.isString(cpfKey) || !_.isString(cpfKey) || !(_.isArray(changes) && changes.length)){
        return {
            regexp: null,
            replacement: str
        };
    }
    var _str = str.replace(/['"`]$/g, '').trim();
    var res = {
        regexp: new RegExp(escPathPattern(_str), 'g'),
        replacement: _str
    };
    var cpfPattern = escPathPattern(cpfKey);
    res.replacement = _str.split(',').map(function(s, i){
        var _s;
        // 'add-prefix': add prefix to path (set complete path to reversion)
        var isFirst = 0 === i;
        if(isFirst){
            _s = s.replace(new RegExp(cpfPattern, 'g'), cpfValue);
        }else{
            _s = cpfValue + s;
        }
        // 'rev-name': reversion name in complete path after 'add-prefix'
        changes.forEach(function (r) {
            _s = _s.replace(r.regexp, r.replacement);
        });
        // 'delete-prefix': delete prefix from path
        var delStart = isFirst ? cpfKey : '';
        var cpfvPtn = escPathPattern(cpfValue);
        _s = _s.replace(new RegExp(cpfvPtn, 'g'), delStart);
        return _s;
    }).join(',');
    if(res.replacement === _str){
        res.regexp = null;
    }
    return res;
}

module.exports = revCollector;
