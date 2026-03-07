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
            onlineUsers.delete(String(socket._userId));
            io.emit('online_status', { userId: socket._userId, online: false, lastSeen: new Date() });
        }
    });
    socket.on('send_private_message', async (data) => {
        try {
            const { senderId, receiverId, content, media_url, media_type, replyToId, isForwarded } = data;
            const[connections] = await pool.query(`SELECT * FROM connections WHERE (requester_id = ? AND receiver_id = ? AND status = 'accepted') OR (requester_id = ? AND receiver_id = ? AND status = 'accepted')`,[senderId, receiverId, receiverId, senderId]);
            const isRequest = connections.length === 0;
            await pool.query('INSERT INTO messages (sender_id, receiver_id, content, is_request, media_url, media_type, reply_to_id, is_forwarded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',[senderId, receiverId, content || '', isRequest, media_url || null, media_type || null, replyToId || null, isForwarded || false]);
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
app.get('/api/users/:id/settings', async (req, res) => { try { const[users] = await pool.query('SELECT is_private, notifications, theme_color, anthem_url, show_active_status FROM users WHERE id = ?',[req.params.id]); res.json(users[0] || { is_private: false, notifications: true, theme_color: '#3b82f6', anthem_url: null, show_active_status: true }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/:id/settings', async (req, res) => { try { await pool.query('UPDATE users SET is_private = ?, notifications = ?, theme_color = ?, anthem_url = ?, show_active_status = ? WHERE id = ?',[req.body.is_private, req.body.notifications, req.body.theme_color, req.body.anthem_url, req.body.show_active_status ?? true, req.params.id]); res.json({ message: "Saved!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/:id/password', async (req, res) => { try { const[users] = await pool.query('SELECT password_hash FROM users WHERE id = ?',[req.params.id]); if (!(await bcrypt.compare(req.body.oldPassword, users[0].password_hash))) return res.status(401).json({ error: "Incorrect password" }); const hash = await bcrypt.hash(req.body.newPassword, 10); await pool.query('UPDATE users SET password_hash = ? WHERE id = ?',[hash, req.params.id]); res.json({ message: "Password updated!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.delete('/api/users/:id', async (req, res) => { try { await pool.query('DELETE FROM users WHERE id = ?',[req.params.id]); res.json({ message: "Deleted." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/search', async (req, res) => { try { const { q, userId } = req.query; const [users] = await pool.query("SELECT id, username, profile_pic_url FROM users WHERE username LIKE ? AND id != ? AND username != 'superadmin' LIMIT 20",[`%${q}%`, userId]); res.json(users); } catch (err) { res.status(500).json({ error: "Server error." }); } });

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
app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        const image_url = req.file ? req.file.path : null;
        const { user_id, content, scheduled_at, is_draft } = req.body;
        // Extract hashtags and mentions
        const hashtags = (content.match(/#[\w]+/g) || []).map(h => h.toLowerCase());
        const mentions = (content.match(/@([\w]+)/g) || []).map(m => m.slice(1).toLowerCase());
        await pool.query('INSERT INTO posts (user_id, content, image_url, scheduled_at, is_draft, hashtags) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, content, image_url, scheduled_at || null, is_draft === 'true' ? 1 : 0, JSON.stringify(hashtags)]);
        // Push notification to mentioned users
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
        res.status(201).json({ message: "Post created!" });
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
            `SELECT p.*, u.username, u.profile_pic_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked
             FROM posts p JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`, [currentUserId]);
        // Filter out drafts and future scheduled posts in JS (safer if columns don't exist yet)
        const filtered = posts.filter(p => !p.is_draft && (!p.scheduled_at || new Date(p.scheduled_at) <= new Date()));
        res.json(filtered);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); }
});
app.post('/api/posts/:id/like', async (req, res) => { try { const postId = req.params.id; const { userId } = req.body; const [existing] = await pool.query('SELECT * FROM likes WHERE post_id = ? AND user_id = ?',[postId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?',[postId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)',[postId, userId]); res.json({ liked: true }); } } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts/:id/likes', async (req, res) => { try { const [likes] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id = ? ORDER BY l.id DESC`,[req.params.id]); res.json(likes); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/posts/:id/comments', async (req, res) => { try { const[comments] = await pool.query(`SELECT c.*, u.username, u.profile_pic_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`,[req.params.id]); res.json(comments); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/posts/:id/comment', async (req, res) => { try { await pool.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',[req.params.id, req.body.userId, req.body.content]); res.json({ message: "Comment added!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });

// CHAT MEDIA
app.post('/api/messages/upload', upload.single('media'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "No file provided" }); const media_url = req.file.path; let media_type = 'document'; if (req.file.mimetype.startsWith('image/')) media_type = 'image'; else if (req.file.mimetype.startsWith('video/')) media_type = 'video'; else if (req.file.mimetype.startsWith('audio/')) media_type = 'audio'; res.json({ media_url, media_type }); } catch (err) { res.status(500).json({ error: "Server error" }); } });
app.put('/api/messages/read', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        await pool.query('UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE', [senderId, receiverId]);
        // Notify sender that messages were seen
        io.to(String(senderId)).emit('messages_seen', { by: receiverId, to: senderId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});
app.get('/api/users', async (req, res) => { try { const[users] = await pool.query("SELECT id, username FROM users WHERE username != 'superadmin'"); res.json(users); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/messages/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; const[messages] = await pool.query(`SELECT m.*, u.username, r.content AS reply_content, ru.username AS reply_username FROM messages m JOIN users u ON m.sender_id = u.id LEFT JOIN messages r ON m.reply_to_id = r.id LEFT JOIN users ru ON r.sender_id = ru.id WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?) ORDER BY m.created_at ASC`,[user1, user2, user2, user1]); res.json(messages); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/requests/:userId', async (req, res) => { try { const [requests] = await pool.query(`SELECT messages.*, users.username, users.profile_pic_url FROM messages JOIN users ON messages.sender_id = users.id WHERE messages.receiver_id = ? AND messages.is_request = true AND messages.sender_id NOT IN (SELECT requester_id FROM connections WHERE receiver_id = ? AND status = 'accepted' UNION SELECT receiver_id FROM connections WHERE requester_id = ? AND status = 'accepted') GROUP BY messages.sender_id ORDER BY messages.created_at DESC`,[req.params.userId, req.params.userId, req.params.userId]); res.json(requests); } catch (err) { res.status(500).json({ error: "Server error." }); } });

// PROFILE & FRIENDS
app.get('/api/users/:id', async (req, res) => { try { const [users] = await pool.query('SELECT id, username, bio, profile_pic_url, cover_pic_url, is_private, theme_color, anthem_url, profile_links, show_active_status, created_at FROM users WHERE id = ?',[req.params.id]); if (users.length === 0) return res.status(404).json({error: "Not found"}); const [friends] = await pool.query(`SELECT COUNT(*) as count FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'`,[req.params.id, req.params.id]); res.json({ ...users[0], friend_count: friends[0].count }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/users/:id/posts', async (req, res) => { try { const currentUserId = req.query.currentUserId || 0; const[posts] = await pool.query(`SELECT p.*, u.username, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.created_at DESC`,[currentUserId, req.params.id]); res.json(posts); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/users/edit', upload.fields([{ name: 'profile_pic', maxCount: 1 }, { name: 'cover_pic', maxCount: 1 }]), async (req, res) => { try { const { userId, bio, theme_color, anthem_url, profile_links } = req.body; let query = 'UPDATE users SET bio = ?, theme_color = ?, anthem_url = ?, profile_links = ?'; let params =[bio, theme_color || '#3b82f6', anthem_url || null, profile_links || null]; if (req.files && req.files['profile_pic']) { query += ', profile_pic_url = ?'; params.push(req.files['profile_pic'][0].path); } if (req.files && req.files['cover_pic']) { query += ', cover_pic_url = ?'; params.push(req.files['cover_pic'][0].path); } query += ' WHERE id = ?'; params.push(userId); await pool.query(query, params); res.json({ message: "Profile updated!" }); } catch(err) { res.status(500).json({ error: "Server error." }); } });

app.post('/api/friends/request', async (req, res) => { try { const { requester_id, receiver_id } = req.body; if (requester_id === receiver_id) return res.status(400).json({ error: "Cannot friend yourself." }); await pool.query('INSERT IGNORE INTO connections (requester_id, receiver_id, status) VALUES (?, ?, ?)',[requester_id, receiver_id, 'pending']); io.to(receiver_id.toString()).emit('activity_updated'); res.json({ message: "Request sent!" }); } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); } });
app.post('/api/friends/remove', async (req, res) => { try { const { user1, user2 } = req.body; await pool.query(`DELETE FROM connections WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,[user1, user2, user2, user1]); io.to(user1.toString()).emit('activity_updated'); io.to(user2.toString()).emit('activity_updated'); res.json({ message: "Unfriended" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.put('/api/friends/accept', async (req, res) => { try { const { requester_id, receiver_id } = req.body; await pool.query('UPDATE connections SET status = ? WHERE requester_id = ? AND receiver_id = ?',['accepted', requester_id, receiver_id]); await pool.query('UPDATE messages SET is_request = false WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',[requester_id, receiver_id, receiver_id, requester_id]); io.to(requester_id.toString()).emit('activity_updated'); res.json({ message: "Request accepted!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/status/:user1/:user2', async (req, res) => { try { const { user1, user2 } = req.params; const[connections] = await pool.query(`SELECT * FROM connections WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,[user1, user2, user2, user1]); if (connections.length === 0) return res.json({ status: 'none' }); const conn = connections[0]; if (conn.status === 'accepted') return res.json({ status: 'friends' }); if (conn.requester_id == user1) return res.json({ status: 'sent_request' }); return res.json({ status: 'received_request', requester_id: conn.requester_id }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/pending/:userId', async (req, res) => { try { const [requests] = await pool.query(`SELECT users.id, users.username, users.profile_pic_url FROM connections JOIN users ON connections.requester_id = users.id WHERE connections.receiver_id = ? AND connections.status = 'pending'`,[req.params.userId]); res.json(requests); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/sent/:userId', async (req, res) => { try { const [sent] = await pool.query(`SELECT users.id, users.username, users.profile_pic_url FROM connections JOIN users ON connections.receiver_id = users.id WHERE connections.requester_id = ? AND connections.status = 'pending'`,[req.params.userId]); res.json(sent); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/friends/cancel', async (req, res) => { try { const { requester_id, receiver_id } = req.body; await pool.query('DELETE FROM connections WHERE requester_id = ? AND receiver_id = ? AND status = ?',[requester_id, receiver_id, 'pending']); res.json({ message: "Request cancelled." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/explore/:userId', async (req, res) => { try { const[explore] = await pool.query(`SELECT id, username, profile_pic_url FROM users WHERE id != ? AND username != 'superadmin' AND id NOT IN (SELECT receiver_id FROM connections WHERE requester_id = ?) AND id NOT IN (SELECT requester_id FROM connections WHERE receiver_id = ?)`,[req.params.userId, req.params.userId, req.params.userId]); res.json(explore); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/friends/list/:userId', async (req, res) => { try { const { userId } = req.params; const [friends] = await pool.query(`SELECT u.id, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) AS unread_count, (SELECT content FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message, (SELECT sender_id FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_sender, (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message_time FROM users u JOIN connections c ON (c.requester_id = u.id AND c.receiver_id = ?) OR (c.receiver_id = u.id AND c.requester_id = ?) WHERE c.status = 'accepted' ORDER BY last_message_time DESC`,[userId, userId, userId, userId, userId, userId, userId, userId, userId]); res.json(friends); } catch (err) { console.error(err); res.status(500).json({ error: "Server error." }); } });

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
            `SELECT s.*, u.username, u.profile_pic_url,
                (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id) AS like_count,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) AS view_count,
                (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id AND user_id = ?) AS user_liked,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id AND user_id = ?) AS user_has_viewed
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
            [currentUserId, currentUserId, currentUserId,
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
app.post('/api/reels', upload.single('video'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "No video provided" }); const video_url = req.file.path; await pool.query('INSERT INTO reels (user_id, video_url, caption) VALUES (?, ?, ?)',[req.body.user_id, video_url, req.body.caption || '']); res.status(201).json({ message: "Reel uploaded!" }); } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); } });
app.get('/api/reels', async (req, res) => { try { const currentUserId = req.query.userId || 0; const[reels] = await pool.query(`SELECT r.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) AS like_count, (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) AS user_liked FROM reels r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC`, [currentUserId]); res.json(reels); } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); } });
app.post('/api/reels/:id/like', async (req, res) => { try { const reelId = req.params.id; const { userId } = req.body; const[existing] = await pool.query('SELECT * FROM reel_likes WHERE reel_id = ? AND user_id = ?',[reelId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?',[reelId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO reel_likes (reel_id, user_id) VALUES (?, ?)', [reelId, userId]); res.json({ liked: true }); } } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); } });

// COMMUNITIES
app.post('/api/communities', async (req, res) => { try { const { name, description, creator_id } = req.body; const[comm] = await pool.query('INSERT INTO communities (name, description, creator_id) VALUES (?, ?, ?)',[name, description, creator_id]); await pool.query('INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, "admin")',[comm.insertId, creator_id]); res.status(201).json({ message: "Community created!" }); } catch (err) { res.status(500).json({ error: "Community name taken." }); } });
app.get('/api/communities', async (req, res) => { try { const currentUserId = req.query.userId || 0; const[communities] = await pool.query(`SELECT c.*, u.username as creator_name, (SELECT COUNT(*) FROM community_posts WHERE community_id = c.id) AS post_count, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) AS member_count, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND user_id = ?) AS is_member FROM communities c JOIN users u ON c.creator_id = u.id ORDER BY member_count DESC`, [currentUserId]); res.json(communities); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/join', async (req, res) => { try { await pool.query('INSERT IGNORE INTO community_members (community_id, user_id) VALUES (?, ?)',[req.params.id, req.body.userId]); res.json({ message: "Joined!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/leave', async (req, res) => { try { await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = ?',[req.params.id, req.body.userId]); res.json({ message: "Left." }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/communities/:id/posts', async (req, res) => { try { const currentUserId = req.query.userId || 0; const[posts] = await pool.query(`SELECT cp.*, u.username, u.profile_pic_url, (SELECT COUNT(*) FROM community_post_likes WHERE post_id = cp.id) AS like_count, (SELECT COUNT(*) FROM community_post_comments WHERE post_id = cp.id) AS comment_count, (SELECT COUNT(*) FROM community_post_likes WHERE post_id = cp.id AND user_id = ?) AS user_liked FROM community_posts cp JOIN users u ON cp.user_id = u.id WHERE cp.community_id = ? ORDER BY cp.created_at DESC`, [currentUserId, req.params.id]); res.json(posts); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/posts', upload.single('image'), async (req, res) => { try { const image_url = req.file ? req.file.path : null; await pool.query('INSERT INTO community_posts (community_id, user_id, content, image_url) VALUES (?, ?, ?, ?)',[req.params.id, req.body.user_id, req.body.content, image_url]); res.status(201).json({ message: "Posted!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/community_posts/:id/like', async (req, res) => { try { const postId = req.params.id; const { userId } = req.body; const[existing] = await pool.query('SELECT * FROM community_post_likes WHERE post_id = ? AND user_id = ?',[postId, userId]); if (existing.length > 0) { await pool.query('DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?',[postId, userId]); res.json({ liked: false }); } else { await pool.query('INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)',[postId, userId]); res.json({ liked: true }); } } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.get('/api/community_posts/:id/comments', async (req, res) => { try { const[comments] = await pool.query(`SELECT c.*, u.username, u.profile_pic_url FROM community_post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC`,[req.params.id]); res.json(comments); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/community_posts/:id/comment', async (req, res) => { try { await pool.query('INSERT INTO community_post_comments (post_id, user_id, content) VALUES (?, ?, ?)',[req.params.id, req.body.userId, req.body.content]); res.json({ message: "Comment added!" }); } catch (err) { res.status(500).json({ error: "Server error." }); } });
app.post('/api/communities/:id/invite', async (req, res) => { try { const { senderId, receiverId, commName } = req.body; const content = `👋 I just invited you to join /${commName}!`; await pool.query('INSERT INTO messages (sender_id, receiver_id, content, is_request) VALUES (?, ?, ?, false)', [senderId, receiverId, content]); io.to(receiverId.toString()).emit('activity_updated'); res.json({success: true}); } catch(e) { res.status(500).json({error: "Failed to invite."}) } });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));