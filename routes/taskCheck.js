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
    query.include('appObject');
    query.limit(5);
    query.descending('createdAt');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appInfoObject = new Object();
            var appObject = results[i].get('appObject');
            appInfoObject.taskId = results[i].id;
            appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
            appInfoObject.trackName = appObject.get('trackName');
            appInfoObject.appId = appObject.get('appleId');
            appInfoObject.sellerName = appObject.get('sellerName');
            appInfoObject.latestReleaseDate = appObject.get('latestReleaseDate');
            appInfoObject.taskType = results[i].get('taskType');
            appInfoObject.excCount = results[i].get('excCount');
            appInfoObject.inProgress = results[i].get('inProgress'); // 进行中的任务
            appInfoObject.Completed = results[i].get('Completed');  // 已完成的任务
            appInfoObject.pendingTask = results[i].get('Completed');  // 待审
            appInfoObject.Uncommitted = results[i].get('Uncommitted'); // 未提交

            retApps.push(appInfoObject);
        }
        res.json({'taskAudit':retApps, 'taskInfo':appInfoObject})
    })
});

//******************点击控制器条目后触发***********************
router.get('/specTaskCheck/:taskId', function(req, res){
    var taskId = req.params.taskId;
    var query = new AV.Query(receiveTaskObject);
    console.log(taskId);
    query.include('taskObject');
    query.include('userObject');
    query.ascending('createdAt');
    query.find().then(function(results){
        var rtnResults = new Array();
        for (var i = 0; i < results.length; i++) {
            var task = results[i].get('taskObject');
            if (taskId == task.id){
                var submission = Object();
                var user = results[i].get('userObject')
                submission.receiveCount = results[i].get('receiveCount');
                submission.receivePrice = results[i].get('receivePrice');
                submission.username = user.get('username');

                //获得单个上交
                //var relation = submission.relation('mackTask');
                //var submission_query = relation.query();
                //submission_query.find().then(function (data) {
                //    submission.entries = new Array();
                //    for (var j = 0; j < data.length; j++) {
                //        var entry = Object();
                //        entry.uploadName = data[j].get('uploadName');
                //        entry.imgs = data[j].get('requirementImgs');
                //        entry.status = data[j].get('status');
                //        entry.detail = data[j].get('detail');
                //        submission.entries.push(entry);
                //    }
                //})
                rtnResults.push(submission);
            }
        }
        console.log(rtnResults);
        res.json({'rtnResults':rtnResults});
    })
})
module.exports = router;