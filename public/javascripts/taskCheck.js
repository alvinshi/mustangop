var app=angular.module('yemaWebApp',[]);
var navIndex =3;

app.controller('taskCheckCtrl', function($scope, $http, $location) {

    var bannerurl = 'taskCheck/banner';
    $http.get(bannerurl).success(function(response){
        $scope.bannerUrl = response.bannerUrl;
    });

    //******************* 自动轮播 *************************
    $("#myCarousel").carousel({
        interval:3000
    });
    //*******************初始化 *************************
    $scope.isLoadingMyApp = true;
    $scope.currentTaskId = undefined;
    $scope.noApp = false;
    $scope.myObj = Object();
    //**************得到左侧控制器条目*******************
    var taskUrl = '/taskCheck/taskAudit';
    $http.get(taskUrl).success(function(response){
        $scope.isLoadingMyApp = false;
        $scope.taskAudit = response.taskAudit;
        if ($scope.taskAudit.length > 0){
            //初始显示返回的第一个
            $scope.taskIndex = 0;
            $scope.taskDisplayed = $scope.taskAudit[0];
        }
        else {
            //如果没有返回值, 需要在前端显示按钮
            $scope.noApp = true;
        }
    });

    // 一键关闭
    $scope.turnOffTask = function(){
        var turnUrl = '/taskCheck/turnOff';
        $http.post(turnUrl).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId != 0){
                $scope.errorMsg = response.errorMsg;
                $("#errorMsg").modal("show");
            }else {
                setTimeout(refresh, 1000);
            }
            function refresh(){
                location.href = '/taskCheck/';
            }
        })

    };

    //************点击左侧条目控制器**********************
    $scope.check = function(app, index){
        $scope.taskIndex = index;
        $scope.taskDisplayed = app;
    };

    // 单条任务关闭
    $scope.oneTaskOff = function(taskId){
        var oneTaskUrl = '/taskCheck/turnOffOneTask';
        $http.post(oneTaskUrl, {'taskId': taskId}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId != 0){
                $scope.errorMsg = response.errorMsg;
                $("#errorMsg").modal("show");
            }else {
                setTimeout(refresh, 100);
            }
            function refresh(){
                location.href = '/taskCheck/'
            }
        })
    };

    //***************撤销任务逻辑************************
    $scope.confirmCancel = function(taskId){
        var url = '/taskCheck/cancelTask/' + taskId;
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
    $scope.reject = function(entry){
        console.log(entry);
        var entryId = entry.id;
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
                entry.status = 'refused';
                console.log(entry);
            })
        }

    };
    $scope.addApp=function(id) {
        $('#'+ id).popover("toggle");
    };
});
