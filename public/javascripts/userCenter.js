/**
 * Created by cailong on 16/5/20.
 */

var app = angular.module('yemaWebApp', ['ui.router']);

var navIndex = 3;
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
        });

    $urlRouterProvider.otherwise('/');     //匹配所有不在上面的路由
}]);

app.controller('userCenterCtrl', function($scope, $http){
    $scope.userName = true;

    var userUrl = '/user/userCenter';
    $http.get(userUrl).success(function(request){
        $scope.PhoneNumber = request.personAPP;
        $scope.userNickname = request.userNickname;
        $scope.userQQ = request.userQQ;

    });

    $scope.preserve = function(){
        var userUrl = '/user/userCenter';
        $http.post(userUrl,{'userNickname':$scope.userNickname, 'userQQ':$scope.userQQ}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;

            if (response.errorId == 0){
                //return to my App
                location.href='/user';
            }
        })
    };

});

function logout(){

    clearCookie('userIdCookie');
    clearCookie('username');

    location.href='/';
}