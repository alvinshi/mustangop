/**
 * Created by wujiangwei on 16/5/4.
 */
'use strict';
var router = require('express').Router();
var AV = require('leanengine');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var Todo = AV.Object.extend('Todo');

// 查询 Todo 列表
router.get('/', function(req, res, next) {
    var query = new AV.Query(Todo);
    query.descending('createdAt');
    query.find({
        success: function(results) {

            angular.module('todoTestApp', []).controller('todoCtrl', function($scope) {
                $scope.title = 'todo';
                $scope.todos = results;
            });

        },
        error: function(err) {
            if (err.code === 101) {
                angular.module('todoTestApp', []).controller('todoCtrl', function($scope) {
                    $scope.title = 'Class or object doesn\'t exists.';
                    $scope.todos = [];
                });
            } else {
                next(err);
            }
        }
    });
});

// 新增 Todo 项目
router.post('/', function(req, res, next) {
    var content = req.body.content;
    var todo = new Todo();
    todo.set('content', content);
    todo.save(null, {
        success: function(todo) {
            res.redirect('/todos');
        },
        error: function(err) {
            next(err);
        }
    });
});

module.exports = router;