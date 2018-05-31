'use strict';

// count name that start for M

module.exports = function (row) {
  if (row.name.charAt(0).toLowerCase() === 'm') {
    console.log(`${row.name} start with M`)
  }
};