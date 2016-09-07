/**
 * Created by cailong on 16/8/29.
 */

var app = angular.module('yemaWebApp',[]);
var navIndex = 0;

app.controller('homePageCtrl', function($scope, $http){
    //邀请好友
    //$scope.inviteUrl = "http://yematest.leanapp.cn/user/register/" + getCookie("userIdCookie");
    $scope.inviteUrl = "http://www.mustangop.com/user/register/" + getCookie("userIdCookie");
    $scope.copyUrl = function () {
        $('#alert-btn').popover('toggle');
        var Url = document.getElementById("invitecopy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };

    //尊贵客人
    $scope.noviceTaskObject = Object();
    $scope.noviceTaskObject.luxuryUserStep = 0;
    //首次充值
    $scope.noviceTaskObject.hasFirstRecharge = 0;

    // 任务
    var noviceTaskUrl = 'homePage/noviceTask';
    $http.get(noviceTaskUrl).success(function(response){
        $scope.noviceTaskObject = response.noviceTaskObject;
    });

    $scope.LuxuryUser = function(){
        var luxuryURL = 'homePage/LuxuryUser';
        $http.post(luxuryURL, {}).success(function(response){
            $scope.luxuryMessage = response.errorMsg;
            $scope.luxurySucceed = response.errorId;
        })
    };

    //******************* 自动轮播 *************************
    $("#myCarousel").carousel({
        interval:5000
    });
    $("#myCarousel1").carousel({
        interval:3000
    });

        // banner
    var bannerurl = 'homePage/banner';
    $http.get(bannerurl).success(function(response){
        $scope.bannerUrl = response.bannerUrl;
    });

    // 签到
    var ischeckinsUrl = 'homePage/ischeckins';
    $scope.isCheckIns = 0;
    $scope.todayYB = 1;
    $scope.continueCheck = 2;
    $scope.latestDays = 0;
    $http.get(ischeckinsUrl).success(function(response){
        if(response.errorId == 0){
            $scope.isCheckIns = response.isCheckIns;
            $scope.todayYB = response.todayYB;
            $scope.continueCheck = response.continueCheck;
            $scope.latestDays = response.latestDays;
        }
    });

    $http.get('homePage/dayTask').success(function(response){
        if(response.errorId == 0){
            $scope.releaseTaskY = response.releaseTaskY;
            $scope.doTaskY = response.doTaskY;
            $scope.checkTaskY = response.checkTaskY;
        }
    });

    // 每日任务按钮
    $scope.dayTaskLock = 0;
    $scope.dayTaskBtn = function(actionId){
        if($scope.dayTaskLock = 1){
            return
        }
        $scope.dayTaskLock = 1;
        var checkInsURL = 'homePage/dayTask';
        $http.post(checkInsURL, {'actionId':actionId}).success(function(response){
            $scope.dayTaskLock = 0;
            if (response.errorId == 0){
                $scope.releaseTaskY = response.releaseTaskY;
                $scope.doTaskY = response.doTaskY;
                $scope.checkTaskY = response.checkTaskY;
            }
        })
    };

    // 签到按钮
    $scope.checkInLock = 0;
    $scope.butCheckIns = function(){
        if($scope.checkInLock = 1){
            return;
        }
        $scope.checkInLock = 1;
        var checkInsURL = 'homePage/checkIns';
        $http.post(checkInsURL, {}).success(function(response){
            $scope.checkInLock = 0;
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                $scope.isCheckIns = 1;
                $scope.latestDays += 1;
            }
        })
    };
    //我发布的任务
     $scope.jump = function(curren){
        window.open('http://aso100.com/app/rank/appid' + '/' + curren.appleId + '/country/cn');
     };
     $scope.jump1 = function(curren){
         window.open('http://aso100.com/app/keyword/appid/'+curren.appleId+'/country/cn');
     };
    $scope.jump2 = function(curren){
        window.open('http://aso100.com/app/comment/appid/'+curren.appleId+'/country/cn');
    };
    $scope.jump3 = function(curren){
        window.open('http://aso100.com/app/download/appid/'+curren.appleId+'/country/cn');
    };

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
        $scope.myReleaseTask = response.myReleaseTaskInfo;
        if ($scope.myReleaseTask.length <= 0){
            $scope.noApp = true;
        }
    });

    // 点击领取
    $scope.receInLock = 0;
    clickToReceive = function(button){
        if($scope.receInLock == 1){
            return;
        }
        $scope.receInLock = 1;
        var actionId = button.getAttribute("data-id");
        var userReceiveAwardUrl = 'homePage/userReceiveAward';
        var transferMoney = {'actionId': actionId};

        $http.post(userReceiveAwardUrl, transferMoney).success(function(response){
            $scope.receInLock = 0;
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;

                if(actionId == 'finishNoviceTask'){
                    $scope.noviceTaskObject.noviceTaskAcceptReward = -1;
                }else  if(actionId == 'uploadHaveReceive'){
                    $scope.noviceTaskObject.noviceReward = -1;
                }else if (actionId == 'inviteUserReward'){
                    $scope.noviceTaskObject.canReceive = 0;
                }else if (actionId == 'guideUserRewardYB'){
                    $scope.noviceTaskObject.successCanReceive = 0;
                }
            }
        })
    };
});