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

//
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
            appInfoObject.artworkUrl100 = appObject.get('artworkUrl100');
            appInfoObject.trackName = appObject.get('trackName');

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
module.exports = router;