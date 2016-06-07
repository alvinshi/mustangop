/**
 * Created by cailong on 16/6/7.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

router.get('/', function(req, res) {
    res.render('dailyTask')
});

router.get('daily', function(req, res){
    var userId = util.useridInReq(req);


})

module.exports = router;