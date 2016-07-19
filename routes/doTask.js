/**
 * Created by tanghui on 16/7/6.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppSql = AV.Object.extend('IOSAppInfo');
var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');

router.get('/', function(req, res) {
    res.render('doTask');
});

// get do task list
router.get('/taskHall', function(req, res){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + parseInt(myDate.getMonth() + 1) + '-' + myDate.getDate();

    var query = new AV.Query(releaseTaskObject);
    //query.notEqualTo('remainCount', '0');
    //query.equalTo('completed', 0);
    query.include('appObject');
    query.descending('updatedAt');

    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appObject = Object();
            var hisAppObject = results[i].get('appObject');
            //app基本信息
            appObject.trackName = hisAppObject.get('trackName').substring(0, 20);
            appObject.artworkUrl100 = hisAppObject.get('artworkUrl100');
            appObject.appleId = hisAppObject.get('appleId');
            appObject.appleKind = hisAppObject.get('appleKind');
            appObject.formattedPrice = hisAppObject.get('formattedPrice');
            appObject.latestReleaseDate = hisAppObject.get('latestReleaseDate');
            appObject.sellerName = hisAppObject.get('sellerName');

            appObject.objectId = result[i].get('objectId')
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
router.post('/postUsertask/:taskObjectId', function(req, res){
    var userId = util.useridInReq(req);
    var receiveCount = req.body.receiveCount;
    var receivePrice = req.body.receivePrice;
    var detailRem = req.body.detailRem;
    var taskObjectId = req.params.taskObjectId;

    var user = new AV.User();
    user.id = userId;

    var app = AV.Object.createWithoutData('releaseTaskObject', taskObjectId);

    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', user);
    query.include('taskObject');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var taskid = results[i].get('taskObject');
            if (taskid == taskObjectId){
                res.json({'error':'已经领取了'})
            }else {
                var receiveTaskObject = new receiveTaskObject();
                receiveTaskObject.set('userObject', user);
                receiveTaskObject.set('taskObject', app);
                receiveTaskObject.set('receiveCount', receiveCount);
                receiveTaskObject.set('receivePrice', receivePrice);
                receiveTaskObject.set('detailRem', detailRem);
                receiveTaskObject.save().then(function(){
                    // 保存成功
                })
            }
        }
        res.json({'errorId':0, 'errorMsg':''});
    })

});
module.exports = router;