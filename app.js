'use strict';

require('dotenv').config();

const AWS = require('aws-sdk');
const parquet = require('parquetjs');
const promisify = require('util').promisify;
const fs = require('fs');
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

// Promisify
const appendFS = promisify(fs.appendFile);
const statAsync = promisify(fs.stat);
const removeAsync = promisify(fs.unlink);

let s3;
if (process.env.S3_STORE) {
  AWS.config.loadFromPath(`${__dirname}/aws-keys.json`);
  AWS.config.update({ region: process.env.S3_REGION });
  s3 = new AWS.S3();
}

let parquetSchema, parquetWriter;
if (process.env.EXPORT_TYPE === 'parquet') {
  // read the parquet schema
  parquetSchema = new parquet.ParquetSchema(require('./parquetSchema'));
}

async function main() {
  try {
    let referenceDate = Date.now();
    let cursor;
    let scan = true;
    while (scan) {
      const datasetFile = `./output/${process.env.DATASET_NAME}${referenceDate}.${process.env.EXPORT_TYPE}`;
      const exists = fs.existsSync(datasetFile);
      if (exists) {
        // calculate if need to split to new file
        const fileStat = await statAsync(datasetFile);
        const fileSize = fileStat.size / 1000000.0;

        if (fileSize >= +process.env.MAX_FILE_SIZE) {
          // if enabled s3 store, send and remove on local disk
          if (process.env.S3_STORE) {
            const body = fs.createReadStream(datasetFile);

            await new Promise((resolve, reject) => {
              // http://docs.amazonaws.cn/en_us/AWSJavaScriptSDK/guide/node-examples.html#Amazon_S3__Uploading_an_arbitrarily_sized_stream__upload_
              s3.upload({
                Bucket: process.env.S3_BUCKET,
                Key: `${process.env.DATASET_NAME}${referenceDate}.${process.env.EXPORT_TYPE}`,
                Body: body
              })
                //.on('httpUploadProgress', (evt) => { console.log(evt); })
                .send(function (err, data) {
                  //  console.log(err, data);            
                  if (err) {
                    reject(err);
                  }
                  resolve(data);
                });
            });
            await removeAsync(datasetFile);
          }
          referenceDate = Date.now();
        }

      }
      let query = process.env.QUERY;

      if (cursor) {
        query += ` WHERE ${process.env.QUERY_ORDER_KEY} > ${cursor}`;
      }
      query += ` ORDER BY ${process.env.QUERY_ORDER_KEY}`;
      if (process.env.QUERY_LIMIT) {
        query += ` LIMIT ${process.env.QUERY_LIMIT}`;
      }

      const rows = await mysql.raw(query);
      // if parquet, open file
      if (process.env.EXPORT_TYPE === 'parquet') {
        parquetWriter = await parquet.ParquetWriter.openFile(parquetSchema, datasetFile);
      }
      cursor = false;
      // scan paginated results and store
      for (let row of rows[0]) {
        cursor = row[process.env.QUERY_ORDER_KEY];
        switch (process.env.EXPORT_TYPE) {
          case 'json':
            await appendFS(datasetFile, `${JSON.stringify(row)}\r\n`, 'utf8');
            break;
          case 'csv':
            await appendFS(datasetFile, `${Object.values(row).join(',')}\r\n`, 'utf8');
            break;
          case 'parquet':
            await parquetWriter.appendRow(row);
            break;
          default:
            throw new Error('Wrong format');
        }
      }
      // stop if there are less results
      if (!cursor) {
        scan = false;
      }
    }
    process.exit();
  } catch (e) {
    console.log(e)
    process.exit(1);
  }
}

main();
