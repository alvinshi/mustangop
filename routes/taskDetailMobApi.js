/**
 * Created by tanghui on 16/6/8.
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
var File = AV.Object.extend('_File');

router.get('/:excTaskId', function(req, res) {
    res.render('taskDetailMobile')
});

router.get('/single/:appleId', function(req, res){
    //var userId = util.useridInReq(req);
    var appleid = parseInt(req.params.appleId);
    var uploadUserName = req.cookies.uploadImgName;

    var query = new AV.Query(IOSAppExcLogger);

    query.equalTo('hisAppId', appleid);
    //query.equalTo('userId', userId);
    query.include('myAppObject');
    query.include('hisAppObject');
    query.find().then(function(results){
        var retObject = Object();
        for (var i = 0; i< results.length; i++){
            var hisappObject = results[i].get('hisAppObject');
            var myappObject = results[i].get('myAppObject');
            var hisappid = results[i].get('hisAppId');
            if (hisappid == appleid){
                retObject.artworkUrl100 = hisappObject.get('artworkUrl100');
                retObject.trackName = hisappObject.get('trackName');
                retObject.sellerName = hisappObject.get('sellerName');
                retObject.appleKind = hisappObject.get('appleKind');
                retObject.appleId = hisappObject.get('appleId');
                retObject.formattedPrice = hisappObject.get('formattedPrice');
                retObject.latestReleaseDate = hisappObject.get('latestReleaseDate');
                retObject.version = hisappObject.get('version');

                retObject.totalExcCount = results[i].get('totalExcCount');
                retObject.requirementImg = results[i].get('requirementImg');
                retObject.excKinds = results[i].get('excKinds');
                retObject.taskObjectId = results[i].id;

                retObject.myAppartworkUrl100 = myappObject.get('artworkUrl100');
                retObject.myAppName = myappObject.get('trackName');

                if (retObject.excKinds == 1){
                    retObject.excKinds = '评论'
                }else
                    retObject.excKinds = '下载';

                query.get(retObject.taskObjectId).then(function(taskObject){
                    var relation = taskObject.relation('mackTask');
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
                })
            }
        }

    }),function(error){
        res.json({'errorId':error.code, 'errorMsg':error.message})
    }
});

// 新增 做任务详情
router.post('/addTask/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var uploadName = req.body.uploadName;
    var requirementImgs = req.body.requirementImgs;

    res.cookie('uploadImgName', uploadName);

    var task_query = new AV.Query(IOSAppExcLogger);
    task_query.get(excTaskId).then(function(taskObject){
        var relation = taskObject.relation('mackTask');
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
                    var relation = taskObject.relation('mackTask');
                    relation.add(newTaskObject);// 建立针对每一个 Todo 的 Relation
                    taskObject.save().then(function(){
                        // 保存到云端
                    });

                    var taskCount = taskObject.get('taskCount');
                    if (taskCount == undefined){
                        taskObject.set('taskCount', 1);
                        taskObject.save().then(function(){
                            //如果没有就set1个
                        })
                    }
                    else {
                        taskObject.increment('taskCount', 1);
                        taskObject.save().then(function(){
                            //如果有就计数+1
                        })
                    }
                });
            }
            res.json({'errorId':0, 'errorMsg':'', 'uploadName':uploadName, 'requirementImgs':requirementImgs});
        })

        },
        function (err){
        res.json({'errorMsg':err.message, 'errorId': err.code});
    })
});


module.exports = router;