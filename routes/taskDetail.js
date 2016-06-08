/**
 * Created by cailong on 16/6/8.
 */

'use strict';
var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');
var https = require('https');

router.get('/', function(req, res){
    res.render('taskDetail')
});

module.exports = router;