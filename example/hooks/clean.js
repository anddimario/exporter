// Example post hook
const promisify = require('util').promisify;
const { exec } = require('child_process');

const clean = promisify(exec);

module.exports = async function () {
  try {
    await clean('rm ./output/*');
    return;
  } catch (e) {
    console.log(e)
    process.exit(1);
  }

};