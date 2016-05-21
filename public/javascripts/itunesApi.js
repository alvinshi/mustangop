/**
 * Created by wujiangwei on 16/5/9.
 */


var app=angular.module('itunesSearch',[]);

app.controller('itunesSearchControl', function($scope, $http) {

    var appsUrl = 'myapp/angular';

    $http.get(appsUrl).success(function(response){
        $scope.myApps = response.myApps;
    });

    $scope.searchApp = function(){
        if ($scope.searchUrl != ''){

            var searchUrl = 'api/itunes/search/' + $scope.searchKey;

            console.log('--------- searchApp searchApp');

            $http.get(searchUrl).success(function(response){

                console.log('searchApp' + response);

                $scope.appResults = response.appResults;
            });
        }
    };

    $scope.chooseMyApp = function(appInfo){
        //$cookieStore.get("name") == "my name";

        var searchUrl = 'myapp/add';

        console.log(appInfo);
        $http.post(searchUrl, {'appInfo':appInfo}).success(function(response){

            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){
                var flag = 0;

                if ($scope.myApps == undefined){
                    $scope.myApps = new Array();
                }

                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appInfo.appleId){
                        flag = 1;
                        break;
                    }
                }

                if (flag == 0){
                    console.log('add app to ui');
                    //第一个不是最后一个
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
                console.log('remove app if');
                for (var i = 0; i < $scope.myApps.length; i++){
                    var app = $scope.myApps[i];
                    if (app.appleId == appid){
                        console.log('remove app to ui');
                        $scope.myApps.splice(i, 1);
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                console.log('remove app else');
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