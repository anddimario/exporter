'use strict';
require('dotenv').config();

const faker = require('faker');
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

async function main() {
  try {
    for (let i = 0; i < 100; i++) {
      const record = {
        name: faker.name.findName(),
        email: faker.internet.email(),
        text: faker.lorem.text()
      }
      await mysql('mytest').insert(record);
    }
    process.exit();
  } catch (e) {
    console.log(e)
    process.exit(1);
  }
}

main();