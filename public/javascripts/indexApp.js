/**
 * Created by cailong on 16/5/31.
 */

app.directive("thNav",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/navbar.html',

        controller: function($scope, $element, $http){
            var indexUrl = '/index';

            //用户相关
            $http.get(indexUrl).success(function(response){
                loadNav();
                if(response.Count>0){
                    $scope.Count = response.Count;
                    $scope.showBadge=true;
                }
                else {
                    $scope.showBadge=false;
                }
                $scope.userObjectId = response.userObjectId;
            });

            //消息相关
            var getMessage = '/user/userCenter/getMessage';
            $http.get(getMessage).success(function(response){
                var msg = response.rtnMsg;
                for (var i = 0; i < msg.length; i++){
                    if (!msg[i].read){
                        $scope.unreadNotice = true;
                    }
                }
            });
        }
    };
});
app.directive("thFooter",function(){
    return {
        restrict: 'E',
        templateUrl: '/html/footer.html'


    };
});

app.controller('indexAppCtrl', function($scope, $http, $location){
    $scope.unreadNotice = false;
    $scope.chuxian = false;

    var index = navIndex;
    $scope.myColors = ['white', 'white', 'white', 'white','white','white','white'];
    $scope.myColors[index] = '#3498db';

    $scope.logout = function(){
        clearCookie('userIdCookie');
        clearCookie('username');
        location.href='/';
    };




});

