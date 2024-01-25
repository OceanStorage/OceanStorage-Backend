const { query, execTransaction } = require("../vitals/sqlconn");
const generateUniqueID = require('../utils/idGenerator');
const globalState = require("../vitals/globalState");
const moment = require("moment");

function ifNull(a, b) {
    return (a == null) ? b : a;
}

const userService = {
    async getUserGroupById(userGroupId) {
        let result = await query(`SELECT * FROM user_groups WHERE user_group_id = ?`, [userGroupId]);
        return result[0];
    },
    async getUserGroupByName(userGroupName) {
        let result = await query(`SELECT * FROM user_groups WHERE user_group_name = ?`, [userGroupName]);
        return result[0];
    },
    async createNewUserGroup(userGroupName, permissionParams) {
        let result = await query("INSERT INTO user_groups(user_group_name, permission_params) VALUES(?, ?)",
            [userGroupName, permissionParams]);
        return await userService.getUserGroupById(result.insertId);
    },
    async createNewUser(username, password, user_group_id, info_params, mobile, email) {
        let result = await query(`INSERT INTO users(user_id, user_name, pwd, user_group, activated, info_params, mobile, email)
        VALUES(?, ?, ?, ?, 1, ?, ?, ?)`, [generateUniqueID(), username, password, user_group_id, info_params, mobile, email])
        return await userService.getUserInfoByUserId(result.insertId);
    },
    async setUserValidate(method, content, userId) {
        await query(`UPDATE users SET ${method} = ? WHERE user_id = ?`, [content, userId]);
        return;
    },
    async setNewPassword(userId, pwd) {
        await query(`UPDATE users SET pwd = ? WHERE user_id = ?`, [pwd, userId]);
        return;
    },
    async getUserByMultiIdentifiers(identifier) {
        return (await query("SELECT * FROM users WHERE user_name = ? OR email = ? OR mobile = ?", [identifier, identifier, identifier]))[0];
    },
    async getUserInfoByBase64Identifier(base64Identifier) {
        let binaryData = Buffer.from(base64Identifier, 'base64').toString('utf8');
        return (await query("SELECT * FROM users WHERE user_id = ?", [binaryData]))[0];
    },
    async getUserInfoByUserId(userId) {
        return (await query("SELECT * FROM users u WHERE user_id = ?", [userId]))[0];
    },
    async getUserGroupByUserId(userId) {
        let user = (await query("SELECT * FROM users u WHERE user_id = ?", [userId]))[0];
        // 如果用户组过期了
        if (user.user_group_valid_time < new Date()) {
            // 则重置为默认用户组
            await query("UPDATE users SET user_group = (SELECT user_group_id FROM user_groups WHERE user_group_name = ?), user_group_valid_time = ? WHERE user_id = ?", [
                globalState.config.default.userGroupName, globalState.config.default.expireTime, userId
            ])
        }
        userGroup = (await query("SELECT * FROM user_groups WHERE user_group_id = (SELECT user_group FROM users WHERE user_id = ?)", [userId]))[0];
        userGroup.permission_params = JSON.parse(userGroup.permission_params);
        return userGroup;
    },
    async getUserInfoByUserName(userName) {
        return (await query("SELECT * FROM users WHERE user_name = ?", [userName]))[0];
    },
    async setUserGroupById(userId, userGroupId, expireTime="2099-12-31 23:59:59") {
        await query("UPDATE users SET user_group = ?, user_group_valid_time = ? WHERE user_id = ?", [userGroupId, expireTime, userId]);
    },
    async getServiceKeyById(serviceKeyId) {
        return (await query(`SELECT * FROM service_keys WHERE service_key_id = ?`, [serviceKeyId]))[0];
    },
    async getServiceKeyByKeyContent(serviceKeyContent) {
        return (await query(`SELECT * FROM service_keys WHERE key_content = ?`, [serviceKeyContent]))[0];
    },
    async createNewServiceKey(serviceKeyId, keyName, userId, expireTime, securityParams, keyContent) {
        let result = await query(`INSERT INTO service_keys(service_key_id, service_key_name, user_id, expire_time, security_params, key_content)
                            VALUES(?, ?, ?, ?, ?, ?)`, [serviceKeyId, keyName, userId, expireTime, securityParams, keyContent]);
        return userService.getServiceKeyById(serviceKeyId);
    },
    async getUserUsageInfo(userId) {
        // 现场查询资源总量
        let totalResourceSize = await query('SELECT SUM(file_size) sum FROM resources WHERE user_id = ?', [userId]);
        // 现场查询当月流量消耗
        let firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0);
        firstDayOfMonth.setSeconds(0);
        firstDayOfMonth.setMilliseconds(0);
        firstDayOfMonth.setMinutes(0);
        let endOfMonth = new Date();
        if (endOfMonth.getMonth() === 11) {
            endOfMonth.setMonth(0);
        } else {
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        }
        endOfMonth.setDate(1);
        endOfMonth.setHours(0);
        endOfMonth.setSeconds(0);
        endOfMonth.setMilliseconds(0);
        endOfMonth.setMinutes(0);
        endOfMonth = new Date((parseInt(endOfMonth.getTime() / 1000) - 1) * 1000);
        let trafficOfMonth = await query('SELECT SUM(file_size) sum FROM visit_log WHERE user_id = ? AND visit_time BETWEEN ? AND ?', [
            userId, moment(firstDayOfMonth).format("YYYY-MM-DD HH:mm:ss"), moment(endOfMonth).format("YYYY-MM-DD HH:mm:ss")
        ])
        return { totalResourceSize: ifNull(totalResourceSize[0].sum, 0), trafficOfMonth: ifNull(trafficOfMonth[0].sum, 0) };
    },
    async getUserServiceKeys(userId) {
        let serviceKeys = await query(`SELECT * FROM service_keys WHERE user_id = ? ORDER BY create_time DESC`, [userId]);
        for (let item of serviceKeys) {
            item.key_content = undefined;
        }
        return serviceKeys;
    },
    async deleteServiceKey(serviceKeyId) {
        await query(`DELETE FROM service_keys WHERE service_key_id = ?`, [serviceKeyId]);
    },
    async useGiftCard(giftCard, userId) {
        let card = (await query("SELECT * FROM asso_user_group_activation_codes WHERE activation_code = ?", [giftCard]))[0];
        if (card != undefined) {
            if(card.is_used_by != undefined){
                return "激活码不正确或已被使用"
            }
            try {
                await execTransaction(async (query, commit, rollback) => {
                    try {
                        if(card.infinite != 1) {
                            await query(`UPDATE asso_user_group_activation_codes
                            SET is_used_by = ?, used_time = ? WHERE activation_code = ?`, 
                            [userId, new Date(), giftCard]);
                        }
                        await query(`UPDATE users SET user_group = ?, user_group_valid_time = ? WHERE user_id = ?`, 
                        [card.user_group_id, card.expire_time, userId]);
                        commit();
                    } catch (e) {
                        rollback();
                        throw e;
                    }
                })
                return "success";
            } catch (e) {
                return "激活码不正确或已被使用"
            }
        } else {
            return "激活码不正确或已被使用"
        }
    }
}

module.exports = userService;