import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: '',          // empty password if you used MYSQL_ALLOW_EMPTY_PASSWORD
  database: process.env.MYSQL_DATABASE || 'appdb',
  port: 3306,
});

export default pool;