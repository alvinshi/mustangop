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

router.get('/:appleId', function(req, res) {
    res.render('taskDetailMobile')
});

// 新增 做任务详情
router.post('/addTask/:excTaskId', function(req, res){
    var excTaskId = req.params.excTaskId;
    var uploadName = req.body.uploadName;
    var requirementImgs = req.body.requirementImgs;

    var taskFolder = AV.Object.createWithoutData('IOSAppExcLogger', excTaskId);
    var relation = taskFolder.relation('mackTask');
    var query = relation.query();
    query.equalTo('uploadName', uploadName);
    query.find().then(function (results) {
        for (var i = 0; i<results.length; i++){
            var taskId = results[i].id;
            var IMages = results[i].get('requirementImg');
            var IMage = IMages[0];
            var query = new AV.Query(File);
            query.equalTo('url', IMage);
            query.find().then(function(result){
                for (var e = 0; e<result.length; e++){
                    var imagesId = result[e].id;
                    var todo = AV.Object.createWithoutData('_File', imagesId);
                    todo.destroy().then(function(){
                        //
                    });
                }
            })
        }
        if (results.length > 0){
            var newTaskObject = AV.Object.createWithoutData('mackTaskInfo', taskId);
            newTaskObject.set('requirementImg', requirementImgs);
            newTaskObject.save().then(function(){
                //
            })
        }else {
            var newTaskObject = new mackTaskInfo();
            newTaskObject.set('uploadName', uploadName);
            newTaskObject.set('requirementImg', requirementImgs);
            newTaskObject.save().then(function(){

            });

            AV.Object.saveAll(newTaskObject).then(function(){
                var relation = taskFolder.relation('mackTask');
                relation.add(newTaskObject);// 建立针对每一个 Todo 的 Relation
                taskFolder.save();// 保存到云端
            });

        }

    }, function (error) {
    });

});

module.exports = router;