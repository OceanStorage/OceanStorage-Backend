const { query } = require("../vitals/sqlconn");

const resourceServices = {
    async getContainersByUserIdIterately(userId, startId, rows) {
        let results;
        // 迭代器模式，如果没有startId则从一开始取，否则从startId往后开始取
        if(isNaN(startId)){
            results = await query(`SELECT COUNT(r.resource_id) resource_amount, c.*
                                  FROM containers c LEFT JOIN resources r 
                                  ON c.container_id = r.container_id 
                                  WHERE c.user_id = ? 
                                  GROUP BY c.container_id
                                  ORDER BY c.container_create_time DESC, c.inner_id DESC
                                  LIMIT ?`, [userId, rows]);
        } else {
            results = await query(`SELECT COUNT(r.resource_id) resource_amount, c.*
                                  FROM containers c LEFT JOIN resources r 
                                  ON c.container_id = r.container_id 
                                  WHERE c.user_id = ? 
                                  AND c.inner_id < (SELECT inner_id FROM containers WHERE container_id = ?)
                                  GROUP BY c.container_id
                                  ORDER BY c.container_create_time DESC, c.inner_id DESC
                                  LIMIT ?`, [userId, startId, rows]);
        }
        return results;
    },
    async getContainerById(containerId) {
        let result = await query(`SELECT COUNT(r.resource_id) resource_amount, c.*
                                  FROM containers c LEFT JOIN resources r 
                                  ON c.container_id = r.container_id 
                                  WHERE c.container_id = ? 
                                  GROUP BY c.container_id`, [containerId]);
        return result[0];
    },
    async getResourcesByContainerId(containerId, first, rows) {
        let results;
        results = await query(`SELECT r.*, e.file_category, c.permission_level
                                FROM resources r
                                JOIN containers c ON c.container_id = r.container_id
                                LEFT JOIN ext_categories e ON r.file_ext = e.file_ext 
                                WHERE c.container_id = ?
                                ORDER BY r.create_time DESC`, [containerId]);
        return results;
    },
    async getResourcesByContainerIdIterately(containerId, startId, rows) {
        let results;
        // 迭代器模式，如果没有startId则从一开始取，否则从startId往后开始取
        if(isNaN(startId)){
            results = await query(`SELECT r.*, e.file_category, c.permission_level
                                    FROM resources r
                                    JOIN containers c ON c.container_id = r.container_id
                                    LEFT JOIN ext_categories e ON r.file_ext = e.file_ext 
                                    WHERE c.container_id = ?
                                    ORDER BY r.create_time DESC, r.inner_id DESC
                                    LIMIT ?`, [containerId, rows]);
        } else {
            results = await query(`SELECT r.*, e.file_category, c.permission_level
                                    FROM resources r
                                    JOIN containers c ON c.container_id = r.container_id
                                    LEFT JOIN ext_categories e ON r.file_ext = e.file_ext 
                                    WHERE c.container_id = ?
                                    AND r.inner_id < (SELECT inner_id FROM resources WHERE resource_id = ?)
                                    ORDER BY r.create_time DESC, r.inner_id DESC
                                    LIMIT ?`, [containerId, startId, rows]);
        }
        return results
    },
    async createNewContainer(containerId, containerName, userId, permissionLevel){
        let result = await query(`INSERT INTO containers(container_id, container_name, user_id, permission_level) VALUES(?, ?, ?, ?)`,
        [containerId, containerName, userId, permissionLevel]);
        return (await resourceServices.getContainerById(containerId));
    },
    async editContainerInfo(containerId, containerName, permissionLevel){
        let result = await query(`UPDATE containers SET container_name = ?, permission_level = ? WHERE container_id = ?`,
        [containerName, permissionLevel, containerId]);
        return await resourceServices.getContainerById(containerId);
    },
    async getResourceById(resourceId){
        result = await query(`SELECT r.*, c.permission_level FROM resources r JOIN containers c ON c.container_id = r.container_id WHERE resource_id = ?`, [resourceId]);
        return result[0];
    },
    async updateResourceVisitTime(resourceId){
        await query(`UPDATE resources SET last_visit_time = ? WHERE resource_id = ?`, [new Date(), resourceId]);
    },
    async uploadNewResource(resourceId, originalName, fileExt, userId, containerId, fileSize){
        await query(`INSERT INTO resources(resource_id, original_name, file_ext, user_id, container_id, file_size) VALUES(?, ?, ?, ?, ?, ?)`,
        [resourceId, originalName, fileExt, userId, containerId, fileSize]);
        return await resourceServices.getResourceById(resourceId);
    },
    async renameResource(resourceId, rename){
        await query(`UPDATE resources SET original_name = ? WHERE resource_id = ?`,
        [rename, resourceId]);
        return await resourceServices.getResourceById(resourceId);
    },
    async deleteResource(resourceId){
        await query(`DELETE FROM resources WHERE resource_id = ?`,
        [resourceId]);
        return;
    },
    async deleteContainer(containerId){
        await query(`DELETE FROM containers WHERE container_id = ?`,
        [containerId]);
        return;
    },
    async getImgApiKeys(userId){
        return (await query("SELECT * FROM api_keys k INNER JOIN containers c ON c.container_id = k.container_id WHERE c.user_id = ?",[userId]));
    },
    async getImgApiKeyByContainerId(containerId){
        return (await query("SELECT * FROM api_keys WHERE container_id = ?",[containerId]))[0];
    },
    async createApiKey(containerId, apiKey){
        await query("INSERT INTO api_keys(container_id, api_key) VALUES(?, ?)", [containerId, apiKey])
    },
    async deleteApiKey(containerId){
        await query("DELETE FROM api_keys WHERE container_id = ?", [containerId])
    }
}

module.exports = resourceServices;