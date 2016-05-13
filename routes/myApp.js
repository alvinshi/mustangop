/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');

// 查询 我的App
router.get('/', function(req, res, next) {
    var userid = util.useridInReq(req);
    return res.render('myApp');
});

router.get('/angular', function(req, res, next) {
    var userId = util.useridInReq(req);

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.find({
        success: function(results) {
            //has blinded
            var retApps = new Array();
            for (var i = 0; i < results.length; i++){
                var appObject = new Object();
                var appInfoObject = results[i].get('appObject');

                appObject.trackName = appInfoObject.get('trackName');
                appObject.artworkUrl100 = appInfoObject.get('artworkUrl100');
                appObject.artworkUrl512 = appInfoObject.get('artworkUrl512');
                appObject.appleId = appInfoObject.get('appleId');
                appObject.appleKind = appInfoObject.get('appleKind');
                appObject.formattedPrice = appInfoObject.get('formattedPrice');
                appObject.latestReleaseDate = appInfoObject.get('latestReleaseDate');
                appObject.sellerName = appInfoObject.get('sellerName');
                appObject.version = appInfoObject.get('version');

                retApps.push(appObject);
            }
            res.json({'myApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

function updateIOSAppInfo(appstoreObject, leanAppObject){
    var genres = appstoreObject['genres'];
    var appInfoObject = new Object();

    leanAppObject.set('trackName', appstoreObject['trackName']);
    leanAppObject.set('artworkUrl100', appstoreObject['artworkUrl100']);
    leanAppObject.set('artworkUrl512', appstoreObject['artworkUrl512']);
    leanAppObject.set('appleId', appstoreObject['trackId']);
    leanAppObject.set('appleKind', genres[0]);
    leanAppObject.set('formattedPrice', appstoreObject['formattedPrice']);
    leanAppObject.set('latestReleaseDate', appstoreObject['currentVersionReleaseDate']);
    leanAppObject.set('sellerName', appstoreObject['sellerName']);
    leanAppObject.set('version', appstoreObject['version']);

    appInfoObject.trackName = appstoreObject['trackName'];
    appInfoObject.artworkUrl100 = appstoreObject['artworkUrl100'];
    appInfoObject.artworkUrl512 = appstoreObject['artworkUrl512'];
    appInfoObject.appleId = appstoreObject['artistId'];
    appInfoObject.appleKind = genres[0];
    appInfoObject.formattedPrice = appstoreObject['formattedPrice'];
    appInfoObject.latestReleaseDate = appstoreObject['currentVersionReleaseDate'];
    appInfoObject.sellerName = appstoreObject['sellerName'];
    appInfoObject.version = appstoreObject['version'];

    return appInfoObject;
}

function blindAppToUser(res, userId, appObject, appInfoObject){
    //bind app to userid
    //query did it exist
    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('appObject', appObject);
    query.equalTo('userObject', user);

    query.find({
        success: function(results) {
            //has blinded
            if (results.length < 1){
                var appBlindObject = new IOSAppBinder();
                appBlindObject.set('appObject', appObject);
                appBlindObject.set('userObject', user);

                appBlindObject.save().then(function(post) {
                    // 实例已经成功保存.
                    res.json({'newApp':appInfoObject});
                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });
            }else {
                res.json({'myApps':appInfoObject});
            }
        },
        error: function(err) {
            var appBlindObject = new IOSAppBinder();
            appBlindObject.set('appObject', appObject);
            appBlindObject.set('userObject', user);

            appBlindObject.save().then(function(post) {
                // 实例已经成功保存.
                res.json({'newApp':appInfoObject});
            }, function(err) {
                // 失败了.
                res.json({'errorMsg':err.message, 'errorId': err.code});
            });
        }
    });
}

// 新增 我的 App
router.post('/add', function(req, res, next) {
    var appid = req.body.appid;
    var userId = util.useridInReq(req);

    var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid +'&country=cn&entity=software';

    https.get(appInfoUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalData = '';

        if (httpRes.statusCode != 200){
            console.log("Add app error: " + httpRes.statusMessage);
            res.json({'appInfo':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString();
                var dataObject = eval("(" + dataStr + ")");

                //appid just 1 result
                var appInfo = dataObject.results[0];

                //query did it exist
                var query = new AV.Query(IOSAppSql);
                query.equalTo('appleId', appid);
                query.descending('updatedAt');
                query.find({
                    success: function(results) {
                        if (results.length < 1){
                            var appObject = new IOSAppSql();
                            var appInfoObject = updateIOSAppInfo(appInfo, appObject);
                            appObject.save().then(function(post) {
                                // 实例已经成功保存.
                                blindAppToUser(res, userId, appObject, appInfoObject);
                            }, function(err) {
                                // 失败了.
                                res.json({'errorMsg':err.message, 'errorId': err.code});
                            });
                        }else {
                            var appObject = results[0];
                            var appInfoObject = updateIOSAppInfo(appInfo, appObject);
                            appObject.save().then(function() {
                                // 实例已经成功保存.
                                blindAppToUser(res, userId, appObject, appInfoObject);
                            }, function(err) {
                                // 失败了.
                                res.json({'errorMsg':err.message, 'errorId': err.code});
                            });
                        }

                    },
                    error: function(err) {
                        var appObject = new IOSAppSql();
                        var appInfoObject = updateIOSAppInfo(appInfo, appObject);
                        appObject.save().then(function(post) {
                            // 实例已经成功保存.
                            blindAppToUser(res, userId, appObject, appInfoObject);
                        }, function(err) {
                            // 失败了.
                            res.json({'errorMsg':err.message, 'errorId': err.code});
                        });
                    }
                });
            })
        }

    }).on('error', function(e) {
        console.log("Got appInfo with appid error: " + e.message);
        res.json({'errorMsg':e.message, 'errorId': e.code});
    });
});

// 删除 我的 App
router.post('/delete', function(req, res, next) {
    var appid = req.body.appid;
    var userId = util.useridInReq(req);

    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.equalTo('appleId', appid);
    query.descending('updatedAt');
    query.find({
        success: function(results) {
            var appObject = results[0];

            //bind app to userid
            //query did it exist
            var user = new AV.User();
            user.id = userId;

            var query = new AV.Query(IOSAppBinder);
            query.equalTo('appObject', appObject);
            query.equalTo('userObject', user);

            query.find({
                success: function(results) {
                    //has blinded
                    if (results.length < 1){
                        res.json({'errorMsg':'' , 'errorId': 0});
                    }else {
                        var blindObject = results[0];

                        blindObject.destroy().then(function() {
                            // 删除成功
                            res.json({'errorMsg':'' , 'errorId': 0});
                        }, function(err) {
                            // 失败
                            res.json({'errorMsg':err.message , 'errorId': err.code});
                        });
                    }
                },
                error: function(err) {
                    res.json({'errorMsg':err.message , 'errorId': err.code});
                }
            });
        },
        error: function(err) {
            res.json({'errorMsg':'not find appid info' , 'errorId': -1});
        }
    });
});


// 查询 我的历史记录
router.get('/history', function(req, res, next) {
    res.render('myExchangeHistory')
});

// 新增 我的 历史记录
router.post('/history/add', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});

// 删除 我的 历史记录
router.post('/history/delete', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});

module.exports = router;