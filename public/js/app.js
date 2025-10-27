import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const socket = io('http://localhost:3000');

let currentUser = null;
let currentChatId = null;
let selectedMessageId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    const authContainer = document.getElementById('auth-container');
    const chatUI = document.getElementById('chat-ui');
    const loginBtn = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-input');
    const passwordInput = document.getElementById('password-input');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signupOverlay = document.getElementById('signup-overlay');
    const closeSignupBtn = document.getElementById('close-signup-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signupName = document.getElementById('signup-name');
    const signupHandle = document.getElementById('signup-handle');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const profileOverlay = document.getElementById('profile-overlay');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const profileModalPic = document.querySelector('.profile-modal-pic');
    const profileModalName = document.querySelector('.profile-modal-name');
    const profileModalHandle = document.querySelector('.profile-modal-handle');
    const requestsOverlay = document.getElementById('requests-overlay');
    const requestsBtn = document.getElementById('requests-btn');
    const closeRequestsBtn = document.getElementById('close-requests-btn');
    const requestsList = document.getElementById('requests-list');
    const chatWindow = document.getElementById('chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatHeaderName = document.querySelector('.chat-header-info h3');
    const chatMessages = document.querySelector('.chat-messages');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    const chatsBtn = document.getElementById('chats-btn');
    const chatHeadsContainer = document.getElementById('chat-heads-container');
    const userProfile = document.getElementById('user-profile');
    const notificationContainer = document.getElementById('notification-container');
    const messageContextMenu = document.getElementById('message-context-menu');
    const editMessageBtn = document.getElementById('edit-message-btn');
    const deleteMessageBtn = document.getElementById('delete-message-btn');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

        const closeChatHistoryBtn = document.getElementById('close-chat-history-btn');

    function setupEventListeners() {
        loginBtn.addEventListener('click', () => handleLogin());
        passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
        logoutBtn.addEventListener('click', handleLogout);
        showSignupBtn.addEventListener('click', () => signupOverlay.classList.add('visible'));
        closeSignupBtn.addEventListener('click', () => signupOverlay.classList.remove('visible'));
        signupBtn.addEventListener('click', handleSignup);
        chatsBtn.addEventListener('click', () => {
    document.getElementById('chat-history').classList.add('visible');
    document.querySelector('.chat-area').classList.add('history-visible');
});
        closeChatHistoryBtn.addEventListener('click', () => {
    document.getElementById('chat-history').classList.remove('visible');
    document.querySelector('.chat-area').classList.remove('history-visible');
});
        requestsBtn.addEventListener('click', () => requestsOverlay.classList.add('visible'));
        closeRequestsBtn.addEventListener('click', () => requestsOverlay.classList.remove('visible'));
        userProfile.addEventListener('click', showSelfProfile);
        closeProfileBtn.addEventListener('click', hideProfile);
        closeChatBtn.addEventListener('click', closeChatWindow);
        uploadBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', handleImageUpload);
        chatMessages.addEventListener('contextmenu', showContextMenu);
        editMessageBtn.addEventListener('click', handleEditMessage);
        deleteMessageBtn.addEventListener('click', handleDeleteMessage);
        sendBtn.addEventListener('click', handleSendMessage);
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
    }

    function hideProfile() {

            profileOverlay.classList.remove('visible');

        }

    

        function showContextMenu(e) {

            const messageEl = e.target.closest('.message.sent');

            if (!messageEl) return;

    

            e.preventDefault();

    

            selectedMessageId = messageEl.dataset.messageId;

    

            messageContextMenu.style.top = `${e.clientY}px`;

            messageContextMenu.style.left = `${e.clientX}px`;

            messageContextMenu.classList.add('visible');

    

            const clickListener = () => {

                messageContextMenu.classList.remove('visible');

                document.removeEventListener('click', clickListener);

            };

            document.addEventListener('click', clickListener);

                }

            

                function handleDeleteMessage() {

                    if (!selectedMessageId) return;

            

                    socket.emit('deleteMessage', {

            

                                messageId: selectedMessageId,

            

                                chatId: currentChatId,

            

                                userId: currentUser.userId

            

                            });

            

                        }

            

                    

            

                        function handleEditMessage() {

            

                    

            

                                if (!selectedMessageId) return;

            

                    

            

                        

            

                    

            

                                const messageEl = document.querySelector(`[data-message-id="${selectedMessageId}"]`);

            

                    

            

                                if (!messageEl) return;

            

                    

            

                        

            

                    

            

                                const messageBubble = messageEl.querySelector('.message-bubble');

            

                    

            

                                if (!messageBubble) return;

            

                    

            

                        

            

                    

            

                                const currentContent = messageBubble.textContent;

            

                    

            

                                const input = document.createElement('input');

            

                    

            

                                input.type = 'text';

            

                    

            

                                input.value = currentContent;

            

                    

            

                        

            

                    

            

                                messageBubble.innerHTML = '';

            

                    

            

                                messageBubble.appendChild(input);

            

                    

            

                                input.focus();

            

                    

            

                        

            

                    

            

                                input.addEventListener('keydown', (e) => {

            

                    

            

                                    if (e.key === 'Enter') {

            

                    

            

                                        const newContent = input.value;

            

                    

            

                                        socket.emit('editMessage', {

            

                    

            

                                            messageId: selectedMessageId,

            

                    

            

                                            chatId: currentChatId,

            

                    

            

                                            userId: currentUser.userId,

            

                    

            

                                            newContent

            

                    

            

                                        });

            

                    

            

                                        messageBubble.textContent = newContent;

            

                    

            

                                    }

            

                    

            

                                });

            

                    

            

                            }

            

                    

            

                        

            

                    

            

                            function handleSendMessage() {

            

                    

            

                                const content = messageInput.value.trim();

            

                    

            

                                if (content) {

            

                    

            

                                    socket.emit('sendMessage', {

            

                    

            

                                        chatId: currentChatId,

            

                    

            

                                        senderId: currentUser.userId,

            

                    

            

                                        content

            

                    

            

                                    });

            

                    

            

                                    messageInput.value = '';

            

                    

            

                                }

            

                    

            

                            }    async function loadChatHistory() {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/chats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch chats');
            }
            const chats = await response.json();
            const chatList = document.querySelector('.chat-history-list');
            chatList.innerHTML = ''; // Clear existing list
            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-history-item';
                chatItem.dataset.chatId = chat.chatId;
                chatItem.innerHTML = `
                    <img src="${chat.otherProfilePic || 'img/default-avatar.png'}" alt="Profile Picture">
                    <div class="chat-history-info">
                        <h4>${chat.otherUsername}</h4>
                        <p>${chat.lastMessage || ''}</p>
                    </div>
                `;
                chatItem.addEventListener('click', () => openChatWindow(chat));
                chatList.appendChild(chatItem);
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function showChatUI() {
        authContainer.classList.add('hidden');
        chatUI.classList.add('visible');
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const userProfile = document.getElementById('user-profile');
            userProfile.innerHTML = `<img src="${user.profilePictureUrl || 'img/default-avatar.png'}" class="mini-profile-pic"><span>Profile</span>`;
        }
        loadChatHistory();
    }

    function showAuthUI() {
        chatUI.classList.remove('visible');
        authContainer.classList.remove('hidden');
    }

    function showSelfProfile() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            profileModalPic.src = user.profilePictureUrl || 'img/default-avatar.png';
            profileModalName.textContent = user.username;
            profileModalHandle.textContent = user.email;
            profileOverlay.classList.add('visible');
        }
    }

    function hideProfile() {
        profileOverlay.classList.remove('visible');
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('chatId', currentChatId);
        formData.append('userId', currentUser.userId);
        formData.append('type', 'chat');

        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Image upload failed');
            }

            // The server will emit a 'newMessage' event, which will be handled by the socket listener.

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image.');
        }
    }



    async function openChatWindow(chat) {
        socket.emit('joinChat', chat.chatId);
        currentChatId = chat.chatId;
        document.querySelector('.chat-area').classList.add('visible');
        const chatHead = document.querySelector(`.chat-head[data-chat-id="${chat.chatId}"]`);
        if (chatHead) {
            const badge = chatHead.querySelector('.notification-badge');
            if (badge) {
                badge.remove();
            }
        }

        chatHeadsContainer.classList.add('chat-open');
        chatWindow.classList.add('visible');
        chatHeaderName.textContent = chat.otherUsername;

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/chats/${chat.chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const messages = await response.json();
                chatMessages.innerHTML = '';
                messages.forEach(message => {
                const messageEl = document.createElement('div');
                messageEl.className = `message ${message.senderId === currentUser.userId ? 'sent' : 'received'}`;
                messageEl.dataset.messageId = message.messageId;
                let content = '';
                if (message.imageUrl) {
                    content = `<img src="${message.imageUrl}" class="message-image">`;
                } else {
                    content = message.content;
                }
                messageEl.innerHTML = `<div class="message-bubble">${content}</div>`;
                chatMessages.appendChild(messageEl);
            });
            } else {
                console.error('Failed to fetch messages');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    socket.on('newMessage', (data) => {
        // If the new message belongs to the currently open chat, append it
        if (data.chatId === currentChatId) {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${data.senderId === currentUser.userId ? 'sent' : 'received'}`;
            messageEl.dataset.messageId = data.messageId;
            let content = '';
            if (data.imageUrl) {
                content = `<img src="${data.imageUrl}" class="message-image">`;
            } else {
                content = data.content;
            }
            messageEl.innerHTML = `<div class="message-bubble">${content}</div>`;
            chatMessages.appendChild(messageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Update the last message in the chat history list
        const chatHistoryItem = document.querySelector(`.chat-history-item[data-chat-id="${data.chatId}"]`);
        if (chatHistoryItem) {
            const lastMessageEl = chatHistoryItem.querySelector('p');
            if (lastMessageEl) {
                lastMessageEl.textContent = data.imageUrl ? '📷 Image' : data.content;
            }
        }

        showNotification(`New message from ${data.sender.username}`);
        const chatHead = document.querySelector(`.chat-head[data-chat-id="${data.chatId}"]`);
        if (chatHead) {
            const badge = document.createElement('div');
            badge.className = 'notification-badge';
            badge.textContent = '1';
            chatHead.appendChild(badge);
        }
    });

    socket.on('messageUpdated', (data) => {
        const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageEl) {
            const messageBubble = messageEl.querySelector('.message-bubble');
            if (messageBubble) {
                messageBubble.textContent = data.content;
            }
        }

        // Update the last message in the chat history list if it was the one that was edited
        const chatHistoryItem = document.querySelector(`.chat-history-item[data-chat-id="${data.chatId}"]`);
        if (chatHistoryItem) {
            const lastMessageEl = chatHistoryItem.querySelector('p');
            if (lastMessageEl && lastMessageEl.textContent !== data.content) { // Check if it was the last message
                // This is a simplification. A more robust solution would be to check the message timestamp.
                lastMessageEl.textContent = data.content;
            }
        }
    });

    function closeChatWindow() {
        document.querySelector('.chat-area').classList.remove('visible');
        chatWindow.classList.remove('visible');
        chatHeadsContainer.classList.remove('chat-open');
    }

    async function handleLogin(loginIdentifier, password) {
        const userLoginIdentifier = loginIdentifier || loginInput.value;
        const userPassword = password || passwordInput.value;
        if (!userLoginIdentifier || !userPassword) {
            alert('Please enter email/handle and password');
            return;
        }
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginIdentifier: userLoginIdentifier, password: userPassword })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                showChatUI();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login.');
        }
    }

    async function handleSignup() {
        const name = signupName.value;
        const handle = signupHandle.value;
        const email = signupEmail.value;
        const password = signupPassword.value;
        if (!name || !handle || !email || !password) {
            alert('Please fill out all fields');
            return;
        }
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: name, email, password, handle })
            });
            const data = await response.json();
            if (response.ok) {
                signupOverlay.classList.remove('visible');
                await handleLogin(handle, password);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('An error occurred during signup.');
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        chatMessages.innerHTML = '';
        chatHeaderName.textContent = '';
        showAuthUI();
    }

    async function checkAuth() {
        const token = localStorage.getItem('token');
        console.log('Token from local storage:', token);        if (token) {
            try {
                const response = await fetch('/api/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const user = await response.json();
                    currentUser = user;
                    showChatUI();
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error('Auth check error:', error);
                handleLogout();
            }
        }
    }

    // Event Listeners
    setupEventListeners();

    // Initial call to check authentication status
    checkAuth();
});
