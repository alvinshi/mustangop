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

    //删除当前交换记录
    $scope.releaseBtnClick = function(appid,appversion){
        $scope.prepareReleaseAppid = appid;
        $scope.prepareReleaseVersion = appversion;
    };

    $scope.removeHistory = function(){
        var releaseHistoryUrl = '/myapp/history/delete';

        var myAppId = $scope.appBaseInfo.appleId;
        var myAppVersion = $scope.appBaseInfo.version;

        var postParam = {'myAppId' : myAppId, 'myAppVersion' : myAppVersion,
            'hisAppId' : $scope.prepareReleaseAppid, 'hisAppVersion' : $scope.prepareReleaseVersion};
        console.log('add history' + postParam);

        $http.post(releaseHistoryUrl, postParam).success(function(response){
            if (response.errorId == 0){
                console.log('remove app if');

                if ($scope.appResults != undefined){
                    //change ui
                    for (var q = 0; q < $scope.appResults.length; q++){
                        var appRe = $scope.appResults[q];

                        if (appRe.appleId === $scope.prepareReleaseAppid){
                            appRe.isExced = false;
                            console.log(appRe.appleId + 'is exchanged');
                            break;
                        }
                    }
                }

                //other thing
                for (var i = 0; i < $scope.myExcAllApps.length; i++){
                    var app = $scope.myExcAllApps[i];
                    if (app.appleId == $scope.prepareReleaseAppid){
                        console.log('remove app to ui');
                        $scope.myExcAllApps.splice(i, 1);
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                console.log('remove app else');
                $scope.errorMsg = response.errorMsg;
            }

        });
    };

    //搜索iTunes
    $scope.searchHistoryApp = function () {
        $scope.isError = 0;
        $scope.progressNum = 100;

        if ($scope.searchUrl != '') {

            var searchUrl = '/myapp/addHistory/' + appid + '/' + $scope.appBaseInfo.version + '/' + $scope.searchKey;

            $http.get(searchUrl).success(function (response) {

                $scope.pageSize = 6; //每页显示条数
                $scope.pagedItems = [];
                $scope.currentPage = 0; // 当前页

                var totalCount = response.appResults; //获取总数list

                // 处理每页获取的数据逻辑
                for (var e = 0; e < totalCount.length; e++) {
                    if (e % $scope.pageSize === 0) {
                        $scope.pagedItems[Math.floor(e / $scope.pageSize)] = [ totalCount[e] ];
                    } else {
                        $scope.pagedItems[Math.floor(e / $scope.pageSize)].push(totalCount[e]);
                    }
                }

                // 上一页
                $scope.prevPage = function () {
                    if ($scope.currentPage > 0) {
                        $scope.currentPage--;
                    }
                };

                // 下一页
                $scope.nextPage = function () {
                    if ($scope.currentPage < $scope.pagedItems.length - 1) {
                        $scope.currentPage++;
                    }
                };

                $scope.progressNum = 0;

                if (response.errorMsg.length > 0) {
                    $scope.isError = 1;
                    $scope.errorMsg = response.errorMsg;
                } else {
                    $scope.errorMsg = '';
                    if (totalCount.length == 0) {
                        $scope.isError = 1;
                        $scope.errorMsg = '未找到你搜索的App';
                    }
                }

                //console.log($scope.appResults);
            })
        }
    };

    $scope.keySearchApp = function(e){
        var keycode = window.event?e.keyCode:e.which;
        //console.log('keycode ' + keycode);
        //enter or space
        if(keycode==13 || keycode==32){
            $scope.searchHistoryApp();
        }
    };


    // 弹框里面添加交换的应用
    $scope.addHistory = function(hisAppInfo){

        var addHistoryUrl = '/myapp/addHistory/' + appid + '/' + $scope.appBaseInfo.version;

        var postParam = {'hisAppInfo' : hisAppInfo};
        console.log('add history' + postParam);
        $http.post(addHistoryUrl, postParam).success(function(response){

            $scope.isError = response.errorId;
            console.log(response.errorId);

            if (response.errorId == 0 || response.errorId === undefined){

                if ($scope.myExcAllApps == undefined){
                    $scope.myExcAllApps = new Array();
                }

                //change ui
                for (var i = 0; i < $scope.appResults.length; i++){
                    var appRe = $scope.appResults[i];

                    if (appRe.appleId === hisAppInfo.appleId){
                        appRe.isExced = true;
                        console.log(appRe.appleId + 'is exchanged');
                        break;
                    }
                }

                $scope.errorMsg = '';
            }else {
                $scope.errorMsg = response.errorMsg;
            }

        });
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
})
