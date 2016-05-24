'use strict';
var domain = require('domain');
var express = require('express');
var path = require('path');
var ejs = require('ejs');
var fs= require('fs')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multipart = require('connect-multiparty');
var cloud = require('./cloud');


// 挂载子路由
var todos = require('./routes/todos');//demo
var api = require('./routes/api')//for html js api request
var users = require('./routes/users')//user account and info center
var userapps = require('./routes/myApp')//user app related center

var app = express();

// 上传文件
var multipartMiddleware = multipart();
app.post('/upload', multipartMiddleware, function(req, resp) {
  console.log(req.body, req.files);
  // don't forget to delete all req.files when done
});

// 设置 view 引擎
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', ejs.__express);
app.set('view engine', 'html');
app.use(express.static('public'));

// 加载云代码方法
app.use(cloud);

// 使用 LeanEngine 中间件
// （如果没有加载云代码方法请使用此方法，否则会导致部署失败，详细请阅读 LeanEngine 文档。）
// app.use(AV.Cloud);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 未处理异常捕获 middleware
app.use(function(req, res, next) {
  var d = null;
  if (process.domain) {
    d = process.domain;
  } else {
    d = domain.create();
  }
  d.add(req);
  d.add(res);
  d.on('error', function(err) {
    console.error('uncaughtException url=%s, msg=%s', req.url, err.stack || err.message || err);
    if(!res.finished) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=UTF-8');
      res.end('uncaughtException');
    }
  });
  d.run(next);
});

//test start

function routeHasPrefix(originalUrl, judgeArray){
  for (var i = 0; i < judgeArray.length; i++){
    var judgeStr = judgeArray[i];
    if (originalUrl.length >= judgeStr.length) {
      var judgePre = originalUrl.substr(0, judgeStr.length);
      if (judgePre == judgeStr) {
        return true;
      }
    }
  }

  return false;
}

// 没有挂载路径的中间件，应用的每个请求都会执行该中间件
app.use(function (req, res, next) {
  console.log('Time:', Date.now());

  var loginWhiteList  = new Array();
  loginWhiteList[0] = "/user";
  var needLogin = !routeHasPrefix(req.originalUrl, loginWhiteList);
  console.log(needLogin);
  //不是主页,也不是以白名单开头的网页,则是需要用户先登陆的网站
  if (req.originalUrl.length > 1 && needLogin){
    //获取cookie的值
    var encodeUserId = req.cookies.userIdCookie;

    //鉴别cookie是否存在
    if ('undefined' === (typeof req.cookies.userIdCookie)){
      res.render('login');
    }else {
      if (encodeUserId.length > 0){
        next();
      }else {
        res.render('login');
      }
    }
  }else {
    next();
  }


});

// angular 测试
app.get('/test/angular', function(req, res) {
    res.render('testAngular');
});
//end test

app.get('/', function(req, res) {
  res.render('index', { currentTime: new Date() });
});

app.get('/userProtocol', function(req, res) {
  res.render('userProtocol');
});


// 可以将一类的路由单独保存在一个文件中
app.use('/todos', todos);

app.use('/api', api);
app.use('/user', users);
app.use('/myapp', userapps);


// 如果任何路由都没匹配到，则认为 404
// 生成一个异常让后面的 err handler 捕获
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) { // jshint ignore:line
    var statusCode = err.status || 500;
    if(statusCode === 500) {
      console.error(err.stack || err);
    }
    res.status(statusCode);
    res.render('error', {
      message: err.message || err,
      error: err
    });
  });
}

// 如果是非开发环境，则页面只输出简单的错误信息
app.use(function(err, req, res, next) { // jshint ignore:line
  res.status(err.status || 500);
  res.render('error', {
    message: err.message || err,
    error: {}
  });
});

module.exports = app;