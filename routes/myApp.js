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
    appInfoObject.excUniqueCode = appObject.get('excUniqueCode');
    appInfoObject.sellerName = appObject.get('sellerName');
    appInfoObject.version = appObject.get('version');
    appInfoObject.createdAt = appObject.createdAt;
    retApps.push(appInfoObject);
}

router.get('/angular', function(req, res, next) {
    var userId = util.useridInReq(req);

    var user = new AV.User();
    user.id = userId;
    var promiseCount = 0;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', user);
    query.include('appObject');
    query.addDescending('updatedAt')
    query.find({
        success: function(results) {
            if (results.length == 0){
                res.json({'myApps': [], 'errorId': 0});
                return;
            }

            //has blinded
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
                            console.log("Add app error: " + httpRes.statusMessage);
                            //未检测到App的更新信息
                            dealiTunesAppFailed(retApps, tempAppObject);
                            promiseCount++;
                            if (promiseCount == results.length){
                                res.json({'myApps':retApps, 'errorId': -1, 'errorMsg':''});
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

                                    if (retApps.length == results.length){
                                        res.json({'myApps':retApps, 'errorId': 0, 'errorMsg': ''});
                                    }
                                }, function(error) {
                                    // 失败了.
                                    dealiTunesAppFailed(retApps, tempAppObject);
                                    promiseCount++;
                                    if (promiseCount == results.length){
                                        res.json({'myApps':retApps, 'errorId': error.code, 'errorMsg': error.message});
                                    }
                                });
                            })
                        }
                    }).on('error', function(error) {
                        dealiTunesAppFailed(retApps, tempAppObject);
                        promiseCount++;
                        if (promiseCount == judgeLength){
                            res.json({'myApps':retApps, 'errorId': error.code, 'errorMsg': error.message});
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

    var userObject = new AV.User();
    userObject.id = userId;

    //TODO 用户自己App可以置顶

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

                if(unGetAllTaskCount >= 2){
                    res.json({'errorMsg':'你还有2个任务未被领完哦,等领完再发吧', 'errorId': -1});
                    return;
                }
            }

            var rateunitPrice = excUnitPrice * myRate;

            var trackName = appObject.get('trackName');
            var message = new messageLogger();
            message.set("senderObjectId", userObject);
            message.set('receiverObjectId', userObject);
            message.set('category', 'Y币');
            message.set('type', '发布');
            message.set('thirdPara', rateunitPrice * excCount);
            message.set('firstPara', trackName);
            message.save();

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
                    })
                });

                var taskObjectId = AV.Object.createWithoutData('releaseTaskObject', releasetaskObject.id);
                // 循环发布的条数 记录单条的流水
                for (var e = 0; e < excCount; e++){
                    var accountJour = new accountJournal();
                    accountJour.set('payYCoinUser', userObject);  //支出金额的用户
                    accountJour.set('payYCoin', excUnitPrice); // 此次交易支付金额
                    accountJour.set('taskObject', taskObjectId); // 任务的id
                    accountJour.set('payYCoinStatus', 'prepare_pay'); // 发布任务的时候为准备支付;
                    accountJour.set('payYCoinDes', '发布任务');
                    accountJour.set('releaseDate', myDateStr); // 添加发布日期,冗余字段
                    accountJour.save().then(function(){
                        //
                    })
                }
                res.json({'errorId': 0});
            });

        }, function(error){
            res.json({'errorMsg':error.message, 'errorId': error.code});
        });

    }, function(error) {
        // 失败了.
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

//获取需求编辑信息
router.get('/getNeed/:appleId', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appleId;

    var userObject = new AV.User();
    userObject.id = userId;
    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', userObject);
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
    }, function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 保存任务需求编辑内容
router.post('/taskneed/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appid;
    var task_type = req.body.taskType;
    var exc_count = req.body.excCount;
    var screenshot_count = parseInt(req.body.screenshotCount);
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
        var dealIOSAppBilderObject = undefined;
        var taskdemand = undefined;

        for (var i = 0; i < results.length; i++){
            var appObject = results[i].get('appObject');
            var appObjectId = appObject.get('appleId');
            taskdemand = results[i].get('taskDemand');
            if (appObjectId == myappId){
                dealIOSAppBilderObject = results[i];
                break;
            }
        }

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
            taskObject.save().then(function(lTaskObject){
                dealIOSAppBilderObject.set('taskDemand', lTaskObject);
                dealIOSAppBilderObject.save().then(function(){
                    res.json({'errorId':0, 'errorMsg':''});
                }, function(error){
                    res.json({'errorMsg':error.message, 'errorId': error.code});
                })
            }, function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
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
                res.json({'errorId':0, 'errorMsg':''});
            }, function(error){
                res.json({'errorMsg':error.message, 'errorId': error.code});
            });
        }
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })
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
    })
});

module.exports = router;