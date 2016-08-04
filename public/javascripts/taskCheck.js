var app=angular.module('yemaWebApp',[]);
var navIndex =3;

app.controller('taskCheckCtrl', function($scope, $http, $location) {
    $scope.currentTaskId = undefined;
    $scope.noApp = false;
    $scope.myObj = Object();
    //**************得到左侧控制器条目*******************
    var taskUrl = '/taskCheck/taskAudit';
    $http.get(taskUrl).success(function(response){
        $scope.taskAudit = response.taskAudit;
        if ($scope.taskAudit.length > 0){
            //初始显示返回的第一个
            $scope.taskIndex = 0;
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
    $scope.check = function(app, index){
        $scope.taskIndex = index;
        $scope.taskDisplayed = app;
        specTaskCheck(app.taskId);
    }

    //**************  Helper Function *******************
    var specTaskCheck = function(taskId){
        $scope.currentTaskId = taskId;
        var url = '/taskCheck/specTaskCheck/' + taskId;
        $http.get(url).success(function(response){
            $scope.specTask = response.rtnResults;
        })
    };

    //***************撤销任务逻辑************************
    $scope.confirmCancel = function(taskId){
        var url = '/taskCheck/cancelTask/' + taskId;
        console.log(taskId);
        $http.get(url).success(function(response){
            location.reload();
        })
    };

    //***************任务审核动作逻辑**********************

    //*****************确认接收***************************
    $scope.checkText = function () {
        if ($scope.myObj.rejectReason.length >20) {
            $scope.myObj.rejectReason = $scope.myObj.rejectReason.substr(0,20);
        }
    };




    $scope.accept = function(entry){
        var entryId = entry.id;
        //BUGBUG
                entry.status = 'accepted';
                var url = '/taskCheck/accept/' + entryId;
                $http.post(url).success(function(response){
                    specTaskCheck($scope.currentTaskId);
                })
        };




    //*****************拒绝接收****************************
    $scope.reject = function(entryId){
        var flag=true;
        $scope.required = false;
        if($scope.myObj.rejectReason==""||$scope.myObj.rejectReason==undefined){
            flag=false;
            $scope.required = true;
            //$("#rejectreason{{entryId}}").modal("show");
        }
        if(flag){

            var url = '/taskCheck/reject/' + entryId;
            var reject_reason = {'rejectReason': $scope.myObj.rejectReason};
            $http.post(url, reject_reason).success(function(response){

                $("#rejectreason"+entryId).modal("hide");
                $scope.myObj.rejectReason="";

                specTaskCheck($scope.currentTaskId);
            })
        }

    };
    $scope.addApp=function(id) {
        $('#'+ id).popover("toggle");
    };



});
