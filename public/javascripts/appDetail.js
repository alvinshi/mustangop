/**
 * Created by cailong on 16/5/30.
 */

var app = angular.module('myAppContent', []);
app.controller('myAppControl', function($scope, $http, $location){
    var appurlList = $location.absUrl().split('/');
    var appid = appurlList[appurlList.length - 1];
    var myappUrl = 'baseinfo/' + appid;

    $http.get(myappUrl).success(function(request){
        $scope.artworkUrl100 = request.artworkUrl100;
        $scope.trackName = request.trackName;
        $scope.sellerName = request.sellerName;
        $scope.appleId = request.appleId;
        $scope.latestReleaseDate = request.latestReleaseDate;

    });

});