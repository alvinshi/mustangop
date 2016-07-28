/**
 * Created by tanghui on 16/7/14.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var messageLogger = AV.Object.extend('messageLogger');
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表
var User = AV.Object.extend('_User');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

router.get('/', function(req, res) {
    res.render('taskCheck');
});

//*************页面左侧控制器条目*************************
router.get('/taskAudit', function(req, res){
    var userId = util.useridInReq(req);
    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.equalTo('close', false);
    query.include('appObject');
    query.ascending('createdAt');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appInfoObject = Object();

            //基本信息
            var appObject = results[i].get('appObject');
            appInfoObject.taskId = results[i].id;
            appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
            appInfoObject.trackName = appObject.get('trackName');
            appInfoObject.appId = appObject.get('appleId');
            appInfoObject.sellerName = appObject.get('sellerName');
            appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');

            //任务需求
            appInfoObject.taskType = results[i].get('taskType');
            appInfoObject.excCount = results[i].get('excCount');
            appInfoObject.detailRem = results[i].get('detailRem');
            appInfoObject.ranking = results[i].get('ranking');
            appInfoObject.score = results[i].get('score');
            appInfoObject.searchKeyword = results[i].get('searchKeyword');
            appInfoObject.screenshotCount = results[i].get('screenshotCount');
            appInfoObject.titleKeyword = results[i].get('titleKeyword');
            appInfoObject.commentKeyword = results[i].get('commentKeyword');


            //实时数据
            appInfoObject.remainCount = results[i].get('remainCount');
            appInfoObject.pending = results[i].get('pending');
            appInfoObject.submitted = results[i].get('submitted');
            appInfoObject.rejected = results[i].get('rejected');
            appInfoObject.accepted = results[i].get('accepted');

            appInfoObject.completed = results[i].get('completed');
            appInfoObject.cancelled = results[i].get('cancelled');
            retApps.push(appInfoObject);
        }
        res.json({'taskAudit':retApps, 'taskInfo':appInfoObject})
    })
});

//***********************撤销任务***************************
router.get('/cancelTask/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(releaseTaskObject);
    query.get(taskId).then(function(result){
        result.set('cancelled', true);
        result.save();
        res.json({'errorMsg':'succeed'});
    })
})

//******************点击控制器条目后触发***********************
router.get('/specTaskCheck/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(receiveTaskObject);
    query.include('taskObject');
    query.include('userObject');
    query.ascending('createdAt');
    query.find().then(function(results){
        var rtnResults = new Array();
        var promise = 0;
        var counter = 0;

        for (var i = 0; i < results.length; i++) {
            var task = results[i].get('taskObject');
            if (taskId == task.id){
                promise ++;
                var submission = Object();
                var user = results[i].get('userObject')
                //领取任务基本信息
                submission.id = results[i].id;
                submission.receiveCount = results[i].get('receiveCount');
                submission.receivePrice = results[i].get('receivePrice');
                submission.createdAt = results[i].createdAt;
                submission.username = user.get('username');
                submission.userId = user.id;

                //领取任务实时信息
                submission.pending = results[i].get('pending');
                submission.submitted = results[i].get('submitted');
                submission.rejected = results[i].get('rejected');
                submission.accepted = results[i].get('accepted');
                submission.completed = results[i].get('completed');

                //获取各个上传信息
                (function(tempSubmission){
                    var todoFolder = AV.Object.createWithoutData('receiveTaskObject', tempSubmission.id);
                    var relation = todoFolder.relation('mackTask');
                    var query = relation.query();
                    query.descending('createdAt');
                    query.find().then(function (data) {
                        tempSubmission.entries = new Array();
                        for (var j = 0; j < data.length; j++) {
                            var entry = Object();
                            entry.id = data[j].id;
                            entry.uploadName = data[j].get('uploadName');
                            entry.imgs = data[j].get('requirementImgs');
                            entry.status = data[j].get('status');
                            entry.detail = data[j].get('detail');
                            tempSubmission.entries.push(entry);
                        }
                        rtnResults.push(tempSubmission);
                        counter++;
                        if (counter == promise){
                            //排序;
                            rtnResults.sort(function(a, b){return a.createdAt - b.createdAt});
                            res.json({'rtnResults':rtnResults});
                        }
                    })
                })(submission)

            }
        }
        //没有上传,返回空值
        if (promise == 0){
            res.json({'rtnResults': []});
        }
    })
});

//*************接收逻辑******************************
var updateReceiveTaskDatabase = function(entryId, uploaderName){
    var entry = AV.Object.createWithoutData('mackTaskInfo', entryId);
    var secondQuery = new AV.Query('receiveTaskObject');
    secondQuery.equalTo('mackTask', entry);
    secondQuery.include('taskObject');
    secondQuery.include('userObject');
    secondQuery.include('appObject');
    secondQuery.find().then(function (results) {
        //更新领取任务数据库
        //results返回的是数组
        var data = results[0];
        //待审-1
        var preSubmitted = data.get('submitted');
        data.set('submitted', preSubmitted - 1);
        //接受+1
        var preAccepted = data.get('accepted');
        data.set('accepted', preAccepted + 1);
        //检查领取的任务是否已经完成
        var receiveCount = parseInt(data.get('receiveCount'));
        if (receiveCount == preAccepted + 1) {
            data.set('completed', 1);
        }
        data.save();
        //更新发布任务数据库
        var task = data.get('taskObject');
        //待审-1
        //待审-1
        preSubmitted = task.get('submitted');
        task.set('submitted', preSubmitted - 1);
        //接受+1
        preAccepted = task.get('accepted');
        task.set('accepted', preAccepted + 1);
        //检查发布的任务是否已经完成
        var excCount = task.get('excCount');
        if (excCount == preAccepted + 1) {
            task.set('completed', 1);
        }
        task.save();

        //消息产生所需数据
        var userObject = data.get('userObject');
        var userId = userObject.id;
        var appObject = data.get('appObject');
        var trackName = appObject.get('trackName');
        var senderId = task.get('userObject').id;
        var rateUnitPrice = task.get('rateUnitPrice');

        // 接收任务后 把钱打给用户记录流水
        var query = new AV.Query(accountJournal);
        query.equalTo('incomeYCoinUser', userObject);
        query.equalTo('taskObject', task);
        query.find().then(function(results){
            for (var i = 0; i < results.length; i++){
                var register = results[0];
                var payYB = results[i].get('payYCoin'); // 支付的YB
                var incomeYB = results[i].get('incomeYCoin'); // 得到的YB
                var systemYB = payYB - incomeYB;  // 系统得到的
                register.set('payYCoinStatus', 'payed');
                register.set('incomeYCoinStatus', 'incomed');
                register.set('systemYCoin', systemYB);
                register.save().then(function(){
                    //
                })

                // 接收任务后 把钱打给领取任务的用户
                var query_user = new AV.Query(User);
                query_user.get(userObject.id).then(function(userInfo){
                    var remainYB = userInfo.get('remainMoney');
                    var totalYB = userInfo.get('totalMoney');
                    userInfo.set('remainMoney', remainYB + incomeYB);
                    userInfo.set('totalMoney', totalYB + incomeYB);
                    userInfo.save();
                });

                // 接收任务后 冻结的钱减掉
                var query_releaseUser = new AV.Query(User);
                query_releaseUser.get(senderId).then(function(userIn){
                    var freezingYB = userIn.get('freezingMoney');
                    userIn.set('freezingMoney', freezingYB - payYB);
                    userIn.save();
                });
            }
        });
        acceptMessage(userId, senderId, trackName, uploaderName, rateUnitPrice);
    })
};

var acceptMessage = function(receiverId, senderId, trackName, uploaderName, rateUnitPrice){
    var message = new messageLogger();
    var receiver = new AV.User();
    receiver.id = receiverId;
    var sender = new AV.User();
    sender.id = senderId;
    message.set('receiverObjectId', receiver);
    message.set('senderObjectId', sender);
    message.set('category', '任务');
    message.set('type', '接受');
    message.set('firstPara', trackName);
    message.set('secondPara', uploaderName);
    message.set('thirdPara', rateUnitPrice)
    message.save();
};

router.post('/accept/:entryId', function(req, res) {
    var entryId = req.params.entryId;
    var query = new AV.Query(mackTaskInfo);
    query.get(entryId).then(function(data) {
        var uploaderName = data.get('uploadName');
        data.set("status", 3);
        data.save();

        updateReceiveTaskDatabase(entryId, uploaderName);
        res.json({'msg':'accepted'});
    });
});

//*************拒绝逻辑******************************
var updateDatabaseReject = function(entryId, uploaderName){
    var entry = AV.Object.createWithoutData('mackTaskInfo', entryId);
    var secondQuery = new AV.Query('receiveTaskObject');
    secondQuery.equalTo('mackTask', entry);
    secondQuery.include('taskObject');
    secondQuery.include('userObject');
    secondQuery.include('appObject');
    secondQuery.find().then(function (results) {
        //更新领取任务数据库
        //results返回的是数组
        var data = results[0];
        //待审-1
        var preSubmitted = data.get('submitted');
        data.set('submitted', preSubmitted - 1);
        //拒绝+1
        var preRejected = data.get('rejected');
        data.set('rejected', preRejected + 1);
        data.save();
        //更新发布任务数据库
        var task = data.get('taskObject');
        //待审-1
        //待审-1
        preSubmitted = task.get('submitted');
        task.set('submitted', preSubmitted - 1);
        //拒绝+1
        preRejected = task.get('rejected');
        task.set('rejected', preRejected + 1);
        task.save();

        var userObject = data.get('userObject');
        var userId = userObject.id;
        var appObject = data.get('appObject');
        var trackName = appObject.get('trackName');
        var senderId = task.get('userObject').id;

        rejectMessage(userId, senderId, trackName, uploaderName);
    })
}

var rejectMessage = function(receiverId, senderId, trackName, uploaderName){
    var message = new messageLogger();
    var receiver = new AV.User();
    receiver.id = receiverId;
    var sender = new AV.User();
    sender.id = senderId;
    message.set('receiverObjectId', receiver);
    message.set('senderObjectId', sender);
    message.set('category', '任务');
    message.set('type', '拒绝');
    message.set('firstPara', trackName);
    message.set('secondPara', uploaderName);
    message.save();
};

router.post('/reject/:entryId', function(req, res) {
    var rejectReason = req.body.rejectReason;
    var entryId = req.params.entryId;
    var query = new AV.Query(mackTaskInfo);
    query.get(entryId).then(function(data) {
        var uploaderName = data.get('uploadName');
        data.set("status", 2);
        data.set('detail', rejectReason)
        data.save();

        updateDatabaseReject(entryId, uploaderName);
        res.json({'msg':'rejected'});
    });
});

module.exports = router;