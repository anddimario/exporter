// Example post hook
const promisify = require('util').promisify;
const { exec } = require('child_process');

const touch = promisify(exec);

module.exports = async function () {
  try {
    await touch('touch ./output/done');
    return;
  } catch (e) {
    console.log(e)
    process.exit(1);
  }

};