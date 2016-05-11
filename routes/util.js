/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';
var Base64 = require('../public/javascripts/vendor/base64').Base64;

exports.useridInReq = function(req){
    //获取cookie的值,进行解密
    var encodeUserId = req.cookies.userIdCookie;
    return Base64.decode(encodeUserId);
};
