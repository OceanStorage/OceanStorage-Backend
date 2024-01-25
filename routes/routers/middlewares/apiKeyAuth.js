// 引入依赖包
let { query } = require("../../../vitals/sqlconn.js");
const userServices = require("../../../services/userServices.js")


// 中间件：验证授权
const auth = async (req, res, next) => {
    // 获取客户端请求头的ApiKey
    let api_key = String(req.headers.apikey);
    if(api_key == undefined) api_key = String(req.body.apikey);
    if(api_key == undefined) {
        req.authInfo.apiKeyAuth.status = "absent";
        next();
    } else {
        let key_info = (await query("SELECT * FROM api_keys WHERE api_key = ?" , [api_key]))[0];
        if(key_info != undefined){
            let container_info = (await query("SELECT * FROM containers WHERE container_id = ?",[key_info.container_id]))[0];
            if(container_info != undefined){
                req.authInfo.apiKeyAuth.status = "succeeded";
                req.authInfo.apiKeyAuth.userGroup = await userServices.getUserGroupByUserId(container_info.user_id);
                req.authInfo.apiKeyAuth.user = await userServices.getUserInfoByUserId(container_info.user_id);
                req.authInfo.apiKeyAuth.user.pwd = undefined;
                req.authInfo.apiKeyAuth.authEntity = api_key;
                req.container_info = container_info;
                next();
            } else {
                req.authInfo.apiKeyAuth.status = "absent";
                next();
            }
        } else {
            req.authInfo.apiKeyAuth.status = "absent";
            next();
        }
    }
 }

module.exports = auth;