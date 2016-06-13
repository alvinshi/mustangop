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

function addTaskDetail(res, appExcObject, hisAppId, hisAppInfo){
    var myDate = new Date();
    var myDateStr = myDate.getFullYear() + '-' + (parseInt(myDate.getMonth())+1) + '-' + myDate.getDate() + ' ' +
        myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();     //获取当前日期



}

// 新增 做任务详情
router.post('/addTask/:appleId', function(req, res){
    var hisAppId = req.params.appleId;

});

module.exports = router;