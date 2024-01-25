const {query} = require("../vitals/sqlconn");
const userService = require("./userServices");

const infoServices = {
    async getSiteFileInfo(){
        let siteInfo = await query("SELECT COUNT(*) totalFileCount, SUM(file_size) totalFileSize FROM resources");
        let userInfo = await query("SELECT COUNT(*) totalUserCount FROM users");
        return {
            totalFileCount: siteInfo[0].totalFileCount,
            totalFileSize: siteInfo[0].totalFileSize == null ? 0 : siteInfo[0].totalFileSize,
            totalUserCount: userInfo[0].totalUserCount
        };
    },
    async getClientInfo(userId){
        let userGroupInfo = await query("SELECT * FROM user_groups WHERE user_group_id = (SELECT user_group FROM users WHERE user_id = ?)", [userId]);
        let containerCount = await query("SELECT COUNT(*) count FROM containers WHERE user_id = ?",[userId]);
        let resourceCount = await query("SELECT COUNT(*) count FROM resources WHERE user_id = ?",[userId]);
        let serviceKeyCount = await query("SELECT COUNT(*) count FROM service_keys WHERE user_id = ?",[userId]);
        return {
            userGroupInfo: userGroupInfo,
            containerCount: containerCount[0].count,
            resourceCount: resourceCount[0].count,
            serviceKeyCount: serviceKeyCount[0].count,
        };
    },
    async addApiLog(logData, visitLogId){
        await query('INSERT INTO api_log(url, headers, method, response_code, ip, auth_method, auth_entity, user_id, visit_log_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [logData.url, JSON.stringify(logData.headers), logData.method, logData.response_code, logData.ip, logData?.authInfo?.method,
            logData?.authInfo?.authEntity, logData?.authInfo?.user?.user_id, visitLogId])
    },
    async addVisitLog(logData){
        let result = await query('INSERT INTO visit_log(visit_type, resource_id, user_id, file_size) VALUES(?, ?, ?, ?)',
        [logData.visit_type, logData.resource_id, logData.user_id, logData.file_size]);
        return result.insertId;
    },
    async setCachedVisitLog(visitLogId){
        let result = await query('UPDATE visit_log SET file_size = 0 WHERE visit_log_id = ?',
        [visitLogId]);
    },
    async getVisitLogSizeSum(userId, startTime, endTime){
        let logSize = await query('SELECT IFNULL(SUM(file_size), 0) sum FROM visit_log WHERE user_id = ? AND visit_time BETWEEN ? AND ?', [userId, startTime, endTime]);
        return logSize[0].sum;
    },
    async getVisitLogByPage(userId, pageSize, pageNum){
        let logSize = await query('SELECT COUNT(*) sum FROM visit_log WHERE user_id = ?', [userId]);
        let log = await query('SELECT * FROM visit_log WHERE user_id = ? ORDER BY visit_time DESC LIMIT ?, ?', [userId, (pageNum - 1) * pageSize, pageSize]);
        return {
            sum: logSize[0].sum,
            items: log
        };
    },
    async getObjectInfoById(type, id){
        if(type == "resource"){
            let result  = await query('SELECT * FROM resources WHERE resource_id = ?', [id]);
            return result[0];
        } else {
            let result  = await query('SELECT * FROM containers WHERE container_id = ?', [id]);
            return result[0];
        }
    },
    async getApiLogByVisitLogId(userId, id){
        let result = await query('SELECT COUNT(*) c FROM visit_log WHERE user_id = ? AND visit_log_id = ?', [userId, id]);
        if(result[0].c > 0){
            let result = await query('SELECT * FROM api_log WHERE visit_log_id = ?', [id]);
            return result;
        } else {
            return [];
        }
    },
    async getVisitCheck(userId, operation, fileSize) {
        let userUsageInfo = await userService.getUserUsageInfo(userId);
        let userGroupInfo = await userService.getUserGroupByUserId(userId);
        if(operation == "download"){
            if(userUsageInfo.trafficOfMonth > userGroupInfo.permission_params.trafficLimitPerMonth) return false;
            return true;
        } else if(operation == "upload"){
            if(userUsageInfo.trafficOfMonth > userGroupInfo.permission_params.trafficLimitPerMonth) return false;
            if(userUsageInfo.totalResourceSize > userGroupInfo.permission_params.maxTotalResourceSize) return false;
            return true;
        } else if(operation == "upload_size_check"){
            if(fileSize > userGroupInfo.permission_params.maxSingleResourceSize) return false;
            return true;
        }
    }
}

module.exports = infoServices;