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

router.get('/:appleId', function(req, res) {
    res.render('taskDetailMobile')
});

router.post('/add/:appleId', function(req, res){
    var appleid = req.params.appleId;
    var extUserName = req.body.extUserName;
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate() + ' ' +
        myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();     //获取当前日期

    var query = new AV.Query(mackTaskInfo);
    query.startsWith('excDateStr', myDateStr);
    query.exists('extUserName');
    query.find().then(function(results){
        if (results.length < 1){
            var mackTaskObject = new mackTaskInfo();
            mackTaskObject.set('extUserName', extUserName);
            mackTaskObject.set('excDateStr', myDateStr);
            mackTaskObject.save().then(function(){
                //成功
            })
        }
    });
});

// 新增 做任务详情
router.post('/addTask/:appleId', function(req, res){
    var requirementImg = req.body.requirementImg;

    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate() + ' ' +
        myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();     //获取当前日期

    var query = new AV.Query(mackTaskInfo);
    query.startsWith('excDateStr', myDateStr);
    query.exists('requirementImg');
    query.find().then(function(results){
        if (results.length < 1){
            var mackTaskObject = new mackTaskInfo();
            mackTaskObject.set('requirementImg', [requirementImg]);
            mackTaskObject.save().then(function(){
                //成功
            })
        }
    })

});

module.exports = router;