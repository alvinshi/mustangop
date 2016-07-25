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
        });


    //$urlRouterProvider.otherwise('/');     //匹配所有不在上面的路由
}]);

app.controller('inforManageCtrl', function($scope, $http){
    $scope.userName = true;

    var userUrl = '/user/userCenter';
    $http.get(userUrl).success(function(response){
        $scope.PhoneNumber = response.personAPP;
        $scope.userNickname = response.userNickname;
        $scope.userQQ = response.userQQ;
        $scope.balance = response.balance;
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

    var getMessage = '/user/userCenter/getMessage';
    $http.get(getMessage).success(function(response){
        var messages = response.rtnMsg;
        $scope.taskMsg = new Array();
        $scope.systemMsg = new Array();
        $scope.moneyMsg = new  Array();
        for (var i = 0; i < messages.length; i++){
            if (messages[i].category == '任务'){
                $scope.taskMsg.push(messages[i]);
            }
            else if (messages[i].category == '系统'){
                $scope.systemMsg.push(messages[i]);
            }
            else {
                $scope.moneyMsg.push(message[i]);
            }
        }
    })
});

app.controller('userCenterCtrl', function($scope, $http){
    $scope.userName = true;

    var userUrl = '/user/userCenter';
    $http.get(userUrl).success(function(response){
        $scope.PhoneNumber = response.personAPP;
        $scope.userNickname = response.userNickname;
        $scope.userQQ = response.userQQ;
        $scope.balance = response.balance;

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