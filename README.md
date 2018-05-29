Export from SQL to json, csv or parquet

### Features
- support json, csv and parquet file
- optional write on s3
- pre and post hook

### Setup
- create aws credentials and store them as json in root directory as aws-keys.json (optional)
- create a .env file
- create a `queries.js` (see example)
- npm install
- `mkdir output`
- run: `node app.js queryReference`

### .env example
```
EXPORT_TYPE=json
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mypass
DB_NAME=test
MAX_FILE_SIZE=10
```
**NOTE**: Not all variables are required

### Parquet file
Parquet schema should save on root as `parquetSchema.js` see `example/`

### Run example
- create database and table: `create table mytest (id int NOT NULL AUTO_INCREMENT, name varchar(100), email varchar(100), text text, primary key (id));`
- node example/populate
- in `queries.js` use:
```
module.exports = {
  myQuery: {orderKey: 'id', query: 'SELECT * FROM mytest', limit: 50, datasetName: 'myQueryDataset'}
};
```
**Note**: `limit` is optional
- node app.js

### Use hooks
Hooks are useful to run functions pre and post process, for example to check if process could start on particular situations, or if it must delete data after export, or send a notifications. Hooks could be specified on `queries.js` as per-query informations in the object, example:
```
preHooks: './example/hooks/check', postHooks: './example/hooks/touch,./example/hooks/clean'
```
In .env are used the path where functions are.

### Store on s3
Add this in .env:
```
S3_BUCKET=
S3_REGION=
S3_CREDENTIALS=
```
Then, for each query that need the store, add in query definition object: `s3Store: true`

### Filters
For add filters in query where, for example, add in query definition:
`filters: 'age > 10'`
