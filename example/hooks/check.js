// get example counts
'use strict';

require('dotenv').config();

const mysql = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4',
    database: process.env.DB_NAME,
    timezone: 'UTC'
  },
  //debug: true,
  pool: {
    min: 0,
    max: 7
  }
});

module.exports = async function () {
  try {
    const count = await mysql('mytest').count(`${process.env.QUERY_ORDER_KEY} as count`);
    if (count[0].count === 100) {
      return;
    } else {
      console.log('Check failed')
      process.exit(1);
    }
  } catch (e) {
    console.log(e)
    process.exit(1);
  }

};