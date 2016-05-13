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

    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.equalTo('appleId', appid);
    query.descending('updatedAt');
    query.find({
        success: function(results) {
            if (results.length >= 1){

                var appObject = results[0];
                var appInfoObject = util.updateIOSAppInfo(appInfo, appObject);
                appObject.save().then(function() {
                    // 实例已经成功保存.
                    blindAppToUser(res, userId, appObject, appInfoObject);
                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });

            }else {
                util.findAppidInItunes(res, appid);
            }
        },
        error: function(err) {
            util.findAppidInItunes(res, appid);
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
            res.json({'myExcAllApps':retApps});
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

function addExcHistory(appExcObject, userId, myAppId, myAppVersion, hisAppId, hisAppVersion){

    var myDate = new Date();
    var myDateStr = myDate.toLocaleDateString();     //获取当前日期

    var myAppObject = '';
    var hisAppObject = '';

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
            }else {

            }

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
    var hisAppId = req.body.hisAppId;
    var hisAppVersion = req.body.hisAppVersion;

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
            addExcHistory(appExcObject, userId, myAppId, myAppVersion, hisAppId, hisAppVersion);
        },
        error: function(err) {
            var appExcObject = new IOSAppExcLogger();
            addExcHistory(appExcObject, userId, myAppId, myAppVersion, hisAppId, hisAppVersion);
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