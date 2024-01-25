let globalState = require("./globalState");
const mysql = require('mysql');
let pool = mysql.createPool({
	host: globalState.config.mysql.host,
	port: globalState.config.mysql.port,
	user: globalState.config.mysql.user,
	password: globalState.config.mysql.password,
	database: globalState.config.mysql.database,
});

// 测试连接
const testConnection = () => new Promise(function(resolve, reject){
    pool.getConnection(function (err, connection) {
		if (err) {
			reject(err);
		} else {
			connection.query("SELECT COUNT(*) FROM users", [], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
				connection.release();
			});
		}
	});
});

const query = async function (sql, values) {
	return new Promise((resolve, reject) => {
		pool.getConnection(function (err, connection) {
			if (err) {
				reject(err);
			} else {
				connection.query(sql, values, (err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
					connection.release();
				});
			}
		});
	});
};

const execTransaction = (callback) => {
    return new Promise((resolve, reject) => {
        var promiseArr = [];
        pool.getConnection(function (err, connection) {
            if (err) {
                return reject(err)
            }
            connection.beginTransaction(err => {
                if (err) {
                    return reject('开启事务失败')
                }
                let _resolve = resolve;
                let _reject = reject;
                let lastResult = undefined;
                let query = (sql, values) => {
                    return new Promise((resolve, reject) => {
                        connection.query(sql, values, (e, rows, fields) => {
                            if(e) {
                                setTimeout(()=>{
                                    reject(e);
                                })
                                _reject(e);
                            } else {
                                lastResult = rows;
                                resolve(rows);
                            }
                        })
                    })
                }
                let rollback = () => {
                    connection.rollback(() => {
                        console.log('数据操作回滚')
                    })
                    reject(err);
                }
                let commit = () => {
                    connection.commit((error) => {
                        if (error) {
                            console.log('事务提交失败')
                            reject(error)
                        }
                    })
                    connection.release()  // 释放链接
                    resolve(lastResult)
                }
                callback(query, commit, rollback);
            })
        });
    })
}

module.exports = {
	query,
	testConnection,
    execTransaction
};
