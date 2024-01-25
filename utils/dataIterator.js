async function fetchDataWithValidatorIterately(params){
    if((params.startId != undefined && isNaN(params.startId)) || isNaN(params.rows)){
        return {
            code: -1, results: [], reason:"迭代参数不正确"
        }
    }
    // 检查start_id对应的对象是否合法
    if(params.startId != undefined){
        let startObject = await params.getSingleMethod(params.startId);
        let isStartValid = true;
        if(startObject == undefined){
            isStartValid = false;
        } else if(!params.validator(startObject)){
            // 鉴权
            isStartValid = false;
        }


        if(!isStartValid) return {
            code: -1, results: [], reason:"startId不合法"
        }
    }
    
    // 滑动窗口遍历法
    let finalResults = [];
    let isEnd = false;
    let myStartId = params.startId;
    let myRows = Number(params.rows);
    while(finalResults.length < Number(params.rows) && !isEnd){
        // 向前搜索rows个项目
        let result = await params.getIteratelyMethod(myStartId, myRows)
        // 如果返回结果不足rows个，则说明已经遍历到结尾了
        if(result.length < myRows) isEnd = true;
        // 通过鉴权器进行过滤
        result = result.filter(item => {
            return params.validator(item);
        })
        // 如果拿到的数据存在被过滤掉的情况，则进行翻倍扩张，在下次向前搜索时获得更大的视野
        if(result.length < myRows) myRows = myRows * 2;
        finalResults = finalResults.concat(result);
        // 滑动窗口
        if(finalResults.length != 0) myStartId = finalResults[finalResults.length - 1][params.idParam];
    }
    return {
        code: 0, results: finalResults.slice(0, Number(params.rows))
    }

}

module.exports = fetchDataWithValidatorIterately