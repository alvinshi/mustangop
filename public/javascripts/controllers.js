
//user code
var gUserCId;
function getUserCode()
{
    if (window.localStorage) {
        gUserCId = localStorage.getItem("userCId");
    } else {
        gUserCId = getCookie('userCId');
    }
}

angular.module('starter.controllers', ['angularFileUpload'])
.controller('homeController', function($scope, $http, $location) {
    //是否是被邀请的
    var homeUrlList = $location.absUrl().split('/');
    var inviteCode = homeUrlList[homeUrlList.length - 1];

    getUserCode();
    //复制链接
    $scope.copyUrl = function(userCode) {
         var Url = $location.absUrl() +'/' + userCode;
         Url.select(); // 选择对象
        document.execCommand("Copy"); // 执行浏览器复制命令
    };
    //输入邀请码
    $scope.invitation=false;
    $scope.invita=function(){
        $scope.invitation=true;
    };






    //设备判定
    $scope.isIOSDevice = 0;
    $scope.isAndroidDevice = 0;
    if(/(iPhone|iPad|iPod|iOS|MacIntel|Macintosh)/i.test(navigator.userAgent)){
        $scope.isIOSDevice = 1;
    }else if(/android/i.test(navigator.userAgent)){
        $scope.isAndroidDevice = 1;
    }

    $scope.isQQBrowser = 0;
    $scope.isWeixinBrowser = 0;
    $scope.isiPhoneSafari = 0;
    if($scope.isAndroid || $scope.isIOSDevice){
        if(/QQ/i.test(navigator.userAgent)){
            $scope.isQQBrowser = 1;
        }else if(/MicroMessenger/i.test(navigator.userAgent)){
            $scope.isWeixinBrowser = 1;
        }else if(/Safari/i.test(navigator.userAgent)){
            $scope.isiPhoneSafari = 1;
        }
    }

    //alert(navigator.platform);
    //alert(navigator.userAgent);
    if($scope.isIOSDevice == 1 && $scope.isiPhoneSafari == 1){

        var userInfoUrl = '/taskUser/' + gUserCId + '/' + inviteCode;
        $http.get(userInfoUrl).success(function (response) {
            if(response.errorId == 0){
                //succeed
                if (window.localStorage) {
                    localStorage.setItem("userCId", response.userCId);
                    localStorage.setItem("userCode", response.userCode);
                } else {
                    setCookie("userCId", response.userCId);
                    setCookie("userCode", response.userCode);
                }

                $scope.userCode = response.userCode;
                $scope.apprenticeMoney = response.apprenticeMoney;
                //$scope.discipleMoney = response.discipleMoney;  //徒孙
                $scope.totalMoney = response.totalMoney;
                $scope.todayMoney = response.todayMoney;
                $scope.currentMoney = response.currentMoney;
                $scope.userCode = response.userCode;

                //TODO chenhao
                //根据masterCode 的有无,来判断是否可点击
                //若有,不可点击,显示 已拜师masterCode
                $scope.masterCode = response.masterCode;

            }else {
                $scope.errorId = response.errorId;
                $scope.message = response.message;
            }
        });
    }
    //弹出窗口
    $scope.showPopup = function () {
        $scope.data = {};
        // 自定义弹窗
        var myPopup = $ionicPopup.show({
            template: '<input type="text">',

            buttons: [
                {text: '取消'},
                {
                    text: '<b>确定</b>',
                    type: 'button-positive'

                }
            ]

        })
    };

    //invite
    $scope.copyInviteUrl = function () {
        //TODO:
    };

    //拜师(绑定邀请码接口)
    var bindLock = 0;
    $scope.bindMaster = function(){
        if(bindLock == 1){
            return;
        }
        var bindUrl = '/taskUser/bindMaster';
        //TODO chenhao
        var bindParams = {'userCode' : $scope.userCode, 'masterCode' : ''};
        bindLock = 1;

        $http.post(bindUrl, bindParams).success(function(response){
            bindLock = 0;
            if(response.errorId == 0){
                $scope.masterCode = '';
            }
        });
    }
})

.controller('TaskHallController', function($scope, $http, Locales, $ionicFilterBar) {
    getUserCode();
    var pageCount = 20;

    //默认下载
    $scope.downloadTasks = [];
    $scope.commentTasks = [];

    //isMore 1(load more) 0(refresh) -1(button click)
    $scope.switchTaskType = function (taskType, isMore) {
        $scope.taskType = taskType;
        var tasksUrl;
        if(taskType == 1){
            if($scope.downloadTasks.length > 0 && isMore == -1){
                return;
            }
            if(isMore == 0){
                //refresh
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + 0;
            }else {
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + $scope.downloadTasks.length/pageCount;
            }

            $scope.downloadLoading = true;
        }else if(taskType == 2){
            if($scope.commentTasks.length > 0 && isMore == -1){
                return;
            }
            if(isMore == 0) {
                //refresh
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + 0;
            }else {
                tasksUrl = '/taskHall/' + taskType + '/' + gUserCId + '/' + $scope.commentTasks.length / pageCount;
            }
            $scope.commentLoading = true;
        }

        if(tasksUrl == undefined){
            console.error('tasksUrl == undefined');
            return;
        }

        $http.get(tasksUrl).success(function (response) {
            if(taskType == 1){
                $scope.downloadLoading = false;
            }else if(taskType == 2){
                $scope.commentLoading = false;
            }

            if(response.errorId == 0){
                //succeed
                if(taskType == 1){
                    if(response.tasks.length > 0){
                        if(response.tasks.length == pageCount){
                            $scope.downloadHasMore = true;
                        }else {
                            $scope.downloadHasMore = false;
                        }
                        if(isMore == 0){
                            //refresh
                            $scope.downloadTasks = [];
                        }
                        $scope.downloadTasks = $scope.downloadTasks.concat(response.tasks);
                    }else {
                        $scope.downloadHasMore = false;
                    }
                }else if(taskType == 2){
                    if(response.tasks.length > 0){
                        if(response.tasks.length == pageCount) {
                            $scope.commentHasMore = true;
                        }else {
                            $scope.commentHasMore = false;
                        }
                        if(isMore == 0){
                            //refresh
                            $scope.commentTasks = [];
                        }
                        $scope.commentTasks = $scope.commentTasks.concat(response.tasks);
                    }else {
                        $scope.commentHasMore = false;
                    }
                }
            }else {
                $scope.errorId = response.errorId;
                $scope.message = response.message;
            }
        }).finally(function() {
            // Stop the ion-refresher from spinning
            if(isMore == 1){
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
            if(isMore == 0){
                $scope.$broadcast('scroll.refreshComplete');
            }
        });
    };

    $scope.switchTaskType(1, -1);

    $scope.refreshTaskHall = function(){
        $scope.switchTaskType($scope.taskType, 0);
    };

    $scope.loadMore = function(){
        $scope.switchTaskType($scope.taskType, 1);
    };
})

.controller('TaskDetailController', function($scope, $http, $location, FileUploader) {
    getUserCode();

    var appurlList = $location.absUrl().split('/');
    var taskId = appurlList[appurlList.length - 1];

    $scope.lockTaskId = undefined;
    $scope.dataStatus = 0;
    //计时器

    //——————————————————————————————————
    var tasksUrl = '/taskHall/' + gUserCId + '/' + taskId;
    $scope.loading = true;
    $http.get(tasksUrl).success(function (response) {
        $scope.loading = false;
        if(response.errorId == 0){
            //succeed
            $scope.taskDetail = response.taskDetail;
            $scope.lockTaskId = response.taskDetail.lockTaskId;
            $scope.dataStatus = 1;

            if($scope.lockTaskId != undefined){
                //任务已经领取
                $scope.doTaskCreatedAt = response.doTaskCreatedAt;
                $scope.taskPicCount = response.taskDetail.taskPicCount;
                $scope.progressNum = 0;
                //*******************************倒计时
                var time = response.taskDetail.doTaskCreatedAt;
                var taskDate = new Date(time);
                var myDate = new Date();
                var sDate = taskDate.getHours() +  taskDate.getMinutes() + taskDate.getSeconds();
                var eDate = myDate.getHours()+  myDate.getMinutes()  + myDate.getSeconds();

                //TODO chenhao 增加倒计时
                var countDownStr = '11';
                if(response.taskDetail.doTaskStatus == 'uploaded' || response.taskDetail.doTaskStatus == 'reUploaded' || response.taskDetail.doTaskStatus == 'refused'){
                    $scope.uploadButtonTitle = '重新上传' + $scope.taskPicCount + '张任务截图  ' + countDownStr;
                }else {
                    $scope.uploadButtonTitle = '上传' + $scope.taskPicCount + '张任务截图  ' + countDownStr;
                }

                if(response.taskDetail.doTaskStatus == 'refused'){
                    $scope.errorId = -1;
                    $scope.errorMsg = response.taskDetail.refusedReason;
                }
            }
        }else {
            $scope.errorId = response.errorId;
            $scope.message = response.message;
        }
    });



    var locklock = 0;
    $scope.lockTask = function(){
        if(locklock == 1){
            return;
        }
        locklock = 1;

        var lockTaskUrl = '/taskHall/lockTask';
        var lockParam = {'userCId' : gUserCId, 'taskId' : taskId};
        $http.post(lockTaskUrl, lockParam).success(function(response){
            locklock = 0;
            if(response.errorId == 0){
                $scope.lockTaskId = response.lockTaskId;
                $scope.doTaskCreatedAt = response.doTaskCreatedAt;
                $scope.taskPicCount = response.taskPicCount;
                $scope.uploadButtonTitle = '上传' + $scope.taskPicCount + '张任务截图  ' + '43:20';
            }
        });
    };

    function waitingDoTaskTimer(){

    }

    var unlocklock = 0;
    $scope.unlockTask = function(){
        if(unlocklock == 1 || $scope.lockTaskId == undefined){
            return;
        }
        unlocklock = 1;

        var lockTaskUrl = '/taskHall/unlockTask';
        var lockParam = {'userCId' : gUserCId, 'lockTaskId' : $scope.lockTaskId};
        $http.post(lockTaskUrl, lockParam).success(function(response){
            unlocklock = 0;
            if(response.errorId == 0){
                $scope.lockTaskId = undefined;
            }
        });
    };

    //var posklock = 0;
    //$scope.postTask = function(){
    //    if(posklock == 1){
    //        return;
    //    }
    //    posklock = 1;
    //
    //    var uploadTaskUrl = '/taskHall/tempUserDoTask';
    //    var lockParam = {'userCId' : gUserCId, 'taskId' : $scope.taskDetail.id};
    //    $http.post(uploadTaskUrl, lockParam).success(function(response){
    //        posklock = 0;
    //    });
    //};

    $scope.preUploadFile = function () {
        $scope.imgError = 1;
        uploader.clearQueue();
    };

    //上传图片的代码
    if (window.localStorage) {
        $scope.userCode = localStorage.getItem("userCode");
    } else {
        $scope.userCode = getCookie('userCode');
    }

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3
        //removeAfterUpload:true
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });

    //$scope.deletFile = function () {
    //    $scope.imgError = 1;
    //    uploader.clearQueue();
    //};

    var fileUrls = new Array();

    uploader.onAfterAddingFile = function (fileItem) {
        //
    };

    uploader.onAfterAddingAll = function (addedFileItems) {
        $scope.errorId = 0;
        $scope.progressNum = 5;

        uploader.uploadAll();
        console.info('onAfterAddingAll', addedFileItems);
    };

    uploader.onProgressAll = function (progress) {
        $scope.progressNum = progress*0.8 > 10 ? progress*0.8 : 10;
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function (fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function (fileItem, response, status, headers) {
        $scope.errorId = 1;
        $scope.errorMsg = '上传图片失败';
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };

    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        if(response.fileUrlList != undefined && response.fileUrlList.length > 0){
            fileUrls.push(response.fileUrlList[0]);
            console.info('onCompleteItem', fileItem, response, status, headers);
        }else {
            $scope.errorId = -100;
            $scope.errorMsg = '一张或多张图片上传失败,刷新网页重新上传';
        }

    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');
        var Url = '/taskHall/tempUserDoTask';
        $scope.progressNum = 90;

        $http.post(Url, {
                'userCId':gUserCId,
                'taskId':$scope.lockTaskId,
                'uploadName':$scope.userCode,
                'requirementImgs': fileUrls
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                console.log($scope.errorId);
                console.log($scope.errorMsg);
                if($scope.errorId == 0){
                    $scope.images = response.requirementImgs;
                    $scope.uploadButtonTitle = '任务提交成功';
                    $("#up").attr("disabled", true);
                }else {
                    $scope.errorId = response.errorId;
                    $scope.errorMsg = response.message;
                }

                $scope.progressNum = 0;

                uploader.clearQueue();
                fileUrls = Array();
            });
    };

    $scope.endTask = function(){
        //location.href='/myClaim/' + $scope.oneAppInfo.userObjectId;
    }
})

.controller('MyTaskController', function($scope, $http) {
    getUserCode();

    var tasksUrl = '/taskHall/myTask';
    $scope.loading = true;
    $http.post(tasksUrl, {'userCId': gUserCId}).success(function (response) {
        $scope.loading = false;
        if(response.errorId == 0){
            //succeed
            $scope.retList = response.retList;
            $scope.undoTask = response.undoTask;
            $scope.willGetRmb = response.willGetRmb;
        }else {
            $scope.errorId = response.errorId;
            $scope.message = response.message;
        }
    });

})

.controller('AccountController', function($scope, $http) {
    getUserCode();
        $scope.settings = {
            enviarNotificaciones: true
        };
});
