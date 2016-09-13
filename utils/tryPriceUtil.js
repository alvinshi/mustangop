/**
 * Created by wujiangwei on 16/9/13.
 */

//var AV = require('leanengine');

//付费游戏
exports.payAppRmb = function(price){
    return price * 1.3;
};

exports.payAppYCoin = function(price){
    return price * 15;
};

//AS0关键词排名带来的额外 金额
exports.getRankRmb = function(asoRank){
    if(asoRank < 50){
        return 0;
    }
    return (asoRank - 50) * 0.02;
};

exports.needGetRmb = function(needGet){
    return needGet == true ? 0.2 : 0;
};

exports.needThirdLogin = function(registerStatus){
    return registerStatus == 'third' ? 0.1 : 0;
};

exports.needLongComment = function(needLongComment){
    return needLongComment == true ? 0.1 : 0;
};

exports.pointCommentTitle = function(needPoint){
    return needPoint == true ? 0.05 : 0;
};

exports.pointCommentContent = function(needPoint){
    return needPoint == true ? 0.05 : 0;
};