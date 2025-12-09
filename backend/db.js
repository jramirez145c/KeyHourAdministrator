const sql = require('mssql');

const config = {
    server: 'localhost',
    database: 'KeyHourDB',
    user: 'keyuser',
    password: '123456',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

module.exports = { sql, config };
