
//user code
var gUserCId;
function getUserCode()
{
    if (window.localStorage) {
        gUserCId = localStorage.getItem("userCId");
    } else {
        gUserCId = getCookie('userCId');
    }
}

angular.module('starter.controllers', [])
    //弹出窗口
    .controller('PopupCtrl',function($scope, $ionicPopup) {
        $scope.showPopup = function () {
            $scope.data = {}
            // 自定义弹窗
            var myPopup = $ionicPopup.show({
                template: '<input type="text">',

                buttons: [
                    {text: '取消'},
                    {
                        text: '<b>确定</b>',
                        type: 'button-positive',

                    },
                ]

            })
        }
    })

.controller('homeController', function($scope, $http) {
    getUserCode();

    //设备判定
    $scope.isIOSDevice = 0;
    $scope.isAndroidDevice = 0;
    if(/(iPhone|iPad|iPod|iOS|MacIntel|Macintosh)/i.test(navigator.userAgent)){
        $scope.isIOSDevice = 1;
    }else if(/android/i.test(navigator.userAgent)){
        $scope.isAndroidDevice = 1;
    }

    $scope.isQQBrowser = 0;
    $scope.isWeixinBrowser = 0;
    $scope.isiPhoneSafari = 0;
    if($scope.isAndroid || $scope.isIOSDevice){
        if(/QQ/i.test(navigator.userAgent)){
            $scope.isQQBrowser = 1;
        }else if(/MicroMessenger/i.test(navigator.userAgent)){
            $scope.isWeixinBrowser = 1;
        }else if(/Safari/i.test(navigator.userAgent)){
            $scope.isiPhoneSafari = 1;
        }
    }

    //alert(navigator.platform);
    //alert(navigator.userAgent);
    if($scope.isIOSDevice == 1 && $scope.isiPhoneSafari == 1){

        var userInfoUrl = '/taskUser/' + gUserCId;
        $http.get(userInfoUrl).success(function (response) {
            if(response.errorId == 0){
                //succeed
                if (window.localStorage) {
                    localStorage.setItem("userCId", response.userCId);
                    localStorage.setItem("userCode", response.userCode);
                } else {
                    setCookie("userCId", response.userCId);
                    setCookie("userCode", response.userCode);
                }

                $scope.userCode = response.userCode;
                $scope.apprenticeMoney = response.apprenticeMoney;
                //$scope.discipleMoney = response.discipleMoney;  //徒孙
                $scope.totalMoney = response.totalMoney;
                $scope.todayMoney = response.todayMoney;
                $scope.currentMoney = response.currentMoney;
                $scope.userCode = response.userCode;

            }else {
                $scope.errorId = response.errorId;
                $scope.message = response.message;
            }
        });
    }
    //弹出窗口
    $scope.showPopup = function () {
        $scope.data = {}
        // 自定义弹窗
        var myPopup = $ionicPopup.show({
            template: '<input type="text">',

            buttons: [
                {text: '取消'},
                {
                    text: '<b>确定</b>',
                    type: 'button-positive',

                },
            ]

        })
    }
    //invite
    $scope.copyInviteUrl = function () {
        //TODO:
    };
})

.controller('TaskHallController', function($scope, $http, Locales, $ionicFilterBar) {
    getUserCode();
    var pageCount = 20;

    //默认下载
    $scope.downloadTasks = [];
    $scope.commentTasks = [];

    //isMore 1(load more) 0(refresh) -1(button click)
    $scope.switchTaskType = function (taskType, isMore) {
        $scope.taskType = taskType;
        var tasksUrl;
        if(taskType == 1){
            if($scope.downloadTasks.length > 0 && isMore == -1){
                return;
            }
            if(isMore == 0){
                //refresh
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + 0;
            }else {
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + $scope.downloadTasks.length/pageCount;
            }

            $scope.downloadLoading = true;
        }else if(taskType == 2){
            if($scope.commentTasks.length > 0 && isMore == -1){
                return;
            }
            if(isMore == 0) {
                //refresh
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + 0;
            }else {
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + $scope.commentTasks.length / pageCount;
            }
            $scope.commentLoading = true;
        }

        if(tasksUrl == undefined){
            console.error('tasksUrl == undefined');
            return;
        }

        $http.get(tasksUrl).success(function (response) {
            if(taskType == 1){
                $scope.downloadLoading = false;
            }else if(taskType == 2){
                $scope.commentLoading = false;
            }

            if(response.errorId == 0){
                //succeed
                if(taskType == 1){
                    if(response.tasks.length > 0){
                        if(response.tasks.length == pageCount){
                            $scope.downloadHasMore = true;
                        }else {
                            $scope.downloadHasMore = false;
                        }
                        if(isMore == 0){
                            //refresh
                            $scope.downloadTasks = [];
                        }
                        $scope.downloadTasks = $scope.downloadTasks.concat(response.tasks);
                    }else {
                        $scope.downloadHasMore = false;
                    }
                }else if(taskType == 2){
                    if(response.tasks.length > 0){
                        if(response.tasks.length == pageCount) {
                            $scope.commentHasMore = true;
                        }else {
                            $scope.commentHasMore = false;
                        }
                        if(isMore == 0){
                            //refresh
                            $scope.commentTasks = [];
                        }
                        $scope.commentTasks = $scope.commentTasks.concat(response.tasks);
                    }else {
                        $scope.commentHasMore = false;
                    }
                }
            }else {
                $scope.errorId = response.errorId;
                $scope.message = response.message;
            }
        }).finally(function() {
            // Stop the ion-refresher from spinning
            if(isMore == 1){
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
            if(isMore == 0){
                $scope.$broadcast('scroll.refreshComplete');
            }
        });
    };

    $scope.switchTaskType(1, -1);

    $scope.refreshTaskHall = function(){
        $scope.switchTaskType($scope.taskType, 0);
    };

    $scope.loadMore = function(){
        $scope.switchTaskType($scope.taskType, 1);
    };
})

.controller('TaskDetailController', function($scope, $http, $stateParams, Locales) {
    getUserCode();
    var tasksUrl = '/taskHall/' + gUserCId + '/' + 0;
    $scope.loading = true;
    $http.get(tasksUrl).success(function (response) {
        $scope.loading = false;
        if(response.errorId == 0){
            //succeed


        }else {
            $scope.errorId = response.errorId;
            $scope.message = response.message;
        }
    });

    $scope.lockTask = function(){
        var lockTaskUrl = '/lockTask';
        var lockParam = {'userCId' : gUserCId, 'taskId' : $scope.taskDetail.id};
        $http.post(lockTaskUrl, lockParam).success(function(response){

        })
    }
})

.controller('MyTaskController', function($scope) {
    getUserCode();
})

.controller('AccountController', function($scope) {
    getUserCode();
        $scope.settings = {
            enviarNotificaciones: true
        };
});
