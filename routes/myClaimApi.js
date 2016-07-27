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

router.get('/:userObjectId', function(req, res) {
    res.render('myClaim')
});

router.get('/claim/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);

    var user = new AV.User();
    user.id = userId;

    var query = new AV.Query(receiveTaskObject);
    query.equalTo('userObject', user);
    query.include('taskObject');
    query.include('appObject');
    query.descending('createdAt');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i< results.length; i++){
            var appHisObject = new Object();
            var appExcHisObject = results[i].get('taskObject');
            var appobject = results[i].get('appObject');
            appHisObject.trackName = appobject.get('trackName');
            appHisObject.artworkUrl100 = appobject.get('artworkUrl100');
            appHisObject.artworkUrl512 = appobject.get('artworkUrl512');
            appHisObject.appleId = appobject.get('appleId');
            appHisObject.appleKind = appobject.get('appleKind');
            appHisObject.formattedPrice = appobject.get('formattedPrice');
            appHisObject.latestReleaseDate = appobject.get('latestReleaseDate');
            appHisObject.sellerName = appobject.get('sellerName');

            appHisObject.totalExcCount = results[i].get('receiveCount');
            appHisObject.surplusCount = results[i].get('remainCount');
            appHisObject.rejected = results[i].get('rejected');
            appHisObject.accepted = results[i].get('accepted');
            appHisObject.submitted = results[i].get('submitted');
            appHisObject.taskObjectId = results[i].id;
            appHisObject.detailRem = results[i].get('detailRem');

            appHisObject.excKinds = appExcHisObject.get('taskType');
            appHisObject.rejected = appExcHisObject.get('rejected');
            retApps.push(appHisObject);

        }
        res.json({'myClaimApps':retApps});
    }),function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
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


module.exports = router;