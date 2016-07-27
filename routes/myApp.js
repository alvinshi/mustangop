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
var taskDemandObject = AV.Object.extend('taskDemandObject');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表
var messageLogger = AV.Object.extend('messageLogger');

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
    query.addDescending('updatedAt')
    query.find({
        success: function(results) {
            if (results.length == 0){
                res.json({'myApps': []});
            }

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
                        dealiTunesAppFailed(retApps, tempAppObject);

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
                    res.json({'newApp':appInfoObject, 'appObjectId':post.id});
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
                appInfo.appObjectId = appObject.id;
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

router.get('/history/angular/:appleId/:version/:pageIndex', function(req, res) {
    //get data
    var userId = util.useridInReq(req);
    var appId = parseInt(req.params.appleId);
    var pageIndex = req.params.pageIndex;
    var version = req.params.version;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    var query_version = new AV.Query(IOSAppExcLogger);
    query_version.equalTo('myAppVersion', version);

    if (appId != undefined){
        var query_ex = new AV.Query(IOSAppExcLogger);
        query_ex.equalTo('myAppId', appId);
        query = AV.Query.and(query, query_ex, query_version);
    }else {
        query = AV.Query.and(query, query_version);
    }

    var totalCount = 0;
    query.count().then(function(count){
        totalCount = count;
    });

    var hasmore = 0;

    if (pageIndex != -1) {
        query.skip(pageIndex);
        query.limit(20);
    }else {
        //
        query.limit(100);
    }


    query.include('myAppObject');
    query.include('hisAppObject');
    query.descending('createdAt');
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
                appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate').substr(0, 10);
                appHisObject.sellerName = appExcHisObject.get('sellerName');

                appHisObject.myAppVersion = results[i].get('myAppVersion');
                appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                appHisObject.excHisDate = results[i].get('excDateStr');

                appHisObject.appExcTaskObjectID = results[i].id;
                appHisObject.requirementImg = results[i].get('requirementImg');

                var totalExcCount = results[i].get('totalExcCount');
                var excKinds = results[i].get('excKinds');
                var swapMode = results[i].get('excHistoryAdd');

                if (excKinds == undefined){
                    appHisObject.excKinds = ''
                }else if (excKinds == 1){
                    appHisObject.excKinds = '评论'
                }else {
                    appHisObject.excKinds = '下载';
                }

                if (totalExcCount == undefined){
                    appHisObject.totalExcCount = 0;
                }else {
                    appHisObject.totalExcCount = totalExcCount;
                }

                if (swapMode == 'excHistoryadd'){
                    appHisObject.swapMode = '手动添加'
                }else if (swapMode == 'FXS'){
                    appHisObject.swapMode = '外部交换'
                }else if (swapMode == 'intEcx'){
                    appHisObject.swapMode = '内部交换'
                }else {
                    appHisObject.swapMode = '手动添加'
                }

                retApps.push(appHisObject);

            }
            if (totalCount > retApps.length + parseInt(pageIndex)){
                hasmore = 1
            }
            res.json({'myExcAllApps':retApps, 'hasMore':hasmore});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

// 以往交换记录
router.get('/oldhistory/angular/:appleId/:version/', function(req, res, next) {
    var userId = util.useridInReq(req);
    var appId = parseInt(req.params.appleId);
    var version = req.params.version;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);

    var query_version = new AV.Query(IOSAppExcLogger);
    query_version.notEqualTo('myAppVersion', version);

    if (appId != undefined){
        var query_ex = new AV.Query(IOSAppExcLogger);
        query_ex.equalTo('myAppId', appId);
        query = AV.Query.and(query, query_version, query_ex);
    }

    query.limit(100);

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
                appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate').substr(0, 10);
                appHisObject.sellerName = appExcHisObject.get('sellerName');

                appHisObject.myAppVersion = results[i].get('myAppVersion');
                appHisObject.hisAppVersion = results[i].get('hisAppVersion');
                appHisObject.excHisDate = results[i].get('excDateStr');

                appHisObject.requirementImg = results[i].get('requirementImg');

                var totalExcCount = results[i].get('totalExcCount');
                var excKinds = results[i].get('excKinds');
                var swapMode = results[i].get('excHistoryAdd');

                if (excKinds == 1){
                    appHisObject.excKinds = '评论'
                }else
                    appHisObject.excKinds = '下载';

                if (totalExcCount == undefined){
                    appHisObject.totalExcCount = 0;
                }else {
                    appHisObject.totalExcCount = totalExcCount;
                }

                if (swapMode == 'excHistoryadd'){
                    appHisObject.swapMode = '手动添加'
                }else if (swapMode == 'FXS'){
                    appHisObject.swapMode = '外部交换'
                }else {
                    //appHisObject.swapMode = '内部交换'
                }

                retApps.push(appHisObject);

            }
            res.json({'myHistoryApps':retApps});
        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

// 添加搜索 我的历史记录
router.get('/addHistory/:appleId/:version', function(req, res, next) {
    res.render('addExcHistory')
});

function addExcHistory(res, appExcObject, userId, myAppId, myAppVersion, hisAppInfo, excHistoryAdd){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate() + ' ' +
                    myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();     //获取当前日期

    var myAppObject = '';
    var hisAppObject = '';

    var hisAppId = hisAppInfo.appleId;
    var hisAppVersion = hisAppInfo.version;

    if (hisAppId == myAppId){
        res.json({'errorMsg':'不能添加自己和自己的交换记录', 'errorId': 1});
        return;
    }

    //query did it exist
    var query = new AV.Query(IOSAppSql);
    query.containedIn('appleId', [parseInt(myAppId), hisAppId]);

    query.find({
        success: function(results) {
            var needSaveHisApp = 1;
            hisAppObject = new IOSAppSql();

            for (var i = 0; i < results.length; i++){
                var appObject = results[i];
                if (appObject.get('appleId') == myAppId){
                    myAppObject = appObject;
                }
                if (appObject.get('appleId') == hisAppId){
                    //update his App,服务器不一定存储的最新的
                    if (appObject.get('latestReleaseDate') == hisAppObject.latestReleaseDate){
                        //newest
                        needSaveHisApp = 0;
                    }else {
                        //save new info to his app
                        hisAppObject = appObject;
                    }
                }
            }

            if (needSaveHisApp == 1){
                // add his app to SQL

                hisAppObject.set('trackName', hisAppInfo.trackName);
                hisAppObject.set('artworkUrl100', hisAppInfo.artworkUrl100);
                hisAppObject.set('artworkUrl512', hisAppInfo.artworkUrl512);
                hisAppObject.set('appleId', hisAppInfo.appleId);
                hisAppObject.set('appleKind', hisAppInfo.appleKind);
                hisAppObject.set('formattedPrice', hisAppInfo.formattedPrice);
                hisAppObject.set('latestReleaseDate', hisAppInfo.latestReleaseDate);
                hisAppObject.set('sellerName', hisAppInfo.sellerName);
                hisAppObject.set('version', hisAppInfo.version);

                hisAppObject.save().then(function() {
                    // 实例已经成功保存.

                    appExcObject.set('myAppObject', myAppObject);
                    appExcObject.set('hisAppObject', hisAppObject);

                    appExcObject.set('userId', userId);
                    appExcObject.set('myAppId', myAppId);
                    appExcObject.set('myAppVersion', myAppVersion);
                    appExcObject.set('hisAppId', hisAppId);
                    appExcObject.set('hisAppVersion', hisAppVersion);
                    appExcObject.set('excHistoryAdd', excHistoryAdd);

                    appExcObject.set('excDateStr', myDateStr);
                    appExcObject.save().then(function(object) {
                        // 添加成功

                        hisAppInfo.myAppVersion = appExcObject.get('myAppVersion');
                        hisAppInfo.hisAppVersion = appExcObject.get('hisAppVersion');
                        hisAppInfo.excHisDate = appExcObject.get('excDateStr');

                        hisAppInfo.appExcTaskObjectID = appExcObject.id;

                        res.json({'errorMsg':'', 'errorId': 0, 'addExcObject' : hisAppInfo});
                    }, function(err) {
                        // 失败了.
                        res.json({'errorMsg':err.message, 'errorId': err.code});
                    });

                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });
            }else {
                appExcObject.set('myAppObject', myAppObject);
                appExcObject.set('hisAppObject', hisAppObject);

                appExcObject.set('userId', userId);
                appExcObject.set('myAppId', myAppId);
                appExcObject.set('myAppVersion', myAppVersion);
                appExcObject.set('hisAppId', hisAppId);
                appExcObject.set('hisAppVersion', hisAppVersion);
                appExcObject.set('excHistoryAdd', excHistoryAdd);

                appExcObject.set('excDateStr', myDateStr);
                appExcObject.save().then(function(object) {
                    // 添加成功
                    hisAppInfo.myAppVersion = appExcObject.get('myAppVersion');
                    hisAppInfo.hisAppVersion = appExcObject.get('hisAppVersion');
                    hisAppInfo.excHisDate = appExcObject.get('excDateStr');

                    hisAppInfo.appExcTaskObjectID = appExcObject.id;

                    res.json({'errorMsg':'', 'errorId': 0, 'addExcObject' : hisAppInfo});
                }, function(err) {
                    // 失败了.
                    res.json({'errorMsg':err.message, 'errorId': err.code});
                });
            }

        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code});
        }
    });
}

// 新增 我的 历史记录
router.post('/addHistory/:appleId/:version', function(req, res) {
    var userId = util.useridInReq(req);
    var myAppId = req.params.appleId;
    var myAppVersion = req.params.version;

    var hisAppInfo = req.body.hisAppInfo;
    var hisAppId = hisAppInfo.appleId;
    var hisAppVersion = hisAppInfo.version;
    var excHistory = req.body.excHistoryAdd

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
            addExcHistory(res, appExcObject, userId, parseInt(myAppId), myAppVersion, hisAppInfo, excHistory);
        },
        error: function(err) {
            var appExcObject = new IOSAppExcLogger();
            addExcHistory(res, appExcObject, userId, parseInt(myAppId), myAppVersion, hisAppInfo, excHistory);
        }
    });
});

// 删除 我的 当前历史记录
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

router.get('/addHistory/:appleId/:version/:searchkey', function(req, res, next) {

    //https://itunes.apple.com/search?term=美丽约&country=cn&entity=software
    var searchUrl = 'https://itunes.apple.com/search?term=' + req.params.searchkey +'&country=cn&entity=software&media=software'
    searchUrl = encodeURI(searchUrl);

    https.get(searchUrl, function(httpRes) {

        console.log('statusCode: ', httpRes.statusCode);
        console.log('headers: ', httpRes.headers);
        var totalLen = 0;
        var totalData = '';

        if (httpRes.statusCode != 200){
            console.log("Got error: " + httpRes.statusMessage);
            res.json({'appResults':[], 'errorMsg' : httpRes.statusCode + httpRes.statusMessage})
        }else {
            httpRes.on('data', function(data) {
                totalData += data;
            });

            httpRes.on('end', function(){
                var dataStr = totalData.toString();
                var dataObject = eval("(" + dataStr + ")");
                var appResults = Array();

                var appidList = Array();
                for (var i = 0; i < dataObject.results.length; i++){
                    var appleObject = dataObject.results[i];
                    appidList.push(appleObject['trackId']);
                }

                //查询哪些是已经交换过的
                var userId = util.useridInReq(req);
                var myAppId = req.params.appleId;
                var myAppVersion = req.params.version;

                var query = new AV.Query(IOSAppExcLogger);
                query.equalTo('userId', userId);
                query.equalTo('myAppId', parseInt(myAppId));
                query.equalTo('myAppVersion', myAppVersion);

                query.containedIn('hisAppId', appidList);

                query.find({
                    success:function(results){

                        for (var i = 0; i < dataObject.results.length; i++){
                            var appleObject = dataObject.results[i];

                            var appResult = Object();

                            appResult.trackName = appleObject['trackName'];
                            appResult.artworkUrl512 = appleObject['artworkUrl512'];
                            appResult.artworkUrl100 = appleObject['artworkUrl100'];
                            appResult.appleId = appleObject['trackId'];
                            appResult.latestReleaseDate = appleObject['currentVersionReleaseDate'];
                            appResult.sellerName = appleObject['sellerName'];
                            appResult.version = appleObject['version'];
                            appResult.appleKind = appleObject['genres'][0];
                            appResult.formattedPrice = appleObject['formattedPrice'];

                            //isExced
                            for (var j = 0; j < results.length; j++) {
                                var excedAppObject = results[j];
                                var excedAppid = excedAppObject.get('hisAppId');

                                if (excedAppid === appResult.appleId){
                                    appResult.isExced = 1;
                                }
                            }

                            appResults.push(appResult);
                        }

                        res.json({'appResults':appResults, 'errorMsg':''});
                    }
                });
            })
        }

    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        res.json({'appResults':[], 'errorMsg' : e.message})
    });
});


// 删除 我的 以往历史记录
router.post('/oldhistory/delete', function(req, res, next) {
    var userId = util.useridInReq(req);

    var myAppId = req.body.myAppId;
    var myAppVersion = req.body.myAppVersion;
    var hisAppId = req.body.hisAppId;
    var hisAppVersion = req.body.hisAppVersion;

    //query did it exist
    var query = new AV.Query(IOSAppExcLogger);
    query.equalTo('userId', userId);
    query.equalTo('myAppId', myAppId);
    query.notEqualTo('myAppVersion', myAppVersion);
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


// 搜索本地添加的历史记录
//router.get('/historySearch/angular/:searchkey', function(req, res, next) {
//    var userId = util.useridInReq(req);
//    var search = req.params.searchkey;
//
//    var user = new AV.User();
//    user.id = userId;
//
//    var query = new AV.Query(IOSAppExcLogger);
//    query.equalTo('userId', userId);
//
//    var innerQuery = new AV.Query(IOSAppSql);
//    innerQuery.contains('trackName', search);
//    innerQuery.limit(1000);
//    query.matchesQuery('hisAppObject', innerQuery);
//
//    query.include('myAppObject');
//    query.include('hisAppObject');
//
//    query.find({
//        success: function(results) {
//            var retApps = new Array();
//
//            for (var i = 0; i < results.length; i++){
//                var appHisObject = new Object();
//                var appExcHisObject = results[i].get('hisAppObject');
//                appHisObject.trackName = appExcHisObject.get('trackName');
//                appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
//                appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
//                appHisObject.appleId = appExcHisObject.get('appleId');
//                appHisObject.appleKind = appExcHisObject.get('appleKind');
//                appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
//                appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate').substr(0, 10);
//                appHisObject.sellerName = appExcHisObject.get('sellerName');
//
//                appHisObject.myAppVersion = results[i].get('myAppVersion');
//                appHisObject.hisAppVersion = results[i].get('hisAppVersion');
//                appHisObject.excHisDate = results[i].get('excDateStr');
//
//                retApps.push(appHisObject);
//
//            }
//            res.json({'myTotalApps':retApps});
//        },
//        error: function(err) {
//            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
//        }
//    });
//
//});

var myRate = 1;

router.post('/task/:appleId', function(req, res){
    var userId = util.useridInReq(req);
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
    var myappid = parseInt(req.params.appleId);
    var appObjectid = req.body.appObjectId;
    var taskType = req.body.taskType;
    var excCount = req.body.excCount;
    var excUnitPrice = req.body.excUnitPrice;
    var screenshotCount = req.body.screenshotCount;
    var searchKeyword = req.body.searchKeyword;
    var ranKing = req.body.ranKing;
    var Score = req.body.Score;
    var titleKeyword = req.body.titleKeyword;
    var commentKeyword = req.body.commentKeyword;
    var detailRem = req.body.detailRem;


    var user = new AV.User();
    user.id = userId;


    var app = AV.Object.createWithoutData('IOSAppInfo', appObjectid);

    var rateunitPrice = excUnitPrice * myRate;

    //生成发布信息
    var queryForMsg = new AV.Query('IOSAppInfo');
    queryForMsg.get(appObjectid).then(function(data){
        var trackName = data.get('trackName');
        console.log(trackName);
        var message = new messageLogger();
        var receiver = new AV.User();
        receiver.id = userId;
        message.set("senderObjectId", receiver);
        message.set('receiverObjectId', receiver);
        message.set('category', 'Y币');
        message.set('type', '发布');
        message.set('thirdPara', rateunitPrice * excCount);
        message.set('firstPara', trackName);
        message.save();
    })



    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.include('userObject');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var userObject = results[i].get('userObject');
            var userRemainMon = userObject.get('remainMoney');
            var userfreezingMoney = userObject.get('freezingMoney');
        }
        if (results <= 0){
            var releasetaskObject = new releaseTaskObject();
            releasetaskObject.set('userObject', user);  //和用户表关联
            releasetaskObject.set('appObject', app);  //和app表关联
            releasetaskObject.set('taskType', taskType);  // 任务类型
            releasetaskObject.set('excCount', excCount);  // 任务条数
            releasetaskObject.set('excUnitPrice', excUnitPrice);  //任务单价
            releasetaskObject.set('screenshotCount', screenshotCount);  // 截图数
            releasetaskObject.set('searchKeyword', searchKeyword);  // 搜索关键词
            releasetaskObject.set('ranKing', ranKing);  // 排名
            releasetaskObject.set('Score', Score);  // 评分
            releasetaskObject.set('titleKeyword', titleKeyword); // 标题关键字
            releasetaskObject.set('commentKeyword', commentKeyword); // 评论关键字
            releasetaskObject.set('detailRem', detailRem);  // 备注详情
            releasetaskObject.set('remainCount', excCount); // 剩余条数
            releasetaskObject.set('myRate', myRate); // 汇率
            releasetaskObject.set('rateUnitPrice', rateunitPrice); // 汇率后价格,实际显示价格
            releasetaskObject.set('pending', 0);  // 未提交
            releasetaskObject.set('submitted', 0); // 待审
            releasetaskObject.set('rejected', 0);  // 拒绝
            releasetaskObject.set('accepted', 0);  // 接收
            releasetaskObject.set('completed', 0);  // 完成
            releasetaskObject.save().then(function() {
                // 实例已经成功保存.
                var moratoriumMon = excCount * excUnitPrice;  // 冻结的YB
                var query = new AV.Query('_User');
                query.get(userId).then(function(userInfo){
                    var totalmoney = userInfo.get('totalMoney');
                    var remainMon = totalmoney - moratoriumMon;   // 剩余的YB
                    userInfo.set('totalMoney', remainMon);
                    userInfo.set('freezingMoney', moratoriumMon);
                    userInfo.set('remainMoney', remainMon);
                    userInfo.save().then(function(){
                        //
                    })

                });

                var taskObjectId = AV.Object.createWithoutData('releaseTaskObject', releasetaskObject.id);

                // 循环发布的条数 记录单条的流水
                for (var e = 0; e < excCount; e++){
                    var accountJour = new accountJournal();
                    accountJour.set('payYCoinUser', user);  //支出金额的用户
                    accountJour.set('payYCoin', parseInt(excUnitPrice)); // 此次交易支付金额
                    accountJour.set('taskObject', taskObjectId);
                    accountJour.set('payYCoinStatus', 'prepare_pay'); // 发布任务的时候为准备支付;
                    accountJour.set('payYCoinDes', '发布任务');
                    accountJour.set('releaseDate', myDateStr); // 添加发布日期,冗余字段
                    accountJour.save().then(function(){
                        //
                    })
                }

            }, function(err) {
                // 失败了.

            });
        }else {
            // 如果有创建新的,因为同一个用户可以发布多条,但要扣除YB
            var releaseObject = new releaseTaskObject();
            releaseObject.set('userObject', user);  //和用户表关联
            releaseObject.set('appObject', app);  //和app表关联
            releaseObject.set('taskType', taskType);  // 任务类型
            releaseObject.set('excCount', excCount);  // 任务条数
            releaseObject.set('excUnitPrice', excUnitPrice);  //任务单价
            releaseObject.set('screenshotCount', screenshotCount);  // 截图数
            releaseObject.set('searchKeyword', searchKeyword);  // 搜索关键词
            releaseObject.set('ranKing', ranKing);  // 排名
            releaseObject.set('Score', Score);  // 评分
            releaseObject.set('titleKeyword', titleKeyword); // 标题关键字
            releaseObject.set('commentKeyword', commentKeyword); // 评论关键字
            releaseObject.set('detailRem', detailRem);  // 备注详情
            releaseObject.set('remainCount', excCount); // 剩余条数
            releaseObject.set('myRate', myRate); // 汇率
            releaseObject.set('rateUnitPrice', rateunitPrice); // 汇率后价格,实际显示价格
            releaseObject.set('pending', 0);  // 未提交
            releaseObject.set('submitted', 0); // 待审
            releaseObject.set('rejected', 0);  // 拒绝
            releaseObject.set('accepted', 0);  // 接收
            releaseObject.set('completed', 0);  // 完成
            releaseObject.save().then(function() {
                // 实例已经成功保存.
                var moratorium = excCount * excUnitPrice;  // 冻结的YB
                var moratoriumMon = userfreezingMoney + moratorium;  // 再次发任务冻结的YB
                var remainMon = userRemainMon - moratorium;   // 剩余的YB
                var query = new AV.Query('_User');
                query.get(userId).then(function(userInfo){
                    userInfo.set('totalMoney', remainMon);
                    userInfo.set('freezingMoney', moratoriumMon);
                    userInfo.set('remainMoney', remainMon);
                    userInfo.save().then(function(){
                        //
                    })

                });

                var taskObjectId = AV.Object.createWithoutData('releaseTaskObject', releaseObject.id);

                // 循环发布的条数 记录单条的流水
                for (var z = 0; z < excCount; z++){
                    var accountjournal = new accountJournal();
                    accountjournal.set('payYCoinUser', user);  //支出金额的用户
                    accountjournal.set('payYCoin', parseInt(excUnitPrice)); // 此次交易支付金额
                    accountjournal.set('taskObject', taskObjectId);
                    accountjournal.set('payYCoinStatus', 'prepare_pay'); // 发布任务的时候为准备支付;
                    accountjournal.set('payYCoinDes', '发布任务');
                    accountjournal.set('releaseDate', myDateStr); // 添加发布日期,冗余字段
                    accountjournal.save().then(function(){
                        //
                    })
                }
            }, function(err) {
                // 失败了.

            });
        }
        res.json({'errorId':0, 'errorMsg':''});
    })
});

//获取需求编辑信息
router.get('/getNeed/:appleId', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appleId;

    var user = new AV.User();
    user.id = userId;
    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.include('taskDemand');
    query.find().then(function(results){
        var retApps = Object();
        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            var appObjectId = appObject.get('appleId');
            var taskdemand = results[i].get('taskDemand');
            if (taskdemand != undefined){
                if (appObjectId == myappId){
                    retApps.taskType = taskdemand.get('taskType');
                    retApps.excCount = taskdemand.get('excCount');
                    retApps.screenshotCount = taskdemand.get('screenshotCount');
                    retApps.searchKeyword = taskdemand.get('searchKeyword');
                    retApps.ranKing = taskdemand.get('ranKing');

                    retApps.Score = taskdemand.get('Score');
                    retApps.titleKeyword = taskdemand.get('titleKeyword');
                    retApps.commentKeyword = taskdemand.get('commentKeyword');
                    retApps.detailRem = taskdemand.get('detailRem');
                }
            }
        }
        res.json({'appNeedInfo':retApps})
    }),function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
});

// 保存任务需求编辑内容
router.post('/taskneed/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appid;
    var task_type = req.body.taskType;
    var exc_count = req.body.excCount;
    var screenshot_count = req.body.screenshotCount;
    var search_Keywords = req.body.searchKeyword;
    var ranking = req.body.ranKing;
    var score = req.body.Score;
    var title_keywords = req.body.titleKeyword;
    var comment_keywords = req.body.commentKeyword;
    var detail_rem = req.body.detailRem;

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.include('taskDemand');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            var appObjectId = appObject.get('appleId');
            var taskdemand = results[i].get('taskDemand');
            if (appObjectId == myappId){
                if (taskdemand == undefined){
                    var taskObject = new taskDemandObject();
                    taskObject.set('taskType', task_type);
                    taskObject.set('excCount', exc_count);
                    taskObject.set('screenshotCount', screenshot_count);
                    taskObject.set('searchKeyword', search_Keywords);
                    taskObject.set('ranKing', ranking);
                    taskObject.set('Score', score);
                    taskObject.set('titleKeyword', title_keywords);
                    taskObject.set('commentKeyword', comment_keywords);
                    taskObject.set('detailRem', detail_rem);
                    taskObject.save().then(function(){
                        //
                    });
                    results[i].set('taskDemand', taskObject);
                    results[i].save().then(function(){

                    })
                }else {
                    taskdemand.set('taskType', task_type);
                    taskdemand.set('excCount', exc_count);
                    taskdemand.set('screenshotCount', screenshot_count);
                    taskdemand.set('searchKeyword', search_Keywords);
                    taskdemand.set('ranKing', ranking);
                    taskdemand.set('Score', score);
                    taskdemand.set('titleKeyword', title_keywords);
                    taskdemand.set('commentKeyword', comment_keywords);
                    taskdemand.set('detailRem', detail_rem);
                    taskdemand.save().then(function(){
                        //
                    });
                }
            }
        }
        res.json({'errorId':0, 'errorMsg':''});
    })
});

// 验证钱够不够发布任务
router.get('/verify', function(req, res){
    var userId = util.useridInReq(req);
    var postmoney = req.body.taskMoney;
    var query = new AV.Query('_User');
    query.equalTo('objectId', userId);
    query.first().then(function(results){
        var usermoney = results.get('remainMoney');
        res.json({'usermoney':usermoney});
    })

});

module.exports = router;