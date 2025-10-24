
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Use the same database configuration as your server.js
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function seedDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the database.');

    // --- 1. Create Users ---
    console.log('Creating users...');
    const adminPassword = await bcrypt.hash('admin', SALT_ROUNDS);
    const johnPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const janePassword = await bcrypt.hash('password123', SALT_ROUNDS);

    const [adminResult] = await connection.execute(
      'INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
      ['admin', 'admin@example.com', adminPassword]
    );
    const adminId = adminResult.insertId || (await connection.execute('SELECT userId FROM Users WHERE username = ?', ['admin']))[0][0].userId;

    const [johnResult] = await connection.execute(
      'INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
      ['john', 'john@example.com', johnPassword]
    );
    const johnId = johnResult.insertId || (await connection.execute('SELECT userId FROM Users WHERE username = ?', ['john']))[0][0].userId;

    const [janeResult] = await connection.execute(
      'INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
      ['jane', 'jane@example.com', janePassword]
    );
    const janeId = janeResult.insertId || (await connection.execute('SELECT userId FROM Users WHERE username = ?', ['jane']))[0][0].userId;

    const [peterResult] = await connection.execute(
      'INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
      ['peter', 'peter@example.com', await bcrypt.hash('password123', SALT_ROUNDS)]
    );
    const peterId = peterResult.insertId || (await connection.execute('SELECT userId FROM Users WHERE username = ?', ['peter']))[0][0].userId;

    console.log(`Users created: admin (ID: ${adminId}), john (ID: ${johnId}), jane (ID: ${janeId}), peter (ID: ${peterId})`);

    // --- 2. Create Friend Requests for Admin ---
    console.log('Creating friend requests for admin...');
    await connection.execute(
        'INSERT INTO ChatRequests (senderId, receiverId, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status=status',
        [peterId, adminId, 'pending']
    );
    console.log('Request from Peter to Admin created.');

    // --- 3. Create Chats ---
    console.log('Creating chats...');
    // Chat between admin and john
    const [chat1Result] = await connection.execute('INSERT INTO Chats (isGroupChat) VALUES (?)', [false]);
    const chat1Id = chat1Result.insertId;
    await connection.execute(
      'INSERT INTO ChatParticipants (chatId, userId) VALUES (?, ?), (?, ?)',
      [chat1Id, adminId, chat1Id, johnId]
    );
    console.log(`Chat created between admin and john with ID: ${chat1Id}`);

    // Chat between admin and jane
    const [chat2Result] = await connection.execute('INSERT INTO Chats (isGroupChat) VALUES (?)', [false]);
    const chat2Id = chat2Result.insertId;
    await connection.execute(
      'INSERT INTO ChatParticipants (chatId, userId) VALUES (?, ?), (?, ?)',
      [chat2Id, adminId, chat2Id, janeId]
    );
    console.log(`Chat created between admin and jane with ID: ${chat2Id}`);


    // --- 4. Add Messages ---
    console.log('Adding messages to the chats...');
    // Messages for admin and john
    await connection.execute(
      'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
      [chat1Id, adminId, 'Hi John, this is the admin.']
    );
    await connection.execute(
      'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
      [chat1Id, johnId, 'Hello admin! Glad to be here.']
    );
     await connection.execute(
      'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
      [chat1Id, adminId, 'Welcome to Nexy! Feel free to look around.']
    );
    await connection.execute('UPDATE Chats SET lastMessage = ? WHERE chatId = ?', ['Welcome to Nexy! Feel free to look around.', chat1Id]);

    // Messages for admin and jane
    await connection.execute(
      'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
      [chat2Id, adminId, 'Hey Jane, how are you?']
    );
    await connection.execute('UPDATE Chats SET lastMessage = ? WHERE chatId = ?', ['Hey Jane, how are you?', chat2Id]);

    console.log('Messages added.');

    console.log('\nDatabase seeding complete! You can now log in.');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

seedDatabase();
