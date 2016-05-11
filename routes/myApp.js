/**
 * Created by wujiangwei on 16/5/11.
 */
'use strict';

var router = require('express').Router();
var AV = require('leanengine');
var util = require('./util');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var Todo = AV.Object.extend('Todo');

// 查询 我的App
router.get('/', function(req, res, next) {
    return res.render('myApp');
});


// 新增 我的 App
router.post('/add', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});

// 删除 我的 App
router.post('/delete', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});


// 查询 我的历史记录
router.get('/history', function(req, res, next) {
    res.render('myExchangeHistory')
});

// 新增 我的 历史记录
router.post('/history/add', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});

// 删除 我的 历史记录
router.post('/history/delete', function(req, res, next) {
    var appid = req.body.appid;
    var userid = util.useridInReq(req);

    //TODO:
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/myApp');
        },
        error: function(err) {
            next(err);
        }
    });
});

module.exports = router;