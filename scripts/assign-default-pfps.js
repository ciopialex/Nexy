require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const { generateDefaultPfp } = require('../utils/default-pfp');

async function assignDefaultPfps() {
    let dbPool;
    try {
        dbPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [users] = await dbPool.execute('SELECT * FROM Users');

        for (const user of users) {
            if (!user.profilePictureUrl) {
                const profilePictureUrl = generateDefaultPfp(user.userId);
                await dbPool.execute('UPDATE Users SET profilePictureUrl = ? WHERE userId = ?', [profilePictureUrl, user.userId]);
                console.log(`Assigned default profile picture to user ${user.userId}`);
            }
        }

        console.log('Finished assigning default profile pictures.');

    } catch (error) {
        console.error('Error assigning default profile pictures:', error);
    } finally {
        if (dbPool) {
            dbPool.end();
        }
    }
}

assignDefaultPfps();
