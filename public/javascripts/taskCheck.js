var app=angular.module('yemaWebApp',[]);
var navIndex =3;

app.controller('taskCheckCtrl', function($scope, $http, $location) {
    $scope.noApp = false;
    $scope.myObj = Object();
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
            $scope.noApp = true;
        }
    });


    //************点击左侧条目控制器**********************
    $scope.check = function(app){
        $scope.taskDisplayed = app;
        specTaskCheck(app.taskId);
    }

    //**************  Helper Function *******************
    var specTaskCheck = function(taskId){
        console.log("runned");
        var url = '/taskCheck/specTaskCheck/' + taskId;
        $http.get(url).success(function(response){
            $scope.specTask = response.rtnResults;
            console.log($scope.specTask);
        })
    };

    //***************任务审核动作逻辑**********************

    //*****************确认接收***************************
    $scope.accept = function(entry){
        var entryId = entry.id;
        entry.status = 3;
        var url = '/taskCheck/accept/' + entryId;
        console.log(entryId);
        console.log('request sent');
        $http.post(url).success(function(response){
        })
    }

    //*****************拒绝接收****************************
    $scope.reject = function(entry){
        var entryId = entry.id
        entry.status = 2;
        var url = '/taskCheck/reject/' + entryId;
        console.log(entryId);
        console.log('request sent');
        console.log($scope.myObj.rejectReason);
        var reject_reason = {'rejectReason': $scope.myObj.rejectReason};
        $http.post(url, reject_reason).success(function(response){
        })
    }
});
