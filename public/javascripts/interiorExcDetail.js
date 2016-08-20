/**
 * Created by cailong on 16/7/21.
 */

var app = angular.module('yemaWebApp', ['angularFileUpload']);
var navIndex = 2;

app.controller('interorDetailControl',function($scope, $http, $location, FileUploader){
    var appurlList = $location.absUrl().split('/');
    var excTaskId = appurlList[appurlList.length - 1];

    var Url = 'interior' + '/' + excTaskId;
    $http.get(Url).success(function(response){
        $scope.oneAppInfo = response.oneAppInfo;

        for (var i = 0; i < response.macTasks.length; i++){
            // 翻译任务的状态
            if (response.macTasks[i].status == 'uploaded' || response.macTasks[i].status == 'reUploaded'){
                response.macTasks[i].status = '待审'
            }else if (response.macTasks[i].status == 'rejected' || response.macTasks[i].status == "refused"){
                response.macTasks[i].status = '拒绝'
            }else if (response.macTasks[i].status == 'accepted' || response.macTasks[i].status == 'systemAccepted'){
                response.macTasks[i].status = '已完成'
            }else if (response.macTasks[i].status == 'expired'){
                response.macTasks[i].status = '已过期'
            }else {
                response.macTasks[i].status = ''
            }
        }

        $scope.taskInfo = response.macTasks;

        //这个信息被用来給电脑批量上传的任务取名.
        $scope.nextTaskNum = ($scope.oneAppInfo.totalExcCount - $scope.oneAppInfo.tasksRemain) + 1;
    });

    //*******************上传图片*********************
    //解析上传者姓名
    $scope.setUploaderName = function(name){
        if (name == undefined){
            $scope.uploaderName =  '电脑' + parseInt($scope.nextTaskNum);
        }
        else {
            $scope.uploaderName = name;
        }
    };

    //初始上传变量
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 3,
    });

    var fileUrls = new Array();

    //Callbacks
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        console.info('onAfterAddingAll', addedFileItems);
        uploader.uploadAll();
    };
    uploader.onBeforeUploadItem = function(item) {
        console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        if(response.fileUrlList != undefined && response.fileUrlList.length > 0){
            fileUrls.push(response.fileUrlList[0]);
            console.info('onCompleteItem', fileItem, response, status, headers);
        }else {
            $scope.errorId = -100;
            $scope.errorMsg = '网络异常,图片上传错误,刷新网页重新上传';
        }
    };
    uploader.onCompleteAll = function() {
        console.info('onCompleteAll');
        var url = '/interiorExcDetail/add/' + excTaskId;
        $scope.progressNum = 90;

        $http.post(url, {
                'uploadName': $scope.uploaderName,
                'requirementImgs': fileUrls
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
                console.log($scope.errorId);
                console.log($scope.errorMsg);
                if($scope.errorId == 0){
                    location.reload();
                }

                $scope.progressNum = 0;

                uploader.clearQueue();
                fileUrls = Array();
            });
    };
    console.info('uploader', uploader);
});