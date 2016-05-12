/**
 * Created by wujiangwei on 16/5/9.
 */


var app=angular.module('itunesSearch',[]);

app.controller('itunesSearchControl', function($scope, $http) {

    //TODO:
    var appsUrl = 'myapp/angular';

    $http.get(appsUrl).success(function(response){
        $scope.myApps = response.myApps;
    });

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

        console.log(appid);
        $http.post(searchUrl, {'appid':appid}).success(function(response){

            if (response.errorId == 0){
                var flag = 0;
                for (var i = o; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid){
                        flag = 1;
                        break;
                    }
                }

                if (flag == 0){
                    $scope.myApps.push(response.newApp);
                }
                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }

            $scope.appResults = [];
        });
    };

    $scope.releaseMyApp = function(appid){
        //$cookieStore.get("name") == "my name";

        var searchUrl = 'myapp/delete';

        console.log(searchUrl);
        $http.post(searchUrl, {'appid':appid}).success(function(response){
            if (response.errorId == 0){
                for (var i = o; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid){
                        $scope.myApps.splice(i, 1);
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }

            $scope.appResults = [];
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