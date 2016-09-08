/**
 * Created by wujiangwei on 16/8/31.
 */
var express = require('express');
var router = express.Router();
var AV = require('leanengine');
var Base64 = require('../public/javascripts/vendor/base64').Base64;

var tempUserSQL = AV.Object.extend('tempUser');
var doTaskInfoSQL = AV.Object.extend('doTaskInfo');
var releaseTaskSQL = AV.Object.extend('releaseTaskObject');

//任务到小马的过滤策略
//1.发布任务大于10,剩下的任务全部到小马中
var funnelExcCount = 10;
//2.下午3Pm后,2端任务同时进行
var funnelHour = 15;

function taskObjectToDic(taskObject, isOpen){
    if(taskObject != undefined || taskObject.get('appObject') != undefined){
        var taskDic = Object();
        var appObject = taskObject.get('appObject');
        if(appObject == undefined){
            return undefined;
        }

        taskDic.appIcon = appObject.get('artworkUrl100');
        taskDic.appName = appObject.get('trackName');
        var priceStr = appObject.get('formattedPrice');
        if(priceStr != '免费'){
            taskObject.appPrice = priceStr;
        }

        if(isOpen == true){
            taskDic.remainCount = taskObject.get('remainCount');
        }else {
            //maybe negative
            taskDic.remainCount = taskObject.get('remainCount') - funnelExcCount;
        }
        taskDic.doTaskPrice = appObject.get('doTaskPrice');
        if(taskDic.doTaskPrice == undefined){
            taskDic.doTaskPrice = appObject.get('rateUnitPrice')/10 * 0.4;
        }

        //正在做的任务
        taskDic.doingCount = appObject.get('doingCount');

        taskDic.taskExtraDemands = appObject.get('taskExtraDemands');//Array

        return taskDic;
    }

    return undefined;
}

//获取任务大厅任务
router.get('/:type/:userCId/:page', function(req, res, next) {
    var userCId = Base64.decode(req.params.userCId);
    var page = req.params.page;
    var type = req.params.type; //1下载 2评论
    var taskType;
    if(type == 1){
        taskType = '下载'
    }else if(type == 2){
        taskType = '评论'
    }
    if (userCId == undefined){
        //generation header code
        res.json({'errorId': -1, 'message': 'not register user'});
    }
    else {
        var tempUserQuery = new AV.Query(tempUserSQL);
        tempUserQuery.get(userCId).then(function (userTempObject) {

            //获取用户做过的任务(1个App同一版本用户只能做一次)
            //doTaskInfoSQL 都是有效任务(含有效锁定和已做过)
            var doTaskQuery = new AV.Query(doTaskInfoSQL);
            doTaskQuery.equalTo('userTempObject', userTempObject);
            doTaskQuery.notEqualTo('status', 'expired');
            //最新1000个即可(模糊精准)
            doTaskQuery.descending('createdAt');
            doTaskQuery.limit(1000);

            var releaseTaskQuery = new AV.Query(releaseTaskSQL);
            releaseTaskQuery.doesNotMatchKeyInQuery('excUniqueCode', 'excUniqueCode', doTaskQuery);
            var myDate = new Date();
            //需要当天的任务才可以
            if(myDate.getHours() <= funnelHour) {
                releaseTaskQuery.greaterThanOrEqualTo('excCount', 10);
            }
            if(taskType != undefined){
                releaseTaskQuery.equalTo('taskType', taskType);
            }

            var pageCount = 20;
            releaseTaskQuery.include('appObject');
            releaseTaskQuery.skip(page * pageCount);
            releaseTaskQuery.limit(pageCount);
            releaseTaskQuery.descending('remainCount');
            releaseTaskQuery.find().then(function(datas){

                var retArray = Array();
                for(var i = 0; i < datas.length; i++){
                    var taskInfo = taskObjectToDic(datas[i], myDate.getHours() >= funnelHour);
                    if(taskInfo != undefined){
                        retArray.push(taskInfo);
                    }
                }
                res.json({'errorId': 0, 'message': '', 'tasks': retArray});

            }, function(error){
                res.json({'errorId': error.code, 'message': error.message});
            });

            //task check

        }, function (error) {
            res.json({'errorId': error.code, 'message': error.message});
        });
    }

    //get unique userCode
});

//锁定任务(30分钟),定时器,30分钟后,看任务有没有做完,未作完,则释放锁,删除相关数据
//获取任务大厅任务
router.post('/lockTask', function(req, res, next) {
    var userCId = Base64.decode(req.body.userCId);
    var taskId = req.body.taskId;

    var releaseTaskQuery = new AV.Query(releaseTaskSQL);
    releaseTaskQuery.get(taskId).then(function(taskObject){

        var doTaskQuery = new AV.Query(doTaskInfoSQL);
        var userTempObject = new tempUserSQL();
        userTempObject.id = userCId;
        doTaskQuery.equalTo('userTempObject', userTempObject);
        doTaskQuery.equalTo('taskObject', taskObject);
        doTaskQuery.find().then(function(datas){
            if(datas.length > 0){
                //任务曾今做过/锁定未过期
                return res.json({'errorId': -1, 'message': 'task is done or locked'});
            }

            var doTaskLockObject = new doTaskInfoSQL();
            doTaskLockObject.set('userTempObject', userTempObject);
            doTaskLockObject.set('taskObject', taskObject);
            doTaskLockObject.set('status', 'locked');

            taskObject.increment('doingCount', 1);
            taskObject.increment('remainCount', -1);

            AV.Object.SaveAll([taskObject, doTaskLockObject]).then(function(avobjs){
                //30min timer 超时
                setTimeout(unlockTaskIfNeeded, 1000*60*30, taskId);
                var doTaskId;
                for (var i = 0; i < avobjs.length; i++){
                    if(avobjs[i].id != taskObject.id){
                        doTaskId = avobjs[i].id;
                    }
                }

                res.json({'errorId': 0, 'message': 'lock task succeed', 'lockId': doTaskId});
            }, function(error){
                res.json({'errorId': error.code, 'message': error.message});
            });

        }, function(error){
            res.json({'errorId': error.code, 'message': error.message});
        });

    }, function(error){
        res.json({'errorId': error.code, 'message': error.message});
    });

});

//超时后核实锁定任务
function unlockTaskIfNeeded(lockTaskId){
    return unlockTaskWithRes(lockTaskId, undefined);
}

function unlockTaskWithRes(lockTaskId, res){
    var doTaskQuery = new AV.Query(doTaskInfoSQL);
    doTaskQuery.include('taskObject');
    doTaskQuery.get(lockTaskId).then(function(doTaskObject){
        var images = doTaskObject.get('taskImages');
        //必须有任务截图和状态机的改变
        if(images == undefined || images.length == 0 || doTaskObject.get('status') == 'locked'){
            //任务超时,未做,清除锁定任务
            var taskObject = doTaskObject.get('taskObject');
            taskObject.increment('doingCount', -1);
            taskObject.increment('remainCount', 1);

            //锁定任务超时,做记录
            doTaskObject.set('status', 'expired');

            AV.Object.SaveAll([taskObject, doTaskObject]).then(function(){
                console.info('user ' + doTaskObject.get('userTempObject').id + ' unlock task ' + lockTaskId + ' succeed');

                if(res != undefined){
                    res.json({'errorId': 0, 'message': 'unlock succeed'});
                }
            }, function(error){
                console.error('---------- user ' + doTaskObject.get('userTempObject').id + ' unlock task ' + lockTaskId + ' failed');

                //unlock again
                //5min timer 超时(姑且继续执行)
                setTimeout(unlockTaskIfNeeded, 1000*60*5, lockTaskId);
                if(res != undefined) {
                    res.json({'errorId': error.code, 'message': error.message});
                }
            });
        }
    }, function (error) {
        if(res != undefined) {
            res.json({'errorId': error.code, 'message': error.message});
        }
    });
}

//放弃锁定任务
router.post('/unlockTask', function(req, res, next) {
    var unLockTaskId = req.body.unLockTaskId;
    unlockTaskWithRes(unLockTaskId, res);
});

//任务详情 + 用户的任务状态
router.get('/:userCId/:taskId', function(req, res, next) {
    var userCId = Base64.decode(req.params.userCId);
    var taskId = req.params.taskId;


});

module.exports = router;
