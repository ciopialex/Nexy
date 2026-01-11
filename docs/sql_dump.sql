-- Nexy Database Schema
-- Tables ordered by dependencies (no foreign keys first)

-- 1. USERS - The core table, no dependencies
CREATE TABLE `Users` (
  `userId` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `handle` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `profilePictureUrl` varchar(1024) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `handle` (`handle`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. CHATS - No dependencies
CREATE TABLE `Chats` (
  `chatId` int NOT NULL AUTO_INCREMENT,
  `isGroupChat` tinyint(1) NOT NULL DEFAULT '0',
  `chatName` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `lastMessage` text,
  `lastUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`chatId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. MESSAGES - Depends on Chats and Users
CREATE TABLE `Messages` (
  `messageId` int NOT NULL AUTO_INCREMENT,
  `chatId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text,
  `imageUrl` varchar(1024) DEFAULT NULL,
  `isEdited` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','delivered','seen') NOT NULL DEFAULT 'sent',
  PRIMARY KEY (`messageId`),
  KEY `chatId` (`chatId`),
  KEY `senderId` (`senderId`),
  CONSTRAINT `Messages_ibfk_1` FOREIGN KEY (`chatId`) REFERENCES `Chats` (`chatId`) ON DELETE CASCADE,
  CONSTRAINT `Messages_ibfk_2` FOREIGN KEY (`senderId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. CHAT PARTICIPANTS - Depends on Chats and Users
CREATE TABLE `ChatParticipants` (
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `joinedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`chatId`,`userId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ChatParticipants_ibfk_1` FOREIGN KEY (`chatId`) REFERENCES `Chats` (`chatId`) ON DELETE CASCADE,
  CONSTRAINT `ChatParticipants_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. CHAT REQUESTS - Depends on Users
CREATE TABLE `ChatRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int NOT NULL,
  `receiverId` int NOT NULL,
  `status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_request` (`senderId`,`receiverId`),
  KEY `receiverId` (`receiverId`),
  CONSTRAINT `ChatRequests_ibfk_1` FOREIGN KEY (`senderId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `ChatRequests_ibfk_2` FOREIGN KEY (`receiverId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. MESSAGE RECEIPTS - Depends on Messages and Users
CREATE TABLE `MessageReceipts` (
  `receiptId` int NOT NULL AUTO_INCREMENT,
  `messageId` int NOT NULL,
  `userId` int NOT NULL,
  `seenAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`receiptId`),
  UNIQUE KEY `messageId` (`messageId`,`userId`),
  KEY `userId` (`userId`),
  CONSTRAINT `MessageReceipts_ibfk_1` FOREIGN KEY (`messageId`) REFERENCES `Messages` (`messageId`) ON DELETE CASCADE,
  CONSTRAINT `MessageReceipts_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
