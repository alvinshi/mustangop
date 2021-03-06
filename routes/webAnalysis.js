/**
 * Created by apple on 8/16/16.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');


var User = AV.Object.extend('_User');
var releaseTaskObject = AV.Object.extend('releaseTaskObject');
var receiveTaskObject = AV.Object.extend('receiveTaskObject');
var mackTaskInfo = AV.Object.extend('mackTaskInfo');

function sameDate(date1, date2){
    if (date1.getFullYear() == date2.getFullYear() &&
        date1.getMonth() == date2.getMonth() &&
        date1.getDate() == date2.getDate()){
        return true;
    }
    else return false;
}

function pushIntoArray(array, newItem){
    for (var i = 0; i < array.length; i++){
        if (array[i] == newItem){
            return;
        }
    }
    array.push(newItem);
    return;
}


router.get('/', function(req, res) {
    res.render('webAnalysis');
});

router.post('/webData', function(req, res){

    //BUGBUG 不准确数据

    //console.log('webData Post');
    var timePosted = req.body.currentTime;
    var currentTime = new Date();
    var fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    //currentTime.setDate(currentTime.getDate() - 5);


    //需要返回的数据
    var totalUsers = 0;

    var totalReleaseTaskToday = 0;
    var totalReleaseTaskAmountToday = 0;
    var releaseTaskUserIds = [];

    var totalReceiveTaskToday = 0;
    var totalReceiveTaskAmountToday = 0;
    var receiveTaskUserIds = [];
    var totalReceiveTaskError = 0;

    //query结束标示
    var flags = {};
    flags['userFlag'] = false;
    flags['releaseTaskFlag'] = false;
    flags['receiveTaskFlag'] = false;


    //数据返回测试
    function rtnJson(){
        //console.log('tried');
        for (var x in flags){
            if (flags[x] == false){
                return;
            }
        }
        //console.log('returned');
        res.json({'errorId': 0, 'errorMsg':'',
            'totalUsers': totalUsers,
            'totalReleaseTaskToday': totalReleaseTaskToday,
            'totalReleaseTaskAmountToday':totalReleaseTaskAmountToday,
            'releaseTaskUserIds':releaseTaskUserIds,

            'totalReceiveTaskToday': totalReceiveTaskToday,
            'totalReceiveTaskAmountToday': totalReceiveTaskAmountToday,
            'receiveTaskUserIds': receiveTaskUserIds,
            'totalReceiveTaskError':totalReceiveTaskError});
    }

    var userQuery = new AV.Query(User);
    userQuery.count().then(function(count){
        totalUsers = count;
        flags['userFlag'] = true;
        rtnJson();
    });

    var releaseTaskQuery = new AV.Query(releaseTaskObject);
    releaseTaskQuery.greaterThanOrEqualTo('createdAt', fiveDaysAgo);
    releaseTaskQuery.limit(1000);
    releaseTaskQuery.include('userObject');
    releaseTaskQuery.find().then(function(tasks){
        for (var i = 0; i < tasks.length; i++){
            var createdAt = tasks[i].createdAt;
            if (sameDate(createdAt, currentTime)){
                totalReleaseTaskToday++;
                totalReleaseTaskAmountToday += tasks[i].get('excCount');
                var userId = tasks[i].get('userObject').id;
                pushIntoArray(releaseTaskUserIds, userId)
            }
        }
        flags['releaseTaskFlag'] = true;
        rtnJson();
    });

    var receiveTaskQuery = new AV.Query(receiveTaskObject);
    receiveTaskQuery.greaterThanOrEqualTo('createdAt', fiveDaysAgo);
    receiveTaskQuery.limit(1000);
    receiveTaskQuery.include('userObject');
    receiveTaskQuery.find().then(function(tasks){
        for (var i = 0; i < tasks.length; i++){
            var createdAt = tasks[i].createdAt;
            if (sameDate(createdAt, currentTime)){
                if (tasks[i].get('receiveCount') != undefined){
                    totalReceiveTaskToday++;
                    totalReceiveTaskAmountToday += tasks[i].get('receiveCount');
                    var userId = tasks[i].get('userObject').id;
                    pushIntoArray(receiveTaskUserIds, userId)
                }
                else {totalReceiveTaskError++;}
            }
        }
        console.log(totalReceiveTaskAmountToday);
        flags['receiveTaskFlag'] = true;
        rtnJson();
    })
});

module.exports = router;
