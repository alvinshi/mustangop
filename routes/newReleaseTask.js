/**
 * Created by cailong on 16/7/14.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppSql = AV.Object.extend('IOSAppInfo');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var taskDemandObject = AV.Object.extend('taskDemandObject');

router.get('/', function(req, res){
   res.render('appDetail')
});

var myRate = 1;

// 发布任务函数
function releaseTask(res, userId, appObject, releaseDetail){

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.include('taskRequirement');
    query.find().then(function(results){
        for (var i = 0; i < results.length; i++){
            var taskRequireObject = results[i].get('taskRequirement');
            if (taskRequireObject == undefined){
                var requirementObject = new taskDemandObject();
                requirementObject.save().then(function(){
                    res.json({'newReleaseDetail':releaseDetail});
                    //
                });
                results[i].set('taskRequirement', requirementObject);
                results[i].set('userObject', user);
                results[i].set('appObject', appObject);
            }else {
                taskRequireObject.save().then(function(){
                    res.json({'newReleaseDetail':releaseDetail});
                });
            }
        }
    })
}

router.post('/taskNeed/:appid', function(req, res){
    var userId = util.useridInReq(req);
    var myappId = req.params.appid;
    var releaseDetail = req.body.appNeedInfo;
    var appBaseInfo = req.body.appBaseInfo;

    var user = new AV.User();
    user.id = userId;

    var rateunitPrice = releaseDetail.excUnitPrice * myRate;

    var query = new AV.Query(releaseTaskObject);
    query.equalTo('userObject', user);
    query.include('taskRequirement');
    query.include('appObject');
    query.find().then(function(results){
        var releasetaskObject = '';
        if (results.length < 0){
            var releaseObject = new releasetaskObject();
            releaseObject.set('releaseCount', releaseDetail.excCount);
            releaseObject.set('taskUnitPrice', releaseDetail.excUnitPrice);
            releaseObject.set('remainCount', releaseDetail.excCount);
            releaseObject.set('myRate', myRate);
            releaseObject.set('rateUnitPrice', rateunitPrice);
            releaseObject.set('appObject', appBaseInfo);
            releaseObject.save().then(function(){
                releaseTask(res, user, appBaseInfo, releaseDetail);
            })
        }
    })
});

module.exports = router;