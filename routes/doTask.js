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

function getTaskObjectList(query, totalCount, pageIndex){
    var flag = 0;
    var TaskObjects = [];
    var hasmore = 0;

    //TODO 用户自己任务置顶,最多发布2个
    //appObject.myTask = true;


    query.skip(pageIndex);
    query.limit(20);

    query.find().then(function(results){
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

        if (totalCount > results.length + parseInt(pageIndex)){
            hasmore = 1;
        }

        flag = flag + 1;
        if (flag == 2){
            res.json({'allTask':TaskObjects, 'hasMore':hasmore, 'errorId': 0})
        }
    }, function (error){
        flag = flag + 1;
        res.json({'errorMsg':error.message, 'errorId': error.code, 'allTask':TaskObjects});
    });
}

// get do task list
router.get('/taskHall/:pageIndex/:taskType', function(req, res){
    var userId = util.useridInReq(req);
    var pageIndex = req.params.pageIndex;
    var tasktype = req.params.taskType;

    var userObject = new AV.User();
    userObject.id = userId;

    //查询用户无法做任务的query
    var queryReceiveExcTask = new AV.Query(receiveTaskObject);
    queryReceiveExcTask.equalTo('userObject', userObject);
    queryReceiveExcTask.limit(1000);
    //TODO 版本号再次进行筛选
    queryReceiveExcTask.descending('updatedAt');

    //TODO ReleaseTaskObject 增加latestReleaseDate
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
        getTaskObjectList(query, totalCount, pageIndex);
    }, function (error){
        getTaskObjectList(query, 1000, pageIndex);
    });
});


// receive task 领取任务一个人统一领取
router.post('/postUsertask/:taskObjectId/:ratePrice/:appId', function(req, res){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();
    //领取任务基本信息收集
    var userId = util.useridInReq(req);
    var receive_Count = req.body.receiveCount;
    var latestReleaseDate = req.body.latestReleaseDate;
    var receive_Price = (req.params.ratePrice) * receive_Count;
    var detail_Rem = req.body.detailRem;
    if (detail_Rem == undefined){
        detail_Rem = '';
    };
    var taskObjectId = req.params.taskObjectId;
    var appObjectId = req.params.appId;

    //任务领取人
    var user = new AV.User();
    user.id = userId;

    //任务ID
    var task = AV.Object.createWithoutData('releaseTaskObject', taskObjectId);
    var app = AV.Object.createWithoutData('IOSAppInfo', appObjectId);

    //后端效验
    var flag = true;
    var errorMsg = '';

    //1.不得重复领取统一任务
    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', user);
    query.include('taskObject');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var taskid = results[i].get('taskObject');
            if (taskid == taskObjectId){
                errorMsg = "任务已经被领取过";
                flag = false;
                res.json({'succeeded': flag, 'errorMsg': errorMsg});
            }
        }
        //2.账户余额不得为负
        if (flag) {
            query = new AV.Query(User);
            query.get(userId).then(function (results) {
                var totalMoney = results.get('totalMoney');
                if (totalMoney < 0) {
                    flag = false;
                    errorMsg = "账户余额为负, 请充值后再领取新任务";
                    res.json({'succeeded': flag, 'errorMsg': errorMsg});
                }
                //3.剩余条数监测
                if (flag) {
                    query = new AV.Query(releaseTaskObject);
                    query.get(taskObjectId).then(function (results) {
                        var remainCount = parseInt(results.get('remainCount'));
                        if (remainCount < receive_Count){
                            flag = false;
                            console.log('failed');
                            errorMsg = "抱歉, 任务被别的用户抢走了";
                            res.json({'succeeded': flag, 'errorMsg': errorMsg});
                        }
                        //后端效验通过
                        if (flag) {
                            res.json({'succeeded': flag, 'errorMsg': errorMsg});
                            var ReceiveTaskObject = new receiveTaskObject();
                            ReceiveTaskObject.set('userObject', user);
                            ReceiveTaskObject.set('taskObject', task);
                            ReceiveTaskObject.set('appObject', app);
                            ReceiveTaskObject.set('receiveCount', receive_Count);
                            ReceiveTaskObject.set('receivePrice', receive_Price);
                            ReceiveTaskObject.set('detailRem', detail_Rem);
                            ReceiveTaskObject.set('appUpdateInfo', latestReleaseDate);//版本信息
                            ReceiveTaskObject.set('remainCount', parseInt(receive_Count));
                            ReceiveTaskObject.set('pending', parseInt(receive_Count));  // 未提交
                            ReceiveTaskObject.set('receiveDate', myDateStr);
                            ReceiveTaskObject.set('submitted', 0); // 待审
                            ReceiveTaskObject.set('rejected', 0);  // 拒绝
                            ReceiveTaskObject.set('accepted', 0);  // 接收
                            ReceiveTaskObject.set('completed', 0);  // 完成
                            ReceiveTaskObject.set('abandoned', 0);  // 过期
                            ReceiveTaskObject.save();
                            //更新任务剩余条数
                            query = new AV.Query(releaseTaskObject);
                            query.include('userObject');
                            query.include('appObject');
                            query.get(taskObjectId).then(function (data) {
                                var prevRemainCount = parseInt(data.get('remainCount'));
                                var taskOwnerId = data.get('userObject').id;
                                var app = data.get('appObject');
                                var trackName = app.get('trackName');
                                data.set('remainCount', (prevRemainCount - parseInt(receive_Count)) + '');
                                var prePending = data.get('pending');
                                data.set('pending', prePending + parseInt(receive_Count));
                                data.save();

                                //创建领取信息
                                var message = new messageLogger();
                                var receiver = new AV.User();
                                receiver.id = taskOwnerId;
                                var sender = new AV.User();
                                sender.id = userId;
                                var new_query = new AV.Query(User);
                                new_query.get(sender.id).then(function(data){
                                    var senderName = data.get('username');
                                    message.set('receiverObjectId', receiver);
                                    message.set('senderObjectId', sender);
                                    message.set('category', '任务');
                                    message.set('type','领取');
                                    message.set('firstPara', senderName);
                                    message.set('secondPara', trackName);
                                    message.set('thirdPara', parseInt(receive_Count));
                                    message.save();
                                })
                            });
                        }

                        // 查询流水的库, 按照领取的数量 记录
                        var query_account = new AV.Query(accountJournal);
                        query_account.equalTo('taskObject', task);
                        query_account.doesNotExist('incomeYCoinUser');
                        query_account.doesNotExist('incomeYCoinDes');
                        query_account.find().then(function(accountObject){
                            for (var a = 0; a < parseInt(receive_Count); a++){
                                accountObject[a].set('incomeYCoinUser', user);  //收入金额的用户
                                accountObject[a].set('incomeYCoin', parseInt(req.params.ratePrice)); // 此次交易得到金额
                                accountObject[a].set('incomeYCoinStatus', 'prepare_income'); // 领取任务的时候为准备收益;
                                accountObject[a].set('incomeYCoinDes', '做任务');
                                accountObject[a].save().then(function(){
                                    //
                                })

                            }

                        });
                    });
                }
            });
        }
    });
});

module.exports = router;