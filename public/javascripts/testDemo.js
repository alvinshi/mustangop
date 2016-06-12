/**
 * Created by wujiangwei on 16/6/3.
 */


function handleUploadFiles(files){

}


itemList = new Array();
for (var i = 0; i < 120; i++){
    itemList.push(i + ' itemList');
}

var pageCount = 6;
itemPageList = new Array();
for (var j = 0; j < itemList.length/pageCount; j++){
    itemPageList.push(itemList.slice(j * pageCount, (j+1) * pageCount));
}

console.log(itemPageList);