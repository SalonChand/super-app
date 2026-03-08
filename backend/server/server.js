const express = require('express');
const cors = require('cors');
const pool = require('./db'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

// 🔥 CLOUDINARY CLOUD STORAGE FOR RENDER 🔥
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors()); 
app.use(express.json()); 

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'superapp_media', resource_type: 'auto' },
});
const upload = multer({ storage: storage });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static(uploadDir));

app.get('/api/stream/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    const stat = fs.statSync(filePath); const fileSize = stat.size; const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-"); const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1; const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' };
        res.writeHead(206, head); file.pipe(res);
    } else {
        const head = { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' }; res.writeHead(200, head); fs.createReadStream(filePath).pipe(res);
    }
});

let vapidKeys;
const vapidPath = path.join(__dirname, 'vapid.json');
if (fs.existsSync(vapidPath)) { vapidKeys = JSON.parse(fs.readFileSync(vapidPath)); } 
else { vapidKeys = webpush.generateVAPIDKeys(); fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys)); }
webpush.setVapidDetails('mailto:admin@superapp.com', vapidKeys.publicKey, vapidKeys.privateKey);

const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods:["GET", "POST"] } });

// Online users: userId -> { socketId, lastSeen }
const onlineUsers = new Map();

io.on('connection', (socket) => {
    socket.on('join_private_room', async (userId) => {
        socket.join(userId.toString());
        socket._userId = userId;
        onlineUsers.set(String(userId), { socketId: socket.id, lastSeen: new Date() });
        // Only broadcast if user has active status enabled
        try {
            const [rows] = await pool.query('SELECT show_active_status FROM users WHERE id = ?', [userId]);
            const showActive = rows[0]?.show_active_status ?? true;
            if (showActive) io.emit('online_status', { userId, online: true });
        } catch(e) { io.emit('online_status', { userId, online: true }); }
    });
    socket.on('disconnect', () => {
        if (socket._userId) {
            const lastSeen = new Date();
            onlineUsers.delete(String(socket._userId));
            io.emit('online_status', { userId: socket._userId, online: false, lastSeen });
            pool.query('UPDATE users SET last_seen = ? WHERE id = ?', [lastSeen, socket._userId]).catch(() => {});
        }
    });
    socket.on('typing_start', ({ senderId, receiverId }) => {
        io.to(receiverId.toString()).emit('typing_start', { userId: senderId });
    });
    socket.on('typing_stop', ({ senderId, receiverId }) => {
        io.to(receiverId.toString()).emit('typing_stop', { userId: senderId });
    });
    socket.on('send_private_message', async (data) => {
        try {
            const { senderId, receiverId, content, media_url, media_type, replyToId, isForwarded } = data;
            const[connections] = await pool.query(`SELECT * FROM connections WHERE (requester_id = ? AND receiver_id = ? AND status = 'accepted') OR (requester_id = ? AND receiver_id = ? AND status = 'accepted')`,[senderId, receiverId, receiverId, senderId]);
            const isRequest = connections.length === 0;
            const { story_id = null, story_preview_url = null } = data;
            await pool.query('INSERT INTO messages (sender_id, receiver_id, content, is_request, media_url, media_type, reply_to_id, is_forwarded, story_id, story_preview_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',[senderId, receiverId, content || '', isRequest, media_url || null, media_type || null, replyToId || null, isForwarded || false, story_id || null, story_preview_url || null]);
            const[users] = await pool.query('SELECT username FROM users WHERE id = ?',[senderId]);
            // Send rich toast data to receiver, plain update to sender
            const senderName = users[0]?.username || 'Someone';
            io.to(receiverId.toString()).emit('message_updated', { senderId, senderName, preview: content || '📎 Attachment' });
            io.to(senderId.toString()).emit('message_updated', {});
            io.to(receiverId.toString()).emit('activity_updated'); io.to(senderId.toString()).emit('activity_updated');
            // Persist to notifications_history
            try { await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [receiverId, senderId, 'message', content || '']); } catch(e) {}
            if (media_type !== 'tictactoe' && media_type !== 'rps') {
                try {
                    const[subs] = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id = ?', [receiverId]);
                    const payload = JSON.stringify({ title: `New message from ${users[0].username}`, body: content || 'Sent an attachment 📷' });
                    subs.forEach(async (sub) => { try { await webpush.sendNotification(JSON.parse(sub.subscription), payload); } catch (e) { } });
                } catch(e) { }
            }
        } catch (err) { console.error(err); }
    });

    socket.on('play_game_move', async (data) => {
        try {
            const { messageId, index, userId, gameType, choice } = data;
            const[msg] = await pool.query('SELECT content, media_type, sender_id, receiver_id FROM messages WHERE id = ?', [messageId]);
            if(msg.length === 0) return;
            let game = JSON.parse(msg[0].content); const mType = msg[0].media_type;
            if (mType === 'tictactoe') {
                if (game.winner || game.board[index] !== null || game.nextTurn !== userId) return;
                const mySymbol = (userId === game.playerX) ? 'X' : 'O';
                game.board[index] = mySymbol; game.nextTurn = (userId === game.playerX) ? game.playerO : game.playerX;
                const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                for (let line of lines) { const[a,b,c] = line; if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) game.winner = mySymbol; }
                if (!game.winner && !game.board.includes(null)) game.winner = 'Draw';
            } else if (mType === 'rps') {
                if (game.winner) return;
                if (userId === game.player1 && !game.p1Choice) game.p1Choice = choice; else if (userId === game.player2 && !game.p2Choice) game.p2Choice = choice;
                if (game.p1Choice && game.p2Choice) {
                    if (game.p1Choice === game.p2Choice) game.winner = 'Draw';
                    else if ((game.p1Choice === '✊' && game.p2Choice === '✌️') || (game.p1Choice === '✋' && game.p2Choice === '✊') || (game.p1Choice === '✌️' && game.p2Choice === '✋')) game.winner = game.player1;
                    else game.winner = game.player2;
                }
            }
            await pool.query('UPDATE messages SET content = ? WHERE id = ?',[JSON.stringify(game), messageId]);
            io.to(msg[0].receiver_id.toString()).emit('message_updated'); io.to(msg[0].sender_id.toString()).emit('message_updated');
        } catch(e) { console.error(e); }
    });

    socket.on('react_message', async (data) => { try { await pool.query('UPDATE messages SET reaction = ? WHERE id = ?',[data.reaction, data.messageId]); io.to(data.receiverId.toString()).emit('message_updated'); io.to(data.senderId.toString()).emit('message_updated'); } catch (err) {} });
    socket.on('pin_message', async (data) => { try { await pool.query('UPDATE messages SET is_pinned = ? WHERE id = ?',[data.isPinned, data.messageId]); io.to(data.receiverId.toString()).emit('message_updated'); io.to(data.senderId.toString()).emit('message_updated'); } catch (err) {} });
    socket.on('delete_message', async (data) => { try { await pool.query('DELETE FROM messages WHERE id = ?',[data.messageId]); io.to(data.receiverId.toString()).emit('message_updated'); io.to(data.senderId.toString()).emit('message_updated'); } catch (err) {} });
    socket.on('call_user', (data) => { io.to(data.userToCall.toString()).emit('incoming_call', { signal: data.signalData, from: data.from, callerName: data.callerName, isVideo: data.isVideo }); });
    socket.on('answer_call', (data) => { io.to(data.to.toString()).emit('call_accepted', data.signal); });
    socket.on('ice_candidate', (data) => { io.to(data.to.toString()).emit('ice_candidate', data.candidate); });
    socket.on('end_call', (data) => { io.to(data.to.toString()).emit('call_ended'); });
});

// 🔥 THE NEW DATABASE PATCH ROUTE 🔥
// This forces Aiven to add any columns it is missing!
app.get('/api/patch-cloud-db', async (req, res) => {
    let results = "Running database patches...<br/>";
    const patch = async (query) => {
        try { await pool.query(query); results += `✅ Success: ${query}<br/>`; }
        catch (e) { results += `⚠️ Skipped (Already exists): ${query}<br/>`; }
    };
    await patch("ALTER TABLE users ADD COLUMN cover_pic_url VARCHAR(255)");
    await patch("ALTER TABLE users ADD COLUMN theme_color VARCHAR(20) DEFAULT '#3b82f6'");
    await patch("ALTER TABLE users ADD COLUMN anthem_url VARCHAR(255)");
    await patch("ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT FALSE");
    await patch("ALTER TABLE users ADD COLUMN notifications BOOLEAN DEFAULT TRUE");
    await patch("ALTER TABLE users ADD COLUMN show_active_status BOOLEAN DEFAULT TRUE");
    await patch(`CREATE TABLE IF NOT EXISTS notifications_history (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, actor_id INT NOT NULL, type VARCHAR(30) NOT NULL, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await patch("ALTER TABLE users ADD COLUMN profile_links JSON DEFAULT NULL");
    await patch("ALTER TABLE posts ADD COLUMN hashtags JSON DEFAULT NULL");
    await patch("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
    await patch("ALTER TABLE messages ADD COLUMN reply_to_id INT DEFAULT NULL");
    await patch("ALTER TABLE messages ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE");
    await patch("ALTER TABLE messages ADD COLUMN reaction VARCHAR(50) DEFAULT NULL");
    await patch("ALTER TABLE stories ADD COLUMN caption VARCHAR(255)");
    await patch("ALTER TABLE stories ADD COLUMN filter_class VARCHAR(100) DEFAULT 'none'");
    await patch("ALTER TABLE stories ADD COLUMN song_name VARCHAR(100)");
    await patch("ALTER TABLE stories ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'");
    await patch("ALTER TABLE stories ADD COLUMN visible_to TEXT DEFAULT NULL");
    await patch("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL");
    await patch("ALTER TABLE messages ADD COLUMN read_at TIMESTAMP NULL DEFAULT NULL");
    await patch("CREATE TABLE IF NOT EXISTS saved_posts (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, post_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)");
    await patch("ALTER TABLE posts ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'");
    await patch("ALTER TABLE posts ADD COLUMN tagged_users JSON DEFAULT NULL");
    await patch("ALTER TABLE posts ADD COLUMN co_author_id INT DEFAULT NULL");
    await patch("ALTER TABLE posts ADD COLUMN co_author_status VARCHAR(20) DEFAULT NULL");
    await patch("ALTER TABLE users ADD COLUMN birthday DATE DEFAULT NULL");
    await patch("CREATE TABLE IF NOT EXISTS close_friends (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, friend_id INT NOT NULL, UNIQUE(user_id, friend_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE)");
    // === NEW FEATURES BATCH 3 ===
    // Carousel posts (multiple images stored as JSON array)
    await patch("ALTER TABLE posts ADD COLUMN images JSON DEFAULT NULL");
    // Post analytics: view count, profile_visit source
    await patch("ALTER TABLE posts ADD COLUMN view_count INT DEFAULT 0");
    await patch("CREATE TABLE IF NOT EXISTS post_views (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(post_id, user_id), FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
    // Profile visits
    await patch("CREATE TABLE IF NOT EXISTS profile_visits (id INT AUTO_INCREMENT PRIMARY KEY, profile_id INT NOT NULL, visitor_id INT NOT NULL, visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (profile_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (visitor_id) REFERENCES users(id) ON DELETE CASCADE)");
    // 2FA
    await patch("ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(100) DEFAULT NULL");
    await patch("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE");
    // Chat folders (stored as JSON in users table)
    await patch("ALTER TABLE users ADD COLUMN chat_folders JSON DEFAULT NULL");
    // Community channels
    await patch("CREATE TABLE IF NOT EXISTS community_channels (id INT AUTO_INCREMENT PRIMARY KEY, community_id INT NOT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE)");
    await patch("ALTER TABLE community_posts ADD COLUMN channel_id INT DEFAULT NULL");
    // Duet reels
    await patch("ALTER TABLE reels ADD COLUMN duet_of_id INT DEFAULT NULL");
    await patch("ALTER TABLE reels ADD COLUMN duet_video_url VARCHAR(255) DEFAULT NULL");
    // Message request filter setting
    await patch("ALTER TABLE users ADD COLUMN filter_message_requests BOOLEAN DEFAULT TRUE");
    // Screen recording detection log (lightweight)
    await patch("CREATE TABLE IF NOT EXISTS screen_record_alerts (id INT AUTO_INCREMENT PRIMARY KEY, chat_user1 INT NOT NULL, chat_user2 INT NOT NULL, detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    // === SOCIAL ENGAGEMENT BATCH ===
    await patch("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE");
    await patch("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
    await patch("ALTER TABLE users ADD COLUMN verified_reason VARCHAR(100) DEFAULT NULL");
    await patch("ALTER TABLE reels ADD COLUMN song_name VARCHAR(200) DEFAULT NULL");
    await patch("ALTER TABLE reels ADD COLUMN song_url VARCHAR(500) DEFAULT NULL");
    await patch("ALTER TABLE messages ADD COLUMN story_id INT DEFAULT NULL");
    await patch("ALTER TABLE messages ADD COLUMN story_preview_url VARCHAR(500) DEFAULT NULL");
    await patch("CREATE TABLE IF NOT EXISTS verification_requests (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, reason TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
    res.send(results + "<h1>✅ Database completely patched! Go back to your app!</h1>");
});

app.get('/api/setup-cloud-db', async (req, res) => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, profile_pic_url VARCHAR(255), cover_pic_url VARCHAR(255), bio TEXT, theme_color VARCHAR(20) DEFAULT '#3b82f6', anthem_url VARCHAR(255), is_private BOOLEAN DEFAULT FALSE, notifications BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS connections (id INT AUTO_INCREMENT PRIMARY KEY, requester_id INT NOT NULL, receiver_id INT NOT NULL, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX unique_connection (requester_id, receiver_id), FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS posts (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, content TEXT NOT NULL, image_url VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS likes (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, UNIQUE(user_id, post_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS comments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, sender_id INT NOT NULL, receiver_id INT NOT NULL, content TEXT, media_url VARCHAR(255), media_type VARCHAR(50), reply_to_id INT DEFAULT NULL, is_forwarded BOOLEAN DEFAULT FALSE, is_request BOOLEAN DEFAULT FALSE, reaction VARCHAR(50) DEFAULT NULL, is_read BOOLEAN DEFAULT FALSE, is_pinned BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, subscription JSON NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS stories (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, media_url VARCHAR(255) NOT NULL, media_type VARCHAR(50) NOT NULL, caption VARCHAR(255), filter_class VARCHAR(100) DEFAULT 'none', song_name VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS story_likes (id INT AUTO_INCREMENT PRIMARY KEY, story_id INT NOT NULL, user_id INT NOT NULL, UNIQUE(story_id, user_id), FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS story_views (id INT AUTO_INCREMENT PRIMARY KEY, story_id INT NOT NULL, user_id INT NOT NULL, UNIQUE(story_id, user_id), FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reels (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, video_url VARCHAR(255) NOT NULL, caption TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reel_likes (id INT AUTO_INCREMENT PRIMARY KEY, reel_id INT NOT NULL, user_id INT NOT NULL, UNIQUE(reel_id, user_id), FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS communities (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, description TEXT, banner_url VARCHAR(255), creator_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS community_members (id INT AUTO_INCREMENT PRIMARY KEY, community_id INT NOT NULL, user_id INT NOT NULL, role VARCHAR(20) DEFAULT 'member', UNIQUE(community_id, user_id), FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS community_posts (id INT AUTO_INCREMENT PRIMARY KEY, community_id INT NOT NULL, user_id INT NOT NULL, content TEXT NOT NULL, image_url VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS community_post_likes (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, UNIQUE(post_id, user_id), FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS community_post_comments (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
        res.send("<h1>✅ Cloud Database Successfully Built!</h1>");
    } catch (e) { res.send("<h1>❌ Error building database:</h1><p>" + e.message + "</p>"); }
});

// PUSH & AUTH
app.get('/api/vapidPublicKey', (req, res) => { res.send(vapidKeys.publicKey); });
app.post('/api/subscribe', async (req, res) => { try { const { userId, subscription } = req.body; await pool.query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]); await pool.query('INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)',[userId, JSON.stringify(subscription)]); res.status(201).json({}); } catch (err) { res.status(500).json({ error: "Server error" }); } });
app.post('/api/register', async (req, res) => { try { const hash = await bcrypt.hash(req.body.password, 10); await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',[req.body.username, req.body.email, hash]); res.status(201).json({ message: "Registered!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/login', async (req, res) => { try { const[users] = await pool.query('SELECT * FROM users WHERE email = ?',[req.body.email]); if (users.length === 0 || !(await bcrypt.compare(req.body.password, users[0].password_hash))) return res.status(401).json({ error: "Invalid credentials" }); const token = jwt.sign({ id: users[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' }); res.json({ message: "Logged in!", token, user: { id: users[0].id, username: users[0].username, email: users[0].email } }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/:id/settings', async (req, res) => { try { await pool.query('UPDATE users SET is_private = ?, notifications = ?, theme_color = ?, anthem_url = ? WHERE id = ?',[req.body.is_private, req.body.notifications, req.body.theme_color, req.body.anthem_url, req.params.id]); try { const showActive = req.body.show_active_status ?? true; await pool.query('UPDATE users SET show_active_status = ? WHERE id = ?',[showActive, req.params.id]); io.emit('online_status', { userId: Number(req.params.id), online: !!showActive }); } catch(e) {} res.json({ message: "Saved!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/:id/password', async (req, res) => { try { const[users] = await pool.query('SELECT password_hash FROM users WHERE id = ?',[req.params.id]); if (!(await bcrypt.compare(req.body.oldPassword, users[0].password_hash))) return res.status(401).json({ error: "Incorrect password" }); const hash = await bcrypt.hash(req.body.newPassword, 10); await pool.query('UPDATE users SET password_hash = ? WHERE id = ?',[hash, req.params.id]); res.json({ message: "Password updated!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.delete('/api/users/:id', async (req, res) => { try { await pool.query('DELETE FROM users WHERE id = ?',[req.params.id]); res.json({ message: "Deleted." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/search', async (req, res) => {
    try {
        const { q, userId, filter = 'people' } = req.query;
        if (filter === 'posts') {
            const [posts] = await pool.query(`SELECT p.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count FROM posts p JOIN users u ON p.user_id = u.id WHERE p.content LIKE ? ORDER BY p.created_at DESC LIMIT 30`, [`%${q}%`]);
            return res.json(posts);
        }
        if (filter === 'communities') {
            const [comms] = await pool.query(`SELECT c.*, u.username as creator_name, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) AS member_count FROM communities c JOIN users u ON c.creator_id = u.id WHERE c.name LIKE ? LIMIT 20`, [`%${q}%`]);
            return res.json(comms);
        }
        const [users] = await pool.query("SELECT id, username, profile_pic_url FROM users WHERE username LIKE ? AND id != ? AND username != 'superadmin' LIMIT 20",[`%${q}%`, userId || 0]);
        res.json(users);
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});

app.get('/api/bookmarks/:userId', async (req, res) => { try { const [posts] = await pool.query(`SELECT p.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked FROM saved_posts sp JOIN posts p ON sp.post_id = p.id JOIN users u ON p.user_id = u.id WHERE sp.user_id = ? ORDER BY sp.created_at DESC`, [req.params.userId, req.params.userId]); res.json(posts); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/bookmarks', async (req, res) => { try { const { userId, postId } = req.body; const [ex] = await pool.query('SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]); if (ex.length > 0) { await pool.query('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]); return res.json({ saved: false }); } await pool.query('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId]); res.json({ saved: true }); } catch(e) { res.status(500).json({ error: "Server error." }); } });

app.get('/api/friends/mutual/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; const [mutual] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url FROM users u WHERE u.id IN (SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted') AND u.id IN (SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted')`, [user1,user1,user1, user2,user2,user2]); res.json(mutual); } catch(e) { res.status(500).json({ error: "Server error." }); } });

app.get('/api/friends/suggestions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [myFriends] = await pool.query(`SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END AS fid FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'`, [userId, userId, userId]);
        const myFriendIds = myFriends.map(r => r.fid);
        if (myFriendIds.length === 0) return res.json([]);
        const placeholders = myFriendIds.map(() => '?').join(',');
        const [suggestions] = await pool.query(
            `SELECT u.id, u.username, u.profile_pic_url, COUNT(*) as mutual_count FROM users u JOIN connections c ON (c.requester_id = u.id OR c.receiver_id = u.id) AND c.status = 'accepted' WHERE (CASE WHEN c.requester_id = u.id THEN c.receiver_id ELSE c.requester_id END) IN (${placeholders}) AND u.id != ? AND u.id NOT IN (${placeholders}) AND u.username != 'superadmin' GROUP BY u.id ORDER BY mutual_count DESC LIMIT 10`,
            [...myFriendIds, userId, ...myFriendIds]
        );
        res.json(suggestions);
    } catch(e) { res.status(500).json({ error: "Server error." }); }
});

app.get('/api/online', (req, res) => {
    const onlineList = Array.from(onlineUsers.keys()).map(id => ({ userId: id, online: true }));
    res.json(onlineList);
});

app.get('/api/hashtags/:tag', async (req, res) => {
    try {
        const tag = req.params.tag.toLowerCase();
        const currentUserId = req.query.userId || 0;
        const [posts] = await pool.query(
            `SELECT p.*, u.username, u.profile_pic_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked
             FROM posts p JOIN users u ON p.user_id = u.id
             WHERE (p.is_draft IS NULL OR p.is_draft = 0) AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())
             AND p.content LIKE ?
             ORDER BY p.created_at DESC LIMIT 50`,
            [currentUserId, `%#${tag}%`]);
        res.json(posts);
    } catch(err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT n.*, u.username, u.profile_pic_url
             FROM notifications_history n
             JOIN users u ON n.actor_id = u.id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT 100`,
            [req.params.userId]
        );
        res.json(rows);
    } catch(err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/activity/:userId', async (req, res) => { try { const uid = req.params.userId; const [msgs] = await pool.query(`SELECT m.id, m.content, u.username, u.profile_pic_url, m.created_at, 'message' as type FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.receiver_id = ? AND m.is_read = FALSE ORDER BY m.created_at DESC`, [uid]); const [reqs] = await pool.query(`SELECT c.id, 'Sent you a friend request' as content, u.username, u.profile_pic_url, c.created_at, 'request' as type FROM connections c JOIN users u ON c.requester_id = u.id WHERE c.receiver_id = ? AND c.status = 'pending' ORDER BY c.created_at DESC`,[uid]); let activity =[...msgs, ...reqs]; activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); res.json({ feed: activity, unread_messages: msgs.length, pending_requests: reqs.length, total_notifications: msgs.length + reqs.length }); } catch (err) { res.status(500).json({ error: "Server error" }); } });

// POSTS
app.post('/api/posts', upload.array('images', 10), async (req, res) => {
    try {
        // Support both single 'image' (legacy) and multiple 'images' (carousel)
        let image_url = null;
        let images_json = null;
        if (req.files && req.files.length > 0) {
            const urls = req.files.map(f => f.path);
            image_url = urls[0];
            if (urls.length > 1) images_json = JSON.stringify(urls);
        }
        const { user_id, content, scheduled_at, is_draft, visibility, tagged_users } = req.body;
        const safeContent = content || '';
        const hashtags = (safeContent.match(/#[\w]+/g) || []).map(h => h.toLowerCase());
        const mentions = (safeContent.match(/@([\w]+)/g) || []).map(m => m.slice(1).toLowerCase());
        const [result] = await pool.query('INSERT INTO posts (user_id, content, image_url, images, scheduled_at, is_draft, hashtags, visibility, tagged_users) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, safeContent, image_url, images_json, scheduled_at || null, is_draft === 'true' ? 1 : 0, JSON.stringify(hashtags), visibility || 'public', tagged_users || null]);
        if (mentions.length > 0) {
            try {
                const [poster] = await pool.query('SELECT username FROM users WHERE id = ?', [user_id]);
                const posterName = poster[0]?.username || 'Someone';
                for (const mention of mentions) {
                    const [mentioned] = await pool.query('SELECT id FROM users WHERE username = ?', [mention]);
                    if (mentioned.length > 0 && mentioned[0].id != user_id) {
                        const mentionedId = mentioned[0].id;
                        await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)',
                            [mentionedId, user_id, 'mention', `@${posterName} mentioned you in a post`]).catch(()=>{});
                        io.to(String(mentionedId)).emit('activity_updated', { type: 'mention', from: posterName });
                        const [subs] = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id = ?', [mentionedId]);
                        const payload = JSON.stringify({ title: `${posterName} mentioned you`, body: content.slice(0, 80) });
                        subs.forEach(async sub => { try { await webpush.sendNotification(JSON.parse(sub.subscription), payload); } catch(e){} });
                    }
                }
            } catch(e) {}
        }
        res.status(201).json({ message: "Post created!", postId: result.insertId });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});
app.get('/api/posts/drafts/:userId', async (req, res) => {
    try {
        const [posts] = await pool.query(
            `SELECT p.*, u.username, u.profile_pic_url FROM posts p JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ? AND (p.is_draft = TRUE OR (p.scheduled_at IS NOT NULL AND p.scheduled_at > NOW()))
             ORDER BY p.created_at DESC`, [req.params.userId]);
        res.json(posts);
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});
app.post('/api/posts/:id/publish', async (req, res) => {
    try {
        await pool.query('UPDATE posts SET is_draft = FALSE, scheduled_at = NULL WHERE id = ? AND user_id = ?', [req.params.id, req.body.userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});
app.put('/api/posts/:id', async (req, res) => { try { await pool.query('UPDATE posts SET content = ? WHERE id = ?',[req.body.content, req.params.id]); res.json({ message: "Post updated!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.delete('/api/posts/:id', async (req, res) => { try { await pool.query('DELETE FROM posts WHERE id = ?',[req.params.id]); res.json({ message: "Post deleted!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts', async (req, res) => {
    try {
        const currentUserId = req.query.userId || 0;
        const [posts] = await pool.query(
            `SELECT p.*, u.username, u.profile_pic_url, COALESCE(u.show_active_status, 1) as show_active_status,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked,
             cu.username as co_author_username, cu.profile_pic_url as co_author_pic
             FROM posts p JOIN users u ON p.user_id = u.id
             LEFT JOIN users cu ON p.co_author_id = cu.id
             ORDER BY p.created_at DESC`, [currentUserId]);
        // Filter out drafts and future scheduled posts in JS (safer if columns don't exist yet)
        const filtered = posts.filter(p => !p.is_draft && (!p.scheduled_at || new Date(p.scheduled_at) <= new Date()) && (p.visibility !== 'only_me' || p.user_id == currentUserId));
        res.json(filtered);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); }
});
app.post('/api/posts/:id/like', async (req, res) => { try { const postId = req.params.id; const { userId } = req.body; const [existing] = await pool.query('SELECT * FROM likes WHERE post_id = ? AND user_id = ?',[postId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?',[postId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)',[postId, userId]); const [post] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [postId]); if (post[0] && post[0].user_id != userId) { const [liker] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]); await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [post[0].user_id, userId, 'like', `${liker[0]?.username} liked your post`]).catch(()=>{}); io.to(post[0].user_id.toString()).emit('activity_updated'); } res.json({ liked: true }); } } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts/:id/likes', async (req, res) => { try { const [likes] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id = ? ORDER BY l.id DESC`,[req.params.id]); res.json(likes); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts/:id/comments', async (req, res) => { try { const[comments] = await pool.query(`SELECT c.*, u.username, u.profile_pic_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`,[req.params.id]); res.json(comments); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/posts/:id/comment', async (req, res) => { try { await pool.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',[req.params.id, req.body.userId, req.body.content]); const [post] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]); if (post[0] && post[0].user_id != req.body.userId) { const [commenter] = await pool.query('SELECT username FROM users WHERE id = ?', [req.body.userId]); await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [post[0].user_id, req.body.userId, 'comment', `${commenter[0]?.username} commented on your post`]).catch(()=>{}); io.to(post[0].user_id.toString()).emit('activity_updated'); } res.json({ message: "Comment added!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });

// CHAT MEDIA
app.post('/api/messages/upload', upload.single('media'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "No file provided" }); const media_url = req.file.path; let media_type = 'document'; if (req.file.mimetype.startsWith('image/')) media_type = 'image'; else if (req.file.mimetype.startsWith('video/')) media_type = 'video'; else if (req.file.mimetype.startsWith('audio/')) media_type = 'audio'; res.json({ media_url, media_type }); } catch (err) { res.status(500).json({ error: "Server error" }); } });
app.put('/api/messages/read', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const readAt = new Date();
        await pool.query('UPDATE messages SET is_read = TRUE, read_at = ? WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE', [readAt, senderId, receiverId]);
        io.to(String(senderId)).emit('messages_seen', { by: receiverId, to: senderId, readAt });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});
app.get('/api/users', async (req, res) => { try { const[users] = await pool.query("SELECT id, username FROM users WHERE username != 'superadmin'"); res.json(users); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/messages/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; const[messages] = await pool.query(`SELECT m.*, u.username, r.content AS reply_content, ru.username AS reply_username FROM messages m JOIN users u ON m.sender_id = u.id LEFT JOIN messages r ON m.reply_to_id = r.id LEFT JOIN users ru ON r.sender_id = ru.id WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?) ORDER BY m.created_at ASC`,[user1, user2, user2, user1]); res.json(messages); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.delete('/api/messages/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; await pool.query('DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [user1, user2, user2, user1]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Server error." }); } });

// Birthday
app.put('/api/users/:id/birthday', async (req, res) => { try { await pool.query('UPDATE users SET birthday = ? WHERE id = ?', [req.body.birthday || null, req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/users/:id/birthday-friends', async (req, res) => { try { const [friends] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url, u.birthday FROM users u JOIN connections c ON (c.requester_id = u.id OR c.receiver_id = u.id) WHERE ((c.requester_id = ? AND c.receiver_id = u.id) OR (c.receiver_id = ? AND c.requester_id = u.id)) AND c.status = 'accepted' AND u.birthday IS NOT NULL AND DATE_FORMAT(u.birthday, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')`, [req.params.id, req.params.id]); res.json(friends); } catch(e) { res.status(500).json({ error: "Server error." }); } });

// Close friends
app.get('/api/close-friends/:userId', async (req, res) => { try { const [rows] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url FROM close_friends cf JOIN users u ON cf.friend_id = u.id WHERE cf.user_id = ?`, [req.params.userId]); res.json(rows); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/close-friends', async (req, res) => { try { const { userId, friendId } = req.body; const [ex] = await pool.query('SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]); if (ex.length > 0) { await pool.query('DELETE FROM close_friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]); return res.json({ added: false }); } await pool.query('INSERT INTO close_friends (user_id, friend_id) VALUES (?, ?)', [userId, friendId]); res.json({ added: true }); } catch(e) { res.status(500).json({ error: "Server error." }); } });

// ===== VERIFIED BADGE =====
app.post('/api/users/:id/request-verification', async (req, res) => {
    try {
        const { reason } = req.body;
        await pool.query('INSERT INTO verification_requests (user_id, reason, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason), status = \'pending\', created_at = NOW()', [req.params.id, reason || '', 'pending']);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});
app.get('/api/users/:id/verification-status', async (req, res) => {
    try {
        const [user] = await pool.query('SELECT is_verified, verified_reason FROM users WHERE id = ?', [req.params.id]);
        const [req_row] = await pool.query('SELECT status, created_at FROM verification_requests WHERE user_id = ?', [req.params.id]);
        res.json({ is_verified: !!(user[0]?.is_verified), verified_reason: user[0]?.verified_reason || null, request: req_row[0] || null });
    } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});
// Admin: approve/deny (superadmin only)
app.post('/api/admin/verify-user', async (req, res) => {
    try {
        const { adminId, userId, approved, reason } = req.body;
        const [admin] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'superadmin'", [adminId]);
        if (!admin[0]) return res.status(403).json({ error: 'Not authorized.' });
        await pool.query('UPDATE users SET is_verified = ?, verified_reason = ? WHERE id = ?', [approved ? 1 : 0, reason || null, userId]);
        await pool.query('UPDATE verification_requests SET status = ? WHERE user_id = ?', [approved ? 'approved' : 'denied', userId]);
        if (approved) {
            await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [userId, adminId, 'mention', '✅ Your verification request was approved! You are now verified.']).catch(()=>{});
            io.to(String(userId)).emit('activity_updated');
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ===== ADMIN: list all verification requests =====
app.get('/api/admin/verification-requests', async (req, res) => {
    try {
        const { adminId } = req.query;
        const [admin] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'superadmin'", [adminId]);
        if (!admin[0]) return res.status(403).json({ error: 'Not authorized.' });
        const [requests] = await pool.query(`
            SELECT vr.*, u.username, u.profile_pic_url, u.id as user_id,
                   u.is_verified, vr.created_at
            FROM verification_requests vr
            JOIN users u ON vr.user_id = u.id
            ORDER BY FIELD(vr.status,'pending','approved','denied'), vr.created_at DESC
        `);
        res.json(requests);
    } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ===== SUGGESTED POSTS (hashtag-based) =====
app.get('/api/posts/suggested/:userId', async (req, res) => {
    try {
        const uid = req.params.userId;
        // Get hashtags from posts the user liked recently
        const [likedPosts] = await pool.query(
            'SELECT p.hashtags FROM likes l JOIN posts p ON l.post_id = p.id WHERE l.user_id = ? AND p.hashtags IS NOT NULL ORDER BY l.id DESC LIMIT 20', [uid]);
        const tagSet = new Set();
        likedPosts.forEach(row => { try { const tags = JSON.parse(row.hashtags); if (Array.isArray(tags)) tags.forEach(t => tagSet.add(t)); } catch(e) {} });
        if (tagSet.size === 0) {
            // Fallback: return popular recent posts
            const [popular] = await pool.query(
                `SELECT p.*, u.username, u.profile_pic_url, u.is_verified,
                 COUNT(DISTINCT l.id) as like_count, COUNT(DISTINCT cm.id) as comment_count,
                 0 as user_liked
                 FROM posts p JOIN users u ON p.user_id = u.id
                 LEFT JOIN likes l ON l.post_id = p.id
                 LEFT JOIN comments cm ON cm.post_id = p.id
                 WHERE p.user_id != ? AND (p.is_draft=0 OR p.is_draft IS NULL) AND p.visibility='public'
                 AND p.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY p.id ORDER BY like_count DESC LIMIT 10`, [uid]);
            return res.json(popular);
        }
        const tags = [...tagSet].slice(0, 5);
        const placeholders = tags.map(() => 'JSON_CONTAINS(p.hashtags, ?)').join(' OR ');
        const tagParams = tags.map(t => JSON.stringify(t));
        const [suggested] = await pool.query(
            `SELECT p.*, u.username, u.profile_pic_url, COALESCE(u.is_verified, 0) as is_verified,
             COUNT(DISTINCT l.id) as like_count, COUNT(DISTINCT cm.id) as comment_count,
             MAX(CASE WHEN l2.user_id = ? THEN 1 ELSE 0 END) as user_liked
             FROM posts p JOIN users u ON p.user_id = u.id
             LEFT JOIN likes l ON l.post_id = p.id
             LEFT JOIN comments cm ON cm.post_id = p.id
             LEFT JOIN likes l2 ON l2.post_id = p.id AND l2.user_id = ?
             WHERE p.user_id != ? AND (p.is_draft=0 OR p.is_draft IS NULL) AND p.visibility='public'
             AND (${placeholders})
             GROUP BY p.id ORDER BY like_count DESC, p.created_at DESC LIMIT 10`,
            [uid, uid, uid, ...tagParams]);
        res.json(suggested);
    } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// Collaborative post invite
app.post('/api/posts/:id/collab-invite', async (req, res) => { try { const { coAuthorId } = req.body; await pool.query('UPDATE posts SET co_author_id = ?, co_author_status = ? WHERE id = ?', [coAuthorId, 'pending', req.params.id]); const [post] = await pool.query('SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [req.params.id]); if (post[0]) { await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [coAuthorId, post[0].user_id, 'mention', `${post[0].username} invited you to co-author a post`]).catch(()=>{}); io.to(String(coAuthorId)).emit('activity_updated'); } res.json({ success: true }); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/posts/:id/collab-respond', async (req, res) => { try { const { accept, userId } = req.body; await pool.query('UPDATE posts SET co_author_status = ? WHERE id = ? AND co_author_id = ?', [accept ? 'accepted' : 'rejected', req.params.id, userId]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts/collab-invites/:userId', async (req, res) => { try { const [rows] = await pool.query(`SELECT p.*, u.username as author_username, u.profile_pic_url as author_pic FROM posts p JOIN users u ON p.user_id = u.id WHERE p.co_author_id = ? AND p.co_author_status = 'pending'`, [req.params.userId]); res.json(rows); } catch(e) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/requests/:userId', async (req, res) => { try { const [requests] = await pool.query(`SELECT messages.*, users.username, users.profile_pic_url FROM messages JOIN users ON messages.sender_id = users.id WHERE messages.receiver_id = ? AND messages.is_request = true AND messages.sender_id NOT IN (SELECT requester_id FROM connections WHERE receiver_id = ? AND status = 'accepted' UNION SELECT receiver_id FROM connections WHERE requester_id = ? AND status = 'accepted') GROUP BY messages.sender_id ORDER BY messages.created_at DESC`,[req.params.userId, req.params.userId, req.params.userId]); res.json(requests); } catch (err) { res.status(500).json({ error: "Server error." }); } });

// PROFILE & FRIENDS
app.get('/api/users/:id', async (req, res) => { try { const [users] = await pool.query('SELECT id, username, bio, profile_pic_url, cover_pic_url, is_private, theme_color, anthem_url, profile_links, show_active_status, created_at, COALESCE(is_verified, 0) as is_verified, verified_reason, COALESCE(role, 'user') as role FROM users WHERE id = ?',[req.params.id]); if (users.length === 0) return res.status(404).json({error: "Not found"}); const [friends] = await pool.query(`SELECT COUNT(*) as count FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'`,[req.params.id, req.params.id]); res.json({ ...users[0], friend_count: friends[0].count }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/users/:id/posts', async (req, res) => { try { const currentUserId = req.query.currentUserId || 0; const[posts] = await pool.query(`SELECT p.*, u.username, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.created_at DESC`,[currentUserId, req.params.id]); res.json(posts); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/edit', upload.fields([{ name: 'profile_pic', maxCount: 1 }, { name: 'cover_pic', maxCount: 1 }]), async (req, res) => { try { const { userId, bio, theme_color, anthem_url, profile_links } = req.body; let query = 'UPDATE users SET bio = ?, theme_color = ?, anthem_url = ?, profile_links = ?'; let params =[bio, theme_color || '#3b82f6', anthem_url || null, profile_links || null]; if (req.files && req.files['profile_pic']) { query += ', profile_pic_url = ?'; params.push(req.files['profile_pic'][0].path); } if (req.files && req.files['cover_pic']) { query += ', cover_pic_url = ?'; params.push(req.files['cover_pic'][0].path); } query += ' WHERE id = ?'; params.push(userId); await pool.query(query, params); res.json({ message: "Profile updated!" }); } catch(err) { res.status(500).json({ error: "Server error." }); } });

app.post('/api/friends/request', async (req, res) => { try { const { requester_id, receiver_id } = req.body; if (requester_id === receiver_id) return res.status(400).json({ error: "Cannot friend yourself." }); await pool.query('INSERT IGNORE INTO connections (requester_id, receiver_id, status) VALUES (?, ?, ?)',[requester_id, receiver_id, 'pending']); io.to(receiver_id.toString()).emit('activity_updated'); res.json({ message: "Request sent!" }); } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); } });
app.post('/api/friends/remove', async (req, res) => { try { const { user1, user2 } = req.body; await pool.query(`DELETE FROM connections WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,[user1, user2, user2, user1]); io.to(user1.toString()).emit('activity_updated'); io.to(user2.toString()).emit('activity_updated'); res.json({ message: "Unfriended" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/friends/accept', async (req, res) => { try { const { requester_id, receiver_id } = req.body; await pool.query('UPDATE connections SET status = ? WHERE requester_id = ? AND receiver_id = ?',['accepted', requester_id, receiver_id]); await pool.query('UPDATE messages SET is_request = false WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',[requester_id, receiver_id, receiver_id, requester_id]); const [actor] = await pool.query('SELECT username FROM users WHERE id = ?', [receiver_id]); await pool.query('INSERT INTO notifications_history (user_id, actor_id, type, content) VALUES (?, ?, ?, ?)', [requester_id, receiver_id, 'friend_accepted', `${actor[0]?.username} accepted your friend request`]).catch(()=>{}); io.to(requester_id.toString()).emit('activity_updated'); res.json({ message: "Request accepted!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/status/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; const[connections] = await pool.query(`SELECT * FROM connections WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,[user1, user2, user2, user1]); if (connections.length === 0) return res.json({ status: 'none' }); const conn = connections[0]; if (conn.status === 'accepted') return res.json({ status: 'friends' }); if (conn.requester_id == user1) return res.json({ status: 'sent_request' }); return res.json({ status: 'received_request', requester_id: conn.requester_id }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/pending/:userId', async (req, res) => { try { const [requests] = await pool.query(`SELECT users.id, users.username, users.profile_pic_url FROM connections JOIN users ON connections.requester_id = users.id WHERE connections.receiver_id = ? AND connections.status = 'pending'`,[req.params.userId]); res.json(requests); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/sent/:userId', async (req, res) => { try { const [sent] = await pool.query(`SELECT users.id, users.username, users.profile_pic_url FROM connections JOIN users ON connections.receiver_id = users.id WHERE connections.requester_id = ? AND connections.status = 'pending'`,[req.params.userId]); res.json(sent); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/friends/cancel', async (req, res) => { try { const { requester_id, receiver_id } = req.body; await pool.query('DELETE FROM connections WHERE requester_id = ? AND receiver_id = ? AND status = ?',[requester_id, receiver_id, 'pending']); res.json({ message: "Request cancelled." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/explore/:userId', async (req, res) => { try { const[explore] = await pool.query(`SELECT id, username, profile_pic_url FROM users WHERE id != ? AND username != 'superadmin' AND id NOT IN (SELECT receiver_id FROM connections WHERE requester_id = ?) AND id NOT IN (SELECT requester_id FROM connections WHERE receiver_id = ?)`,[req.params.userId, req.params.userId, req.params.userId]); res.json(explore); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/list/:userId', async (req, res) => { try { const { userId } = req.params; const [friends] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url, COALESCE(u.show_active_status, 1) as show_active_status, u.last_seen, (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) AS unread_count, (SELECT content FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message, (SELECT sender_id FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_sender, (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message_time FROM users u JOIN connections c ON (c.requester_id = u.id AND c.receiver_id = ?) OR (c.receiver_id = u.id AND c.requester_id = ?) WHERE c.status = 'accepted' ORDER BY last_message_time DESC`,[userId, userId, userId, userId, userId, userId, userId, userId, userId]); res.json(friends); } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); } });

// STORIES & REELS
app.post('/api/stories', upload.single('media'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        const media_url = req.file.path;
        const media_type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
        const { user_id, caption, filter_class, song_name, visibility, visible_to } = req.body;
        await pool.query(
            'INSERT INTO stories (user_id, media_url, media_type, caption, filter_class, song_name, visibility, visible_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, media_url, media_type, caption || null, filter_class || 'none', song_name || null, visibility || 'public', visible_to || null]
        );
        res.status(201).json({ message: "Story added!" });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); }
});
app.get('/api/stories', async (req, res) => {
    try {
        const currentUserId = parseInt(req.query.userId) || 0;
        // Auto-delete expired stories older than 24 hours
        await pool.query('DELETE FROM stories WHERE created_at < NOW() - INTERVAL 1 DAY');
        // Get friend IDs of current user
        const [friendRows] = await pool.query(
            `SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END AS friend_id FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'`,
            [currentUserId, currentUserId, currentUserId]
        );
        const friendIds = friendRows.map(r => r.friend_id);
        const [stories] = await pool.query(
            `SELECT s.*, u.username, u.profile_pic_url, COALESCE(u.show_active_status, 1) as show_active_status,
                (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id) AS like_count,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) AS view_count,
                (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id AND user_id = ?) AS user_liked,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id AND user_id = ?) AS user_has_viewed,
                (SELECT COUNT(*) FROM close_friends WHERE user_id = ? AND friend_id = s.user_id) AS is_close_friend
             FROM stories s JOIN users u ON s.user_id = u.id
             WHERE s.created_at >= NOW() - INTERVAL 1 DAY
             AND (
                s.user_id = ?
                OR s.visibility IS NULL
                OR s.visibility = 'public'
                OR (s.visibility = 'friends' AND s.user_id IN (?))
                OR (s.visibility = 'only_me' AND s.user_id = ?)
                OR (s.visibility = 'selected' AND JSON_CONTAINS(s.visible_to, CAST(? AS JSON)))
             )
             ORDER BY s.created_at DESC`,
            [currentUserId, currentUserId, currentUserId, currentUserId,
             friendIds.length ? friendIds : [0],
             currentUserId, JSON.stringify(currentUserId)]
        );
        res.json(stories);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); }
});
app.delete('/api/stories/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        const [story] = await pool.query('SELECT * FROM stories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!story.length) return res.status(403).json({ error: 'Not authorized' });
        await pool.query('DELETE FROM stories WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/stories/:id', async (req, res) => {
    try {
        const { userId, caption } = req.body;
        const [story] = await pool.query('SELECT * FROM stories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!story.length) return res.status(403).json({ error: 'Not authorized' });
        await pool.query('UPDATE stories SET caption = ? WHERE id = ?', [caption, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/stories/:id/like', async (req, res) => { try { const storyId = req.params.id; const { userId } = req.body; const [existing] = await pool.query('SELECT * FROM story_likes WHERE story_id = ? AND user_id = ?',[storyId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM story_likes WHERE story_id = ? AND user_id = ?', [storyId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO story_likes (story_id, user_id) VALUES (?, ?)', [storyId, userId]); res.json({ liked: true }); } } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/stories/:id/view', async (req, res) => { try { await pool.query('INSERT IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)',[req.params.id, req.body.userId]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/reels', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No video provided" });
        const video_url = req.file.path;
        const { user_id, caption, song_name, song_url } = req.body;
        await pool.query('INSERT INTO reels (user_id, video_url, caption, song_name, song_url) VALUES (?, ?, ?, ?, ?)',
            [user_id, video_url, caption || '', song_name || null, song_url || null]);
        res.status(201).json({ message: "Reel uploaded!" });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.get('/api/reels', async (req, res) => { try { const currentUserId = req.query.userId || 0; const[reels] = await pool.query(`SELECT r.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) AS like_count, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) AS user_liked FROM reels r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC`, [currentUserId]); res.json(reels); } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); } });
app.get('/api/reels/user/:userId', async (req, res) => { try { const currentUserId = req.query.currentUserId || 0; const [reels] = await pool.query(`SELECT r.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) AS like_count, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) AS user_liked FROM reels r JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC`, [currentUserId, req.params.userId]); res.json(reels); } catch (err) { res.status(500).json({ error: "Server error" }); } });
app.post('/api/reels/:id/like', async (req, res) => { try { const reelId = req.params.id; const { userId } = req.body; const[existing] = await pool.query('SELECT * FROM reel_likes WHERE reel_id = ? AND user_id = ?',[reelId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?',[reelId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO reel_likes (reel_id, user_id) VALUES (?, ?)', [reelId, userId]); res.json({ liked: true }); } } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); } });

// COMMUNITIES
app.post('/api/communities', async (req, res) => { try { const { name, description, creator_id } = req.body; const[comm] = await pool.query('INSERT INTO communities (name, description, creator_id) VALUES (?, ?, ?)',[name, description, creator_id]); await pool.query('INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, "admin")',[comm.insertId, creator_id]); res.status(201).json({ message: "Community created!" }); } catch (err) { res.status(500).json({ error: "Community name taken." }); } });
app.get('/api/communities', async (req, res) => { try { const currentUserId = req.query.userId || 0; const[communities] = await pool.query(`SELECT c.*, u.username as creator_name, (SELECT COUNT(*) FROM community_posts WHERE community_id = c.id) AS post_count, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) AS member_count, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND user_id = ?) AS is_member FROM communities c JOIN users u ON c.creator_id = u.id ORDER BY member_count DESC`, [currentUserId]); res.json(communities); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/join', async (req, res) => { try { await pool.query('INSERT IGNORE INTO community_members (community_id, user_id) VALUES (?, ?)',[req.params.id, req.body.userId]); res.json({ message: "Joined!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/leave', async (req, res) => { try { await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = ?',[req.params.id, req.body.userId]); res.json({ message: "Left." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/community_posts/:id/like', async (req, res) => { try { const postId = req.params.id; const { userId } = req.body; const[existing] = await pool.query('SELECT * FROM community_post_likes WHERE post_id = ? AND user_id = ?',[postId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?',[postId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)',[postId, userId]); res.json({ liked: true }); } } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/community_posts/:id/comments', async (req, res) => { try { const[comments] = await pool.query(`SELECT c.*, u.username, u.profile_pic_url FROM community_post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`,[req.params.id]); res.json(comments); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/community_posts/:id/comment', async (req, res) => { try { await pool.query('INSERT INTO community_post_comments (post_id, user_id, content) VALUES (?, ?, ?)',[req.params.id, req.body.userId, req.body.content]); res.json({ message: "Comment added!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/invite', async (req, res) => { try { const { senderId, receiverId, commName } = req.body; const content = `👋 I just invited you to join /${commName}!`; await pool.query('INSERT INTO messages (sender_id, receiver_id, content, is_request) VALUES (?, ?, ?, false)', [senderId, receiverId, content]); io.to(receiverId.toString()).emit('activity_updated'); res.json({success: true}); } catch(e) { res.status(500).json({error: "Failed to invite."}) } });

// ===== POST ANALYTICS =====
app.post('/api/posts/:id/view', async (req, res) => { try { const { userId } = req.body; if (!userId) return res.json({ ok: true }); await pool.query('INSERT IGNORE INTO post_views (post_id, user_id) VALUES (?, ?)', [req.params.id, userId]); await pool.query('UPDATE posts SET view_count = (SELECT COUNT(*) FROM post_views WHERE post_id = ?) WHERE id = ?', [req.params.id, req.params.id]); res.json({ ok: true }); } catch(e) { res.json({ ok: true }); } });
app.get('/api/posts/:id/analytics', async (req, res) => { try { const [post] = await pool.query('SELECT view_count, (SELECT COUNT(*) FROM likes WHERE post_id = ?) AS like_count, (SELECT COUNT(*) FROM comments WHERE post_id = ?) AS comment_count FROM posts WHERE id = ?', [req.params.id, req.params.id, req.params.id]); res.json(post[0] || { view_count: 0, like_count: 0, comment_count: 0 }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== PROFILE VISITS =====
app.post('/api/users/:id/visit', async (req, res) => { try { const { visitorId } = req.body; if (!visitorId || visitorId == req.params.id) return res.json({ ok: true }); await pool.query('INSERT INTO profile_visits (profile_id, visitor_id) VALUES (?, ?)', [req.params.id, visitorId]); res.json({ ok: true }); } catch(e) { res.json({ ok: true }); } });
app.get('/api/users/:id/profile-analytics', async (req, res) => { try { const [visitCount] = await pool.query('SELECT COUNT(*) as total FROM profile_visits WHERE profile_id = ? AND visited_at > DATE_SUB(NOW(), INTERVAL 30 DAY)', [req.params.id]); const [postStats] = await pool.query('SELECT COALESCE(SUM(view_count),0) as total_views, COUNT(*) as post_count FROM posts WHERE user_id = ?', [req.params.id]); res.json({ profile_visits_30d: visitCount[0].total, total_post_views: postStats[0].total_views, post_count: postStats[0].post_count }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== USER DASHBOARD =====
app.get('/api/users/:id/dashboard', async (req, res) => {
    try {
        const uid = req.params.id;
        const safe = async (fn, fallback) => { try { return await fn(); } catch(e) { console.error('dashboard query err:', e.message); return fallback; } };
        const visits = await safe(async () => { const [r] = await pool.query('SELECT COUNT(*) as total FROM profile_visits WHERE profile_id = ? AND visited_at > DATE_SUB(NOW(), INTERVAL 30 DAY)', [uid]); return r[0].total; }, 0);
        const postStats = await safe(async () => { const [r] = await pool.query('SELECT COUNT(*) as post_count, COALESCE(SUM(view_count),0) as total_views, COALESCE(SUM((SELECT COUNT(*) FROM likes WHERE post_id=p.id)),0) as total_likes, COALESCE(SUM((SELECT COUNT(*) FROM comments WHERE post_id=p.id)),0) as total_comments FROM posts p WHERE p.user_id=? AND (p.is_draft=0 OR p.is_draft IS NULL)', [uid]); return r[0]; }, { post_count:0, total_views:0, total_likes:0, total_comments:0 });
        const topPosts = await safe(async () => { const [r] = await pool.query('SELECT p.id, LEFT(p.content,80) as content, p.image_url, COALESCE(p.view_count,0) as view_count, (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as like_count, (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comment_count, p.created_at FROM posts p WHERE p.user_id=? AND (p.is_draft=0 OR p.is_draft IS NULL) ORDER BY view_count DESC LIMIT 5', [uid]); return r; }, []);
        const reelStats = await safe(async () => { const [r] = await pool.query('SELECT COUNT(*) as reel_count, COALESCE(SUM((SELECT COUNT(*) FROM reel_likes WHERE reel_id=r.id)),0) as total_likes FROM reels r WHERE r.user_id=?', [uid]); return r[0]; }, { reel_count:0, total_likes:0 });
        const topReels = await safe(async () => { const [r] = await pool.query('SELECT r.id, LEFT(r.caption,60) as caption, r.video_url, (SELECT COUNT(*) FROM reel_likes WHERE reel_id=r.id) as like_count, r.created_at FROM reels r WHERE r.user_id=? ORDER BY like_count DESC LIMIT 3', [uid]); return r; }, []);
        const friendCount = await safe(async () => { const [r] = await pool.query("SELECT COUNT(*) as count FROM connections WHERE (requester_id=? OR receiver_id=?) AND status='accepted'", [uid, uid]); return r[0].count; }, 0);
        const recentActivity = await safe(async () => { const [r] = await pool.query('SELECT n.type, n.content, n.created_at, u.username, u.profile_pic_url FROM notifications_history n JOIN users u ON n.actor_id=u.id WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 10', [uid]); return r; }, []);
        const recentPosts = await safe(async () => { const [r] = await pool.query('SELECT DATE(created_at) as day, COUNT(*) as count FROM posts WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) AND (is_draft=0 OR is_draft IS NULL) GROUP BY day ORDER BY day ASC', [uid]); return r; }, []);
        res.json({ profile_visits_30d: visits, post_stats: postStats, reel_stats: reelStats, top_posts: topPosts, top_reels: topReels, friend_count: friendCount, recent_activity: recentActivity, posts_last_7d: recentPosts });
    } catch(e) { console.error('dashboard error:', e); res.status(500).json({ error: 'Server error.' }); }
});

// ===== 2FA =====
app.post('/api/users/:id/2fa/setup', async (req, res) => { try { const secret = Math.random().toString(36).substring(2, 18).toUpperCase(); await pool.query('UPDATE users SET two_factor_secret = ?, two_factor_enabled = FALSE WHERE id = ?', [secret, req.params.id]); res.json({ secret, qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/SuperApp:${req.params.id}?secret=${secret}%26issuer=SuperApp` }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.post('/api/users/:id/2fa/verify', async (req, res) => { try { const { code } = req.body; const [users] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [req.params.id]); if (!users[0]?.two_factor_secret) return res.status(400).json({ error: 'No secret set.' }); const secret = users[0].two_factor_secret; const t = Math.floor(Date.now() / 30000); const validCodes = [t-1, t, t+1].map(ts => (parseInt(secret.charCodeAt(0) * 7 + ts * 31337) % 1000000).toString().padStart(6, '0')); if (validCodes.includes(code.toString())) { await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = ?', [req.params.id]); res.json({ success: true }); } else { res.status(400).json({ error: 'Invalid code.' }); } } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.post('/api/users/:id/2fa/disable', async (req, res) => { try { await pool.query('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.get('/api/users/:id/2fa/status', async (req, res) => { try { const [u] = await pool.query('SELECT two_factor_enabled FROM users WHERE id = ?', [req.params.id]); res.json({ enabled: !!u[0]?.two_factor_enabled }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== COMMUNITY CHANNELS =====
app.get('/api/communities/:id/channels', async (req, res) => { try { const [channels] = await pool.query('SELECT * FROM community_channels WHERE community_id = ? ORDER BY created_at ASC', [req.params.id]); res.json(channels); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.post('/api/communities/:id/channels', async (req, res) => { try { const { name, description } = req.body; const [r] = await pool.query('INSERT INTO community_channels (community_id, name, description) VALUES (?, ?, ?)', [req.params.id, name, description || '']); res.status(201).json({ id: r.insertId, name, description }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.get('/api/communities/:id/posts', async (req, res) => { try { const currentUserId = req.query.userId || 0; const channelId = req.query.channel_id || null; let query = `SELECT cp.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM community_post_likes WHERE post_id = cp.id) AS like_count, (SELECT COUNT(*) FROM community_post_comments WHERE post_id = cp.id) AS comment_count, (SELECT COUNT(*) FROM community_post_likes WHERE post_id = cp.id AND user_id = ?) AS user_liked FROM community_posts cp JOIN users u ON cp.user_id = u.id WHERE cp.community_id = ?`; const params = [currentUserId, req.params.id]; if (channelId) { query += ' AND cp.channel_id = ?'; params.push(channelId); } query += ' ORDER BY cp.created_at DESC'; const [posts] = await pool.query(query, params); res.json(posts); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/posts', upload.single('image'), async (req, res) => { try { const image_url = req.file ? req.file.path : null; const channel_id = req.body.channel_id || null; await pool.query('INSERT INTO community_posts (community_id, user_id, content, image_url, channel_id) VALUES (?, ?, ?, ?, ?)',[req.params.id, req.body.user_id, req.body.content, image_url, channel_id]); res.status(201).json({ message: "Posted!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
// ===== COMMUNITY OWNER CONTROLS =====
app.get('/api/communities/:id/members', async (req, res) => { try { const [members] = await pool.query('SELECT u.id, u.username, u.profile_pic_url, cm.role, cm.joined_at FROM community_members cm JOIN users u ON cm.user_id = u.id WHERE cm.community_id = ? ORDER BY cm.role DESC, cm.joined_at ASC', [req.params.id]); res.json(members); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.delete('/api/communities/:id/members/:userId', async (req, res) => { try { const { requesterId } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [req.params.id, req.params.userId]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.post('/api/communities/:id/members/:userId/role', async (req, res) => { try { const { requesterId, role } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query("UPDATE community_members SET role = ? WHERE community_id = ? AND user_id = ?", [role, req.params.id, req.params.userId]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.delete('/api/communities/:id', async (req, res) => { try { const { requesterId } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('DELETE FROM communities WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.put('/api/communities/:id', async (req, res) => { try { const { requesterId, name, description } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('UPDATE communities SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.post('/api/communities/:id/ban', async (req, res) => { try { const { requesterId, userId } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [req.params.id, userId]); await pool.query('INSERT IGNORE INTO community_bans (community_id, user_id, banned_at) VALUES (?, ?, NOW())', [req.params.id, userId]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.delete('/api/communities/:id/posts/:postId', async (req, res) => { try { const { requesterId } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('DELETE FROM community_posts WHERE id = ? AND community_id = ?', [req.params.postId, req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });
app.delete('/api/communities/:id/channels/:channelId', async (req, res) => { try { const { requesterId } = req.body; const [comm] = await pool.query('SELECT creator_id FROM communities WHERE id = ?', [req.params.id]); if (!comm[0] || comm[0].creator_id != requesterId) return res.status(403).json({ error: 'Not authorized.' }); await pool.query('DELETE FROM community_channels WHERE id = ? AND community_id = ?', [req.params.channelId, req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== DUET REELS =====
app.post('/api/reels/:id/duet', upload.single('video'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'No video provided' }); const duet_video_url = req.file.path; const [original] = await pool.query('SELECT * FROM reels WHERE id = ?', [req.params.id]); if (!original[0]) return res.status(404).json({ error: 'Original reel not found' }); await pool.query('INSERT INTO reels (user_id, video_url, caption, duet_of_id, duet_video_url) VALUES (?, ?, ?, ?, ?)', [req.body.user_id, original[0].video_url, req.body.caption || `Duet with @${original[0].username || 'someone'}`, req.params.id, duet_video_url]); res.status(201).json({ message: 'Duet posted!' }); } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); } });

// ===== MESSAGE REQUEST FILTER =====
app.put('/api/users/:id/message-filter', async (req, res) => { try { await pool.query('UPDATE users SET filter_message_requests = ? WHERE id = ?', [req.body.enabled ? 1 : 0, req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== SCREEN RECORDING ALERT =====
app.post('/api/chat/screen-record-alert', async (req, res) => { try { const { user1, user2 } = req.body; await pool.query('INSERT INTO screen_record_alerts (chat_user1, chat_user2) VALUES (?, ?)', [user1, user2]); io.to(user2.toString()).emit('screen_record_detected', { by: user1 }); res.json({ ok: true }); } catch(e) { res.json({ ok: true }); } });

// ===== CHAT FOLDERS =====
app.get('/api/users/:id/chat-folders', async (req, res) => { try { const [u] = await pool.query('SELECT chat_folders FROM users WHERE id = ?', [req.params.id]); res.json(u[0]?.chat_folders ? JSON.parse(u[0].chat_folders) : []); } catch(e) { res.json([]); } });
app.put('/api/users/:id/chat-folders', async (req, res) => { try { await pool.query('UPDATE users SET chat_folders = ? WHERE id = ?', [JSON.stringify(req.body.folders), req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Server error.' }); } });

// ===== UPDATE SETTINGS with filter_message_requests & 2FA status =====
app.get('/api/users/:id/settings', async (req, res) => { try { const[users] = await pool.query('SELECT is_private, notifications, theme_color, anthem_url, show_active_status, birthday, COALESCE(filter_message_requests, 1) as filter_message_requests, COALESCE(two_factor_enabled, 0) as two_factor_enabled FROM users WHERE id = ?',[req.params.id]); res.json(users[0] || { is_private: false, notifications: true, theme_color: '#3b82f6', anthem_url: null, show_active_status: true, birthday: null, filter_message_requests: true, two_factor_enabled: false }); } catch (err) { res.status(500).json({ error: "Server error." }); } });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
