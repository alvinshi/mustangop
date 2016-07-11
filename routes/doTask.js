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

router.get('/', function(req, res) {
    res.render('doTask');
});

// get do task list
router.get('/taskHall', function(req, res){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + parseInt(myDate.getMonth() + 1) + '-' + myDate.getDate();

    var query = new AV.Query(IOSAppExcLogger);
    query.exists('totalExcCount');
    query.exists('excKinds');
    query.exists('requirementImg');
    query.notEqualTo('taskStatus', 1);
    query.include('hisAppObject');
    query.greaterThan('remainCount', 0);
    query.descending('excDateStr');
    query.find().then(function(results){
        var retApps = new Array();
        for (var i = 0; i < results.length; i++){
            var appObject = Object();
            var hisAppObject = results[i].get('hisAppObject');
            appObject.trackName = hisAppObject.get('trackName').substring(0, 20);
            appObject.artworkUrl100 = hisAppObject.get('artworkUrl100');
            appObject.appleId = hisAppObject.get('appleId');
            appObject.appleKind = hisAppObject.get('appleKind');
            appObject.formattedPrice = hisAppObject.get('formattedPrice');
            appObject.latestReleaseDate = hisAppObject.get('latestReleaseDate');
            appObject.sellerName = hisAppObject.get('sellerName');

            appObject.totalExcCount = results[i].get('totalExcCount');
            appObject.requirementImg = results[i].get('requirementImg');
            appObject.remainCount = results[i].get('remainCount');

            var excKinds = results[i].get('excKinds');
            if (excKinds == 1){
                appObject.excKinds = '评论'
            }else {
                appObject.excKinds = '下载'
            }

            retApps.push(appObject)
        }
        res.json({'doTask':retApps})
    }),function (error){
        res.json({'errorMsg':error.message, 'errorId': error.code});
    }
});

module.exports = router;