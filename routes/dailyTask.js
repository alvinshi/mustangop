/**
 * Created by cailong on 16/6/7.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

router.get('/:userObjectId', function(req, res) {
    res.render('dailyTask')
});

router.get('/daily/:userObjectId', function(req, res){
    var userId = Base64.decode(req.params.userObjectId);
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate();

    var query = new AV.Query(IOSAppExcLogger);

    query.equalTo('userId', userId);
    query.exists('totalExcCount');
    query.exists('excKinds');
    query.exists('requirementImg');
    query.notEqualTo('taskStatus', 1);
    query.include('hisAppObject');
    query.descending('excDateStr');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i< results.length; i++){

            var appHisObject = new Object();
            var appExcHisObject = results[i].get('hisAppObject');
            appHisObject.trackName = appExcHisObject.get('trackName');
            appHisObject.artworkUrl100 = appExcHisObject.get('artworkUrl100');
            appHisObject.artworkUrl512 = appExcHisObject.get('artworkUrl512');
            appHisObject.appleId = appExcHisObject.get('appleId');
            appHisObject.appleKind = appExcHisObject.get('appleKind');
            appHisObject.formattedPrice = appExcHisObject.get('formattedPrice');
            appHisObject.latestReleaseDate = appExcHisObject.get('latestReleaseDate');
            appHisObject.sellerName = appExcHisObject.get('sellerName');

            appHisObject.myAppVersion = results[i].get('myAppVersion');
            appHisObject.hisAppVersion = results[i].get('hisAppVersion');
            appHisObject.excHisDate = results[i].get('excDateStr');
            appHisObject.totalExcCount = results[i].get('totalExcCount');
            appHisObject.surplusCount = results[i].get('remainCount');
            appHisObject.taskObjectId = results[i].id;

            var excKinds = results[i].get('excKinds');

            if (appHisObject.excKinds == 1){
                appHisObject.excKinds = '评论'
            }else
                appHisObject.excKinds = '下载';

            //var totalExcCount = results[i].get('totalExcCount');
            //var taskCount = results[i].get('taskCount');
            //var SurplusCount = totalExcCount - taskCount;
            //if (taskCount == undefined){
            //    appHisObject.surplusCount = totalExcCount;
            //}else {
            //    appHisObject.surplusCount = SurplusCount;
            //}
            retApps.push(appHisObject);

        }
        res.json({'myDailyApps':retApps});
    }),function(error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
});

module.exports = router;