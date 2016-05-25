/**
 * Created by cailong on 16/5/20.
 */

var app=angular.module('userCenterAPP', []);

app.controller('userCenterCtrl', function($scope, $http){
    $scope.userName = true;

    var userUrl = '/user/userCenter';
    $http.get(userUrl).success(function(request){
        $scope.PhoneNumber = request.personAPP;
        $scope.username = request.userName;
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