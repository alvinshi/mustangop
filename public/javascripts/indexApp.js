/**
 * Created by cailong on 16/5/31.
 */

app.directive("thNav",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/navbar.html'
        //replace: true
    };
});
app.directive("thFooter",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/footer.html'
        //replace: true
    };
});

app.controller('indexAppCtrl', function($scope, $http, $location){

    var index = navIndex;
    $scope.myColors = ['white', 'white', 'white', 'white','white','white'];
    $scope.myColors[index] = '#3498db';

    var indexUrl = '/index';

    $http.get(indexUrl).success(function(response){
        loadNav();
        $scope.userObjectId = response.userObjectId;
        $scope.tracknameAPPs = response.tracknameAPPs;
    });
    $scope.logout=function(){

        clearCookie('userIdCookie');
        clearCookie('username');

        location.href='/';
    }

});

