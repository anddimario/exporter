Export from SQL to json, csv or parquet

### Features
- support json, csv and parquet file
- optional write on s3
- pre and post hook

### Setup
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

### Use hooks
Hooks are useful to run functions pre and post process, for example to check if process could start on particular situations, or if it must delete data after export, or send a notifications. Hooks could be specified on .env as:
```
HOOKS_PRE=./example/hooks/check
HOOKS_POST=./example/hooks/touch,./example/hooks/clean
```
In .env are used the path where functions are.

### Todo
- check cursor
- better docs
- more tests
- improvements (code, speed and features)
