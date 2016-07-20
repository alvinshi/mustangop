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
    //query.descending('createdAt');
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

            appHisObject.totalExcCount = appExcHisObject.get('excCount');
            appHisObject.surplusCount = appExcHisObject.get('remainCount');
            appHisObject.taskObjectId = results[i].id;
            appHisObject.detailRem = results[i].get('detailRem');

            appHisObject.excKinds = appExcHisObject.get('taskType');

            retApps.push(appHisObject);

        }
        res.json({'myDailyApps':retApps});
    }),function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
});


module.exports = router;