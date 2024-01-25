const globalStates = require("../vitals/globalState");
const userServices = require("../services/userServices");
const responses = require("../vitals/responses");
const jwt = require('jsonwebtoken');
const path = require("path");
const query = require("../vitals/sqlconn");
const generateUniqueID = require('../utils/idGenerator');
const hash = require('../utils/hash');
const { access } = require("fs");
const resourceServices = require("../services/resourceServices");
let globalState = require("../vitals/globalState");

let userValidates = {}
setInterval(() => {
    for (let key in userValidates) {
        if (userValidates[key].countdown > 0) {
            userValidates[key].countdown--;
        }
        if (userValidates[key].validateCountdown > 0) {
            userValidates[key].validateCountdown--;
        }
    }
    userValidates = Object.filter(userValidates, function (item) {
        return item.countdown > 0 || item.validateCountdown > 0;
    });
}, 1000)

function getRandomCode() {
    let code = '' + (parseInt(Math.random() * 1000000) + 1000000);
    return code.substring(1, 7);
}

module.exports = {
    /**
     * 用户注册
     * body: username, password, email, mobile
     * @param {*} req 
     * @param {*} res 
     */
    async register(req, res) {
        try {
            // 表单检查
            // 检查用户名、密码
            if (req.body.username == undefined || !/^[0-9A-Za-z_]{6,20}$/.test(req.body.username)) {
                res.status(400).json(responses.BAD_REQUEST("用户名不符合要求，应为：数字、字母、下划线组成的6-20位"))
                return;
            }
            if (req.body.password == undefined || !/^.*(?=.{6,20})(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*?]).*$/.test(req.body.password)) {
                res.status(400).json(responses.BAD_REQUEST("密码不符合要求，应为：至少1个大写字母，1个小写字母，1个数字，1个特殊字符长度为6-20位"))
                return;
            }

            // 逻辑处理
            // 对密码进行hash处理
            let pwd = require('bcryptjs').hashSync(req.body.password, 10);
            let user = await userServices.getUserInfoByUserName(req.body.username);
            // 防止重复的用户名
            if (user != undefined) {
                res.status(400).json(responses.BAD_REQUEST("用户名已被注册"));
                return;
            } else {
                let defaultUserInfoParams = require("../vitals/defaults/user_info_params.json");
                let newUser = await userServices.createNewUser(req.body.username, pwd, globalStates.default.userGroupId,
                    JSON.stringify(defaultUserInfoParams));
                res.status(200).json(responses.OK());
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 用户登录
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async login(req, res) {
        try {
            // 表单检查
            if (req.body.username == undefined) {
                res.status(400).json(responses.BAD_REQUEST("请输入用户名、邮箱或手机号"))
                return;
            }
            if (req.body.password == undefined) {
                res.status(400).json(responses.BAD_REQUEST("请输入密码"))
                return;
            }

            // 逻辑处理
            let user = await userServices.getUserByMultiIdentifiers(req.body.username);
            if (user == undefined) {
                res.status(401).json(responses.AUTHENTICATION_ERROR("用户名或密码错误"));
                return;
            } else {
                // 2.用户如果存在，则看密码是否正确
                let isPasswordValid = require('bcryptjs').compareSync(
                    req.body.password,
                    user.pwd,
                );

                if (!isPasswordValid) {
                    // 密码无效
                    res.status(401).json(responses.AUTHENTICATION_ERROR("用户名或密码错误"));
                    return;
                }

                let expireTime = "3d";
                if(req.body.rememberMe == true){
                    expireTime = "14d";
                }

                console.log(expireTime);

                // 生成token
                const token = jwt.sign(
                    {
                        id: String(user.user_id),
                        pwd: String(user.pwd),
                    },
                    globalStates.config.jwtSecret,
                    {
                        expiresIn: expireTime
                    }
                );

                res.status(200).json(responses.SUCCESS({
                    token, userName: user.user_name, userId: user.user_id, userGroup: await userServices.getUserGroupById(user.user_group)
                }));
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async checkUsername(req, res){
        try{
            let user = await userServices.getUserInfoByUserName(req.body.username);
            // 防止重复的用户名
            if (user != undefined) {
                res.status(200).json(responses.SUCCESS({used: true}));
                return;
            } else {
                res.status(200).json(responses.SUCCESS({used: false}));
                return;
            }
        } catch(e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 获取用户验证方式，包含mobile和email两种
     * @param {*} req 
     * @param {*} res 
     */
    async getValidateMethods(req, res){
        try{
            let validateMethods = {
                mobile: {
                    name: "手机号"
                },
                email: {
                    name: "邮箱"
                }
            }
            let result = [];
            for(let key in globalStates.config.policies.forcedUserValidate){
                if(globalStates.config.policies.forcedUserValidate[key]){
                    result.push({...validateMethods[key], value: key})
                }
            }
            res.status(200).json(responses.SUCCESS(result));
        } catch(e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 发送用户验证码
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async sendValidateCode(req, res) {
        try {
            // 表单检查
            if (!globalStates.config.policies.forcedUserValidate[req.body.method]) {
                res.status(400).json(responses.BAD_REQUEST("选择的验证方式不受支持"))
                return;
            }

            let user = await userServices.getUserByMultiIdentifiers(req.body.content);
            if (user != undefined && req.body.for == "activateAccount") {
                res.status(400).json(responses.BAD_REQUEST(`${req.body.content} 已绑定于其他用户，请更换验证方式或联系系统管理员申诉`))
                return;
            }

            // 检查手机号、邮箱
            if (req.body.method == "email" && req.body.content != undefined && !/^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(req.body.content)) {
                res.status(400).json(responses.BAD_REQUEST("邮箱地址错误"))
                return;
            }

            if (req.body.method == "mobile" && req.body.content != undefined && !/^1[356789]\d{9}$/.test(req.body.content)) {
                res.status(400).json(responses.BAD_REQUEST("手机号不符合要求或非中国大陆手机号"))
                return;
            }


            // 逻辑处理
            let smsWorker = require(path.join(process.cwd(), globalStates.config["smsWorker"]));
            let emailer = require(path.join(process.cwd(), globalStates.config["emailer"]));
            const workers = {
                "email": emailer,
                "mobile": smsWorker
            }
            if (userValidates[req.body.content] != undefined && userValidates[req.body.content].countdown > 0) {
                res.status(400).json(responses.BAD_REQUEST("验证码发送过于频繁，请等一分钟后再发送"));
                return;
            } else {
                //生成6位的验证码
                let code = ('000000' + Math.floor(Math.random() * 999999)).slice(-6);
                // 根据选择的方法，邮箱或手机来执行发送操作
                workers[req.body.method].sendValidateCode(req.body.content, code, 15);
                userValidates[req.body.content] = {
                    validateCode: code,
                    countdown: 60,
                    validateCountdown: 15 * 60,
                }
                if(req.authInfo.authSuccess) {
                    userValidates[req.body.content].userId = req.authInfo.user.user_id
                }
                res.status(200).json(responses.OK());
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 检验用户验证码
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async verifyValidateCode(req, res) {
        try {
            // 表单检查
            if (!globalStates.config.policies.forcedUserValidate[req.body.method]) {
                res.status(400).json(responses.BAD_REQUEST("选择的验证方式不受支持"))
                return;
            }

            let user = await userServices.getUserByMultiIdentifiers(req.body.content);
            if (user != undefined && req.body.for == "activateAccount") {
                res.status(400).json(responses.BAD_REQUEST(`${req.body.content} 已绑定于其他用户，请更换验证方式或联系系统管理员申诉`))
                return;
            }

            // 检查手机号、邮箱
            if (req.body.method == "email" && req.body.content != undefined && !/^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(req.body.content)) {
                res.status(400).json(responses.BAD_REQUEST("邮箱地址错误"))
                return;
            }

            if (req.body.method == "mobile" && req.body.content != undefined && !/^1[356789]\d{9}$/.test(req.body.content)) {
                res.status(400).json(responses.BAD_REQUEST("手机号不符合要求或非中国大陆手机号"))
                return;
            }

            // 逻辑处理
            for (let key in userValidates) {
                if (key == req.body.content) {
                    // 用于激活账户
                    if (req.body.for == "activateAccount") {
                        if (req.authInfo.user.email != undefined || req.authInfo.user.mobile != undefined ) {
                            res.status(400).json(responses.BAD_REQUEST("此用户已激活，不得重复激活"));
                            return;
                        }
                        if (userValidates[key].validateCode == req.body.code && userValidates[key].userId == req.authInfo.user.user_id) {
                            await userServices.setUserValidate(req.body.method, req.body.content, req.authInfo.user.user_id);
                            let userGroup = await userServices.getUserGroupByName(globalState.config.default.activatedUserGroupName);
                            await userServices.setUserGroupById(req.authInfo.user.user_id, userGroup.user_group_id);
                            res.status(200).json(responses.OK());
                            return;
                        } else {
                            res.status(400).json(responses.BAD_REQUEST("验证失败，请检查验证码是否正确"));
                            return;
                        }
                    // 用于找回密码
                    } else if(req.body.for == "forgetPassword"){
                        if (userValidates[key].validateCode == req.body.code) {
                            let user = await userServices.getUserByMultiIdentifiers(key);
                            if(user == undefined) {
                                res.status(400).json(responses.BAD_REQUEST("验证失败，请检查验证码是否正确或账户是否存在"));
                            } else {
                                // 检验密码
                                if (req.body.pwd == undefined || !/^.*(?=.{6,20})(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*?]).*$/.test(req.body.pwd)) {
                                    res.status(400).json(responses.BAD_REQUEST("密码不符合要求，应为：至少1个大写字母，1个小写字母，1个数字，1个特殊字符长度为6-20位"))
                                    return;
                                }
                                // 对密码进行hash处理
                                let pwd = require('bcryptjs').hashSync(req.body.pwd, 10);
                                await userServices.setNewPassword(user.user_id, pwd);
                                res.status(200).json(responses.OK());
                            }
                            return;
                        } else {
                            res.status(400).json(responses.BAD_REQUEST("验证失败，请检查验证码是否正确"));
                            return;
                        }
                    }
                }
            }
            res.status(400).json(responses.BAD_REQUEST("验证失败，请检查验证码是否正确"));
            return;
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 修改密码
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async changePassword(req, res) {
        try {
            // 表单检查
            if (req.body.password == undefined) {
                res.status(400).json(responses.BAD_REQUEST("请输入旧密码"))
                return;
            }
            if (req.body.new_password == undefined) {
                res.status(400).json(responses.BAD_REQUEST("请输入新密码"))
                return;
            }
            let user = await userServices.getUserInfoByUserId(req.authInfo.user.user_id)
            let isPasswordValid = require('bcryptjs').compareSync(
                req.body.password,
                user.pwd
            );
            if (!isPasswordValid) {
                // 密码无效
                res.status(400).json(responses.BAD_REQUEST("旧密码输入错误"));
                return;
            }
            // 对密码进行hash处理
            let pwd = require('bcryptjs').hashSync(req.body.new_password, 10);
            userServices.setNewPassword(req.authInfo.user.user_id, pwd);
            res.status(200).json(responses.OK());
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    /**
     * 创建新的ServiceKey
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createNewServiceKey(req, res) {
        try {
            // 表单检查
            if (req.body.name == undefined || !/^[\u4e00-\u9fa50-9A-Za-z_]{2,80}$/.test(req.body.name)) {
                res.status(400).json(responses.BAD_REQUEST("业务令牌名称不符合要求，应为：数字、字母、下划线或中文字符组成的2-80位"))
                return;
            }
            let date = new Date(req.body.expireTime);
            if(date == "Invalid Date"){
                res.status(400).json(responses.BAD_REQUEST("时间格式不对，应为yyyy/MM/dd HH:mm:ss"))
                return;
            }

            // 详细检查securityParams的有效性
            try{
                let securityParams = JSON.parse(req.body.securityParams);
                if(securityParams.level == "client"){
                    if(["container", "resource"].indexOf(securityParams.range) == -1 || ["readable", "free"].indexOf(securityParams.permission_level) == -1)
                        throw new Error("格式不正确");
                } else if(securityParams.level == "object"){
                    if(securityParams.access.length == 0) 
                        throw new Error("access数组不能为空");
                    for(let accessItem of securityParams.access){
                        if(["container", "resource"].indexOf(accessItem.range) != -1 &&
                        ["readable", "free"].indexOf(accessItem.permission_level) != -1){
                            if(accessItem.type == "container"){
                                let container = await resourceServices.getContainerById(accessItem.id);
                                if(container == undefined || container.user_id != req.authInfo.user.user_id) throw new Error("引用了不正确的container");
                            } else if(accessItem.type == "resource"){
                                let resource = await resourceServices.getResourceById(accessItem.id);
                                if(resource == undefined || resource.user_id != req.authInfo.user.user_id) throw new Error("引用了不正确的resource");
                            } else throw new Error("securityParams不正确");
                        } else throw new Error("accessItem中range或permission_level的值不正确");
                    }
                } else throw new Error("securityParams不正确");
            } catch(e){
                console.error(e);
                res.status(400).json(responses.BAD_REQUEST("securityParams不正确：" + e.message))
                return;
            }

            req.body.securityParams = JSON.stringify(JSON.parse(req.body.securityParams));
            // 生成keyContent
            let serviceKeyId = generateUniqueID();
            let originalKeyContent = hash.generateHash(serviceKeyId + req.body.name + req.authInfo.user.user_id +
                req.body.expireTime + req.body.securityParams + globalStates.config.jwtSecret);
            let keyContent = hash.generateHash(originalKeyContent);
            let result = await userServices.createNewServiceKey(serviceKeyId, req.body.name, req.authInfo.user.user_id, 
                req.body.expireTime, req.body.securityParams, keyContent);
            // 发送给用户的应当是originalKeyContent
            result.key_content = originalKeyContent;
            res.status(200).json(responses.SUCCESS(result));
            return;
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getUserGroupInfo(req, res){
        try {
            let userGroupInfo = req.authInfo.userGroup;
            userGroupInfo.expire_time = req.authInfo.user.user_group_valid_time;
            res.status(200).json(responses.SUCCESS(userGroupInfo));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getUserUsageInfo(req, res){
        try {
            let userUsageInfo = await userServices.getUserUsageInfo(req.authInfo.user.user_id);
            res.status(200).json(responses.SUCCESS(userUsageInfo));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async getAllServiceKeys(req, res){
        try {
            let serviceKeys = await userServices.getUserServiceKeys(req.authInfo.user.user_id);
            res.status(200).json(responses.SUCCESS(serviceKeys));
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async deleteServiceKey(req, res){
        try {
            await userServices.deleteServiceKey(req.body.serviceKeyId);
            res.status(200).json(responses.OK());
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    },
    async useGiftCard(req, res){
        try {
            if(req.authInfo.userGroup.user_group_name == globalState.config.default.userGroupName){
                res.status(400).json(responses.BAD_REQUEST("你所在的用户组不允许通过此方式进行用户组转换"))
                return;
            }
            let result = await userServices.useGiftCard(req.body.giftCard, req.authInfo.user.user_id);
            if(result == "success"){
                res.status(200).json(responses.OK());
            } else {
                res.status(400).json(responses.BAD_REQUEST(result))
            }
        } catch (e) {
            res.status(500).json(responses.INTERNAL_ERROR("[API错误] 服务器发生内部错误，请联系管理员"))
            console.error(e);
        }
    }
}