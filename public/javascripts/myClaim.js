/**
 * Created by cailong on 16/7/20.
 */

var app = angular.module('yemaWebApp', []);

var navIndex = 2;

app.controller('myClaimControl', function($scope, $http, $location){



    $scope.noApp = false;
    $scope.isLoadingMyApp = true;

    //$scope.hideContent=true;
    var appurlList = $location.absUrl().split('/');
    var userId = appurlList[appurlList.length - 1];

    var todayUrl = '/myClaim/claim/' + userId;

    //uploadName
    var claimParams = Object();
    var uploadName = undefined;
    if (window.localStorage) {
        uploadName = localStorage.getItem("uploadName");
    } else {
        uploadName = getCookie('uploadName');
    }
    if(uploadName != undefined){
        claimParams.uploadName = uploadName;
    }

    $http.post(todayUrl, claimParams).success(function(response){
        $scope.isLoadingMyApp = false;
        $scope.dailyTask = response.myClaimApps;
        //被拒绝的Task Objects, 数据类型(Array)
        $scope.rejectedTaskObjects = response.rejectedTaskObjects;
        for (var i = 0; i < response.myClaimApps.length; i++){
            response.myClaimApps[i].mode = true;
            console.log(response.myClaimApps[i]);
            console.log(response.myClaimApps[i].rejected);
        }

        if($scope.dailyTask.length > 0){
            $scope.noApp = false;
        }else {
            $scope.noApp = true;
        }
    });

    $scope.copy = $location.absUrl();

   //重新填写备注
    $scope.reAssign = function(app){
        app.mode = false;
        console.log("changed");

    };

    $scope.uploadTaskVideo=function(){
        $("#uploadTaskVideo").modal("hide");
        var myVideo=document.getElementById("uploadTask");
        myVideo.pause();
    };
    //******备注保存逻辑**********
    //保存填写的备注到数据库

    $scope.saveRemark = function(detailRem, taskObjectId,app){
        var saveurl = '/myClaim/saveRemark/' + userId;
        $http.post(saveurl,{"remark":detailRem, 'taskObjectId': taskObjectId}).success(
            function(response){
                app.mode = true;
            }
        )
    };
    //按回车保存
    $scope.keySaveAssign = function(e,detailRem, taskObjectId,app){
        var keycode = window.event?e.keyCode:e.which;
        if(keycode==13 ){

            $scope.saveRemark(detailRem, taskObjectId,app);
        }
    };

    //复制链接

    $scope.url=$location.absUrl();
    $scope.copyUrl= function () {
        $('#btn').popover('toggle');
        var Url = document.getElementById("copy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };

    $scope.openNewPage = function(courseid){
        location.href = '/newtaskMobile/' + courseid;
    }

    // 一键关闭
    $scope.turnoffTask = function(){
        var turnUrl = '/myClaim/closeTask/' + userId;
        $http.post(turnUrl).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId != 0){
                $scope.errorMsg = response.errorMsg;
                $("#popover").modal("show");
            }else {
                setTimeout(refresh, 1000);
            }
            function refresh(){
                location.href = '/myClaim/' + userId;
            }
        })
    }


});