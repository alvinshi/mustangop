/**
 * Created by cailong on 16/5/20.
 */

var app = angular.module('yemaWebApp', ['ui.router']);

var navIndex = 6;
app.config(['$stateProvider','$urlRouterProvider',function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('inform',{
            url:'/',
            templateUrl:'/html/userCenter-infor.html',
            controller:'userCenterCtrl'
        })
        .state('account',{
            url:'/account',
            templateUrl:'/html/userCenter-account.html',
            controller:'userCenterCtrl'
        })
        .state('YRecharge',{
            url:'/YRecharge',
            templateUrl:'/html/userCenterYRecharge.html',
            controller:'userCenterCtrl'
        })
        .state('inforManage',{
            url:'/inforManage',
            templateUrl:'/html/userCenter-inforManage.html',
            controller:'inforManageCtrl'
        })
        .state('taskHistory',{
        url:'/taskHistory',
        templateUrl:'/html/userCenter-taskHistory.html',
        controller:'taskHistoryCtrl'
    });


    //$urlRouterProvider.otherwise('/');     //匹配所有不在上面的路由
}]);

app.controller('inforManageCtrl', function($scope, $http){
    //*****helper function*********
    //date comparison
    $scope.userName = true;

    //初始
    $scope.pageNum = 0;
    $scope.YCoinMessages = [];

    function getMessage(){
        var getMessage = '/user/userCenter/YCoinFlow/' + parseInt($scope.YCoinMessages.length/20);
        $http.get(getMessage).success(function(response){
            $scope.YCoinMessages = $scope.YCoinMessages.concat(response.YCoinMessages);
        });
    }

    getMessage();

    $scope.nextPage = function(){
        getMessage();
    };

    $scope.prevPage = function(){
        getMessage();
    };
});

// 任务历史
app.controller('taskHistoryCtrl', function($scope, $http){
    // 初始
    $scope.pageSize = 14; //每页显示条数
    $scope.ReleaseTaskHistory = [];
    $scope.currentPage = 0; // 当前页

    //var taskUrl = '/user/taskhistory';
    //$http.get(taskUrl).success(function(response){
    //    var releaseTaskHistory = response.ReleaseTaskHistory;
    //
    //    for (var i = 0; i < releaseTaskHistory.length; i++){
    //        if (i % $scope.pageSize === 0) {
    //            $scope.ReleaseTaskHistory[Math.floor(i / $scope.pageSize)] = [ releaseTaskHistory[i] ];
    //        } else {
    //            $scope.ReleaseTaskHistory[Math.floor(i / $scope.pageSize)].push(releaseTaskHistory[i]);
    //        }
    //    }
    //
    //});

    // 上一页
    $scope.prevPage = function () {
        if ($scope.currentPage > 0) {
            $scope.currentPage--;
        }
    };

    // 下一页
    $scope.nextPage = function () {
        if ($scope.currentPage < $scope.ReleaseTaskHistory.length - 1) {
            $scope.currentPage++;
        }
    };
});

app.controller('userCenterCtrl', function($scope, $http,$location){
    //复制链接
    $scope.inviteUrl = "http://www.mustangop.com/user/register/" + getCookie("userIdCookie");

    $scope.copyUrl = function () {
        $('#btn').popover('toggle');
        var Url = document.getElementById("inviteUrlcopy");
        Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };

    $scope.addApp = function(id) {
        $('#'+ id).popover("toggle");
    };

    $scope.userName = true;
    $scope.userNickname = getCookie('uploadName');

    var userUrl = '/user/userCenter';
    $http.get(userUrl).success(function(response){
        $scope.PhoneNumber = response.personAPP;
        $scope.userNickname = response.userNickname;
        $scope.userQQ = response.userQQ;
        $scope.balance = response.balance;
        $scope.userFreezingYB = response.userFreezingYB;
        $scope.register_status = response.registerBonus;
        $scope.inviteCount = response.inviteCount;
        $scope.inviteSucceedCount = response.inviteSucceedCount;
    });

    $scope.preserve = function(){
        var userUrl = '/user/userSaveInfo';
        $http.post(userUrl,{'userNickname':$scope.userNickname, 'userQQ':$scope.userQQ}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                //return to my App
                //location.href='/user';
            }
        })
    };
});

function logout(){
    clearCookie('userIdCookie');
    clearCookie('username');

    location.href='/';
}