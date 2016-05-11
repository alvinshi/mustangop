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

// 查询 我的App
router.get('/', function(req, res, next) {
    var userid = util.useridInReq(req);
    return res.render('myApp');
});

function updateIOSAppInfo(appstoreObject, leanAppObject){
    var genres = appstoreObject['genres'];
    var appInfoObject = new Object();

    leanAppObject.set('trackName', appstoreObject['trackName']);
    leanAppObject.set('artworkUrl100', appstoreObject['artworkUrl100']);
    leanAppObject.set('artworkUrl512', appstoreObject['artworkUrl512']);
    leanAppObject.set('appleId', appstoreObject['artistId']);
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

// 新增 我的 App
router.post('/add', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

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
                var dataStr = totalData.toString()

                var dataObject = eval("(" + dataStr + ")")

                //appid just 1 result
                var appInfo = dataObject.results[0];

                //query did it exist
                var query = new AV.Query(IOSAppSql);
                query.equalTo('appleId', appResult.appid);
                query.descending('updatedAt');
                query.find({
                    success: function(results) {
                        for (var i = 0; i < results.length; i++)
                        {
                            var appObject = results[i];
                            var appInfoObject = updateIOSAppInfo(appInfo, appObject);
                            appObject.save().then(function(post) {
                                // 实例已经成功保存.

                                //bind app to userid

                                res.json({'myApps':appInfoObject});
                            }, function(err) {
                                // 失败了.
                            });
                        }
                    },
                    error: function(err) {
                        var appObject = IOSAppSql();
                        var appInfoObject = updateIOSAppInfo(appInfo, appObject);
                        appObject.save().then(function(post) {
                            // 实例已经成功保存.

                            res.json({'myApps':appInfoObject});
                        }, function(err) {
                            // 失败了.
                        });
                    }
                });


            })
        }

    }).on('error', function(e) {
        console.log("Got appInfo with appid error: " + e.message);
        $scope.myApps = [];
    });
});

// 删除 我的 App
router.post('/delete', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:解绑App
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