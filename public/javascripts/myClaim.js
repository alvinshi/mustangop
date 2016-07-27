/**
 * Created by cailong on 16/7/20.
 */

var app = angular.module('yemaWebApp', []);

var navIndex = 2;

app.controller('myClaimControl', function($scope, $http, $location){
    $scope.noApp = true;
    $scope.index=0;
    $scope.remark="";
    //$scope.hideContent=true;
    var appurlList = $location.absUrl().split('/');
    var userId = appurlList[appurlList.length - 1];

    var todayUrl = '/myClaim/claim/' + userId;


    $http.get(todayUrl).success(function(response){
        $scope.dailyTask = response.myDailyApps;
        if($scope.dailyTask.length>0){
            $scope.noApp=false;



        }

    });
    $scope.copy = $location.absUrl();

   //重新填写备注
    $scope.reAssign=function(appleName){
        for(var i=0;i<$scope.dailyTask.length;i++){
            var tempApp = $scope.dailyTask[i];
            if (tempApp.trackName == appleName){
                $scope.index = i;
                break;

            }
        }

        var input=document.getElementsByClassName("assignTask")[$scope.index];
        input.innerHTML="";
        var input1=document.getElementsByClassName("input1")[$scope.index];
        input1.style.display="inline-block";
        //input.value=$scope.app.detailRem;
        var btnSave=document.getElementsByClassName("btnSave")[$scope.index];
        btnSave.style.display="inline-block";
        var imgpen=document.getElementsByClassName("imgpen")[$scope.index];
        imgpen.style.display="none";




    };

    //保存填写的备注到数据库
    $scope.saveRemark=function(){
        var url = '/myClaim/saveRemark';
        console.log($scope.remark);
        $http.post(url,{"remark":$scope.remark}).success(function(response){
            if(response.errorId==0){

                var btnSave=document.getElementsByClassName("btnSave")[$scope.index];
                btnSave.style.display="none";
                var imgpen=document.getElementsByClassName("imgpen")[$scope.index];
                imgpen.style.display="inline-block";
        }



            }
        )

    };
    //复制链接

    $scope.url=$location.absUrl();
    $scope.copyUrl= function () {
        $('#btn').popover('toggle');
        var Url=document.getElementById("copy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令




    };




});