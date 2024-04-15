import fs from 'fs';
import db from './db'
import path from 'path'

// Read and execute the SQL query in ./sql/articles.sql
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8').toString());
