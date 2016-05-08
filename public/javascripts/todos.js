/**
 * Created by wujiangwei on 16/5/7.
 */
var AV = require('leanengine');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var Todo = AV.Object.extend('Todo');

//------ Angular

var app=angular.module('todosApp',[]);

app.controller('todosCtrl', function($scope) {

    var query = new AV.Query(Todo);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            $scope.todos = ['1', '2']
        },
        error: function(err) {
            //
        }
    });
});

//------