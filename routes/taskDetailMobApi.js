/**
 * Created by tanghui on 16/6/8.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

var IOSAppBinder = AV.Object.extend('IOSAppBinder');
var IOSAppExcLogger = AV.Object.extend('IOSAppExcLogger');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');
var File = AV.Object.extend('_File');

router.get('/:excTaskId', function(req, res) {
    res.render('taskDetailMobile')
});

// 新增 做任务详情
router.post('/addTask/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var uploadName = req.body.uploadName;
    var requirementImgs = req.body.requirementImgs;

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