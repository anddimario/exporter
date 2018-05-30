'use strict';

const startDate = Date.now();

require('dotenv').config();

const AWS = require('aws-sdk');
const parquet = require('parquetjs');
const promisify = require('util').promisify;
const fs = require('fs');
const queries = require('./queries');
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
const fileListAsync = promisify(fs.readdir);

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

// Store file on s3
async function storeOnS3(file) {
  // list acutal files
  const files = await fileListAsync('./output/');
  // if size is reached, gzip, send and rotate file
  for (const file of files) {
    const body = fs.createReadStream(`./output/${file}`);

    await new Promise((resolve, reject) => {
      // http://docs.amazonaws.cn/en_us/AWSJavaScriptSDK/guide/node-examples.html#Amazon_S3__Uploading_an_arbitrarily_sized_stream__upload_
      s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: file,
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
    await removeAsync(`./output/${file}`);
  }
}

function runHooks(hooksList) {
  const hooks = hooksList.split(',');
  for (let hook of hooks) {
    // require function and push on function array
    require(hook)();
  }
}

async function execute(info) {
  try {
    if (info.preHooks) {
      runHooks(info.preHooks);
    }
    let referenceDate = Date.now();
    let cursor;
    let scan = true;
    while (scan) {
      const datasetFile = `./output/${info.datasetName}${referenceDate}.${process.env.EXPORT_TYPE}`;
      const exists = fs.existsSync(datasetFile);
      if (exists) {
        // calculate if need to split to new file
        const fileStat = await statAsync(datasetFile);
        const fileSize = fileStat.size / 1000000.0;

        if (fileSize >= +process.env.MAX_FILE_SIZE) {
          referenceDate = Date.now();
        }

      }
      let query = info.query;

      if (info.filters) {
        query += ` WHERE ${info.filters}`;
      }
      // Check if continue is set and if there's a cursor on db
      if (info.continue) {
        const checkCursor = await mysql('exporter_timeouts').where('query', process.argv[2]).select('last_cursor');
        if (checkCursor[0] && checkCursor[0].last_cursor) {
          cursor = checkCursor[0].last_cursor;
          // Delete old cursor
          await mysql('exporter_timeouts').where('query', process.argv[2]).del();
        }
      }
      if (cursor) {
        if (info.filters) {
          query += ` AND ${info.orderKey} > ${cursor}`;
        } else {
          query += ` WHERE ${info.orderKey} > ${cursor}`;
        }
      }
      query += ` ORDER BY ${info.orderKey}`;
      if (info.limit) {
        query += ` LIMIT ${info.limit}`;
      }

      const rows = await mysql.raw(query);
      cursor = false;
      // scan paginated results and store      
      if (process.env.EXPORT_TYPE === 'parquet') {
        parquetWriter = await parquet.ParquetWriter.openFile(parquetSchema, datasetFile);
        for (let row of rows[0]) {
          await parquetWriter.appendRow(row);
        }
        await parquetWriter.close();
      } else {

        for (let row of rows[0]) {
          cursor = row[info.orderKey];
          switch (process.env.EXPORT_TYPE) {
            case 'json':
              await appendFS(datasetFile, `${JSON.stringify(row)}\r\n`, 'utf8');
              break;
            case 'csv':
              await appendFS(datasetFile, `${Object.values(row).join(',')}\r\n`, 'utf8');
              break;
            default:
              throw new Error('Wrong format');
          }
        }
      }

      // stop if there are less results
      if (!cursor) {
        scan = false;
      }
      // Check timeout and stop the loop
      const processTime = (Date.now()- startDate)/1000;
      if (processTime > info.timeout) {
        // store cursor
        await mysql.raw(`INSERT INTO exporter_timeouts (query, last_cursor) VALUES ('${process.argv[2]}', '${cursor}') ON DUPLICATE KEY UPDATE last_cursor = '${cursor}'`);
        // stop loop
        break;
      }
    }

    // if enabled s3 store, send and remove on local disk
    if (info.s3Store) {
      await storeOnS3(file);
    }
    if (info.postHooks) {
      runHooks(info.postHooks);
    }
    process.exit();
  } catch (e) {
    console.log(e)
    process.exit(1);
  }
}

function main() {
  execute(queries[process.argv[2]]);
}

main();
