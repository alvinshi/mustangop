/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var tryPriceUtil = require('../utils/tryPriceUtil');
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
router.get('/', function(req, res) {
    res.render('myApp');
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
    //appInfoObject.userAddAppId = objectId;
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
                var objectId = results[i].id;
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
            console.error('not app');
            res.json({'errorMsg':err.message, 'errorId': err.code, 'myApps':[]});
        }
    });
});

//更新APP信息
router.post('/UpdateApp', function(req, res){
    var userId = util.useridInReq(req);

    var userObject = new AV.User();
    userObject.id = userId;

    var appObjectId = req.body.appObjectId;

    var appObject = new IOSAppInfoSQL();
    appObject.id = appObjectId;

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', userObject);
    query.equalTo('appObject', appObject);
    query.include('appObject');

    query.first().then(function(userAppBinder){
        if (userAppBinder == 0){
            res.json({'errorId': 0, 'errorMsg':'请先添加APP'});
        }

        var retApps = Array();
        var appObject = userAppBinder.get('appObject');
        var appid = appObject.get('appleId');

        var appInfoUrl = 'https://itunes.apple.com/lookup?id=' + appid + '&country=cn&entity=software';
        https.get(appInfoUrl, function(httpRes) {

            var totalData = '';

            if (httpRes.statusCode != 200){
                //未检测到App的更新信息
                dealiTunesAppFailed(retApps, appObject);
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

                    var appInfoObject = util.updateIOSAppInfo(appInfo, appObject);
                    appObject.save().then(function() {
                        // 实例已经成功保存.
                        //retApps.push(appInfoObject);
                        res.json({'myApps':appInfoObject, 'errorId': 0, 'errorMsg': 'APP更新成功'});


                    }, function(error) {
                        // 失败了.
                        dealiTunesAppFailed(retApps, appObject);
                        res.json({'errorId': -1, 'errorMsg': 'APP更新失败'});

                    });
                })
            }
        }).on('error', function(error) {
            dealiTunesAppFailed(retApps, appObject);
            res.json({'errorId': error.code, 'errorMsg': error.message});

        });

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
    var appObjectId = req.body.appObjectId;

    var excCount = parseInt(req.body.excCount); // 发布总数量
    var excUnitPrice = 0;
    var taskType = req.body.taskType;
    if (taskType == '评论'){
        excUnitPrice = 30;
    }else {
        excUnitPrice = 23;
    }

    var extraRetObject = Object();
    extraRetObject.excUnitPrice = excUnitPrice;

    //截图1
    var searchKeyword = req.body.searchName; // 搜索关键词
    var asoRank = parseInt(req.body.asoRank);  // 搜索排名
    screenShotOneElement(extraRetObject, asoRank, req.body.needGet);

    //截图2
    //TODO: Refine 示例App内截图
    var registerStatus = req.body.registerStatus;  //注册方式
    screenShotTwoElement(extraRetObject, registerStatus);

    //截图3
    var Score = req.body.radio4;  // 评分
    var reviewTitleKey = req.body.reviewTitleKey; // 标题关键词
    var reviewMustTitleKey = req.body.reviewMustTitleKey; // 标题必选
    var reviewContentKey = req.body.reviewContentKey; // 评论关键词
    var reviewMustContentKey = req.body.reviewMustContentKey; // 评论必选
    screenShotThirdElement(extraRetObject, reviewMustTitleKey, reviewMustContentKey, req.body.needMoreReviewContent);

    //额外要求
    var needOfficialAudit = req.body.needOfficialAudit; // 需要官方审核
    if (needOfficialAudit == 'true'){
        extraRetObject.excUnitPrice += 3;
        needOfficialAudit = true;
    }

    var detailRem = req.body.detailRem; // 任务备注


    var userQuery = new AV.Query(User);
    userQuery.get(userId).then(function(userObject){
        var userMoney = userObject.get('totalMoney');
        if (userMoney >= excCount * excUnitPrice){
            var appObjectQuery = new AV.Query(IOSAppInfoSQL);
            appObjectQuery.get(appObjectId).then(function(appObject){
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

                    var appPriceStr = appObject.get('formattedPrice');
                    var appPrice = parseFloat(appPriceStr.substring(1, appPriceStr.length));
                    if(appPriceStr != '免费') {
                        //广告主付费
                        extraRetObject.excUnitPrice += tryPriceUtil.payAppYCoin(appPrice);
                        //小马用户得到
                        extraRetObject.tempUserPrice += tryPriceUtil.payAppRmb(appPrice);
                    }
                    console.log('----- task send price:' + extraRetObject.toString());

                    var releasetaskObject = new releaseTaskObject();
                    releasetaskObject.set('userObject', userObject);  //和用户表关联
                    releasetaskObject.set('appObject', appObject);  //和app表关联

                    //use excUniqueCode now,latestReleaseDate just for display
                    releasetaskObject.set('latestReleaseDate', appObject.get('latestReleaseDate'));
                    releasetaskObject.set('excUniqueCode', appObject.get('excUniqueCode'));

                    releasetaskObject.set('taskType', taskType);  // 任务类型
                    releasetaskObject.set('excCount', excCount);  // 任务条数
                    releasetaskObject.set('excUnitPrice', extraRetObject.excUnitPrice);  //任务单价
                    releasetaskObject.set('myRate', myRate); // 汇率
                    releasetaskObject.set('rateUnitPrice', extraRetObject.excUnitPrice * myRate); // 汇率后价格,实际显示价格
                    releasetaskObject.set('tempUserPrice', extraRetObject.tempUserPrice); // 小马用户任务价格

                    releasetaskObject.set('searchKeyword', searchKeyword);  // 搜索关键词
                    releasetaskObject.set('ranKing', asoRank);  // 排名
                    releasetaskObject.set('rankExtraRmb', extraRetObject.rankExtraRmb);  // 排名
                    releasetaskObject.set('needGet', extraRetObject.needGet); // 获取

                    releasetaskObject.set('registerStatus', registerStatus); // 注册方式

                    releasetaskObject.set('Score', parseInt(Score));  // 评分
                    releasetaskObject.set('titleKeyword', reviewTitleKey); // 标题关键字
                    releasetaskObject.set('reviewMustTitleKey', reviewMustTitleKey); // 标题必选
                    releasetaskObject.set('commentKeyword', reviewContentKey); // 评论关键字
                    releasetaskObject.set('reviewMustContentKey', reviewMustContentKey); // 评论必选
                    releasetaskObject.set('needMoreReviewContent', extraRetObject.needMoreReviewContent); // 评论必须满足50个字
                    releasetaskObject.set('needOfficialAudit', needOfficialAudit);  // 需要官方审核
                    releasetaskObject.set('detailRem', detailRem);  // 任务备注

                    //额外字段
                    releasetaskObject.set('remainCount', excCount); // 剩余条数
                    releasetaskObject.set('completed', 0);  // 完成

                    var myDate = new Date();
                    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
                    releasetaskObject.set('releaseDate', myDateStr); // 添加发布日期,冗余字段
                    releasetaskObject.save().then(function() {
                        // 实例已经成功保存.
                        var freezing_money = excCount * excUnitPrice;  // 发布总条数 * 发布的单价 = 冻结的钱
                        userObject.increment('totalMoney', - freezing_money);
                        userObject.increment('freezingMoney', freezing_money);
                        userObject.save().then(function(){
                            saveDemands(res, userObject, appObject, taskType, String(excCount), excUnitPrice, searchKeyword,
                                String(asoRank), extraRetObject.needGet, registerStatus, parseInt(Score), reviewTitleKey, reviewMustTitleKey,
                                reviewContentKey, reviewMustContentKey, extraRetObject.needMoreReviewContent, needOfficialAudit);
                            messager.freezeMsg(appObject.get('trackName'), freezing_money, userObject.id);
                        }, function(error){
                            console.error('------ user: ' + userObject.id + ' release task,minus YB error,and task send succeed');
                        });

                        //每日任务
                        if( myDate.getHours() < 10){
                            util.dayTaskIncrement(userId, 'releaseTaskY', 5);
                        }

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
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 保存任务需求编辑内容
function saveDemands(res, userObject, appObject, task_type, excCount, excUnitPrice, searchKeyword, asoRank, needGet,
                     registerStatus, Score, reviewTitleKey, reviewMustTitleKey, reviewContentKey, reviewMustContentKey,
                     needMoreReviewContent, needOfficialAudit){

    var query = new AV.Query(IOSAppBinder);
    query.equalTo('userObject', userObject);
    query.equalTo('appObject', appObject);
    query.include('appObject');
    query.include('userObject');

    query.find().then(function(results){
        var dealIOSAppBilderObject = undefined; //must exist
        var taskDemandObject = undefined;
        var appObject = undefined;

        if(results.length > 0){
            dealIOSAppBilderObject = results[0];
            appObject = results[0].get('appObject');

        }

        if (taskDemandObject == undefined){
            //第一次保存需求
            taskDemandObject = new taskDemandSQL();
            dealIOSAppBilderObject.set('taskDemand', taskDemandObject);
        }

        taskDemandObject.set('userObject', userObject);  //和用户表关联
        taskDemandObject.set('appObject', appObject);  //和app表关联

        //use excUniqueCode now,latestReleaseDate just for display
        taskDemandObject.set('latestReleaseDate', appObject.get('latestReleaseDate'));
        taskDemandObject.set('excUniqueCode', appObject.get('excUniqueCode'));

        taskDemandObject.set('taskType', task_type);  // 任务类型
        taskDemandObject.set('excCount', excCount);  // 任务条数
        taskDemandObject.set('excUnitPrice', excUnitPrice);  //任务单价

        taskDemandObject.set('searchKeyword', searchKeyword);  // 搜索关键词
        taskDemandObject.set('ranKing', asoRank);  // 排名
        taskDemandObject.set('needGet', needGet); // 获取
        taskDemandObject.set('registerStatus', registerStatus); // 注册方式
        taskDemandObject.set('Score', Score);  // 评分
        taskDemandObject.set('titleKeyword', reviewTitleKey); // 标题关键字
        taskDemandObject.set('reviewMustTitleKey', reviewMustTitleKey); // 标题必选
        taskDemandObject.set('commentKeyword', reviewContentKey); // 评论关键字
        taskDemandObject.set('reviewMustContentKey', reviewMustContentKey); // 评论必选
        taskDemandObject.set('needMoreReviewContent', needMoreReviewContent); // 评论必须满足50个字
        taskDemandObject.set('needOfficialAudit', needOfficialAudit);  // 需要官方审核

        //2个都会保存
        dealIOSAppBilderObject.save();
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
}

//获取需求编辑信息
router.get('/getNeed/:appObjectId', function(req, res){
    var userId = util.useridInReq(req);
    var appObjectId = req.params.appObjectId;

    var userObject = new AV.User();
    userObject.id = userId;

    var appObject = new IOSAppInfoSQL();
    appObject.id = appObjectId;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', userObject);
    query.equalTo('appObject', appObject);
    query.include('appObject');
    query.include('userObject');
    query.descending('createdAt');
    query.find().then(function(results){
        var demandTemplateArray = Array();

        for (var i = 0; i < 3; i++){
            var appDemandInfo = Object();

            if(results.length > i){
                var taskDemandObject = results[i];
                if (taskDemandObject != undefined){
                    //已经保存过需求
                    appDemandInfo.taskType = taskDemandObject.get('taskType');
                    appDemandInfo.excCount = taskDemandObject.get('excCount');

                    appDemandInfo.searchKeyword = taskDemandObject.get('searchKeyword');
                    appDemandInfo.ranKing = taskDemandObject.get('ranKing'); // 排名YCoin

                    //兼容老的保存需求
                    if(taskDemandObject.get('screenshotCount') != undefined && taskDemandObject.get('screenshotCount') > 0){
                        appDemandInfo.screenshotCount = taskDemandObject.get('screenshotCount');
                    }

                    appDemandInfo.excUnitPrice = taskDemandObject.get('excUnitPrice'); //任务单价YCoin

                    appDemandInfo.needGet = taskDemandObject.get('needGet'); // 获取YCoin
                    appDemandInfo.registerStatus = taskDemandObject.get('registerStatus'); // 注册方式
                    appDemandInfo.Score = taskDemandObject.get('Score'); // 评分

                    appDemandInfo.titleKeyword = taskDemandObject.get('titleKeyword');
                    appDemandInfo.reviewMustTitleKey = taskDemandObject.get('reviewMustTitleKey'); // 标题必选
                    appDemandInfo.commentKeyword = taskDemandObject.get('commentKeyword');
                    appDemandInfo.reviewMustContentKey = taskDemandObject.get('reviewMustContentKey'); // 评论必选
                    appDemandInfo.needMoreReviewContent = taskDemandObject.get('needMoreReviewContent'); // 评论需满50字
                    appDemandInfo.needOfficialAudit = taskDemandObject.get('needOfficialAudit'); // 是否需要官方审核
                    appDemandInfo.taskRemark = taskDemandObject.get('taskRemark');
                    appDemandInfo.detailRem = taskDemandObject.get('detailRem');

                    appDemandInfo.demandTemplateId = taskDemandObject.id;
                }else {
                    appDemandInfo.taskType = '评论';
                    appDemandInfo.registerStatus = 'noNeed';
                    appDemandInfo.Score = 5;
                    appDemandInfo.excUnitPrice = 30;
                }
            }
            else {
                appDemandInfo.taskType = '评论';
                appDemandInfo.registerStatus = 'noNeed';
                appDemandInfo.Score = 5;
                appDemandInfo.excUnitPrice = 30;
            }
            demandTemplateArray.push(appDemandInfo);
        }

        res.json({'demandTemplateArray':demandTemplateArray});
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

//任务需求,换评,小马的金额计算
function screenShotOneElement(retObject, asoRank, needGet)
{
    //初始价格(好评3元,下载2.3元)
    //小马价格(好评1.5元,下载1.15元)
    //默认Y币转人名币汇率
    var YCoinToRMBRate = 0.045;
    retObject.tempUserPrice = retObject.excUnitPrice * YCoinToRMBRate;

    //rank
    if (asoRank <= 20){
        retObject.excUnitPrice += 0;
    }
    else if (asoRank >= 21 && asoRank <= 50){
        retObject.excUnitPrice += (asoRank / 10 - 2);
    }
    else {
        retObject.excUnitPrice += (3 + (asoRank - 50) * 0.5);
        //小马用户排名得到前
        retObject.rankExtraRmb = tryPriceUtil.getRankRmb(asoRank);
        retObject.tempUserPrice += retObject.rankExtraRmb;
    }

    //need get
    if (needGet == 'true'){
        retObject.excUnitPrice += 5;
        //小马需首次下载
        retObject.tempUserPrice += tryPriceUtil.needGetRmb(true);
        retObject.needGet = true;
    }else {
        retObject.needGet = false;
    }
}

function screenShotTwoElement(retObject, registerStatus)
{
    retObject.screenShot2Array = [];

    if (registerStatus == 'third'){
        retObject.excUnitPrice += 2;
        //小马第三方登陆
        retObject.tempUserPrice += tryPriceUtil.priceStr(registerStatus);
    }
}

function screenShotThirdElement(retObject, reviewMustTitleKey, reviewMustContentKey, needMoreReviewContent)
{
    //评论标题
    if (reviewMustTitleKey != undefined && reviewMustTitleKey != ""){
        retObject.excUnitPrice += 1;
        //小马必须标题
        retObject.tempUserPrice += tryPriceUtil.pointCommentTitle(true);
    }

    if (reviewMustContentKey != undefined && reviewMustContentKey != ""){
        retObject.excUnitPrice += 1;
        //小马必须评论内容
        retObject.tempUserPrice += tryPriceUtil.pointCommentContent(true);
    }


    if (needMoreReviewContent == 'true'){
        retObject.excUnitPrice += 3;
        retObject.needMoreReviewContent = true;
        //小马长评论
        retObject.tempUserPrice += tryPriceUtil.needLongComment(true);
    }
}

module.exports = router;