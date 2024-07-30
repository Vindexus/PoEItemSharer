import fs from 'fs';
import db from './db'
import path from 'path'

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8').toString());
