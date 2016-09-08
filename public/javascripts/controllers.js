
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

    //invite
    $scope.copyInviteUrl = function () {
        //TODO:
    };

})

.controller('TaskHallController', function($scope, $http, Locales,$ionicFilterBar) {

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

})

.controller('TaskDetailController', function($scope, $http, $stateParams, Locales) {

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
        var lockParam = {'userCId' : gUserCId, 'taskId' : $scope.taskDetail.id}
        $http.post(lockTaskUrl, lockParam).success(function(response){

        })
    }
})

.controller('MyTaskController', function($scope) {})

.controller('AccountController', function($scope) {
        $scope.settings = {
            enviarNotificaciones: true
        };
});
