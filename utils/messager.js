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

//*************** User数据库请求冻结金额和总额 ******************
function getAccountInfo(userId, callBack){
    var query = new AV.Query(User)
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
//*********************** 发消息 *****************************
//赠送
function sendBonusMsg(reason, amount, userId){
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
        var msg = reason + ',获得' + parseInt(amount) + 'Y币, ';

        //消息转换成html
        var msgElement = messageWrapper(msg);

        //保存信息
        var newMsgObject = new messageObject();
        var receiverObject = new User();
        receiverObject.set('objectId', accountInfo['userId']);
        newMsgObject.set('receiverObject', receiverObject);
        newMsgObject.set('messageText', msg);
        newMsgObject.set('messageHtml', msgElement);
        newMsgObject.save().then(function(){
            return ({'errorId': 0, 'errorMsg': ''});
        })
    })
}