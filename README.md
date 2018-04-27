**STATUS: alpha** 

- create aws credentials and store them as json in root directory as aws-keys.json (optional)
- create a .env file
- npm install
- `mkdir output`
- run

### .env example
```
EXPORT_TYPE=json
DATASET_NAME=mydataset
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mypass
DB_NAME=test
MAX_FILE_SIZE=10
S3_STORE=true
S3_BUCKET=
S3_REGION=
S3_CREDENTIALS=
QUERY_ORDER_KEY=
QUERY=
QUERY_LIMIT=
```
**NOTE**: Not all variables are required

### Parquet file
Parquet schema should save on root as `parquetSchema.js` see `example/`

### Run example
- create database and table: `create table mytest (id int NOT NULL AUTO_INCREMENT, name varchar(100), email varchar(100), text text, primary key (id));`
- node example/populate
- in .env use:
```
QUERY_ORDER_KEY=id
QUERY=SELECT * FROM mytest
QUERY_LIMIT=50
```
- node app.js

### Todo
- see cursor
- better docs
- more tests
- improvements (speed and features)