/**
 * Created by tanghui on 16/7/6.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var User = AV.Object.extend('_User');
var IOSAppInfo = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务库
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表
var messageLogger = AV.Object.extend('messageLogger');

router.get('/', function(req, res) {
    res.render('doTask');
});

function getTaskQuery(userObject){
    var query = new AV.Query(releaseTaskObject);
    query.notEqualTo('cancelled', true);
    query.notEqualTo('close', true);
    query.notEqualTo('userObject', userObject);
    return query;
}

function taskObjectToDic(results, TaskObjects, isMyTask)
{
    for (var i = 0; i < results.length; i++){
        var appObject = Object();
        var userReleaseAppObject = results[i].get('appObject');
        // app详细信息
        appObject.artworkUrl100 = userReleaseAppObject.get('artworkUrl100');
        appObject.appObjectId = userReleaseAppObject.id;
        appObject.myTask = false;

        var trackName = userReleaseAppObject.get('trackName');
        if (trackName != undefined){
            appObject.trackName = trackName.substring(0, 18);
        }
        appObject.appleId = userReleaseAppObject.get('appleId');
        appObject.appleKind = userReleaseAppObject.get('appleKind');
        appObject.formattedPrice = userReleaseAppObject.get('formattedPrice');
        appObject.latestReleaseDate = userReleaseAppObject.get('latestReleaseDate');
        appObject.sellerName = userReleaseAppObject.get('sellerName');

        appObject.myTask = isMyTask;

        appObject.objectId = results[i].id;
        appObject.excCount = results[i].get('excCount');
        appObject.remainCount = results[i].get('remainCount');
        appObject.rateUnitPrice = results[i].get('rateUnitPrice');

        // 任务详情信息
        appObject.taskType = results[i].get('taskType');
        appObject.ranking = results[i].get('ranKing');
        appObject.score = results[i].get('Score');
        appObject.searchKeyword = results[i].get('searchKeyword');
        appObject.screenshotCount = results[i].get('screenshotCount');
        appObject.titleKeyword = results[i].get('titleKeyword');
        appObject.commentKeyword = results[i].get('commentKeyword');
        appObject.detailRem = results[i].get('detailRem');

        TaskObjects.push(appObject);
    }
}

function getTaskObjectList(query, totalCount, pageIndex, userObject, res, disableCount){
    var flag = 0;
    var TaskObjects = [];
    var hasmore = 1;

    function retTaskFunc(disableCount, errorId){
        flag = flag + 1;
        if (flag == 2) {
            if(disableCount >= 0){
                res.json({'allTask':TaskObjects, 'hasMore':hasmore, 'errorId': errorId, 'disableTaskCount':disableCount})
            }else {
                res.json({'allTask':TaskObjects, 'hasMore':hasmore, 'errorId': errorId})
            }
        }
    }

    //查询我发布的任务
    var queryMyTask = new AV.Query(releaseTaskObject);
    queryMyTask.notEqualTo('cancelled', true);
    queryMyTask.notEqualTo('close', true);
    queryMyTask.equalTo('userObject', userObject);
    queryMyTask.find().then(function(results) {
        taskObjectToDic(results, TaskObjects, true);
        retTaskFunc(disableCount, 0);
    }, function(error){
        retTaskFunc(disableCount, 0);
    });

    query.skip(pageIndex);
    query.limit(20);
    query.find().then(function(results){
        taskObjectToDic(results, TaskObjects, false);
        if (totalCount > results.length + parseInt(pageIndex)){
            hasmore = 1;
        }else {
            hasmore = 0;
        }
        retTaskFunc(disableCount, 0);
    }, function (error){
        retTaskFunc(disableCount, error.code);
    });
}

// get do task list
router.get('/taskHall/:pageIndex/:taskType', function(req, res){
    var userId = util.useridInReq(req);
    var pageIndex = req.params.pageIndex;
    var tasktype = req.params.taskType;

    var userObject = new AV.User();
    userObject.id = userId;

    //查询用户无法做任务的query (使用非精准的App发布时间进行区分)
    var queryReceiveExcTask = new AV.Query(receiveTaskObject);
    queryReceiveExcTask.equalTo('userObject', userObject);
    queryReceiveExcTask.limit(1000);
    queryReceiveExcTask.descending('updatedAt');

    //TODO 标记为已做任务,去receiveTask数据库建立相关字段
    //TODO 个人中心保存用户告诉换屏设备个数,排序这边优先排序设备个数的换屏

    var query = getTaskQuery(userObject);

    if (tasktype == 'allTask'){
        query.greaterThan('remainCount', 0);
        query.doesNotMatchKeyInQuery('latestReleaseDate', 'appUpdateInfo', queryReceiveExcTask);
    }
    else if (tasktype == 'commentTask'){
        query.greaterThan('remainCount', 0);
        query.equalTo('taskType', '评论');
        query.doesNotMatchKeyInQuery('latestReleaseDate', 'appUpdateInfo', queryReceiveExcTask);
    }
    else if (tasktype == 'downTask'){
        query.greaterThan('remainCount', 0);
        query.equalTo('taskType', '下载');
        query.doesNotMatchKeyInQuery('latestReleaseDate', 'appUpdateInfo', queryReceiveExcTask);
    }
    else {
        query.lessThanOrEqualTo('remainCount', 0);
        query.matchesKeyInQuery('latestReleaseDate', 'appUpdateInfo', queryReceiveExcTask);
    }

    query.include('appObject');
    query.ascending('remainCount');
    query.ascending('createdAt');

    var totalCount = 0;
    query.count().then(function(count){
        totalCount = count;

        if (pageIndex == 0){
            var disableTaskQuery = getTaskQuery(userObject);
            disableTaskQuery.lessThanOrEqualTo('remainCount', 0);
            disableTaskQuery.matchesKeyInQuery('latestReleaseDate', 'appUpdateInfo', queryReceiveExcTask);

            disableTaskQuery.count().then(function(disableTaskCount){
                getTaskObjectList(query, totalCount, pageIndex, userObject, res, disableTaskCount);
            }, function (error){
                getTaskObjectList(query, 1000, pageIndex, userObject, res, -1);
            });
        }else {
            getTaskObjectList(query, 1000, pageIndex, userObject, res, -1);
        }
    }, function (error){
        getTaskObjectList(query, 1000, pageIndex, userObject, res, -1);
    });
});


// receive task 领取任务一个人统一领取
router.post('/postUsertask/:taskObjectId/:ratePrice/:appId', function(req, res){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
    //领取任务基本信息收集
    var userId = util.useridInReq(req);
    var receive_Count = parseInt(req.body.receiveCount);
    var latestReleaseDate = req.body.latestReleaseDate;
    var receive_Price = (req.params.ratePrice) * receive_Count;
    var detail_Rem = req.body.detailRem;
    if (detail_Rem == undefined){
        detail_Rem = '';
    }
    var taskObjectId = req.params.taskObjectId;
    var appObjectId = req.params.appId;

    //任务领取人
    var userObject = new AV.User();
    userObject.id = userId;

    //任务ID
    var taskObject = AV.Object.createWithoutData('releaseTaskObject', taskObjectId);
    var appObject = AV.Object.createWithoutData('IOSAppInfo', appObjectId);

    //后端效验
    var flag = true;
    var errorMsg = '';

    //1.不得重复领取同一任务
    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', userObject);
    query.equalTo('taskObject', taskObject);
    query.equalTo('appObject', appObject);
    query.include('taskObject');
    query.find().then(function(results){
        if (results.length > 0){
            errorMsg = "任务已经被领取过";
            flag = false;
            res.json({'succeeded': -2, 'errorMsg': errorMsg});
        }else {
            //2.账户余额不得为负
            query = new AV.Query(User);
            query.get(userId).then(function (userObject) {
                var totalMoney = userObject.get('totalMoney');
                if (totalMoney < 0) {
                    errorMsg = "账户余额为负, 请充值后再领取新任务";
                    res.json({'succeeded': -100, 'errorMsg': errorMsg});
                }else {
                    //3.剩余条数监测
                    query = new AV.Query(releaseTaskObject);
                    query.get(taskObjectId).then(function (resultTaskObject) {
                        var remainCount = resultTaskObject.get('remainCount');
                        if (remainCount < receive_Count){
                            console.log('task get failed because of task done');
                            errorMsg = "抱歉, 任务被别的用户抢走了";
                            res.json({'succeeded': -1, 'errorMsg': errorMsg});
                        }else {
                        //后端效验通过
                            var ReceiveTaskObject = new receiveTaskObject();
                            ReceiveTaskObject.set('userObject', userObject);
                            ReceiveTaskObject.set('taskObject', taskObject);
                            ReceiveTaskObject.set('appObject', appObject);
                            ReceiveTaskObject.set('receiveCount', receive_Count);
                            ReceiveTaskObject.set('receivePrice', receive_Price);
                            ReceiveTaskObject.set('detailRem', detail_Rem);
                            ReceiveTaskObject.set('appUpdateInfo', latestReleaseDate);//版本信息
                            ReceiveTaskObject.set('remainCount', receive_Count);
                            ReceiveTaskObject.set('pending', receive_Count);  // 未提交
                            ReceiveTaskObject.set('receiveDate', myDateStr);
                            ReceiveTaskObject.set('submitted', 0); // 待审
                            ReceiveTaskObject.set('rejected', 0);  // 拒绝
                            ReceiveTaskObject.set('accepted', 0);  // 接收
                            ReceiveTaskObject.set('completed', 0);  // 完成
                            ReceiveTaskObject.set('abandoned', 0);  // 过期
                            ReceiveTaskObject.save().then(function(){
                                //更新任务剩余条数
                                var prevRemainCount = resultTaskObject.get('remainCount');
                                var trackName = resultTaskObject.get('trackName');
                                resultTaskObject.set('remainCount', (prevRemainCount - receive_Count));
                                var prePending = resultTaskObject.get('pending');
                                resultTaskObject.set('pending', prePending + receive_Count);
                                resultTaskObject.save().then(function(){
                                    //创建领取信息
                                    var message = new messageLogger();
                                    var senderName = userObject.get('username');
                                    message.set('receiverObjectId', resultTaskObject.get('userObject'));
                                    message.set('senderObjectId', userObject);
                                    message.set('category', '任务');
                                    message.set('type','领取');
                                    message.set('firstPara', senderName);
                                    message.set('secondPara', trackName);
                                    message.set('thirdPara', receive_Count);
                                    message.save().then(function(){

                                        // 查询流水的库, 按照领取的数量 记录
                                        var query_account = new AV.Query(accountJournal);
                                        query_account.equalTo('taskObject', taskObject);
                                        query_account.doesNotExist('incomeYCoinUser');
                                        query_account.doesNotExist('incomeYCoinDes');
                                        query_account.limit(receive_Count);
                                        query_account.find().then(function(accountObjects){
                                            for (var a = 0; a < receive_Count; a++){
                                                accountObjects[a].set('incomeYCoinUser', userObject);  //收入金额的用户
                                                accountObjects[a].set('incomeYCoin', parseInt(req.params.ratePrice)); // 此次交易得到金额
                                                accountObjects[a].set('incomeYCoinStatus', 'prepare_income'); // 领取任务的时候为准备收益;
                                                accountObjects[a].set('incomeYCoinDes', '做任务');
                                            }

                                            AV.Object.saveAll(accountObjects).then(function(){
                                                res.json({'succeeded': 0, 'errorMsg': '领取成功'});
                                            });
                                        });
                                    });
                                });

                            });
                        }
                    });
                }
            });
        }

    });
});

module.exports = router;