/**
 * Created by cailong on 16/5/12.
 */

var app=angular.module('userAccountApp',[]);

app.controller('userAccountCtrl', function($scope, $http) {

    $scope.getSmsCode = function(){
        if ($scope.searchUrl != ''){

            var registerUrl = '/user/getSmsCode';

            console.log(registerUrl);

            $("#button1").prop("disabled", true);
            var seconds = 60;
            function countdown(seconds) {
                /* Exit if nothing to do */
                if (seconds === 0) {
                    $("#button1").attr("disabled", false);
                    $("#button1").text("获取验证码");
                    return;
                }

                $("#button1").text(seconds+"s后重试");
                seconds--;
                setTimeout(function () {countdown(seconds);}, 1000);
            }
            countdown(seconds);

            $http.post(registerUrl, {'mobile': $scope.userMobile, 'password': $scope.userSecret}).success(function(response){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            });
        }
    };

    $scope.userRegister = function(){
        var registerUrl = '/user/register';

        console.log($scope.userSmsCode);

        $http.post(registerUrl, {'mobile': $scope.userMobile, 'password': $scope.userSecret, 'smsCode':$scope.userSmsCode}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId == 0){
                //return to my App
                location.href='/myapp';
            }
        });
    };

    $scope.userLogin = function(){
        var registerUrl = '/user/login';

        console.log($scope.userSmsCode);

        $http.post(registerUrl, {'mobile': $scope.userMobile, 'password': $scope.userSecret}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId == 0){
                //return to my App
                location.href='/myapp';
            }
        });
    };

    $scope.getNewSmsCode = function(){
        if ($scope.searchUrl != ''){

            var registerUrl = '/user/getNewSmsCode';

            console.log(registerUrl);

            $("#button1").prop("disabled", true);
            var seconds = 60;
            function countdown(seconds) {
                /* Exit if nothing to do */
                if (seconds === 0) {
                    $("#button1").attr("disabled", false);
                    $("#button1").text("重获验证码");
                    return;
                }

                $("#button1").text(seconds+"s后重试");
                seconds--;
                setTimeout(function () {countdown(seconds);}, 1000);
            }
            countdown(seconds);

            $http.post(registerUrl, {'mobile': $scope.userMobile, 'password': $scope.userSecret}).success(function(response){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            });
        }
    };

    $scope.newSecret = function(){
        var registerUrl = '/user/forgetSecret';
        console.log($scope.userSmsCode);

        $http.post(registerUrl, {'mobile': $scope.userMobile, 'smsCode':$scope.newSmsCode, 'newPassword':$scope.usernewSecret}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId == 0){
                //return to my App
                location.href='/user/login';
            }
        });
    };


});