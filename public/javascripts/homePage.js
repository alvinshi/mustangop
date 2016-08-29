/**
 * Created by cailong on 16/8/29.
 */

var app = angular.module('yemaWebApp',[]);
var navIndex = 0;

app.controller('homePageCtrl', function($scope, $http){
    // banner
    var bannerurl = 'homePage/banner';
    $http.get(bannerurl).success(function(response){
        $scope.bannerUrl = response.bannerUrl;
    });

    // 签到
    var ischeckinsUrl = 'homePage/ischeckins';
    $http.get(ischeckinsUrl).success(function(response){
        $scope.isCheckIns = response.isCheckIns;
        $scope.todayYB = response.todayYB;
        $scope.tomorrowYB = response.tomorrowYB;
        if (response.isCheckIns == 0 || response.isCheckIns == 1){
            $scope.isCheckIns = response.isCheckIns;
            $scope.todayYB = response.todayYB;
            $scope.tomorrowYB = response.tomorrowYB;
        }
    });

    // 签到按钮
    $scope.butCheckIns = function(todayYB, tomorrowYB){
        var checkInsURL = 'homePage/checkIns';
        $http.post(checkInsURL, {'todayYB':todayYB, 'tomorrowYB':tomorrowYB}).success(function(response){
            $scope.errorId = response.errorId;
            $scope.errorMsg = response.errorMsg;
            if (response.errorId == 0){
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            }
        })
    };
});