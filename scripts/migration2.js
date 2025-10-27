require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const alterMessagesTable = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await connection.execute("ALTER TABLE Messages ADD COLUMN isEdited BOOLEAN NOT NULL DEFAULT FALSE");
        console.log('Messages table altered successfully.');
    } catch (error) {
        console.error('Error altering Messages table:', error);
    } finally {
        await connection.end();
    }
};

alterMessagesTable();
