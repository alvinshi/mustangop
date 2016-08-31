/**
 * Created by cailong on 16/8/29.
 */

var app = angular.module('yemaWebApp',[]);
var navIndex = 0;

app.controller('homePageCtrl', function($scope, $http){
    //邀请好友
    $scope.inviteUrl = "http://www.mustangop.com/user/register/" + getCookie("userIdCookie");
    $scope.copyUrl = function () {
        $('#alert-btn').popover('toggle');
        var Url = document.getElementById("invitecopy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };


    //******************* 自动轮播 *************************
    $("#myCarousel").carousel({
        interval:3000
    });

    // banner
    var bannerurl = 'homePage/banner';
    $http.get(bannerurl).success(function(response){
        $scope.bannerUrl = response.bannerUrl;
    });

    // 签到
    var ischeckinsUrl = 'homePage/ischeckins';
    $http.get(ischeckinsUrl).success(function(response){
        if (response.isCheckIns == 0){
            $scope.isCheckIns = response.isCheckIns;
            $scope.todayYB = response.todayYB;
            $scope.tomorrowYB = response.tomorrowYB;
            $scope.continueCheck = response.continueCheck; // 连续签到
        }
    });

    // 签到按钮
    $scope.butCheckIns = function(todayYB, tomorrowYB){
        var checkInsURL = 'homePage/checkIns';
        $http.post(checkInsURL, {'todayYB':todayYB, 'tomorrowYB':tomorrowYB}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            }
        })
    };
//我发布的任务

     $scope.jump=function(){
        window.open("http://aso100.com/app/rank/appid/979605189/country/cn");
     };
     $scope.jump1=function(){
         window.open("http://aso100.com/app/keyword/appid/979605189/country/cn");
     }
    $scope.jump2=function(){
        window.open("http://aso100.com/app/comment/appid/979605189/country/cn");
    }
    $scope.jump3=function(){
        window.open("http://aso100.com/app/download/appid/979605189/country/cn");
    }

    //用户+拒绝任务相关
    var indexUrl = '/index';
    $http.get(indexUrl).success(function(response){
        //未做的
        $scope.toDoCount = response.toDoCount;
        //被拒绝的
        $scope.refusedCount = response.refusedCount;
    });

    //需要审核的任务条数相关
    var unCheckCountUrl = '/index/unCheckTaskCount';
    $http.get(unCheckCountUrl).success(function(response){
        $scope.pendingCount = response.pendingCount;
    });

    // 我的发布
    var myReleaseTaskUrl = 'homePage/myReleaseTask';
    $http.get(myReleaseTaskUrl).success(function(response){
        $scope.myReleaseTask = response.myReleaseTask;
    });

    // 新手任务
    var noviceTaskUrl = 'homePage/noviceTask';
    $http.get(noviceTaskUrl).success(function(response){
        $scope.noviceTaskObject = response.noviceTaskObject;
    });

    // 点击领取
    $scope.buttona = function(curre){
        var userReceiveAwardUrl = 'homePage/userReceiveAward';
        var transferMoney = {'noviceReward': curre.noviceReward, 'noviceTaskAcceptReward': curre.noviceTaskAcceptReward,
            'canReceive': curre.canReceive, 'successCanReceive': curre.successCanReceive};

        $http.post(userReceiveAwardUrl, transferMoney).success(function(response){
            if (response.errorId == 0){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            }
        })
    }
});