/**
 * Created by tanghui on 16/7/6.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var User = AV.Object.extend('_User');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布任务库
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务库
var accountJournal = AV.Object.extend('accountJournal'); // 记录账户变动明细表

router.get('/', function(req, res) {
    res.render('doTask');
});

// get do task list
router.get('/taskHall', function(req, res){
    var userId = util.useridInReq(req);
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + parseInt(myDate.getMonth() + 1) + '-' + myDate.getDate();

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(releaseTaskObject);
    query.notEqualTo('remainCount', '0');
    //query.notEqualTo('userObject', user);
    query.include('appObject');
    query.ascending('createdAt');

    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appObject = Object();
            var hisAppObject = results[i].get('appObject');
            //app基本信息
            appObject.appObjectId = hisAppObject.id;
            appObject.trackName = hisAppObject.get('trackName').substring(0, 20);
            appObject.artworkUrl100 = hisAppObject.get('artworkUrl100');
            appObject.appleId = hisAppObject.get('appleId');
            appObject.appleKind = hisAppObject.get('appleKind');
            appObject.formattedPrice = hisAppObject.get('formattedPrice');
            appObject.latestReleaseDate = hisAppObject.get('latestReleaseDate');
            appObject.sellerName = hisAppObject.get('sellerName');

            appObject.objectId = results[i].id;
            appObject.excCount = results[i].get('excCount');
            appObject.remainCount = results[i].get('remainCount');
            appObject.rateUnitPrice = results[i].get('rateUnitPrice');

            //任务需求
            appObject.taskType = results[i].get('taskType');
            appObject.ranking = results[i].get('ranking');
            appObject.score = results[i].get('Score');
            appObject.searchKeyword = results[i].get('searchKeyword');
            appObject.screenshotCount = results[i].get('screenshotCount');
            appObject.titleKeyword = results[i].get('titleKeyword');
            appObject.commentKeyword = results[i].get('commentKeyword');
            appObject.detailRem = results[i].get('detailRem');

            retApps.push(appObject)
        }
        res.json({'doTask':retApps})
    }),function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
});


// receive task 领取任务一个人统一领取
router.post('/postUsertask/:taskObjectId/:ratePrice/:appId', function(req, res){
    //领取任务基本信息收集
    var userId = util.useridInReq(req);
    var receive_Count = req.body.receiveCount;
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
            }
        }
    });

    //2.账户余额不得为负
    if (flag) {
        query = new AV.Query(User);
        query.get(userId).then(function (results) {
            if (results.remainMoney < 0) {
                flag = false;
                errorMsg = "账户余额为负, 请充值后再领取新任务";
            }
        });
    }

    //3.剩余条数监测
    if (flag) {
        query = new AV.Query(releaseTaskObject);
        query.get(taskObjectId).then(function (results) {
            if (parseInt(results.remainCount) < receive_Count){
                flag = false;
                errorMsg = "抱歉, 任务被别的用户抢走了";
            }
        });
    }

    //后端效验通过
    if (flag) {
        var ReceiveTaskObject = new receiveTaskObject();
        ReceiveTaskObject.set('userObject', user);
        ReceiveTaskObject.set('taskObject', task);
        ReceiveTaskObject.set('appObject', app);
        ReceiveTaskObject.set('receiveCount', receive_Count);
        ReceiveTaskObject.set('receivePrice', receive_Price);
        ReceiveTaskObject.set('detailRem', detail_Rem);
        ReceiveTaskObject.set('remainCount', parseInt(receive_Count));
        ReceiveTaskObject.set('pending', parseInt(receive_Count));  // 未提交
        ReceiveTaskObject.set('submitted', 0); // 待审
        ReceiveTaskObject.set('rejected', 0);  // 拒绝
        ReceiveTaskObject.set('accepted', 0);  // 接收
        ReceiveTaskObject.set('completed', 0);  // 完成
        ReceiveTaskObject.save();
        //更新任务剩余条数
        query = new AV.Query(releaseTaskObject);
        query.get(taskObjectId).then(function (data) {
            var prevRemainCount = parseInt(data.get('remainCount'));
            data.set('remainCount', prevRemainCount - receive_Count + '');
            var prePending = data.get('pending');
            data.set('pending', prePending + parseInt(receive_Count));
            data.save();
            console.log('taskObject has been updated')
        });
    }

    // 查询流水的库, 按照领取的数量 记录
    var query_account = new AV.Query(accountJournal);
    query_account.equalTo('taskObject', task);
    query_account.find().then(function(accountObject){
        for (var e = 0; e < accountObject.length; e++){
            for (var a = 0; a < receive_Count; a++){
                accountObject[a].set('incomeYCoinUser', user);  //收入金额的用户
                accountObject[a].set('incomeYCoin', parseInt(req.params.ratePrice)); // 此次交易得到金额
                accountObject[a].set('incomeYCoinStatus', 'prepare_income'); // 领取任务的时候为准备收益;
                accountObject[a].set('incomeYCoinDes', '做任务');
                accountObject[a].save().then(function(){
                    //
                })
            }


        }
    });
    res.json({'succeeded': flag, 'errorMsg': errorMsg});
});

module.exports = router;