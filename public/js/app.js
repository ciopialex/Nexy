// Nexy - Simple Chat App
// This file handles all the frontend logic

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// ===== SETUP =====
const socket = io(`http://${window.location.hostname}:3000`);
let currentUser = null;
let currentChatId = null;

// Helper: Get element by ID (shorter than typing document.getElementById every time)
const $ = id => document.getElementById(id);
const $q = sel => document.querySelector(sel);

// ===== ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    setupButtons();
    setupSearch();
    setupSocket();
    checkIfLoggedIn();
});

// ===== BUTTON SETUP =====
function setupButtons() {
    // Login
    $('login-btn').onclick = login;
    $('password-input').onkeydown = e => e.key === 'Enter' && login();

    // Signup
    $('show-signup-btn').onclick = () => $('signup-overlay').classList.add('visible');
    $('close-signup-btn').onclick = () => $('signup-overlay').classList.remove('visible');
    $('signup-btn').onclick = signup;

    // Logout
    $('logout-btn').onclick = logout;

    // Chats panel
    $('chats-btn').onclick = () => {
        $('chat-history').classList.add('visible');
        loadChats();
    };
    $('close-chat-history-btn').onclick = () => $('chat-history').classList.remove('visible');

    // Requests panel
    $('requests-btn').onclick = () => {
        $('requests-overlay').classList.add('visible');
        loadRequests();
    };
    $('close-requests-btn').onclick = () => $('requests-overlay').classList.remove('visible');

    // Chat window
    $('close-chat-btn').onclick = closeChat;
    $('send-btn').onclick = sendMessage;
    $('message-input').onkeydown = e => e.key === 'Enter' && sendMessage();

    // Image upload
    $('upload-btn').onclick = () => $('image-upload').click();
    $('image-upload').onchange = uploadImage;

    // Profile
    $('user-profile').onclick = showProfile;
    $('close-profile-btn').onclick = () => $('profile-overlay').classList.remove('visible');

    // Password show/hide
    $('show-password-login-btn').onclick = () => togglePassword('password-input', 'show-password-login-btn');
    $('show-password-signup-btn').onclick = () => togglePassword('signup-password', 'show-password-signup-btn');
}

function togglePassword(inputId, btnId) {
    const input = $(inputId);
    const btn = $(btnId);
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
}

// ===== AUTH FUNCTIONS =====
async function login() {
    const id = $('login-input').value;
    const pw = $('password-input').value;
    if (!id || !pw) return alert('Enter email/handle and password');

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier: id, password: pw })
    });
    const data = await res.json();

    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        showChatUI();
    } else {
        alert(data.message);
    }
}

async function signup() {
    const name = $('signup-name').value;
    const handle = $('signup-handle').value;
    const email = $('signup-email').value;
    const pw = $('signup-password').value;
    if (!name || !handle || !email || !pw) return alert('Fill all fields');

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, handle, email, password: pw })
    });

    if (res.ok) {
        $('signup-overlay').classList.remove('visible');
        $('login-input').value = handle;
        $('password-input').value = pw;
        login();
    } else {
        alert((await res.json()).message);
    }
}

function logout() {
    localStorage.clear();
    currentUser = null;
    $('auth-container').classList.remove('hidden');
    $('chat-ui').classList.remove('visible');
}

async function checkIfLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch('/api/user', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
        currentUser = await res.json();
        showChatUI();
    } else {
        logout();
    }
}

function showChatUI() {
    $('auth-container').classList.add('hidden');
    $('chat-ui').classList.add('visible');

    const user = JSON.parse(localStorage.getItem('user'));
    $('user-profile').innerHTML = `<img src="${user?.profilePictureUrl || 'img/default-avatar.png'}" class="mini-profile-pic"><span>Profile</span>`;

    socket.emit('setOnline', currentUser.userId);
    loadChats();
}

function showProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    $q('.profile-modal-pic').src = user?.profilePictureUrl || 'img/default-avatar.png';
    $q('.profile-modal-name').textContent = user?.username;
    $q('.profile-modal-handle').textContent = user?.email;
    $('profile-overlay').classList.add('visible');
}

// ===== SEARCH =====
function setupSearch() {
    const input = $('search-input');
    const results = $('search-results');

    input.oninput = async () => {
        const term = input.value.trim();
        if (!term) { results.innerHTML = ''; return; }

        const res = await fetch(`/api/users/search?handle=${term}`);
        const users = await res.json();

        results.innerHTML = users
            .filter(u => u.userId !== currentUser?.userId)
            .map(u => `
                <div class="search-result-item">
                    <img src="${u.profilePictureUrl || 'img/default-avatar.png'}">
                    <div><h4>${u.username}</h4><span>@${u.handle}</span></div>
                    <button class="add-friend-btn" onclick="sendRequest(${u.userId})">Add</button>
                </div>
            `).join('');
    };

    // Close search when clicking outside
    document.onclick = e => {
        if (!results.contains(e.target) && !input.contains(e.target)) results.innerHTML = '';
    };
}

// ===== FRIEND REQUESTS =====
window.sendRequest = async (userId) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: userId })
    });
    alert(res.ok ? 'Request sent!' : (await res.json()).message);
};

async function loadRequests() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/requests', { headers: { Authorization: `Bearer ${token}` } });
    const requests = await res.json();

    $('requests-list').innerHTML = requests.length === 0
        ? '<p>No pending requests</p>'
        : requests.map(r => `
            <div class="request-item">
                <div class="request-info">
                    <img src="${r.profilePictureUrl || 'img/default-avatar.png'}">
                    <span>${r.username}</span>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="handleRequest(${r.id}, true)">Accept</button>
                    <button class="decline-btn" onclick="handleRequest(${r.id}, false)">Decline</button>
                </div>
            </div>
        `).join('');
}

window.handleRequest = async (id, accept) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: accept ? 'accepted' : 'declined' })
    });
    const data = await res.json();
    loadRequests();
    if (accept && data.chatId) {
        socket.emit('joinNewChat', data.chatId);
        loadChats();
    }
};

// ===== CHATS =====
async function loadChats() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } });
    const chats = await res.json();

    $q('.chat-history-list').innerHTML = chats.map(c => `
        <div class="chat-history-item" data-chat-id="${c.chatId}" onclick='openChat(${JSON.stringify(c)})'>
            <img src="${c.otherProfilePic || 'img/default-avatar.png'}">
            <div class="chat-history-info">
                <h4>${c.otherUsername}</h4>
                <p>${c.lastMessage || ''}</p>
            </div>
        </div>
    `).join('');
}

window.openChat = async (chat) => {
    currentChatId = chat.chatId;
    socket.emit('joinChat', chat.chatId);

    $q('.chat-header-info h3').textContent = chat.otherUsername;
    $q('.chat-area').classList.add('visible');
    $('chat-window').classList.add('visible');

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/chats/${chat.chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    const messages = await res.json();

    $q('.chat-messages').innerHTML = messages.map(m => `
        <div class="message ${m.senderId === currentUser.userId ? 'sent' : 'received'}" data-message-id="${m.messageId}">
            <div class="message-bubble">${m.imageUrl ? `<img src="${m.imageUrl}" class="message-image">` : m.content}</div>
        </div>
    `).join('');

    $q('.chat-messages').scrollTop = $q('.chat-messages').scrollHeight;
};

function closeChat() {
    $q('.chat-area').classList.remove('visible');
    $('chat-window').classList.remove('visible');
    currentChatId = null;
}

function sendMessage() {
    const content = $('message-input').value.trim();
    if (!content) return;

    socket.emit('sendMessage', { chatId: currentChatId, senderId: currentUser.userId, content });
    $('message-input').value = '';
}

async function uploadImage() {
    const file = $('image-upload').files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('chatId', currentChatId);
    formData.append('type', 'chat');

    const token = localStorage.getItem('token');
    await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });
}

// ===== SOCKET EVENTS (Real-time) =====
function setupSocket() {
    socket.on('newMessage', msg => {
        // Add message to chat if it's the current one
        if (msg.chatId === currentChatId) {
            $q('.chat-messages').innerHTML += `
                <div class="message ${msg.senderId === currentUser?.userId ? 'sent' : 'received'}">
                    <div class="message-bubble">${msg.imageUrl ? `<img src="${msg.imageUrl}" class="message-image">` : msg.content}</div>
                </div>
            `;
            $q('.chat-messages').scrollTop = $q('.chat-messages').scrollHeight;
        }

        // Update chat list preview
        const item = $q(`.chat-history-item[data-chat-id="${msg.chatId}"] p`);
        if (item) item.textContent = msg.imageUrl ? '📷 Image' : msg.content;

        // Show notification
        if (msg.sender?.username) showNotification(`New message from ${msg.sender.username}`);
    });

    socket.on('chatCreated', () => loadChats());

    socket.on('messageUpdated', msg => {
        const bubble = $q(`[data-message-id="${msg.messageId}"] .message-bubble`);
        if (bubble) bubble.textContent = msg.content;
    });
}

function showNotification(text) {
    const note = document.createElement('div');
    note.className = 'notification';
    note.textContent = text;
    $('notification-container').appendChild(note);

    setTimeout(() => note.remove(), 3000);
}
