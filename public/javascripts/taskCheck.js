var app=angular.module('yemaWebApp',[]);
var navIndex =3;

app.controller('taskCheckCtrl', function($scope, $http, $location) {

    //**************得到左侧控制器条目*******************
    var taskUrl = '/taskCheck/taskAudit';
    $http.get(taskUrl).success(function(response){
        $scope.taskAudit = response.taskAudit;
        if ($scope.taskAudit.length > 0){
            //初始显示返回的第一个
            $scope.taskDisplayed = $scope.taskAudit[0];
            //获取左侧信息
            specTaskCheck($scope.taskDisplayed.taskId);
        }
        else {
            //如果没有返回值, 需要在前端显示按钮
            $scope.taskDisplayed = undefined;
        }
    });


    //************点击左侧条目控制器**********************
    $scope.check = function(app){
        $scope.taskDisplayed = app;
        specTaskCheck(app.taskId);
    }

    //**************  Helper Function *******************
    var specTaskCheck = function(taskId){
        var url = '/taskCheck/specTaskCheck/' + taskId;
        $http.get(url).success(function(response){
            $scope.specTask = response.rtnResults;
            console.log($scope.specTask);
        })
    };
});
