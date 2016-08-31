/**
 * Created by Shi Xiang on 8/24/16.
 */
var AV = require('leanengine');
var User = AV.Object.extend('_User');
var messageObject = AV.Object.extend('messageObject');
//*************** CSS 装饰 Helper Function *******************
function messageWrapper(messageText){
    var style = 'style = "font-size: 12px; color: #333333"';
    return '<span ' + style + '>' + messageText + '/span>';
}

//*************** 其它Helper Function ***********************
//生成账户余额字符串
function accountInfoToStr(accountInfo){
    var freezingStat = '冻结账户为' + parseInt(accountInfo['freezingMoney']) + 'Y币, ';
    var accountStat = '账户余额为' + parseInt(accountInfo['totalMoney']) + 'Y币';
    return freezingStat + accountStat;
}

//保存信息
function saveMsg(userId, msg, msgElement, msgType){
    var newMsgObject = new messageObject();
    var receiverObject = new AV.User();
    receiverObject.id = accountInfo['userId'];
    newMsgObject.set('receiverObject', receiverObject);
    newMsgObject.set('messageText', msg);
    newMsgObject.set('messageHtml', msgElement);
    newMsgObject.set('type', msgType);
    newMsgObject.save().then(function(){
        return ({'errorId': 0, 'errorMsg': ''});
    })
}

//*************** User数据库请求冻结金额和总额 ******************
function getAccountInfo(userId, callBack){
    var query = new AV.Query(User);
    query.get(userId).then(function(userObject){
        if (userObject == undefined){
            return ({'errorId': 1, 'errorMsg': '数据库没有此用户'});
        }
        var totalMoney = userObject.get('totalMoney');
        var freezingMoney = userObject.get('freezingMoney');
        var userQQ = userObject.get('userQQ');
        callBack({'errorId': 0, 'errorMsg': '',
            'totalMoney': totalMoney, 'freezingMoney': freezingMoney,
            'userQQ': userQQ, 'userId': userId});
    })
}
//*********************** 生成消息 *****************************
//赠送
function bonusMsg(reason, amount, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = reason + ',获得' + parseInt(amount) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '赠送');
    })
}

//充值
function topUpMsg(money, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = '恭喜您成功充值了' + parseInt(money) + '元，获得' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '充值');
    })
}

//冻结
function freezeMsg(appName, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = '你成功发布了' + appName + '的任务, 冻结' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '冻结');
    })
}

//解冻
function unfreezeMsg(text, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = text + ', 冻结' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '解冻');
    })
}

//扣罚
function penaltyMsg(appName, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = '您领取的' + appName + '未完成, 扣罚' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '扣罚');
    })
}

//赚取
function earnMsg(appName, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = appName + '接受了您提交的任务结果, 您获得了' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '赚取');
    })
}

//支付
function payMsg(taskTaker, Ycoin, userId){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = '您接受了' + taskTaker + '提交的任务结果，支付' + parseInt(Ycoin) + 'Y币, ' + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, '支付');
    })
}

//通用信息
function genericMsg(text, userId, msgType){
    //判断userId是object还是string
    if (typeof userId === 'object'){
        userId = userId.id;
    }

    //请求服务器
    getAccountInfo(userId, function(accountInfo){
        if (accountInfo['errorId'] != 0){
            return ({'errorId': 1, 'errorMsg': accountInfo['errorMsg']})
        }

        //拼接消息
        var msg = text + accountInfoToStr(accountInfo);

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        saveMsg(userId, msg, msgElement, msgType);
    })
}