/**
 * Created by cailong on 16/7/20.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var taskDemandObject = AV.Object.extend('taskDemandObject');
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var releaseTaskObject = AV.Object.extend('releaseTaskObject'); // 发布的库
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库


router.get('/', function(req, res) {
    res.render('login');
});

router.get('/:userObjectId', function(req, res) {
    res.render('myClaim');
});

router.get('/claim/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', user);
    query.notEqualTo('close', true);
    query.include('taskObject');
    query.include('appObject');
    query.descending('createdAt');

    var calNumber = 0;
    query.find().then(function(results){

        if(results.length == 0){
            res.json({'myClaimApps':[], 'errorId': 0});
            return;
        }

        var retApps = new Array();
        for (var i = 0; i< results.length; i++){
            var appHisObject = new Object();
            var appExcHisObject = results[i].get('taskObject');
            var appobject = results[i].get('appObject');

            if (appExcHisObject == undefined){
                calNumber++;
                continue;
            }
            appHisObject.taskObjectId = results[i].id;
            appHisObject.createdAt = results[i].createdAt;
            appHisObject.excKinds = appExcHisObject.get('taskType');
            //total count
            appHisObject.totalExcCount = results[i].get('receiveCount');
            //过期
            appHisObject.abandoned = results[i].get('expiredCount');

            //base info
            appHisObject.trackName = appobject.get('trackName');
            appHisObject.artworkUrl100 = appobject.get('artworkUrl100');
            appHisObject.artworkUrl512 = appobject.get('artworkUrl512');
            appHisObject.appleId = appobject.get('appleId');
            //appHisObject.appleKind = appobject.get('appleKind');
            //appHisObject.formattedPrice = appobject.get('formattedPrice');
            //appHisObject.sellerName = appobject.get('sellerName');
            appHisObject.latestReleaseDate = appobject.get('latestReleaseDate');

            //计算截至时间,下午6点前接受的任务,第二天早上8点,6点后接受的任务,第三天早上8点
            var createDate = results[i].createdAt;
            var expireTimeStamp = 0;
            var createHours = createDate.getHours();
            //早10点审核 前天下午6点前接受的任务
            if (createHours < 18){
                expireTimeStamp = createDate.getTime() + 1000*60*60*24;
            }else {
                expireTimeStamp = createDate.getTime() + 1000*60*60*48;
            }
            var expireDate = new Date(expireTimeStamp);
            appHisObject.deadlineStr = '截止:' +
                (expireDate.getMonth() + 1).toString() + '月' + expireDate.getDate().toString() + '日 8:00Am';

            //未完成 审核中 被拒绝 已通过
            (function (receTaskObject, inAppHisObject){
                var relation = receTaskObject.relation('mackTask');
                var query = relation.query();
                query.limit(1000);
                query.find().then(function(doTaskObjects){
                    var submitted = 0, accepted = 0, rejected = 0;
                    for (var r = 0; r < doTaskObjects.length; r++){
                        var taskStatus = doTaskObjects[r].get('taskStatus');
                        if (taskStatus == 'uploaded' || taskStatus == 'reUploaded'){
                            submitted++;
                        }else if(taskStatus == 'systemAccepted' || taskStatus == 'accepted'){
                            accepted++;
                        }else if(taskStatus == 'refused'){
                            rejected++;
                        }else if(taskStatus == 'expired'){
                            //已经在定时器里增加过期数据,无需在这边计算 —— 唉
                        }
                    }

                    var undoTask = receTaskObject.get('receiveCount') - inAppHisObject.abandoned - doTaskObjects.length;
                    if (undoTask > 0){
                        inAppHisObject.surplusCount = undoTask;
                    }

                    inAppHisObject.submitted = submitted;
                    inAppHisObject.accepted = accepted;
                    inAppHisObject.rejected = rejected;

                    //accepted + abandoned == receiveCount
                    //暂时不做,需要手动关闭
                    //任务已经结束
                    if(accepted + inAppHisObject.abandoned >= receTaskObject.get('receiveCount')){
                        inAppHisObject.canClose = true;
                        //不自动关
                        //inAppHisObject.set('close', true);
                    }

                    retApps.push(inAppHisObject);

                    calNumber++;
                    if (calNumber == results.length){
                        retApps.sort(function(a, b){return a.createdAt - b.createdAt});
                        res.json({'myClaimApps':retApps, 'errorId': 0});
                    }
                }, function (error) {
                    calNumber++;
                    if (calNumber == results.length){
                        retApps.sort(function(a, b){return a.createdAt - b.createdAt});
                        res.json({'myClaimApps':retApps, 'errorId': 0});
                    }
                });
            }(results[i], appHisObject));
        }
    }, function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    });
});

// 修改分配备注
router.post('/saveRemark/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);
    var userdetaRem = req.body.remark;
    var taskid = req.body.taskObjectId;

    var query = new AV.Query(receiveTaskObject);
    query.get(taskid).then(function(results){
        results.set('detailRem', userdetaRem);
        results.save().then(function(){
        });
        res.json({'errorId':0, 'errorMsg':''});
    })

});

// 一键关闭已经过期或者被成功接收的任务
router.post('/closeTask', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);

});


module.exports = router;