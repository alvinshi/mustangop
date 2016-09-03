/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var messager = require('../utils/messager');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppInfoSQL = AV.Object.extend('IOSAppInfo');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var taskDemandSQL = AV.Object.extend('taskDemandObject');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var User = AV.Object.extend('_User');

// 查询 我的App
router.get('/', function(req, res, next) {
    //var userid = util.useridInReq(req);
    return res.render('myApp');
});


function dealiTunesAppFailed(retApps, appObject){
    var appInfoObject = Object();

    appInfoObject.trackName = appObject.get('trackName');
    appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
    appInfoObject.artworkUrl512 = appObject.get('artworkUrl512');
    appInfoObject.appleId = appObject.get('appleId');
    appInfoObject.appleKind = appObject.get('appleKind');
    appInfoObject.formattedPrice = appObject.get('formattedPrice');
    appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');
    appInfoObject.excUniqueCode = appObject.get('excUniqueCode');
    appInfoObject.sellerName = appObject.get('sellerName');
    appInfoObject.version = appObject.get('version');
    appInfoObject.appObjectId = appObject.id;
    appInfoObject.createdAt = appObject.createdAt;
    retApps.push(appInfoObject);
}

router.get('/angular', function(req, res) {
    var userId = util.useridInReq(req);

    var user = new AV.User();
    user.id = userId;
    var promiseCount = 0;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.include('userObject');
    query.addDescending('updatedAt');
    query.find({
        success: function(results) {
            if (results.length == 0){
                res.json({'myApps': [], 'errorId': 0});
                return;
            }

            //has blinded
            var retApps = Array();

            var userObject = undefined;
            if(results.length > 0){
                userObject = results[0].get('userObject');
            }
            for (var i = 0; i < results.length; i++){

                var appObject = results[i].get('appObject');
                if (appObject == undefined){
                    promiseCount++;
                    continue;
                }
                dealiTunesAppFailed(retApps, appObject);
            }
            var userPayMoney = userObject.get('rechargeRMB');
            var inviteCount = userObject.get('inviteSucceedCount');
            var canAddApp = inviteCount + parseInt(userPayMoney / 100) + 1;
            if (userPayMoney < 500){
                res.json({'myApps':retApps, 'inviteSucceedCount': canAddApp, 'errorId': 0});
            }else {
                res.json({'myApps':retApps, 'inviteSucceedCount': canAddApp, 'errorId': 0, 'Limit': true});
            }

        },
        error: function(err) {
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

//更新APP信息
router.post('/UpdateApp', function(req, res){
    var userId = util.useridInReq(req);

    var user = new AV.User();
    user.id = userId;
    var promiseCount = 0;

    //TODO: 邀请x个用户,放可以多绑定x个App(未邀请的用户仅可以绑定1个App)

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.addDescending('updatedAt');
    query.find().then(function(results){
        if (results.length == 0){
            res.json({'errorId': 0, 'errorMsg':'请先添加APP'});
        }

        var retApps = Array();

        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            if (appObject == undefined){
                promiseCount++;
                continue;
            }
            var appid = appObject.get('appleId');

            var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid +'&country=cn&entity=software';

            (function(tempAppObject){
                https.get(appInfoUrl, function(httpRes) {

                    var totalData = '';

                    if (httpRes.statusCode != 200){
                        //未检测到App的更新信息
                        dealiTunesAppFailed(retApps, tempAppObject);
                        res.json({'errorId': 0, 'errorMsg':'未检测到APP更新'});
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
                            tempAppObject.save().then(function() {
                                // 实例已经成功保存.
                                retApps.push(appInfoObject);
                                if (retApps.length == results.length){
                                    res.json({'myApps':retApps, 'errorId': 0, 'errorMsg': 'APP更新成功'});
                                }

                            }, function(error) {
                                // 失败了.
                                dealiTunesAppFailed(retApps, tempAppObject);
                                promiseCount++;
                                if (promiseCount == results.length){
                                    res.json({'errorId': -1, 'errorMsg': 'APP更新失败'});
                                }
                            });
                        })
                    }
                }).on('error', function(error) {
                    dealiTunesAppFailed(retApps, tempAppObject);
                    promiseCount++;
                    if (promiseCount == results.length){
                        res.json({'errorId': error.code, 'errorMsg': error.message});
                    }
                });
            })(appObject);
        }
    },function(error){
        res.json({'errorId': error.code, 'errorMsg': error.message});
    })
});

function blindAppToUser(res, userId, appObject, appInfoObject){
    //bind app to userid
    //query did it exist
    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('appObject', appObject);
    query.equalTo('userObject', user);
    query.include('userObject');
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
            appObject.set('excUniqueCode', appInfo.excUniqueCode);
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

// 发布任务
var myRate = 1;

router.post('/task', function(req, res){
    var userId = util.useridInReq(req);
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
    var appObjectid = req.body.appObjectId;
    var taskType = req.body.taskType;
    var excCount = parseInt(req.body.excCount);
    var excUnitPrice = parseInt(req.body.excUnitPrice);
    var screenshotCount = req.body.screenshotCount;
    var searchKeyword = req.body.searchKeyword;
    var ranKing = parseInt(req.body.ranKing);
    var Score = req.body.Score;
    var titleKeyword = req.body.titleKeyword;
    var commentKeyword = req.body.commentKeyword;
    var detailRem = req.body.detailRem;

    var userQuery = new AV.Query(User);
    userQuery.get(userId).then(function(userObject){
        var userMoney = userObject.get('totalMoney');
        if (userMoney >= excCount * excUnitPrice){
            var appObjectQuery = new AV.Query('IOSAppInfo');
            appObjectQuery.get(appObjectid).then(function(appObject){
                var queryMyTask = new AV.Query(releaseTaskObject);
                queryMyTask.notEqualTo('cancelled', true);
                queryMyTask.notEqualTo('close', true);
                queryMyTask.equalTo('userObject', userObject);
                queryMyTask.find().then(function(releaseTaskObjects) {

                    var unGetAllTaskCount = 0;
                    // 最多有2条任务
                    for (var rTask = 0; rTask < releaseTaskObjects.length; rTask++){
                        var aRelaseTaskObejct = releaseTaskObjects[rTask];

                        if(aRelaseTaskObejct.get('remainCount') > 0){
                            unGetAllTaskCount++;
                        }
                    }

                    if(userObject.get('rechargeRMB') < 500 && unGetAllTaskCount >= 2){
                        res.json({'errorMsg':'你还有2个任务未被领完哦,等领完再发吧', 'errorId': -1});
                        return;
                    }

                    var rateunitPrice = excUnitPrice * myRate;

                    var appPriceStr = appObject.get('formattedPrice');
                    var appPrice = parseFloat(appPriceStr.substring(1, appPriceStr.length));
                    if(appPriceStr != '免费') {
                        //广告主付费
                        excUnitPrice += appPrice * 1.5 * 10;
                        rateunitPrice += appPrice * 15
                    }

                    var trackName = appObject.get('trackName');

                    var releasetaskObject = new releaseTaskObject();
                    releasetaskObject.set('userObject', userObject);  //和用户表关联
                    releasetaskObject.set('appObject', appObject);  //和app表关联

                    //use excUniqueCode now,latestReleaseDate just for display
                    releasetaskObject.set('latestReleaseDate', appObject.get('latestReleaseDate'));
                    releasetaskObject.set('excUniqueCode', appObject.get('excUniqueCode'));

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
                    releasetaskObject.set('completed', 0);  // 完成
                    releasetaskObject.set('releaseDate', myDateStr); // 添加发布日期,冗余字段
                    releasetaskObject.save().then(function() {
                        // 实例已经成功保存.
                        var freezing_money = excCount * excUnitPrice;  // 发布总条数 + 发布的单价 = 冻结的钱
                        var query = new AV.Query('_User');
                        query.get(userId).then(function(userInfo){
                            userInfo.increment('totalMoney', - freezing_money);
                            userInfo.increment('freezingMoney', freezing_money);
                            userInfo.save().then(function(){
                                messager.freezeMsg(trackName, freezing_money, userObject.id);
                            }, function(error){
                                console.error('------ user: ' + userObject.id + ' release task,minus YB error,and task send succeed');
                            })
                        });

                        // 循环发布的条数 记录单条的流水
                        res.json({'errorId': 0, 'errorMsg':''});
                    },function(error){
                        res.json({'errorMsg':error.message, 'errorId': error.code});
                    });

                }, function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                });

            }, function(error) {
                // 失败了.
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }
        else {
            res.json({'errorId': 1, 'errorMsg':'账户余额不足'})
        }
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.messageCode});
    });

    //TODO 用户自己App可以置顶
});

//获取需求编辑信息
router.get('/getNeed/:appObjectId', function(req, res){
    var userId = util.useridInReq(req);
    var appObjectId = req.params.appObjectId;

    var userObject = new AV.User();
    userObject.id = userId;

    var appObject = new IOSAppInfoSQL();
    appObject.id = appObjectId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', userObject);
    query.equalTo('appObject', appObject);
    query.include('appObject');
    query.include('userObject');
    query.include('taskDemand');
    query.find().then(function(results){
        var taskDemandObject = undefined;
        var appObject = undefined;

        if(results.length > 0){
            appObject = results[0].get('appObject');
            taskDemandObject = results[0].get('taskDemand');
        }else {
            res.json({'errorMsg': '该账号未绑定该App 请先绑定', 'errorId': -100});
            return;
        }

        var appDemandInfo = Object();
        if (taskDemandObject != undefined){
            //已经保存过需求
            appDemandInfo.taskType = taskDemandObject.get('taskType');
            appDemandInfo.excCount = taskDemandObject.get('excCount');
            appDemandInfo.screenshotCount = taskDemandObject.get('screenshotCount');
            appDemandInfo.searchKeyword = taskDemandObject.get('searchKeyword');
            appDemandInfo.ranKing = taskDemandObject.get('ranKing');

            appDemandInfo.Score = taskDemandObject.get('Score');
            appDemandInfo.titleKeyword = taskDemandObject.get('titleKeyword');
            appDemandInfo.commentKeyword = taskDemandObject.get('commentKeyword');
            appDemandInfo.detailRem = taskDemandObject.get('detailRem');
        }

        res.json({'appNeedInfo':appDemandInfo})
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 保存任务需求编辑内容
router.post('/taskneed/:appObjectId', function(req, res){
    var userId = util.useridInReq(req);
    var appObjectId = req.params.appObjectId;
    var task_type = req.body.taskType;
    var exc_count = req.body.excCount;
    var screenshot_count = parseInt(req.body.screenshotCount);
    var search_Keywords = req.body.searchKeyword;
    var ranking = req.body.ranKing;
    var score = req.body.Score;
    var title_keywords = req.body.titleKeyword;
    var comment_keywords = req.body.commentKeyword;
    var detail_rem = req.body.detailRem;

    var userObject = new AV.User();
    userObject.id = userId;

    var appObject = new IOSAppInfoSQL();
    appObject.id = appObjectId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', userObject);
    query.equalTo('appObject', appObject);
    query.include('appObject');
    query.include('userObject');
    query.include('taskDemand');
    query.find().then(function(results){
        var dealIOSAppBilderObject = undefined; //must exist
        var taskDemandObject = undefined;
        var appObject = undefined;

        if(results.length > 0){
            dealIOSAppBilderObject = results[0];
            appObject = results[0].get('appObject');
            taskDemandObject = results[0].get('taskDemand');
        }else {
            res.json({'errorMsg': '该账号未绑定该App 请先绑定', 'errorId': -100});
            return;
        }

        if (taskDemandObject == undefined){
            //第一次保存需求
            taskDemandObject = new taskDemandSQL();
            dealIOSAppBilderObject.set('taskDemand', taskDemandObject);
        }

        taskDemandObject.set('taskType', task_type);
        taskDemandObject.set('excCount', exc_count);
        taskDemandObject.set('screenshotCount', screenshot_count);
        taskDemandObject.set('searchKeyword', search_Keywords);
        taskDemandObject.set('ranKing', ranking);
        taskDemandObject.set('Score', score);
        taskDemandObject.set('titleKeyword', title_keywords);
        taskDemandObject.set('commentKeyword', comment_keywords);
        taskDemandObject.set('detailRem', detail_rem);

        //2个都会保存
        dealIOSAppBilderObject.save().then(function(){
            res.json({'errorId':0, 'errorMsg':''});
        }, function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 验证钱够不够发布任务
router.get('/verify', function(req, res){
    var userId = util.useridInReq(req);
    var query = new AV.Query('_User');
    query.equalTo('objectId', userId);
    query.first().then(function(userObject){
        if (userObject == undefined){
            res.render('login');
        }else {
            var usermoney = userObject.get('totalMoney');
            res.json({'usermoney': usermoney});
        }
    },function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
});

module.exports = router;