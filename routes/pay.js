'use strict';
var router = require('express').Router();
var alipay = require('../utils/alipay');
var util = require('./util');

router.post('/', function(req, res) {
    //生成订单号
    var originalOrderId = Date.parse(new Date()) + req.cookies.userIdCookie;
    var out_trade_no = util.encodeStr(originalOrderId);

    var params = {
        //加密的user_id
        user_id: req.cookies.userIdCookie,
        //商户网站订单系统中唯一订单号，必填
        out_trade_no: out_trade_no,
        //订单名称，必填
        subject: req.body.subject,
        // 付款金额，必填
        total_fee: req.body.total_fee,

        //卖家支付宝帐户，必填
        seller_id: req.body.seller_id,
        // 订单描述
        body: req.body.body
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
        //总金额增加
        rechargeUserObject.increment('totalMoney', (chargeMoney + chargeReward) * 10);
        //记录奖励金额
        rechargeUserObject.increment('feedingMoney', chargeReward * 10);
        rechargeUserObject.increment('rechargeRMB', chargeMoney);

        rechargeUserObject.save().then(function() {
            // 充值成功,YB增加成功
            res.json({'errorMsg':'', 'errorId':0, 'message':'充值成功,请刷新个人中心查看最新YB金额'});
        }, function(err) {
            // 充值成功,YB增加失败,请联系客服人员
            // 其他基本没用,不精准
            rechargeUserObject.increment('rechargeFailedRMB', chargeMoney);
            rechargeUserObject.save();

            res.json({'errorMsg':err.message, 'errorId': err.code});
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
