/**
 * Created by wujiangwei on 16/5/8.
 */
'use strict';
var express = require('express');
var router = express.Router();
var AV = require('leanengine');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('api home')
    //res.sendFile('./views/index.html');
});





//test code
router.get('/test/todos', function(req, res, next) {

    var Todo = AV.Object.extend('Todo');

    var query = new AV.Query(Todo);
    query.descending('createdAt');
    query.find({
        success: function(results) {
            var todos = new Array()
            for (var i = 0; i < results.length; i++)
            {
                todos[i] = results[i].get('content')
            }

            res.json({'todos':todos, 'title':'Api Todo'})
        },
        error: function(err) {
            if (err.code === 101) {

                res.json({'title':'101 Error'})
                res.render('todos', {
                    title: 'TODO 列表',
                    todos: []
                });
            } else {
                next(err);
            }
        }
    });
});


module.exports = router;
