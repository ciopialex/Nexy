require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const alterUsersTable = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Add the handle column without the UNIQUE constraint first
        await connection.execute("ALTER TABLE Users ADD COLUMN handle VARCHAR(255) NOT NULL AFTER username");
        console.log('handle column added successfully.');

        // Update existing users with a unique handle
        await connection.execute("UPDATE Users SET handle = CONCAT('user', userId) WHERE handle = '' OR handle IS NULL");
        console.log('Existing users updated with unique handles.');

        // Add the UNIQUE constraint to the handle column
        await connection.execute("ALTER TABLE Users ADD UNIQUE (handle)");
        console.log('Users table altered successfully.');
    } catch (error) {
        console.error('Error altering Users table:', error);
    } finally {
        await connection.end();
    }
};

alterUsersTable();
