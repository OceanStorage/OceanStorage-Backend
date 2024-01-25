const imgServices = require("../services/imgServices");
const resourceServices = require("../services/resourceServices");
const responses = require("../vitals/responses");
const imgExts = [
    ".JPG", ".JPEG", ".PNG", ".GIF", ".SVG", ".WEBP", ".BMP", ".ICO", ".APNG", ".AVIF", ".TIFF",
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".ico", ".apng", ".avif", ".tiff"
]
const globalStates = require("../vitals/globalState");
const generateUniqueID = require('../utils/idGenerator');
const fs = require("fs");
const path = require("path")
const mime = require('mime');
const images = require("images");

module.exports = {
    async getImgCount(req, res) {
        try {
            let result = await imgServices.getImgCount(req.container_info.container_id);
            res.send(String(result));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getAllImgs(req, res) {
        try {
            let result = await imgServices.getAllImgs(req.authInfo.user, req.container_info.container_id, Number(req.query.page), Number(req.query.pageSize));
            res.send(result);
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getImgPre(req, res, next) {
        try {
            let urlLs = req.url.split("/");
            let resourceId = urlLs[urlLs.length - 1];
            let resource = await resourceServices.getResourceById(resourceId);
            let getApiKey = await imgServices.getApiKeyByContainerId(resource.container_id);
            if (resource == undefined || getApiKey == undefined) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源不存在"))
                return;
            }
            if (imgExts.indexOf(resource.file_ext) == -1) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源不是常见的Web图片类型"))
                return;
            }
            next()
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async deleteImgPre(req, res, next) {
        try {
            let resourceId = req.query.img_id;
            let resource = await resourceServices.getResourceById(resourceId);
            if (resource == undefined) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源不存在"))
                return;
            }
            if (imgExts.indexOf(resource.file_ext) == -1) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源不是常见的Web图片类型"))
                return;
            }
            if (req.container_info.container_id != resource.container_id) {
                res.status(400).json(responses.BAD_REQUEST("[请求错误] 资源不存在"))
                return;
            }
            req.resourceId = resource.resource_id;
            next()
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async uploadImgPre(req, res, next) {
        try {
            req.query.container = req.container_info.container_id;
            next()
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async uploadImgAfter(req, res) {
        try {
            res.send({
                "err": 0,
                "msg": "success",
                "url": "http://" + globalStates.config.backend_base_url + "/image/" + req.resource.resource_id,
                "img_id": req.resource.resource_id
            });
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getImgAfter(req, res, next) {
        try {
            let contentType = mime.getType(req.resource.file_ext.replace(".",""));
            let file = fs.readFileSync(path.resolve(path.join(globalStates.config.resourceBase, req.resource.resource_id + req.resource.file_ext)));
            let file_ext = req.resource.file_ext.split(".")[1];
            if(req.query.thumbnail == true && ["bmp", "gif", "jpg", "jpeg", "png"].includes(file_ext)){
                let img = images.loadFromBuffer(file);
                img.resize(200);
                file = img.toBuffer(file_ext);
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'inline; filename=resource.original_name');
            res.send(file);
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async uploadImgBase64(req, res, next) {
        try {
            let imgBase64 = req.body.img;
            //过滤data:URL
            let base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, "");
            let dataBuffer = Buffer.from(base64Data, 'base64');
            const allowExtname = ['png', 'jpg', 'jpeg', 'gif', 'bmp'];//支持的图片格式
            //获取扩展名
            let extname = '';
            let filterResult = allowExtname.filter(item => {
                return imgBase64.includes(item)
            })
            // 如果并不在指定的允许拓展名内
            if (filterResult.length == 0) {
                res.send('不支持的文件类型')
                return;
            }
            extname = '.' + filterResult[0]

            // 生成唯一名称
            req.resourceId = generateUniqueID();
            req.fileExt = extname;
            req.query.container = req.container_info.container_id;

            //拼接成图片名
            let keepname = req.resourceId + extname;
            fs.writeFile(path.join(process.cwd(), globalStates.config.resourceBase, keepname), dataBuffer, async (err) => {
                if (err) { return res.send('写入失败') }
                req.fileAccepted = {
                    status: true,
                    reason: ""
                }
                req.file = {
                    originalname: keepname,
                    size: dataBuffer.byteLength
                }
                next();
                return;
            });
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    }
}