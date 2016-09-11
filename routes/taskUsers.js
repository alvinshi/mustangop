var express = require('express');
var router = express.Router();
var AV = require('leanengine');
var Base64 = require('../public/javascripts/vendor/base64').Base64;

var tempUserSQL = AV.Object.extend('tempUser');
var mentorRelationSQL = AV.Object.extend('mentorRelation');

//获取用户(若不存在,则自动创建半账号),返回账号相关数据
router.get('/:userCId', function(req, res) {
    var userCId = req.params.userCId;
    //query current day register number
    var tempUserQuery = new AV.Query(tempUserSQL);

    function generateNewUser(){
        console.log('---- generate new user');

        var myDate = new Date();
        var month = parseInt(myDate.getMonth()) + 1;
        var day = parseInt(myDate.getDate());
        var year = myDate.getFullYear().toString();
        var yearStr = year.substring(2, 4);

        //时间唯一标识码(2050前代码无问题)
        //16 + 12 + 31 = 59
        var codePre = (parseInt(yearStr) + month + day).toString();
        var userCode = codePre;

        tempUserQuery.startsWith('userCodeId', codePre);
        tempUserQuery.count().then(function (count) {
            //随机字符
            var chars = ['0','0','0','0','0','0','0','0','0','0',
                'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
                'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

            var tailNum = count/10 + 1; // 至少一位
            //目前最多6位,每天最多新增9999个用户
            for(var i = 2; i < 6 - tailNum - 1; i++){
                var randomCharIndex = Math.floor(Math.random() * chars.length);
                userCode += chars[randomCharIndex];
            }
            userCode += '0' + count;

            console.log('first generate user,code = ' + userCode);

            //create temp account with code
            var newUser = new tempUserSQL();
            newUser.set('userCodeId', userCode);
            newUser.save().then(function(tempUserObject){
                console.log('first generate user succeed, code = ' + userCode);
                res.json({'errorId': 0, 'message': 'auto create account succeed',
                    'userCId': Base64.encode(tempUserObject.id), 'userCode': userCode,
                    'apprenticeMoney': 0, 'withdrawMoney': 0,
                    'totalMoney': 0, 'currentMoney': 0, 'todayMoney':0
                });
            }, function(error){
                console.error('first generate user error, error = ' + error.message);
                res.json({'errorId': error.code, 'message': error.message});
            })

        }, function (error) {
            res.json({'errorId': error.code, 'message': error.message});
        });
    }

    if (userCId == undefined || userCId == 'null' || userCId == 'undefined'){
        //generation header code
        generateNewUser();
    }
    else {
        userCId = Base64.decode(req.params.userCId);
        tempUserQuery.get(userCId).then(function (data) {

            var todayMoney = 0;
            var myDate = new Date();
            var month = (myDate.getMonth() + 1).toString();
            var day = myDate.getDate().toString();
            var yearStr = myDate.getFullYear().toString();
            var todayStr = yearStr + '-' + month + '-' + day;
            var todayMoneyDate = data.get('todayMoneyDate');
            if(todayMoneyDate != todayStr){
                //非当天赚到的钱
                todayMoney = 0;
                data.set('todayMoneyDate', todayStr);
                data.set('todayMoney', 0);
                data.save();
            }

            res.json({'errorId': 0, 'message': 'auto create account succeed',
                'userCId':  Base64.encode(data.id), 'userCode': data.get('userCodeId'),
                'apprenticeMoney': data.get('apprenticeMoney'), 'withdrawMoney': data.get('withdrawMoney'),
                'totalMoney': data.get('totalMoney'), 'currentMoney': data.get('currentMoney'), 'todayMoney': data.get('todayMoney')
            });

        }, function (error) {
            generateNewUser();
            //res.json({'errorId': error.code, 'message': error.message});
        });
    }

    //get unique userCode
});

//绑定手机号(不可解绑)

//绑定支付宝

//申请提现

/*-*********************************************
 *******************师徒关系**********************
 **********************************************-*/
//绑定邀请码
router.post('/bindMaster', function(req, res, next) {
    var userCode = req.body.userCode;
    var masterUserCode = req.body.masterCode;
    if(masterUserCode.length < 5){
        return res.json({'errorId': -2, 'message': 'invite code not right'});
    }

    //query current day register number
    var tempUserQuery = new AV.Query(tempUserSQL);
    tempUserQuery.containedIn('userCodeId', [userCode, masterUserCode]);
    tempUserQuery.find().then(function (userDatas) {

        if(userDatas.length != 2){
            return res.json({'errorId': -1, 'message': 'invite code not exist'});
        }else {
            var masterUserObject, userObject;
            for(var i = 0; i < 2; i++){
                if(userDatas[i].get('userCodeId') == masterUserCode){
                    masterUserObject = userDatas[i];
                }else {
                    userObject = userDatas[i];
                }
            }
            userObject.set('inviteCode', masterUserCode);
            //TODO: userObject increment money

            //建立徒弟层级的关系网
            //建立徒孙层级的关系网(一级即可,暂时不需要,通过数据处理获得相关数据)
            var userRelation = new mentorRelationSQL();
            userRelation.set('masterUserCode', masterUserCode);
            userRelation.set('userCode', userCode);
            userRelation.set('masterUser', masterUserObject);
            userRelation.set('user', userObject);

            AV.Object.saveAll([userObject, userRelation]).then(function(){
                res.json({'errorId': 0, 'message': 'bind master succeed'});
            }, function(error){
                res.json({'errorId': error.code, 'message': error.message});
            });
        }

    }, function (error) {
        res.json({'errorId': error.code, 'message': error.message});
    });
});


//做任务成功,师傅+15%,师祖+3%
exports.taskSucceed = function(userObject, addMoney)
{

};

module.exports = router;
