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
    function dateCompare(DateA, DateB) {
        var a = new Date(DateA);
        var b = new Date(DateB);
        var msDateA = Date.UTC(a.getFullYear(), a.getMonth()+1, a.getDate());
        var msDateB = Date.UTC(b.getFullYear(), b.getMonth()+1, b.getDate());
        if (parseFloat(msDateA) < parseFloat(msDateB)) {
            if ((a.getDate() - b.getDate()) == -1) {
                return '昨天';
            }
            else {
                return '更早';
            }
        }// lt
        else if (parseFloat(msDateA) == parseFloat(msDateB)){
            return '今天';}  // eq
        else if (parseFloat(msDateA) > parseFloat(msDateB)){
            return '未来';} // gt
        else{
            console.log("fail");
        }
    };
    $scope.userName = true;
    var date = new Date();

    //初始
    $scope.pageNum = 0;
    $scope.msgPerPage = 6;
    var firstTaskIndex = 0;
    var lastTaskIndex = $scope.msgPerPage;

    var getMessage = '/user/userCenter/getMessage';
    $http.get(getMessage).success(function(response){
        $scope.myId = response.yourId;
        console.log($scope.myId);
        var messages = response.rtnMsg;
        $scope.taskMsg = new Array();
        $scope.systemMsg = new Array();
        $scope.moneyMsg = new  Array();
        $scope.unreadMsg = false;
        $scope.unreadTaskMsg = false;
        $scope.unreadSystemMsg = false;
        $scope.unreadMoneyMsg = false;
        for (var i = 0; i < messages.length; i++){
            if (dateCompare(messages[i].time, date) == '今天'){
                messages[i].day = '今天';
            }
            else if (dateCompare(messages[i].time, date) == '昨天'){
                messages[i].day = '昨天';
            }
            else{
                messages[i].day = messages[i].time;
            }
            if (messages[i].category == '任务'){
                $scope.taskMsg.push(messages[i]);
                if (messages[i].read == false){
                    $scope.unreadTaskMsg = true;
                }
            }
            else if (messages[i].category == '系统'){
                $scope.systemMsg.push(messages[i]);
                if (messages[i].read == false){
                    $scope.unreadSystemMsg = true;
                }
            }
            else {
                $scope.moneyMsg.push(messages[i]);
                if (messages[i].read == false){
                    $scope.unreadMoneyMsg = true;
                }
            }
        }
        if ($scope.unreadTaskMsg || $scope.unreadMoneyMsg || $scope.unreadMoneyMsg){
            $scope.unreadMsg = true;
        }

        $scope.taskDisplayed = $scope.taskMsg;
        $scope.totalTaskNum = $scope.taskDisplayed.length;
        $scope.totalPageNum = getTotalPageNum($scope.totalTaskNum, $scope.msgPerPage)
        updateMsgDisplayed();
    });

    //获取总页数
    function getTotalPageNum(totalTaskNum, msgPerPage){
        if (totalTaskNum % msgPerPage == 0){
            return parseInt(totalTaskNum / msgPerPage) + 1;
        }
        else{
            return parseInt(totalTaskNum / msgPerPage) + 2;
        }
    }

    function updateMsgDisplayed(){
        firstTaskIndex = $scope.msgPerPage * $scope.pageNum;
        lastTaskIndex = firstTaskIndex + $scope.msgPerPage;
        $scope.taskMsgDisplayed = $scope.taskDisplayed.slice(firstTaskIndex, lastTaskIndex);
        var msgIdArray = Array;
        for (var i = 0; i < $scope.taskMsgDisplayed.length; i++){
            msgIdArray.push($scope.taskMsgDisplayed[i].id);
            }
        var url = "/user/userCenter/readMsg";
        $http.post(url, {'msgIdArray': msgIdArray}).success(function(response){
        })
    }


    //消息种类选择
    $scope.msgClick = function(type){
        $scope.pageNum = 0;
        if (type == 'task'){
            $scope.taskDisplayed = $scope.taskMsg;
        }
        else if (type == 'system'){
            $scope.taskDisplayed = $scope.systemMsg;
        }
        else if (type == 'money'){
            $scope.taskDisplayed = $scope.moneyMsg;
        }

        $scope.totalPageNum = getTotalPageNum($scope.totalTaskNum, $scope.msgPerPage)
        if ($scope.taskDisplayed.length != 0){
            firstTaskIndex = 0;
            lastTaskIndex = $scope.msgPerPage;
            updateMsgDisplayed();
        }
    };

    $scope.nextPage = function(){
        if ($scope.pageNum + 2 < $scope.totalPageNum){
            $scope.pageNum ++;
        }
        else{
            console.log("Already reached the last page");
        }
        updateMsgDisplayed();
    };

    $scope.prevPage = function(){
        if ($scope.pageNum > 0){
            $scope.pageNum --;
        }
        else{
            console.log("It is the first page");
        }
        updateMsgDisplayed();
    };
});

// 任务历史
app.controller('taskHistoryCtrl', function($scope, $http){
    // 初始
    $scope.pageSize = 14; //每页显示条数
    $scope.ReleaseTaskHistory = [];
    $scope.currentPage = 0; // 当前页

    var taskUrl = '/user/taskhistory';
    $http.get(taskUrl).success(function(response){
        var releaseTaskHistory = response.ReleaseTaskHistory;

        for (var i = 0; i < releaseTaskHistory.length; i++){
            if (i % $scope.pageSize === 0) {
                $scope.ReleaseTaskHistory[Math.floor(i / $scope.pageSize)] = [ releaseTaskHistory[i] ];
            } else {
                $scope.ReleaseTaskHistory[Math.floor(i / $scope.pageSize)].push(releaseTaskHistory[i]);
            }
        }

    });

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