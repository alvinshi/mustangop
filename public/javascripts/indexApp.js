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
    $scope.unreadNotice = false;
    $scope.chuxian = false;

    var index = navIndex;
    $scope.myColors = ['white', 'white', 'white', 'white','white','white','white'];
    $scope.myColors[index] = '#3498db';

    var indexUrl = '/index';

    $http.get(indexUrl).success(function(response){
        $scope.Count = response.Count;
        $scope.userObjectId = response.userObjectId;
        loadNav();
        //$scope.tracknameAPPs = response.tracknameAPPs; // 因为以前导航栏需要获取数据
    });
    $scope.logout=function(){

        clearCookie('userIdCookie');
        clearCookie('username');

        location.href='/';
    };

    var getMessage = '/user/userCenter/getMessage';
    $http.get(getMessage).success(function(response){
        var msg = response.rtnMsg;
        for (var i = 0; i < msg.length; i++){
            if (!msg[i].read){
                $scope.unreadNotice = true;
            }
        }
    });

    var unreadMsgUrl = '/unreadMsg';
    $http.get(unreadMsgUrl).success(function(response){
        $scope.unreadMsgCount = response.unreadMsgCount;
        if (response.unreadMsgCount != 0){
            $scope.chuxian = true;
        }
    });



    //var fooReveal = {
    //    delay    : 200,
    //    distance : '90px',
    //    easing   : 'ease-in-out',
    //    rotate   : { z: 10 },
    //    scale    : 0.9
    //};
    //
    //window.sr = ScrollReveal();
    //sr.reveal('.foo', fooReveal);
    //sr.reveal('#chocolate', { delay: 500, scale: 1.2 });


});

