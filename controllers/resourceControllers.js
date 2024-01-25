const resourceServices = require("../services/resourceServices");
const userServices = require("../services/userServices");
const responses = require("../vitals/responses");
const generateUniqueID = require('../utils/idGenerator');
const multer = require('multer');
const path = require('path');
const globalStates = require("../vitals/globalState");
const fs = require("fs");
const hash = require("../utils/hash");
const { resource } = require("../app");
const iconv = require('iconv-lite');
const infoServices = require("../services/infoServices")
const mime = require('mime');
const fetchDataWithValidatorIterately = require("../utils/dataIterator")

function getRandom(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function getAPIKeyCode() {
    let code = '';
    for (var i = 0; i < 30; i++) {
        var type = getRandom(1, 3);
        switch (type) {
            case 1:
                code += String.fromCharCode(getRandom(48, 57));//数字
                break;
            case 2:
                code += String.fromCharCode(getRandom(65, 90));//大写字母
                break;
            case 3:
                code += String.fromCharCode(getRandom(97, 122));//小写字母
                break;
        }
    }
    return code;
}

function isPermissionLowerThan(operationType, permission_level) {
    if (permission_level == "private") {
        return false;
    } else if (permission_level == "readable") {
        return operationType == "r"
    } else if (permission_level == "free") {
        return true;
    }
    return false;
}

/**
 * 
 * @param {*} authInfo 鉴权器的分析结果
 * @param {*} leastPermissionRange 该操作所要求的最低权限范围，值为'container'或'resource'
 * @param {*} object 操作对象
 * @param {*} operationType 操作类型，值为'r'或'w'
 * @returns 
 */
const hasPermission = (authInfo, leastPermissionRange, objectType, object, operationType) => {
    if (leastPermissionRange != "container" && leastPermissionRange != "resource") return false;
    if (object === undefined) return false;
    // 对于资源级操作，先判断permission_level与operationType
    if (leastPermissionRange == "resource") {
        if (isPermissionLowerThan(operationType, object.permission_level)) return true;
    }
    // 判断是否鉴权成功
    if (authInfo.authSuccess) {

        // 如果是token验证方式
        if (authInfo.method == "tokenAuth") {
            if (object.user_id == authInfo.user.user_id) return true; else return false;
        } else if (authInfo.method == "serviceKeyAuth") {
            // 如果是serviceKey验证方式
            // 账户级ServiceKey
            if (authInfo.securityParams.level == "client") {
                if (object.user_id == authInfo.user.user_id && isPermissionLowerThan(operationType, authInfo.securityParams.permission_level)) {
                    if (leastPermissionRange == "container") {
                        return (authInfo.securityParams.range == "container");
                    } else return true;
                } else return false;
            } else if (authInfo.securityParams.level == "object") {
                for (let accessItem of authInfo.securityParams.access) {
                    // 当操作要求的是容器级权限，而该条访问权限的范围仅为资源级时，默认拒绝
                    if (leastPermissionRange == "container" && accessItem.range == "resource") {
                        continue;
                    } else {
                        //用针对容器的权限去对容器对象或资源对象都是可以的，因为它们都有container_id属性
                        if (accessItem.type == "container") {
                            if (object.container_id == accessItem.id && isPermissionLowerThan(operationType, accessItem.permission_level))
                                return true; else continue;
                        } else if (accessItem.type == "resource") {
                            //尝试用针对资源的权限去鉴定容器对象，不可能成功，因为容器对象没有resource_id属性
                            if (objectType == "container") continue;
                            if (object.resource_id == accessItem.id && isPermissionLowerThan(operationType, accessItem.permission_level))
                                return true; else continue;
                        }
                    }
                }
                return false;

            } else throw new Error("ServiceKey内容不正确: " + JSON.stringify(authInfo.securityParams))
        } else if (authInfo.method == "apiKeyAuth") {
            return true;
        }
    } else {
        return false;
    }

}

module.exports = {
    async getContainers(req, res) {
        try {
            let result = await fetchDataWithValidatorIterately({
                startId: req.query.startId,
                rows: req.query.rows,
                async getSingleMethod(id) {
                    return (await resourceServices.getContainerById(id))
                },
                async getIteratelyMethod(startId, rows) {
                    return (await resourceServices.getContainersByUserIdIterately(req.authInfo.user.user_id, startId, rows))
                },
                validator(container) {
                    return hasPermission(req.authInfo, "container", "container", container, 'r')
                },
                idParam: "container_id"
            })
            if (result.code == 0) {
                res.status(200).json(responses.SUCCESS(result.results));
            } else {
                res.status(400).json(responses.BAD_REQUEST(result.reason));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getContainerInfoById(req, res) {
        try {
            let container = await resourceServices.getContainerById(req.query.containerId);
            if (container == undefined) {
                res.status(400).json(responses.BAD_REQUEST("容器不存在"));
                return;
            }
            // 通过鉴权器进行过滤
            if (!hasPermission(req.authInfo, "container", "container", container, 'r')) {
                res.status(401).json(responses.AUTHENTICATION_ERROR("权限不足"))
            } else {
                res.status(200).json(responses.SUCCESS(container));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getResourcesByContainerId(req, res) {
        try {
            let container = await resourceServices.getContainerById(req.query.containerId);
            if (container != undefined) {
                let result = await fetchDataWithValidatorIterately({
                    startId: req.query.startId,
                    rows: req.query.rows,
                    async getSingleMethod(id) {
                        return (await resourceServices.getResourceById(id))
                    },
                    async getIteratelyMethod(startId, rows) {
                        return (await resourceServices.getResourcesByContainerIdIterately(req.query.containerId,
                            startId, rows))
                    },
                    validator(resource) {
                        return hasPermission(req.authInfo, "container", "resource", resource, 'r')
                    },
                    idParam: "resource_id"
                })
                if (result.code == 0) {
                    res.status(200).json(responses.SUCCESS(result.results));
                } else {
                    res.status(400).json(responses.BAD_REQUEST(result.reason));
                }
            } else {
                res.status(400).json(responses.BAD_REQUEST("容器不存在"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async createNewContainer(req, res) {
        try {
            // 表单验证
            if (["readable", "free", "private"].indexOf(req.body.permissionLevel) == -1) {
                res.status(400).json(responses.BAD_REQUEST("permissionLevel的值不正确"))
                return;
            }
            if (req.body.containerName == undefined || !/^[\u4e00-\u9fa50-9A-Za-z_]{2,20}$/.test(req.body.containerName)) {
                res.status(400).json(responses.BAD_REQUEST("容器名不符合规范，应为：数字、字母、下划线或中文字符组成的2-20位"))
                return;
            }
            // object中仅包含user_id，说明这是只有client级别的serviceKey才能使用通过鉴权。
            if (hasPermission(req.authInfo, "container", "container", { user_id: req.authInfo.user.user_id }, 'w')) {

                let result = await resourceServices.createNewContainer(generateUniqueID(), req.body.containerName, req.authInfo.user.user_id, req.body.permissionLevel);
                res.status(200).json(responses.SUCCESS(result));
            } else {
                res.status(401).json(responses.AUTHENTICATION_ERROR("权限不足"))
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async editContainerInfo(req, res) {
        try {
            // 表单验证
            if (["readable", "free", "private"].indexOf(req.body.permissionLevel) == -1) {
                res.status(400).json(responses.BAD_REQUEST("permission_level的值不正确"))
                return;
            }
            if (req.body.containerName == undefined || !/^[\u4e00-\u9fa50-9A-Za-z_]{2,20}$/.test(req.body.containerName)) {
                res.status(400).json(responses.BAD_REQUEST("容器名不符合规范，应为：数字、字母、下划线或中文字符组成的2-20位"))
                return;
            }

            let container = await resourceServices.getContainerById(req.body.containerId);

            if (hasPermission(req.authInfo, "container", "container", container, 'w')) {
                let result = await resourceServices.editContainerInfo(req.body.containerId, req.body.containerName, req.body.permissionLevel);
                res.status(200).json(responses.SUCCESS(result));
            } else {
                res.status(401).json(responses.AUTHENTICATION_ERROR("权限不足"))
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async beforeUploadCheck(req, res, next){
        try {
            let container = await resourceServices.getContainerById(req.query.container);
            if(container == undefined) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 容器不存在"))
                return;
            }
            req.containerInfo = container;
            // 进行用户组用量判断
            let visitCheckResult = await infoServices.getVisitCheck( req.containerInfo.user_id, "upload");
            console.log(visitCheckResult)
            if(!visitCheckResult){
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 用量超过了用户组限制，请求无法被响应"));
                return;
            }
            // 判断通过，执行下面的步骤
            next();
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    multerMiddleware: multer({
        storage: multer.diskStorage({
            destination: globalStates.config.resourceBase,
            filename(req, file, cb) {
                const originalname = file.originalname;
                const i = originalname.lastIndexOf('.');
                const ext = originalname.substring(i);

                // 生成唯一名称
                req.resourceId = generateUniqueID();
                req.fileExt = ext;

                const unique_name = req.resourceId + ext

                cb(null, unique_name)
            }
        }),
        fileFilter(req, file, cb) {
            // 表单检查，检查rename
            if (req.query.rename != undefined && !/^[^\s\\\\/:*?"<>|]+(\.[^\s\\\\/:*?"<>|]+)?$/.test(req.query.rename)) {
                req.fileAccepted = {
                    status: false,
                    reason: "重命名不符合文件系统规范"
                }
                cb(null, false)
                return;
            }
            // 1. 通过鉴权检查是否有上传权限
            if (!hasPermission(req.authInfo, "resource", "container", req.containerInfo, 'w')) {
                req.fileAccepted = {
                    status: false,
                    reason: "权限不足"
                }
                cb(null, false)
                return;
            } else {
                req.fileAccepted = {
                    status: true,
                    reason: ""
                }
                cb(null, true)
                return;
            }
        }
    }),
    async uploadResource(req, res, next) {
        try {
            if (req.fileAccepted == undefined) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 服务器未接受文件，原因：未正确接收到文件"));
                return;
            }

            if (req.fileAccepted.status) {

                // 进行用户组用量判断
                let visitCheckResult = await infoServices.getVisitCheck( req.containerInfo.user_id, "upload_size_check", req.file.size);
                if(!visitCheckResult){
                    req.visitLogId = await infoServices.addVisitLog({
                        visit_type: "upload",
                        resource_id: "-1",
                        user_id: req.containerInfo.user_id,
                        file_size: req.file.size
                    })
                    res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源大小超过了用户组限制"));
                    return;
                }
                // 判断通过，执行下面的步骤

                iconv.skipDecodeWarning = true;
                req.file.originalname = iconv.decode(req.file.originalname, 'utf-8');

                let resource = await resourceServices.uploadNewResource(req.resourceId, (req.query.rename != undefined) ? req.query.rename + req.fileExt : req.file.originalname,
                    req.fileExt, req.containerInfo.user_id, req.query.container, req.file.size);
                
                req.visitLogId = await infoServices.addVisitLog({
                    visit_type: "upload",
                    resource_id: resource.resource_id,
                    user_id: resource.user_id,
                    file_size: req.file.size
                })

                req.resource = resource;
                
                next();

            } else {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 服务器未接受文件，原因：" + req.fileAccepted.reason));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async uploadResourceAfter(req, res){
        try {
            res.status(200).json(responses.SUCCESS(req.resource));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async downloadResource(req, res) {
        try {
            let urlLs = req.url.split("/");
            let resourceId = urlLs[urlLs.length - 1];
            let resource = await resourceServices.getResourceById(resourceId);
            // 判断文件是否存在
            fs.accessSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext), fs.constants.R_OK);
            if (resource != undefined && hasPermission(req.authInfo, "resource", "resource", resource, 'r')) {
                // 进行用户组用量判断
                let visitCheckResult = await infoServices.getVisitCheck(resource.user_id, "download");
                if(!visitCheckResult){
                    res.status(400).json(responses.BAD_REQUEST("[请求错误] 用量超过了用户组限制，请求无法被响应"));
                }
                // 判断通过，执行下面的步骤
                req.visitLogId = await infoServices.addVisitLog({
                    visit_type: "download",
                    resource_id: resource.resource_id,
                    user_id: resource.user_id,
                    file_size: resource.file_size
                })
                resourceServices.updateResourceVisitTime(resource.resource_id);
                res.download(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext), resource.original_name, (error) => {
                })
            } else {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 所请求的资源不存在"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getResource(req, res, next) {
        try {
            let urlLs = req.url.split("/");
            let resourceId = urlLs[urlLs.length - 1];
            let resource = await resourceServices.getResourceById(resourceId);
            // 判断文件是否存在
            fs.accessSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext), fs.constants.R_OK);
            if (resource != undefined && hasPermission(req.authInfo, "resource", "resource", resource, 'r')) {
                // 进行用户组用量判断
                let visitCheckResult = await infoServices.getVisitCheck(resource.user_id, "download");
                if(!visitCheckResult){
                    res.status(400).json(responses.BAD_REQUEST("[请求错误] 用量超过了用户组限制，请求无法被响应"));
                }
                // 判断通过，执行下面的步骤
                req.visitLogId = await infoServices.addVisitLog({
                    visit_type: "get",
                    resource_id: resource.resource_id,
                    user_id: resource.user_id,
                    file_size: resource.file_size
                })
                resourceServices.updateResourceVisitTime(resource.resource_id);
                req.resource = resource;
                next();
            } else {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 所请求的资源不存在"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getResourceAfter(req, res){
        let contentType = mime.getType(req.resource.file_ext.replace(".",""));
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline; filename=resource.original_name');
        res.sendFile(path.resolve(path.join(globalStates.config.resourceBase, req.resource.resource_id + req.resource.file_ext)), (err) => {
            console.log(err);
        });
    },
    async renameResource(req, res) {
        try {
            // 表单检查，检查rename
            if (req.body.rename != undefined && !/^[^\s\\\\/:*?"<>|]+(\.[^\s\\\\/:*?"<>|]+)?$/.test(req.body.rename)) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 重命名不符合文件系统规范"));
                return;
            }

            let urlLs = req.url.split("/");
            let resourceId = urlLs[urlLs.length - 1];
            let resource = await resourceServices.getResourceById(resourceId);
            if (resource != undefined && hasPermission(req.authInfo, "container", "resource", resource, 'w')) {
                let result = await resourceServices.renameResource(resource.resource_id, req.body.rename + resource.file_ext);
                res.status(200).json(responses.SUCCESS(result));
            } else {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 所请求的资源不存在"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async deleteResource(req, res) {
        try {
            let urlLs = req.url.split("/");
            let resourceId = urlLs[urlLs.length - 1];
            if(req.resourceId != undefined){
                resourceId = req.resourceId;
            }
            let resource = await resourceServices.getResourceById(resourceId);
            if (resource != undefined && hasPermission(req.authInfo, "container", "resource", resource, 'w')) {
                await resourceServices.deleteResource(resource.resource_id);
                if (fs.existsSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext))) {
                    fs.unlinkSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext));
                }
                res.status(200).json(responses.OK());
            } else {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 所请求的资源不存在"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async removeContainer(req, res) {
        try {
            let container = await resourceServices.getContainerById(req.body.containerId);
            // 限制级操作，只支持token级别验证
            if (container == undefined) {
                res.status(400).json(responses.BAD_REQUEST("容器不存在"))
                return;
            }
            if (container.user_id == req.authInfo.user.user_id) {
                let resources = await resourceServices.getResourcesByContainerId(req.body.containerId);
                for (let resource of resources) {
                    if (resource != undefined) {
                        await resourceServices.deleteResource(resource.resource_id);
                        if (fs.existsSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext))) {
                            fs.unlinkSync(path.join(globalStates.config.resourceBase, resource.resource_id + resource.file_ext));
                        }
                    }
                }
                await resourceServices.deleteContainer(req.body.containerId);
                res.status(200).json(responses.OK());
                return;
            } else {
                res.status(401).json(responses.AUTHENTICATION_ERROR("权限不足"))
                return;
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getObjectInfoById(req, res) {
        try {
            if (req.headers['if-none-match'] === req.query.id) {
                res.status(304).end();
                return;
            }
            let info = await infoServices.getObjectInfoById(req.query.type, req.query.id);
            if(info == undefined){
                res.status(200).json(responses.BAD_REQUEST("对象不存在"));
                return;
            }
            if((req.query.type == "resource" && hasPermission(req.authInfo, "resource", "resource", info, 'r'))
            || (req.query.type == "container" && hasPermission(req.authInfo, "container", "container", info, 'r'))){
                res.set({
                    'ETag': req.query.id,
                    'Cache-Control': 'no-cache',
                  });
                res.status(200).json(responses.SUCCESS(info));
            } else {
                res.status(401).json(responses.AUTHENTICATION_ERROR("权限不足"));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getImgApiKeys(req, res) {
        try {
            let apiKeys = await resourceServices.getImgApiKeys(req.authInfo.user.user_id);
            res.status(200).json(responses.SUCCESS(apiKeys));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async createImgApiKey(req, res){
        try {
            let apiKey = await resourceServices.getImgApiKeyByContainerId(req.body.containerId);
            if(apiKey != undefined){
                res.status(400).json(responses.BAD_REQUEST("相同容器已存在API KEY"));
                return;
            }
            let container = await resourceServices.getContainerById(req.body.containerId);
            if(container.user_id != req.authInfo.user.user_id){
                res.status(400).json(responses.BAD_REQUEST("容器不存在或无权限"));
                return;
            }
            await resourceServices.createApiKey(req.body.containerId, getAPIKeyCode());
            res.status(200).json(responses.OK());
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async deleteImgApiKey(req, res){
        try {
            let container = await resourceServices.getContainerById(req.body.containerId);
            if(container.user_id != req.authInfo.user.user_id){
                res.status(400).json(responses.BAD_REQUEST("容器不存在或无权限"));
                return;
            }
            await resourceServices.deleteApiKey(req.body.containerId);
            res.status(200).json(responses.OK());
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    }
}