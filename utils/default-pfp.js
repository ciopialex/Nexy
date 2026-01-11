const fs = require('fs');
const path = require('path');

function generateDefaultPfp(userId) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA', '#F0C419', '#FF8C42', '#FF3D7F'];
    const color = colors[userId % colors.length];

    const svg = `
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="${color}"/>
            <text x="50" y="55" font-family="Arial, sans-serif" font-size="40" fill="#FFF" text-anchor="middle" dominant-baseline="middle">${String.fromCharCode(65 + userId % 26)}</text>
        </svg>
    `;

    const fileName = `default-pfp-${userId}.svg`;
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, svg);

    return `/uploads/${fileName}`;
}

module.exports = { generateDefaultPfp };
