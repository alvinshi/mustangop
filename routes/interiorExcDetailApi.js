/**
 * Created by cailong on 16/7/21.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库

router.get('/:excTaskId', function(req, res){
    res.render('interiorExcDetail')
});


router.get('/interior/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var query = new AV.Query(receiveTaskObject);
    query.include('taskObject');
    query.include('appObject');
    query.get(excTaskId).then(function(results){
        var retObject = Object();
        var hisappObject = results.get('appObject');
        var taskObject = results.get('taskObject');
        retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
        retObject.trackName = hisappObject.get('trackName');
        retObject.sellerName = hisappObject.get('sellerName');
        retObject.appleKind = hisappObject.get('appleKind');
        retObject.appleId = hisappObject.get('appleId');
        retObject.formattedPrice = hisappObject.get('formattedPrice');
        retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
        retObject.excUniqueCode = hisappObject.get('excUniqueCode');
        retObject.version = hisappObject.get('version');

        retObject.totalExcCount = results.get('receiveCount');
        retObject.excKinds = taskObject.get('taskType');
        retObject.taskObjectId = taskObject.id;

        // 需求截图数据
        retObject.taskType = taskObject.get('taskType');  //任务类型
        retObject.searchKeyword = taskObject.get('searchKeyword');  //搜索关键词
        retObject.ranKing = taskObject.get('ranKing'); // 排名
        retObject.Score = taskObject.get('Score');  // 评分
        retObject.titleKeyword = taskObject.get('titleKeyword'); // 标题关键词
        retObject.commentKeyword = taskObject.get('commentKeyword'); // 评论关键词
        retObject.detailRem = taskObject.get('detailRem'); // 备注详情
        retObject.screenshotCount = taskObject.get('screenshotCount'); // 截图数

        var relation = results.relation('mackTask');
        var task_query = relation.query();
        task_query.find().then(function(result){
            var mackTaskList = new Array();
            for (var e = 0; e < result.length; e++){
                var mackTaskObject = Object();
                mackTaskObject.uploadName = result[e].get('uploadName');
                mackTaskObject.taskImages = result[e].get('requirementImgs');
                mackTaskObject.detail = result[e].get('detail');  // 拒绝理由
                //Error for
                mackTaskObject.status = result[e].get('taskStatus'); // 任务状态
                mackTaskList.push(mackTaskObject);
            }
            res.json({'oneAppInfo':retObject, 'macTask':mackTaskList})
        })
    })
});


module.exports = router;