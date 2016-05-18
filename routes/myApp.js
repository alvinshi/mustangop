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
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

// 查询 我的App
router.get('/', function(req, res, next) {
    var userid = util.useridInReq(req);
    return res.render('myApp');
});


function dealiTunesAppFailed(retApps, appObject){
    var appInfoObject = new Object();

    appInfoObject.trackName = appObject.get('trackName');
    appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
    appInfoObject.artworkUrl512 = appObject.get('artworkUrl512');
    appInfoObject.appleId = appObject.get('appleId');
    appInfoObject.appleKind = appObject.get('appleKind');
    appInfoObject.formattedPrice = appObject.get('formattedPrice');
    appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');
    appInfoObject.sellerName = appObject.get('sellerName');
    appInfoObject.version = appObject.get('version');

    retApps.push(appInfoObject);
}

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

            //check update apps

            var judgeLength = results.length;

            for (var i = 0; i < results.length; i++){
                var appObject = results[i].get('appObject');
                if (appObject == undefined){
                    judgeLength -= 1;
                    continue;
                }
                var appid = appObject.get('appleId');

                var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid +'&country=cn&entity=software';

                (function(tempAppObject){
                    https.get(appInfoUrl, function(httpRes) {

                        var totalData = '';

                        if (httpRes.statusCode != 200){
                            console.log("Add app error: " + httpRes.statusMessage);

                            //未检测到App的更新信息
                            dealiTunesAppFailed(retApps, tempAppObject);

                            if (retApps.length == judgeLength){
                                res.json({'myApps':retApps});
                            }

                        }else {
                            httpRes.on('data', function(data) {
                                totalData += data;
                            });

                            httpRes.on('end', function(){
                                var dataStr = totalData.toString();
                                var dataObject = eval("(" + dataStr + ")");

                                //appid just 1 result
                                var appInfo = dataObject.results[0];

                                var appInfoObject = util.updateIOSAppInfo(appInfo, tempAppObject);
                                tempAppObject.save().then(function(post) {
                                    // 实例已经成功保存.
                                    retApps.push(appInfoObject);

                                    if (retApps.length == judgeLength){
                                        res.json({'myApps':retApps});
                                    }
                                }, function(err) {
                                    // 失败了.
                                    dealiTunesAppFailed(retApps, tempAppObject);

                                    if (retApps.length == judgeLength){
                                        res.json({'myApps':retApps});
                                    }
                                });
                            })
                        }

                    }).on('error', function(e) {
                        dealiTunesAppFailed(retApps, appObject);

                        if (retApps.length == results.length){
                            res.json({'myApps':retApps});
                        }
                    });
                })(appObject);


            }
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

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
    var appInfo = req.body.appInfo;
    var userId = util.useridInReq(req);

    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.equalTo('appleId', appInfo.appleId);
    query.descending('updatedAt');
    query.find({
        success: function(results) {
            var appObject = '';
            if (results.length >= 1){
                //update
                appObject = results[0];
            }else {
                appObject = new IOSAppSql();
            }

            appObject.set('trackName', appInfo.trackName);
            appObject.set('artworkUrl100', appInfo.artworkUrl100);
            appObject.set('artworkUrl512', appInfo.artworkUrl512);
            appObject.set('appleId', appInfo.appleId);
            appObject.set('appleKind', appInfo.appleKind);
            appObject.set('formattedPrice', appInfo.formattedPrice);
            appObject.set('latestReleaseDate', appInfo.latestReleaseDate);
            appObject.set('sellerName', appInfo.sellerName);
            appObject.set('version', appInfo.version);

            appObject.save().then(function() {
                // 实例已经成功保存.
                blindAppToUser(res, userId, appObject, appInfo);
            }, function(err) {
                // 失败了.
                res.json({'errorMsg':err.message, 'errorId': err.code});
            });
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
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


// 我的历史记录
router.get('/history', function(req, res, next) {
    res.render('excHistory')
});

router.get('/history/angular', function(req, res, next) {
    //get data
    var userId = util.useridInReq(req);
    var appId = req.body.myAppId;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    var flag = 0;
    if (typeof appId != undefined){
        //TODO: support singel app query
        flag = 1;
    }

    query.include('myAppObject');
    query.include('hisAppObject');

    query.addDescending('excDateStr');
    query.find({
        success: function(results) {
            //has blinded
            var retApps = new Array();
            //date merge by excDateStr for more group
            for (var i = 0; i < results.length; i++){
                var appHisObject = new Object();
                var appExcHisObject = results[i].get('hisAppObject');
                var ExcHisObject = results[i].get('myAppObject');
                var AppVersion = ExcHisObject.get('version');
                var myAppVersion = results[i].get('myAppVersion');
                if (AppVersion == myAppVersion){
                    appHisObject.trackName = appExcHisObject.get('trackName');
                    appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
                    appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
                    appHisObject.appleId = appExcHisObject.get('appleId');
                    appHisObject.appleKind = appExcHisObject.get('appleKind');
                    appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
                    appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate');
                    appHisObject.sellerName = appExcHisObject.get('sellerName');

                    appHisObject.myAppVersion = results[i].get('myAppVersion');
                    appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                    appHisObject.excHisDate = results[i].get('excDateStr');

                    retApps.push(appHisObject);
                }
            }
            res.json({'myExcAllApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

// 以往交换记录
router.get('/historys/angular', function(req, res, next) {
    //get data
    var userId = util.useridInReq(req);
    var appId = req.body.myAppId;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    var flag = 0;
    if (typeof appId != undefined){
        //TODO: support singel app query
        flag = 1;
    }

    query.include('myAppObject');
    query.include('hisAppObject');

    query.addDescending('excDateStr');
    query.find({
        success: function(results) {
            //has blinded
            var retApps = new Array();
            //date merge by excDateStr for more group
            for (var i = 0; i < results.length; i++){
                var appHisObject = new Object();
                var appExcHisObject = results[i].get('hisAppObject');
                var ExcHisObject = results[i].get('myAppObject');
                var AppVersion = ExcHisObject.get('version');
                var myAppVersion = results[i].get('myAppVersion');

                if (AppVersion != myAppVersion){
                    appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                    appHisObject.trackName = appExcHisObject.get('trackName');
                    appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
                    appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
                    appHisObject.appleId = appExcHisObject.get('appleId');
                    appHisObject.appleKind = appExcHisObject.get('appleKind');
                    appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
                    appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate');
                    appHisObject.sellerName = appExcHisObject.get('sellerName');
                    appHisObject.hisAppVersion = results[i].get('hisAppVersion');

                    appHisObject.excHisDate = results[i].get('excDateStr');

                    retApps.push(appHisObject);
                }
            }
            res.json({'myHistoryApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

// 添加搜索 我的历史记录
router.get('/addHistory', function(req, res, next) {
    res.render('addExcHistory')
});

function addExcHistory(res, appExcObject, userId, myAppId, myAppVersion, hisAppInfo){
    var myDate = new Date();
    var myDateStr = myDate.toLocaleDateString();     //获取当前日期

    var myAppObject = '';
    var hisAppObject = '';

    var hisAppId = hisAppInfo.appleId;
    var hisAppVersion = hisAppInfo.version;

    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.containedIn('appleId', [myAppId, hisAppId]);

    query.find({
        success: function(results) {
            if (results.length >= 2){
                for (var i = 0; i < results.length; i++){
                    var appObject = results[i];
                    if (appObject.get('appleId') == myAppId){
                        myAppObject = appObject;
                    }
                    if (appObject.get('appleId') == hisAppId){
                        hisAppObject = appObject;
                    }
                }
            }else {
                // app his app to SQL
                var hisAppObject = new IOSAppSql();

                hisAppObject.set('trackName', hisAppInfo.trackName);
                hisAppObject.set('artworkUrl100', hisAppInfo.artworkUrl100);
                hisAppObject.set('artworkUrl512', hisAppInfo.artworkUrl512);
                hisAppObject.set('appleId', hisAppInfo.trackId);
                hisAppObject.set('appleKind', hisAppInfo.appleKind);
                hisAppObject.set('formattedPrice', hisAppInfo.formattedPrice);
                hisAppObject.set('latestReleaseDate', hisAppInfo.currentVersionReleaseDate);
                hisAppObject.set('sellerName', hisAppInfo.sellerName);
                hisAppObject.set('version', hisAppInfo.version);

                hisAppObject.save().then(function() {
                    // 实例已经成功保存.
                    blindAppToUser(res, userId, appObject, appInfo);
                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });
            }

            appExcObject.set('myAppObject', myAppObject);
            appExcObject.set('hisAppObject', hisAppObject);

            appExcObject.set('userId', userId);
            appExcObject.set('myAppId', myAppId);
            appExcObject.set('myAppVersion', myAppVersion);
            appExcObject.set('hisAppId', hisAppId);
            appExcObject.set('hisAppVersion', hisAppVersion);

            appExcObject.set('excDateStr', myDateStr);
            appExcObject.save().then(function(object) {
                // 添加成功
                res.json({'errorMsg':'', 'errorId': 0});
            }, function(err) {
                // 失败了.
                res.json({'errorMsg':err.message, 'errorId': err.code});
            });
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    });
}

// 新增 我的 历史记录
router.post('/history/add', function(req, res, next) {
    var userId = util.useridInReq(req);

    var myAppId = req.body.myAppId;
    var myAppVersion = req.body.myAppVersion;

    var hisAppInfo = req.body.hisAppInfo;
    var hisAppId = hisAppInfo.appleId;
    var hisAppVersion = hisAppInfo.version;

    //query did it exist
    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('myAppId', myAppId);
    query.equalTo('myAppVersion', myAppVersion);
    query.equalTo('hisAppId', hisAppId);
    query.equalTo('hisAppVersion', hisAppVersion);
    query.descending('updatedAt');
    query.find({
        success: function(results) {
            var appExcObject = '';
            if (results.length < 1){
                appExcObject = new IOSAppExcLogger();
            }else {
                appExcObject = results[0];
            }
            addExcHistory(res, appExcObject, userId, myAppId, myAppVersion, hisAppInfo);
        },
        error: function(err) {
            var appExcObject = new IOSAppExcLogger();
            addExcHistory(res, appExcObject, userId, myAppId, myAppVersion, hisAppInfo);
        }
    });
});

// 删除 我的 历史记录
router.post('/history/delete', function(req, res, next) {
    var userId = util.useridInReq(req);

    var myAppId = req.body.myAppId;
    var myAppVersion = req.body.myAppVersion;
    var hisAppId = req.body.hisAppId;
    var hisAppVersion = req.body.hisAppVersion;

    //query did it exist
    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);
    query.equalTo('myAppId', myAppId);
    query.equalTo('myAppVersion', myAppVersion);
    query.equalTo('hisAppId', hisAppId);
    query.equalTo('hisAppVersion', hisAppVersion);
    query.descending('updatedAt');
    query.find({
        success: function(results) {
            if (results.length < 1){
                res.json({'errorMsg':'已经删除', 'errorId': 0});
            }else {
                var appExcObject = results[0];

                appExcObject.destroy().then(function() {
                    // 删除成功
                    res.json({'errorMsg':'' , 'errorId': 0});
                }, function(err) {
                    // 失败
                    res.json({'errorMsg':err.message , 'errorId': err.code});
                });
            }

        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    });
});

module.exports = router;