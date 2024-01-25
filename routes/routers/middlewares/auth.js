// 引入依赖包
const jwt = require('jsonwebtoken');
const userServices = require("../../../services/userServices.js")
const responses = require('../../../vitals/responses');
const globalStates = require("../../../vitals/globalState");
const hash = require("../../../utils/hash.js")

const defaultAuthInfo = {
    tokenAuth: {
        status: "unknown",
        user: undefined
    },
    serviceKeyAuth: {
        status: "unknown",
        user: undefined
    },
    apiKeyAuth: {
        status: "unknown",
        user: undefined
    },
}

const authInitialize = async (req, res, next) => {
    // unknown未知、absent不存在鉴权字段、failed存在鉴权字段但鉴权失败、succeeded存在鉴权字段且鉴权成功
    req.authInfo = JSON.parse(JSON.stringify(defaultAuthInfo));
    req.forcedAuth = true;
    next();
}

const unforcedAuthInitialize = async (req, res, next) => {
    // unknown未知、absent不存在鉴权字段、failed存在鉴权字段但鉴权失败、succeeded存在鉴权字段且鉴权成功
    req.authInfo = JSON.parse(JSON.stringify(defaultAuthInfo));
    req.forcedAuth = false;
    next();
}

// 中间件：验证授权
const tokenAuth = async (req, res, next) => {
    try {
        if (req.authInfo == undefined) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error("在运行特定的auth中间件前没有正确运行authInitialize中间件");
            return;
        }
        // 获取客户端请求头的token
        let token = undefined;
        if (req.headers.authorization != undefined) token = req.headers.authorization;

        if (token != undefined) {
            const rawToken = String(token).split(' ').pop()
            jwt.verify(rawToken, globalStates.config.jwtSecret, async function (err, decoded) {
                if (err) {
                    req.authInfo.tokenAuth.status = "failed";
                } else {
                    let user_id = decoded.id;
                    req.authInfo.tokenAuth.status = "succeeded";
                    req.authInfo.tokenAuth.userGroup = await userServices.getUserGroupByUserId(user_id);
                    req.authInfo.tokenAuth.user = await userServices.getUserInfoByUserId(user_id);
                    req.authInfo.tokenAuth.user.pwd = undefined;
                    req.authInfo.tokenAuth.authEntity = token;
                }
                next();
            })
        } else {
            req.authInfo.tokenAuth.status = "absent";
            next();
        }
    } catch (e) {
        res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
    }
}

const serviceKeyAuth = (req, res, next) => {
    try {
        if (req.authInfo == undefined) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error("在运行特定的auth中间件前没有正确运行authInitialize中间件");
            return;
        }
        // 获取客户端请求头或query的serviceKey
        let serviceKey = undefined;
        if (req.headers.servicekey != undefined) serviceKey = req.headers.servicekey;
        if (req.query.servicekey != undefined) serviceKey = req.query.servicekey;

        if (serviceKey != undefined) {
            const originalKeyContent = String(serviceKey)
            userServices.getServiceKeyByKeyContent(hash.generateHash(originalKeyContent)).then(async (serviceKey) => {
                if (serviceKey == undefined) {
                    req.authInfo.serviceKeyAuth.status = "failed";
                } else {
                    if (hash.isServiceKeyValid(originalKeyContent, serviceKey)) {
                        req.authInfo.serviceKeyAuth.status = "succeeded";
                        req.authInfo.serviceKeyAuth.userGroup = await userServices.getUserGroupByUserId(serviceKey.user_id);
                        req.authInfo.serviceKeyAuth.user = await userServices.getUserInfoByUserId(serviceKey.user_id);
                        req.authInfo.serviceKeyAuth.user.pwd = undefined;
                        req.authInfo.serviceKeyAuth.securityParams = JSON.parse(serviceKey.security_params);
                        req.authInfo.serviceKeyAuth.authEntity = serviceKey.service_key_id;
                    } else {
                        req.authInfo.serviceKeyAuth.status = "failed";
                    }
                }
                next();
            }).catch((err) => {
                console.error(err);
                req.authInfo.serviceKeyAuth.status = "failed";
                next();
            })
        } else {
            req.authInfo.serviceKeyAuth.status = "absent";
            next();
        }
    } catch (e) {
        res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
    }
}


const authFinalize = async (req, res, next) => {
    let authSuccess = false;
    for (let key in req.authInfo) {
        if (req.authInfo[key].status == "succeeded") {
            req.authInfo = req.authInfo[key];
            req.authInfo.method = key;
            authSuccess = true;
            break;
        }
    }
    req.authInfo.authSuccess = authSuccess;
    // 如果是强制要求鉴权并且鉴权失败了，则不进行进一步响应
    if (!authSuccess && req.forcedAuth) {
        res.status(401).json(responses.AUTHENTICATION_ERROR("[鉴权错误] 用户鉴权信息不正确"))
        return;
    }
    next();
}

module.exports = {
    unforcedAuthInitialize, authInitialize, tokenAuth, serviceKeyAuth, authFinalize
};