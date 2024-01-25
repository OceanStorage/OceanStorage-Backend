const crypto = require('crypto');
const globalStates = require('../vitals/globalState');

let formatDateTime = function (date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  m = m < 10 ? ('0' + m) : m;
  var d = date.getDate();
  d = d < 10 ? ('0' + d) : d;
  var h = date.getHours();
  h = h < 10 ? ('0' + h) : h;
  var minute = date.getMinutes();
  minute = minute < 10 ? ('0' + minute) : minute;
  var second = date.getSeconds();
  second = second < 10 ? ('0' + second) : second;
  return y + '/' + m + '/' + d + ' ' + h + ':' + minute + ':' + second;
}


function generateHash(secretData) {
  let hash = crypto.createHash('sha1');

  hash.update(secretData);

  let hashedData = hash.digest('hex');
  return hashedData;
}

function validateHash(secretData, hashedData) {
  let hash = crypto.createHash('sha1');

  hash.update(secretData);

  return hash.digest('hex') == hashedData;
}

function isServiceKeyValid(keyContent, serviceKeyObject) {
  return keyContent == generateHash(serviceKeyObject.service_key_id + serviceKeyObject.service_key_name + serviceKeyObject.user_id +
    formatDateTime(serviceKeyObject.expire_time) + serviceKeyObject.security_params + globalStates.config.jwtSecret);
}

module.exports = {
  generateHash, validateHash, isServiceKeyValid
}