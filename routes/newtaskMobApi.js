/**
 * Created by cailong on 16/7/21.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var Base64 = require('../public/javascripts/vendor/base64').Base64;

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject'); // 领取任务的库
var File = AV.Object.extend('_File');

router.get('/:userId', function(req, res) {
    res.render('newtaskMob')
});

// 内部交换
router.get('/claim/:excTaskId', function(req, res){
    var userId = util.useridInReq(req);
    var excTaskId = req.params.excTaskId;
    var uploadUserName = req.cookies.uploadImgName;

    var query = new AV.Query(receiveTaskObject);
    query.include('appObject');
    query.include('taskObject');
    query.get(excTaskId).then(function(results){
        var retObject = Object();
        var hisappObject = results.get('appObject');
        var taskInfo = results.get('taskObject');
        retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
        retObject.trackName = hisappObject.get('trackName');
        retObject.sellerName = hisappObject.get('sellerName');
        retObject.appleKind = hisappObject.get('appleKind');
        retObject.appleId = hisappObject.get('appleId');
        retObject.formattedPrice = hisappObject.get('formattedPrice');
        retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
        retObject.version = hisappObject.get('version');
        retObject.excKinds = taskInfo.get('taskType');

        retObject.totalExcCount = results.get('receiveCount');
        retObject.surplusCount = results.get('remainCount');
        retObject.taskObjectId = taskInfo.id;
        retObject.userObjectId = Base64.encode(userId);

        // 需求截图数据
        retObject.taskType = taskInfo.get('taskType');  //任务类型
        retObject.searchKeyword = taskInfo.get('searchKeyword');  //搜索关键词
        retObject.ranKing = taskInfo.get('ranKing'); // 排名
        retObject.Score = taskInfo.get('Score');  // 评分
        retObject.titleKeyword = taskInfo.get('titleKeyword'); // 标题关键词
        retObject.commentKeyword = taskInfo.get('commentKeyword'); // 评论关键词
        retObject.detailRem = taskInfo.get('detailRem'); // 备注详情
        retObject.screenshotCount = taskInfo.get('screenshotCount'); // 截图数

        if (uploadUserName != undefined){
            var relation = results.relation('mackTask');
            var task_query = relation.query();
            task_query.equalTo('uploadName', uploadUserName);
            task_query.find().then(function(result){
                var mackTaskList = new Array();
                for (var e = 0; e < result.length; e++){
                    retObject.uploadName = result[e].get('uploadName');
                    var taskImages = result[e].get('requirementImgs');
                    for (var w = 0; w < taskImages.length; w++){
                        var taskImage = taskImages[w];
                        mackTaskList.push(taskImage);
                    }
                }
                res.json({'oneAppInfo':retObject, 'macTask':mackTaskList})
            })
        }else {
            res.json({'oneAppInfo':retObject})
        }
    })
});

// 新增 做内部做任务
router.post('/add/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var uploadUserName = req.cookies.uploadImgName;
    var uploadName = req.body.uploadName;
    var requirementImgs = req.body.requirementImgs;
    if (uploadName != undefined){
        res.cookie('uploadImgName', uploadName);
    }
    else {
        uploadName = uploadUserName;
    }

    var task_query = new AV.Query(receiveTaskObject);
    task_query.include('taskObject');
    task_query.get(excTaskId).then(function(releaseObject){
        var relation = releaseObject.relation('mackTask');
        var query = relation.query();
        query.equalTo('uploadName', uploadName);
        query.find().then(function(results){
            //销毁以往图片
            for (var i = 0; i < results.length; i++){
                var images = results[i].get('requirementImgs');
                var query_file = new AV.Query(File);
                query_file.containedIn('url', images);
                query_file.find().then(function(result){
                    for (var e = 0; e < result.length; e++){
                        result[e].destroy().then(function(){
                            //remove success
                        })
                    }
                })
            }
            if (results.length > 0){
                var newTaskObject = results[0];
                newTaskObject.set('requirementImgs', requirementImgs);
                newTaskObject.save().then(function(){
                    // 如果有就更新图片
                })
            }
            else {
                var newTaskObject = new mackTaskInfo();
                newTaskObject.set('uploadName', uploadName);
                newTaskObject.set('requirementImgs', requirementImgs);
                newTaskObject.save().then(function(){
                    var relation = releaseObject.relation('mackTask');
                    relation.add(newTaskObject);// 建立针对每一个 Todo 的 Relation
                    releaseObject.save().then(function(){
                        // 保存到云端
                    });

                    releaseObject.increment('remainCount', -1);
                    releaseObject.increment('submitted', 1);
                    releaseObject.increment('pending', -1);
                    releaseObject.save().then(function(){
                        //如果有就计数+1
                    });

                    var releaseid = releaseObject.get('taskObject').id;
                    var todo = AV.Object.createWithoutData('releaseTaskObject', releaseid);
                    todo.increment('submitted', 1);
                    todo.increment('pending', -1);
                    todo.save().then(function(){
                        //如果有就计数+1
                    });

                });
            }
            res.json({'errorId':0, 'errorMsg':'', 'uploadName':uploadName, 'requirementImgs':requirementImgs});
        });
    },
    function (err){
        res.json({'errorMsg':err.message, 'errorId': err.code});
    })
});

module.exports = router;