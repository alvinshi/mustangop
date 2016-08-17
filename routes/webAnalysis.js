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
var messageLogger = AV.Object.extend('messageLogger');
var accountJournal = AV.Object.extend('accountJournal');

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

router.get('/sendEmail', function(req, res){
    var nodemailer = require('nodemailer');

    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport("SMTP",{
        service: 'QQ',
        auth: {
            user: "719480449@qq.com", // 账号
            pass: "kabggqckzbuwbdgi" // 密码
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"野马ASO" <719480449@qq.com>', // sender address
        to: '853914702@qq.com', // list of receivers
        subject: '野马任务审核提醒', // Subject line
        html: '<p>尊敬的野马用户,您今日发布的任务已经有人领取并提交了,请快速到' +
        '<a style="color:red" href="http://www.mustangop.com/taskCheck">审核界面</a>审核提交结果.</p>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            res.json({'errorId': 1});
            return console.log(error);
        }
        else{
            console.log('Message sent: ' + info.response);
            res.json({'errorId': 0});
        }
        transporter.close();
    });
});

router.post('/webData', function(req, res){
    console.log('webData Post');
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
        console.log('tried');
        for (var x in flags){
            if (flags[x] == false){
                return;
            }
        }
        console.log('returned');
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
    })

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
    })

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
