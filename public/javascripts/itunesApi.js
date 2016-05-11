/**
 * Created by wujiangwei on 16/5/9.
 */


var app=angular.module('itunesSearch',[]);

app.controller('itunesSearchControl', function($scope, $http) {

    $scope.searchKey = '11';

    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = 'api/itunes/search/' + $scope.searchKey;

            console.log(searchUrl);

            $http.get(searchUrl).success(function(response){
                $scope.appResults = response.appResults;
            });
        }
    };

    $scope.chooseMyApp = function(appid){
        //$cookieStore.get("name") == "my name";

        var searchUrl = 'myapp/add';

        console.log(searchUrl);
        $http.post(searchUrl, {'appid':appid}).success(function(response){
            $scope.myApps = response.myApps;
            $scope.appResults = [];
        });
    };

    $scope.releaseMyApp = function(appid){
        //$cookieStore.get("name") == "my name";

        var searchUrl = 'myapp/delete';

        console.log(searchUrl);
        $http.post(searchUrl, {'appid':appid}).success(function(response){
            $scope.myApps = response.myApps;
        });
    };

});

//app.directive('itunesSearchDirective', function() {
//    return {
//        restrict: 'AE',
//        template: '<p>Hello {{name}}!</p>',
//        controller: function($scope, $element){
//            $scope.name = $scope.name + "Second ";
//        },
//        link: function(scope, el, attr) {
//            scope.name = scope.name + "Third ";
//        }
//    }
//})