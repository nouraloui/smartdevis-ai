// backend/src/config/db.mysql.js

const mysql = require('mysql2/promise');

let pool = null;

const connectMySQL = async () => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 Configuration MySQL');
    console.log('MYSQL_HOST     =', process.env.MYSQL_HOST);
    console.log('MYSQL_PORT     =', process.env.MYSQL_PORT);
    console.log('MYSQL_USER     =', process.env.MYSQL_USER);
    console.log('MYSQL_DATABASE =', process.env.MYSQL_DATABASE);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'africa-engineering_di',

      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,

      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT DATABASE() AS current_database'
    );

    connection.release();

    console.log('✅ MySQL connecté');
    console.log(
      '📊 Base active :',
      rows[0]?.current_database
    );

    return pool;

  } catch (err) {
    console.error('❌ Erreur connexion MySQL');
    console.error(err.message);
    throw err;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error(
      'Pool MySQL non initialisé. Appeler connectMySQL() au démarrage.'
    );
  }

  return pool;
};

module.exports = {
  connectMySQL,
  getPool
};