// 各个依赖包
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan')
const logger = require('./logger')
const history = require("connect-history-api-fallback");
const responses = require("./vitals/responses");
const globalState = require("./vitals/globalState");
const net = require('net');
const infoServices = require("./services/infoServices");
const multipart = require('connect-multiparty');
const multipartyMiddleware = multipart();
require('./vitals/objectFilter');

// Express 引用实例化
const app = express();

// 使用 morgan 打印日志
app.use(morgan('dev'));

// 使用对 Post 来的数据 json 格式化
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
let multipartyExcludedPath = [
    "/api/resource/upload",
    "/upload/img"
]
app.use(function (req, res, next) {
    if(!multipartyExcludedPath.includes(req._parsedUrl.pathname)) {
        multipartyMiddleware(req, res, next);
    } else {
        next();
    }
});

// 捕捉致命错误 如果服务端存在致命错误则不响应任何请求
app.use(function (req, res, next) {
    for (let key in globalState.fatalError) {
        if (globalState.fatalError[key]) {
            res.status(503).json(responses.SERVICE_UNAVAILABLE("[致命错误] 服务器在以下检查项中存在致命错误：" + key + ", 请联系服务器管理员"));
            console.fatal_error("[致命错误] 服务器在以下检查项中存在致命错误：" + key + ", 故无法响应任何请求");
            return;
        }
    }
    next();
});

// 使用对表单提交的数据 进行格式化
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//设置允许跨域访问该服务
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Expose-Headers', 'Content-Disposition');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});

// 对返回器的封装，用于记录日志
app.use((req, res, next) => {
    let rewriteMethods = ["json", "download", "sendFile", "send"];
    for (let method of rewriteMethods) {
        let resMethod = res[method];
        res[method] = (...args) => {
            resMethod.bind(res)(...args);
            let logData = {
                url: req.originalUrl,
                headers: req.headers,
                method: req.method,
                response_code: res.statusCode,
                ip: req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '',
                authInfo:req.authInfo
            }
            infoServices.addApiLog(logData, req.visitLogId);
            // 缓存处理
            if(req.headers['if-modified-since'] != undefined || req.headers['if-none-match'] != undefined){
                infoServices.setCachedVisitLog(req.visitLogId);
            }
        }
    }
    next();
});


// 路由文件引用
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

/**
* error handler
* @private
*/
// 处理非404的错误（throw 出来的错误)
const _errorHandler = (err, req, res, next) => {
    logger.error(`${req.method} ${req.originalUrl} ` + err.message)
    const errorMsg = err.message
    res.status(err.status || 500).json({
        code: -1,
        success: false,
        message: errorMsg,
        data: {}
    })
}
app.use(_errorHandler)

//  捕捉404错误 catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

module.exports = app;
