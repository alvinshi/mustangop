/**
 * Created by tanghui on 16/5/31.
 */
'use strict';
var router = require('express').Router();
var util = require('./util');

// 查询 我的App
router.get('/:htmlName', function(req, res) {
    var htmlName = req.params.htmlName;
    return res.render(htmlName);
});

module.exports = router;