module.exports = {
    SUCCESS(result){
        return {
            code: 200,
            message: "200: 操作成功",
            data: result
        }
    },
    OK(){
        return {
            code: 200,
            message: "200: 操作成功",
        }
    },
    INTERNAL_ERROR(error){
        return {
            code: 500, 
            message: "500: 服务器错误", 
            data: error
        }
    },
    SERVICE_UNAVAILABLE(error){
        return {
            code: 503, 
            message: "503: 服务不可用", 
            data: error
        }
    },
    BAD_REQUEST(error){
        return {
            code: 400, 
            message: "400: 错误的请求", 
            data: error
        }
    },
    AUTHENTICATION_ERROR(error){
        return {
            code: 401, 
            message: "401: 无权限或权限过期", 
            data: error
        }
    },
    NO_HACKING(error){
        return {
            code: 418, 
            message: "418: 你手速太快啦，土豆服务器吃不住，请稍等半分钟再操作", 
            data: error
        }
    },
}