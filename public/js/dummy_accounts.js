window.createDummyAccounts = async function() {
    const auth = window.auth;
    const db = window.db;

    if (!auth || !db) {
        console.error("Firebase auth and db objects not found on window. Make sure DEV_MODE is true in app.js");
        return;
    }

    const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const { doc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

    async function createDummyAccount(name, handle, email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                handle: handle,
                email: email,
                createdAt: serverTimestamp(),
                contacts: []
            });
            console.log(`Successfully created dummy account for ${name}`);

            // Send friend request to admin
            const adminUserQuery = await getDocs(query(collection(db, "users"), where("handle", "==", "@admin")));
            if (!adminUserQuery.empty) {
                const adminId = adminUserQuery.docs[0].id;
                await addDoc(collection(db, 'friend_requests'), {
                    fromId: user.uid,
                    toId: adminId,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                console.log(`Friend request sent from ${name} to admin.`);
            } else {
                console.log('Could not find admin user to send friend request to.');
            }

            await signOut(auth);
        } catch (error) {
            console.error("Error creating dummy account:", error.message);
        }
    }

    async function acceptFriendRequest(requestId, fromId, toId) {
        const requestDocRef = doc(db, "friend_requests", requestId);
        const toUserDocRef = doc(db, "users", toId);
        const fromUserDocRef = doc(db, "users", fromId);

        await updateDoc(requestDocRef, { status: "accepted" });
        await updateDoc(toUserDocRef, { contacts: arrayUnion(fromId) });
        await updateDoc(fromUserDocRef, { contacts: arrayUnion(toId) });
    }

    async function sendMessage(chatId, senderId, text) {
        await addDoc(collection(db, "chats", chatId, "messages"), {
            text: text,
            senderId: senderId,
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "chats", chatId), {
            lastMessage: text,
            lastUpdated: serverTimestamp()
        });
    }

    await createDummyAccount('John Doe', '@john', 'john@example.com', 'password123');
    await createDummyAccount('Jane Smith', '@jane', 'jane@example.com', 'password123');
    await createDummyAccount('Peter Jones', '@peter', 'peter@example.com', 'password123');

    // Sign in as admin to accept friend requests
    try {
        await signInWithEmailAndPassword(auth, "admin@example.com", "password123");
        const adminUserQuery = await getDocs(query(collection(db, "users"), where("handle", "==", "@admin")));
        if (!adminUserQuery.empty) {
            const adminId = adminUserQuery.docs[0].id;
            const friendRequestsQuery = await getDocs(query(collection(db, "friend_requests"), where("toId", "==", adminId), where("status", "==", "pending")));
            for (const requestDoc of friendRequestsQuery.docs) {
                const request = requestDoc.data();
                await acceptFriendRequest(requestDoc.id, request.fromId, request.toId);
                console.log(`Accepted friend request from ${request.fromId}`);
            }
        }
        await signOut(auth);
    } catch (error) {
        console.error("Error accepting friend requests:", error.message);
    }

    // Send messages from dummy accounts to admin
    try {
        const adminUserQuery = await getDocs(query(collection(db, "users"), where("handle", "==", "@admin")));
        if (!adminUserQuery.empty) {
            const adminId = adminUserQuery.docs[0].id;

            await signInWithEmailAndPassword(auth, "john@example.com", "password123");
            let currentUser = auth.currentUser;
            let chatId = [currentUser.uid, adminId].sort().join('_');
            await sendMessage(chatId, currentUser.uid, "Hey admin, it's John!");
            await signOut(auth);

            await signInWithEmailAndPassword(auth, "jane@example.com", "password123");
            currentUser = auth.currentUser;
            chatId = [currentUser.uid, adminId].sort().join('_');
            await sendMessage(chatId, currentUser.uid, "Hi there, admin! This is Jane.");
            await signOut(auth);

            await signInWithEmailAndPassword(auth, "peter@example.com", "password123");
            currentUser = auth.currentUser;
            chatId = [currentUser.uid, adminId].sort().join('_');
            await sendMessage(chatId, currentUser.uid, "Peter here, just saying hello.");
            await signOut(auth);
        }
    } catch (error) {
        console.error("Error sending messages:", error.message);
    }

    console.log("Dummy accounts, contacts, and chats created successfully!");
}
