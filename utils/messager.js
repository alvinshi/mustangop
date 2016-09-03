/**
 * Created by Shi Xiang on 8/24/16.
 */
var AV = require('leanengine');
var User = AV.Object.extend('_User');
var messageObject = AV.Object.extend('messageObject');

//*************** CSS 装饰 Helper Function *******************
function messageWrapper(messageText){
    return messageText;

    //不是这种转换,如果需要某些细节格式时,转换
    var style = 'style = "font-size: 12px; color: #333333"';
    return '<span ' + style + '>' + messageText + '/span>';
}

//*************** 其它Helper Function ***********************

//保存信息
function saveMsg (receiverObject, msg, msgElement, msgType){
    var newMsgObject = new messageObject();
    newMsgObject.set('receiverObject', receiverObject);
    newMsgObject.set('messageText', msg);
    newMsgObject.set('messageHtml', msgElement);
    newMsgObject.set('type', msgType);

    //账户变化
    if(receiverObject.get('totalMoney') != undefined){
        newMsgObject.set('totalMoney', receiverObject.get('totalMoney'));
    }
    if(receiverObject.get('freezingMoney') != undefined) {
        newMsgObject.set('freezingMoney', receiverObject.get('freezingMoney'));
    }
    if(receiverObject.get('feedingMoney') != undefined) {
        newMsgObject.set('feedingMoney', receiverObject.get('feedingMoney'));
    }

    newMsgObject.save().then(function(){
        return ({'errorId': 0, 'errorMsg': ''});
    }, function(error){
        console.error('Y Coin save error' + error.message);
    })
}

//*************** User数据库请求冻结金额和总额 ******************
 function getAccountInfo(userId, callBack){
    var query = new AV.Query(User);
    query.get(userId).then(function(userObject){
        if (userObject != undefined){
            callBack(userObject);
        }
    },function(error){
        console.error('user Y Coin Flow error:' + error.message);
    })
}

//*********************** 生成消息 *****************************
//奖励
exports.bonusMsg = function (reason, amount, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        //拼接消息
        var msg = reason + ',获得' + parseInt(amount) + 'Y币';

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(accountInfo, msg, msgElement, '奖励');
    })
};

//充值
exports.topUpMsg = function (money, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        //拼接消息
        var msg = '恭喜您成功充值了' + parseInt(money) + '元，获得' + parseInt(Ycoin) + 'Y币';

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(accountInfo, msg, msgElement, '充值');
    })
};

//冻结
exports.freezeMsg = function (appName, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        //拼接消息
        var msg = '你成功发布了任务(' + appName + '), 共冻结' + parseInt(Ycoin) + 'Y币,';

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(accountInfo, msg, msgElement, '冻结');
    })
};

//解冻
exports.unfreezeMsg = function (text, Ycoin, userId, needMoneyInfo){

    //请求服务器
    if(needMoneyInfo == 1){
        getAccountInfo(userId, function(accountInfo){
            //拼接消息
            var msg = text + ', 解冻' + parseInt(Ycoin) + 'Y币';
            //消息转换成html
            var msgElement = messageWrapper(msg);

            //保存信息
            saveMsg(accountInfo, msg, msgElement, '解冻');
        })
    }else {
        //拼接消息
        var msg = text + ', 解冻' + parseInt(Ycoin) + 'Y币';
        //消息转换成html
        var msgElement = messageWrapper(msg);

        var userObject = new User();
        userObject.id = userId;
        //保存信息
        saveMsg(userObject, msg, msgElement, '解冻');
    }

};

//扣罚
exports.penaltyMsg = function (appName, Ycoin, userId){
    var userObject = new User();
    userObject.id = userId;

    var msg = '您领取的' + appName + '未完成, 扣罚' + parseInt(Ycoin) + 'Y币';
    //消息转换成html
    var msgElement = messageWrapper(msg);

    //保存信息
    saveMsg(userObject, msg, msgElement, '扣罚');
};

//赚取
exports.earnMsg = function (taskEarnInfo, Ycoin, userId, needMoneyInfo){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    if(needMoneyInfo == 1){
        getAccountInfo(userId, function(accountInfo){
            //拼接消息
            var msg = taskEarnInfo + ', 获得了' + parseInt(Ycoin) + 'Y币';

            //消息转换成html
            var msgElement = messageWrapper(msg);

            //保存信息
            saveMsg(accountInfo, msg, msgElement, '赚取');
        })
    }else {
        //拼接消息
        var msg = taskEarnInfo + ', 获得了' + parseInt(Ycoin) + 'Y币';
        //消息转换成html
        var msgElement = messageWrapper(msg);

        var userObject = new User();
        userObject.id = userId;
        //保存信息
        saveMsg(userObject, msg, msgElement, '赚取');
    }

};

//支付
exports.payMsg = function (taskPayInfo, Ycoin, userId, needMoneyInfo){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    if(needMoneyInfo == 1){
        //请求服务器
        getAccountInfo(userId, function(accountInfo){
            //拼接消息
            var msg = taskPayInfo + ', 支付' + parseInt(Ycoin) + 'Y币';

            //消息转换成html
            var msgElement = messageWrapper(msg);

            //保存信息
            saveMsg(accountInfo, msg, msgElement, '支付');
        })
    }else {
        //拼接消息
        var msg = taskPayInfo + ', 支付' + parseInt(Ycoin) + 'Y币';
        //消息转换成html
        var msgElement = messageWrapper(msg);

        var userObject = new User();
        userObject.id = userId;
        //保存信息
        saveMsg(userObject, msg, msgElement, '支付');
    }
};

//通用信息
//暂不支持使用
function genericMsg(text, userId, msgType){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        //生成账户余额字符串
        function accountInfoToStr(accountInfo){
            var freezingStat = '冻结账户为' + parseInt(accountInfo['freezingMoney']) + 'Y币, ';
            var accountStat = '账户余额为' + parseInt(accountInfo['totalMoney']) + 'Y币';
            return freezingStat + accountStat;
        }

        //拼接消息
        var msg = text + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, msgType);
    })
}