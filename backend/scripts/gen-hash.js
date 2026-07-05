const { hashPassword } = require('../password');
const hash = hashPassword('123');
console.log(hash);
