/**
 * Created by cailong on 16/5/30.
 */

var app = angular.module('myAppContent', ['angularFileUpload']);

app.controller('myAppControl', function($scope, $http, $location, FileUploader) {
    var appurlList = $location.absUrl().split('/');
    var appid = appurlList[appurlList.length - 1];
    var myappUrl = 'baseinfo/' + appid;

    $http.get(myappUrl).success(function (response) {
        $scope.appBaseInfo = response.appBaseInfo;

        var historyUrl = '/myapp/history/angular/' + appid + '/' + $scope.appBaseInfo.version + '/' + -1;
        $http.get(historyUrl).success(function (response) {
            $scope.myExcAllApps = response.myExcAllApps;
        });
    });




    //搜索iTunes
    $scope.searchHistoryApp = function () {
        $scope.isError = 0;

        if ($scope.searchUrl != '') {

            var searchUrl = '/myapp/addHistory/' + appid + '/' + $scope.appBaseInfo.version + '/' + $scope.searchKey;

            $scope.progressNum = 100;

            $http.get(searchUrl).success(function (response) {

                console.log(response);

                $scope.appResults = response.appResults;

                $scope.progressNum = 0;

                if (response.errorMsg.length > 0) {
                    $scope.isError = 1;
                    $scope.errorMsg = response.errorMsg;
                } else {
                    $scope.errorMsg = '';
                    if ($scope.appResults.length == 0) {
                        $scope.isError = 1;
                        $scope.errorMsg = '未找到你搜索的App';
                    }
                }

                //console.log($scope.appResults);
            });
        }
    };

    var prepareUploadFile = undefined;
    var prepareSaveApp = undefined;

    //upload file
    var uploader = $scope.uploader = new FileUploader({
        url: '/upload/img',
        queueLimit: 1
    });

    $scope.saveTask = function (app) {

        //一次只能保存一个任务,不支持多个同时保存
        if (!uploader.isUploading) {
            $scope.saveMgs = '';

            prepareSaveApp = app;
            uploader.uploadItem(uploader.queue[uploader.queue.length - 1]);

            //上传成功的回掉里,保存换评参数
        } else {
            $scope.saveMgs = '请等待上个任务保存成功';
        }

    };

    $scope.deletFile = function () {
        uploader.clearQueue();
    };

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|'.indexOf(type) !== -1;
        }
    });
    // CALLBACKS

    uploader.onAfterAddingFile = function (fileItem) {
        console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function (addedFileItems) {
        $scope.files = addedFileItems;
        console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function (item) {
        console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function (fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function (progress) {
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function (fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function (fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);

        var appUrl = 'excTaskId/' + prepareSaveApp.appExcTaskObjectID;

        $http.post(appUrl, {
                'excKinds': prepareSaveApp.excKinds,
                'totalExcCount': prepareSaveApp.totalExcCount,
                'requirementImg': response.fileUrlList[0]
            })
            .success(function (response) {
                $scope.errorId = response.errorId;
                $scope.errorMsg = response.errorMsg;
            });
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');
    };

    console.info('uploader', uploader);
});
