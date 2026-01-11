require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugMessages() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- DEBUG: Chat Data ---');

        // 1. List all chats
        const [chats] = await connection.execute('SELECT * FROM Chats');
        console.log('\nChats:', chats.length);
        chats.forEach(c => console.log(`[${c.chatId}] ${c.chatName || 'DM'} - Last Msg: ${c.lastMessage}`));

        // 2. List participants
        const [participants] = await connection.execute(
            `SELECT cp.chatId, cp.userId, u.username 
             FROM ChatParticipants cp 
             JOIN Users u ON cp.userId = u.userId
             ORDER BY cp.chatId`
        );
        console.log('\nParticipants:');
        participants.forEach(p => console.log(`Chat ${p.chatId}: ${p.username} (ID: ${p.userId})`));

        // 3. List recent messages
        const [messages] = await connection.execute(
            `SELECT m.messageId, m.chatId, u.username as sender, m.content, m.createdAt
             FROM Messages m
             JOIN Users u ON m.senderId = u.userId
             ORDER BY m.createdAt DESC LIMIT 20`
        );
        console.log('\nRecent Messages (Last 20):');
        messages.forEach(m => console.log(`[Msg ${m.messageId}] Chat ${m.chatId} | ${m.sender}: "${m.content}" (${m.createdAt})`));

        await connection.end();
    } catch (error) {
        console.error('Error debugging:', error);
    }
}

debugMessages();
