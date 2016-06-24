/**
 * Created by cailong on 16/6/8.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');

router.get('/:excTaskId', function(req, res){
    res.render('taskDetail')
});

router.get('/detail/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;

    var query = new AV.Query(IOSAppExcLogger);
    query.include('myAppObject');
    query.include('hisAppObject');
    query.get(excTaskId).then(function(taskObject){
        var retObject = Object();
        var hisappObject = taskObject.get('hisAppObject');
        var myappObject = taskObject.get('myAppObject');
        retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
        retObject.trackName = hisappObject.get('trackName');
        retObject.sellerName = hisappObject.get('sellerName');
        retObject.appleKind = hisappObject.get('appleKind');
        retObject.appleId = hisappObject.get('appleId');
        retObject.formattedPrice = hisappObject.get('formattedPrice');
        retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
        retObject.version = hisappObject.get('version');

        retObject.totalExcCount = taskObject.get('totalExcCount');
        retObject.requirementImg = taskObject.get('requirementImg');
        retObject.excKinds = taskObject.get('excKinds');
        retObject.taskObjectId = taskObject.id;

        retObject.myAppartworkUrl100 = myappObject.get('artworkUrl100');
        retObject.myAppName = myappObject.get('trackName');

        if (retObject.excKinds == 1){
            retObject.excKinds = '评论'
        }else
            retObject.excKinds = '下载';

        var relation = taskObject.relation('mackTask');
        var task_query = relation.query();
        task_query.find().then(function(result){
            var mackTaskList = new Array();
            for (var e = 0; e < result.length; e++){
                var mackTaskObject = Object();
                mackTaskObject.uploadName = result[e].get('uploadName');
                mackTaskObject.taskImages = result[e].get('requirementImgs');
                mackTaskList.push(mackTaskObject);
            }
            res.json({'oneAppInfo':retObject, 'macTask':mackTaskList})
        })

    })
});



module.exports = router;