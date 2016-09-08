'use strict';
var router = require('express').Router();

var alipay = require('../utils/alipay');
var messager = require('../utils/messager');

var AV = require('leanengine');
var util = require('./util');

var User = AV.Object.extend('_User');

router.post('/:chargeMoney', function(req, res) {
    var chargeMoney = req.params.chargeMoney;
    var username = req.cookies.username;
    var total_fee = chargeMoney;
    var body = username + '充值YB——' + '付款金额RMB:' + chargeMoney;
    var subject = '购买至少' + parseInt(chargeMoney)*10 + 'Y币';

    //生成订单号
    var originalOrderId = Date.parse(new Date()) + req.cookies.userIdCookie;
    var out_trade_no = util.encodeStr(originalOrderId);

    var params = {
        //加密的user_id
        extra_common_param: req.cookies.userIdCookie,
        //商户网站订单系统中唯一订单号，必填
        out_trade_no: out_trade_no,
        //订单名称，必填
        subject: subject,
        // 付款金额，必填
        total_fee: total_fee,

        // 订单描述
        body: body
        // 商品展示地址
        //需以http://开头的完整路径，例如：http://www.商户网址.com/myorder.html
        //show_url: req.body.show_url
    };
    var html = alipay.getDirectPayReqHtml(params, 'get');
    res.send(html);
});

router.get('/return', function(req, res) {
    console.log('return query: ', req.query);
    alipay.verify(req.query, function(err, result) {
        console.log('result: ', err, result);
        if (err) {
            return res.send('err: ' + err);
        }
        //充值成功
        //TODO 从query中获取参数
        var chargeMoney = parseFloat(req.query.total_fee);//获取充值的金额
        var chargeUserId = util.decodeUserId(req.query.extra_common_param);//充值的用户
        var aliOrderId = req.query.trade_no;//订单号

        var rechargeHistorySQL = AV.Object.extend('rechargeHistory');

        function chargeUser(){

            var chargeRMB = [30, 100, 500, 1000, 3000];
            var chargeRewardYB = [0, 10, 70, 200, 700];

            var chargeReward = 0;
            for (var i = 0; i < chargeRMB.length; i++){
                if(chargeMoney == chargeRMB[i]){
                    chargeReward = chargeRewardYB[i];
                    break;
                }
            }

            var rechargeUserObject = new AV.User();
            rechargeUserObject.id = chargeUserId;
            var addYB = (chargeMoney + chargeReward) * 10;
            //总金额增加
            rechargeUserObject.increment('totalMoney', addYB);
            //记录奖励金额
            rechargeUserObject.increment('feedingMoney', chargeReward * 10);
            rechargeUserObject.increment('rechargeRMB', chargeMoney);

            var rechargeHistoryObject = new rechargeHistorySQL();
            rechargeHistoryObject.set('chargeUserId', chargeUserId);
            rechargeHistoryObject.set('aliOrderId', aliOrderId);
            rechargeHistoryObject.set('chargeMoney', chargeMoney);
            rechargeHistoryObject.set('chargeReward', chargeReward);

            AV.Object.saveAll([rechargeUserObject, rechargeHistoryObject]).then(function() {
                // 充值成功,YB增加成功
                messager.topUpMsg(chargeMoney, addYB, chargeUserId);

                //暂时只有99才可以
                if(chargeMoney == 99){
                    var query = new AV.Query(User);
                    query.get(chargeUserId).then(function(userObject){
                        if(userObject.get('firstRecharge') == undefined || userObject.get('firstRecharge') == 0){
                            var firstBoundsYCoin = 990;
                            //首充奖励
                            userObject.increment('totalMoney', firstBoundsYCoin);
                            //记录奖励金额
                            userObject.increment('feedingMoney', firstBoundsYCoin);
                            userObject.set('firstRecharge', chargeMoney);
                            userObject.save().then(function(){
                                messager.bonusMsg('首次充值任务完成', firstBoundsYCoin, chargeUserId);
                            }, function(error){
                                console.error('first recharge bounds error ' + error.message);
                            });

                            res.json({'errorMsg':'', 'errorId':0, 'message':'充值成功,获得' + addYB + 'YB,首次充值奖励' + firstBoundsYCoin + '币,请刷新个人中心查看最新YB金额'});
                        }else {
                            res.json({'errorMsg':'', 'errorId':0, 'message':'充值成功,获得' + addYB + 'YB,请刷新个人中心查看最新YB金额'});
                        }
                    },function(error){
                        console.error('首充奖励失败:' + error.message);
                        res.json({'errorMsg':'', 'errorId':0, 'message':'充值成功,获得' + addYB + 'YB,请刷新个人中心查看最新YB金额'});
                    });
                }else {
                    //默认充值
                    res.json({'errorMsg':'', 'errorId':0, 'message':'充值成功,获得' + addYB + 'YB,请刷新个人中心查看最新YB金额'});
                }
            }, function(err) {
                // 充值成功,YB增加失败,请联系客服人员
                // 其他基本没用,不精准
                rechargeUserObject.increment('rechargeFailedRMB', chargeMoney);
                rechargeUserObject.save();

                res.json({'errorMsg':'充值成功,增加Y币失败(error),联系QQ768826903,为你恢复充值的Y币', 'errorId': err.code});
            });
        }

        //查询充值记录
        var rechargeQuery = new AV.Query(rechargeHistorySQL);
        // 查询有没有被充值过
        rechargeQuery.equalTo('aliOrderId', aliOrderId);
        rechargeQuery.equalTo('chargeUserId', chargeUserId);
        rechargeQuery.descending('createdAt');
        rechargeQuery.find().then(function(rechargeObjectList) {
            if(rechargeObjectList.length == 0){
                chargeUser();
            }else {
                //重复的支付宝回调
                res.json({'errorMsg':'已经成功充值', 'errorId': 0});
            }
        }, function (error) {
            chargeUser();
        });
    });
});

router.post('/notify', function(req, res) {
    console.log('notify params:', req.params);
    alipay.verify(req.params, function(err, result) {
        console.log('result: ', err, result);
        if (err) {
            return res.send('err: ' + err);
        }
        return res.send('验证结果: ' + result);
    });
});

module.exports = router;
