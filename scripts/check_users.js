require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkUsers() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        const [rows] = await connection.execute('SELECT userId, username, email, handle, passwordHash FROM Users');

        if (rows.length === 0) {
            console.log('No users found in the database.');
        } else {
            console.log('Users found:');
            rows.forEach(user => {
                console.log('--------------------------------------------------');
                console.log(`ID: ${user.userId}`);
                console.log(`Username: ${user.username}`);
                console.log(`Email: ${user.email}`);
                console.log(`Handle: ${user.handle}`);
                console.log(`Password Hash (start): ${user.passwordHash ? user.passwordHash.substring(0, 10) + '...' : 'NULL'}`);
            });
            console.log('--------------------------------------------------');
        }

        await connection.end();
    } catch (error) {
        console.error('Error checking users:', error);
    }
}

checkUsers();
