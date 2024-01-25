#!/usr/vitals/env node

/**
 * 以下为一系列启动自检项目
 */

// 1. 读取配置文件
const path = require("path");
require("./vitals/vConsole/vConsole.js")  // 对console进行复写
let globalState = require("./vitals/globalState");
let YAML = require('yamljs');
try {
  // Load yaml file using YAML.load
  let nativeObject = YAML.load('./config.yaml');
  let jsonstr = JSON.stringify(nativeObject);
  let jsonTemp = JSON.parse(jsonstr, null);
  globalState.config = jsonTemp;
  globalState.fatalError.config = false;  // 设置config全局状态
  console.info("已成功读取配置文件config.yaml");
} catch (e) {
  console.fatal_error("在读取配置文件config.yaml时发生致命错误:\n", e);
  process.exit(1);
}

// 2. 尝试访问资源文件夹
const fs = require('fs');
try {
  fs.accessSync(globalState.config.resourceBase);
  globalState.fatalError.resourceBase = false;  // 设置resourceBase全局状态
  console.info("已成功预加载资源库");
} catch (e) {
  console.fatal_error("在预加载资源库时发生了致命错误:\n", e);
}

// 3. 检查配置文件项目-policies
let forcedUserValidateConfig = globalState.config.policies.forcedUserValidate;
if (!forcedUserValidateConfig.mobile && !forcedUserValidateConfig.email) {
  console.warn("当前使用的用户信息强制验证协议不安全，强烈建议至少验证一项用户信息")
}
if (forcedUserValidateConfig.mobile) {
  try {
    let smsWorker = require(path.join(process.cwd(), globalState.config["smsWorker"]));
    if(smsWorker.sendValidateCode == undefined){
      throw new Error("smsWorker中未对sendValidateCode方法进行正确定义");
    }
  }
  catch (e) {
    console.warn("[配置问题] smsWorker配置不正确，可能会导致无法正确发送短信验证码:", e);
  };
}
if (forcedUserValidateConfig.email) {
  try {
    let emailer = require(path.join(process.cwd(), globalState.config["emailer"]))
    if(emailer.sendValidateCode == undefined){
      throw new Error("emailer中未对sendValidateCode方法进行正确定义");
    }
  }
  catch (e) {
    console.warn("[配置问题] emailer配置不正确，可能会导致无法正确发送短信验证码", e)
  };
}

// 4. 数据库测试连接，这是最后一项工作，后续工作将在该工作基础上进行
const sqlconn = require('./vitals/sqlconn.js');
sqlconn.testConnection().then(async () => {
  globalState.fatalError.database = false;
  console.info("已成功完成数据库测试连接");
  await checkUserGroup();
  await checkAdminUser();
  await startServer();
}).catch((e) => {
  console.fatal_error("在数据库测试连接时发生了致命错误:\n", e);
});


/**
 * 需要在数据库测试连接完成后进行的检查项目
 */
// 5. 检查默认用户组
const userService = require("./services/userServices.js");
async function checkUserGroup() {
  try {
    let result = await userService.getUserGroupByName(globalState.config.default.userGroupName);
    if (result == undefined) {
      let defaultPermissionParams = require("./vitals/defaults/user_group_permission_params.json");
      await userService.createNewUserGroup(globalState.config.default.userGroupName, JSON.stringify(defaultPermissionParams));
      console.warn("[配置问题] 默认用户组配置存在问题，已尝试为你修复");
    }
    globalState.default.userGroupId = (await userService.getUserGroupByName(globalState.config.default.userGroupName)).user_group_id;
  } catch (e) {
    globalState.fatalError.database = true;
    console.fatal_error("在检查默认用户组配置时发生了致命错误:\n", e);
  }
}

// 6. 检查管理员账户
async function checkAdminUser() {
  try {
    let result = await sqlconn.query("SELECT * FROM admin_users");
    if (result.length == 0) {
      console.warn("[警告] 尚未为系统创建管理员账户，请尽快前往后台管理页面创建管理员账户");
    }
  } catch (e) {
    globalState.fatalError.database = true;
    console.fatal_error("在检查管理员账户时发生了致命错误:\n", e);
  }
}


// 7. 启动服务器

async function startServer() {
  /**
 * Module dependencies.
 */

  let app = require('./app.js');
  let debug = require('debug')('expressframe:server');
  let http = require('http');
  let https = require('https');

  /**
   * Get port from environment and store in Express.
   */
  let port = globalState.config.access.httpPort;

  /**
   * Create HTTP server.
   */

  let server = http.createServer(app).listen(port);
  server.on('error', onError);
  server.on('listening', onListening);

  function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    let bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + '端口需要提升权限');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + '端口已经被使用');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    console.info('HTTP服务已经在该端口上启动：' + bind);
  }


  /**
   * Create HTTPs server.
   */

  if (globalState.config.access.httpsEnabled) {
    let port = globalState.config.access.httpsPort;

    try {
      const key = fs.readFileSync(globalState.config.access.ssl.key)
      const crt = fs.readFileSync(globalState.config.access.ssl.crt)
      const options = { key, cert: crt }
      let httpsServer = https.createServer(options, app).listen(port)
      httpsServer.on('error', onHttpsError);
      httpsServer.on('listening', onHttpsListening);
    } catch (e) {
      console.error("在创建HTTPS服务时发生了致命错误:\n", e);
    }


    function onHttpsListening() {
      let addr = server.address();
      let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + port;
      console.info('HTTPS服务已经在该端口上启动：' + bind);
    }

    function onHttpsError(error) {
      if (error.syscall !== 'listen') {
        throw error;
      }

      let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          console.error(bind + '端口需要提升权限');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(bind + '端口已经被使用');
          process.exit(1);
          break;
        default:
          throw error;
      }
    }

  }
}