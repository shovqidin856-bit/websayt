const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Baza xatosi:", err.message);
    else console.log("SQLite Baza ulandi.");
});

// Jadvallarni yaratish va unikallik cheklovlarini qo'shish
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, username TEXT UNIQUE, password TEXT, role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_option TEXT
    )`);

    // user_name va quiz_title juftligi unikal bo'lishi uchun UNIQUE qo'shildi
    db.run(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT,
        quiz_title TEXT,
        score INTEGER,
        total INTEGER,
        created_at TEXT,
        UNIQUE(user_name, quiz_title)
    )`);

    db.run(`INSERT OR IGNORE INTO users (name, username, password, role) 
            VALUES ('Oqituvchi', 'teacher', 'admin123', 'teacher')`);
});

// AUTH API
app.post('/api/register', (req, res) => {
    const { name, username, password } = req.body;
    db.run(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'student')`,
        [name, username, password], function(err) {
            if (err) return res.json({ success: false, message: "Bu login allaqachon mavjud!" });
            res.json({ success: true, message: "Ro'yxatdan o'tdingiz!" });
        });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (user) res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
        else res.json({ success: false, message: "Login yoki parol xato!" });
    });
});

// TEST API
app.post('/api/quizzes', (req, res) => {
    const { title, question, a, b, c, d, correct } = req.body;
    db.run(`INSERT INTO quizzes (title, question, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, question, a, b, c, d, correct], function(err) {
            if (err) return res.json({ success: false, message: "Xatolik!" });
            res.json({ success: true, message: "Test muvaffaqiyatli qo'shildi!" });
        });
});

app.get('/api/quizzes', (req, res) => {
    db.all(`SELECT * FROM quizzes`, [], (err, rows) => {
        if (err) return res.json({ success: false, quizzes: [] });
        res.json({ success: true, quizzes: rows || [] });
    });
});

// NATIJANISAQLASH (Agar avval topshirgan bo'lsa, eng yuqori balini yangilaydi)
app.post('/api/results', (req, res) => {
    const { user_name, quiz_title, score, total } = req.body;
    const createdAt = new Date().toISOString();

    // Avvalgi natijani olish
    db.get(`SELECT * FROM results WHERE user_name = ? AND quiz_title = ?`, [user_name, quiz_title], (err, row) => {
        if (row) {
            // Agar yangi ball avvalgisidan yuqori bo'lsa, bazani yangilaydi
            if (score > row.score) {
                db.run(`UPDATE results SET score = ?, total = ?, created_at = ? WHERE id = ?`,
                    [score, total, createdAt, row.id], function(err) {
                        res.json({ success: true, message: "Natijangiz yangilandi (yangi rekord)!" });
                    });
            } else {
                res.json({ success: true, message: "Natijangiz saqlandi (avvalgi natija yuqoriroq edi)." });
            }
        } else {
            // Birinchi marta topshirayotgan bo'lsa, yangi qator qo'shadi
            db.run(`INSERT INTO results (user_name, quiz_title, score, total, created_at) VALUES (?, ?, ?, ?, ?)`,
                [user_name, quiz_title, score, total, createdAt], function(err) {
                    res.json({ success: true, message: "Natijangiz reytingga saqlandi!" });
                });
        }
    });
});

// REYTING API (Har bir o'quvchining faqat 1 ta eng yaxshi natijasini beradi)
app.get('/api/leaderboard', (req, res) => {
    db.all(`SELECT user_name, quiz_title, MAX(score) as score, total, created_at 
            FROM results 
            GROUP BY user_name, quiz_title 
            ORDER BY score DESC, created_at ASC 
            LIMIT 50`, [], (err, rows) => {
        if (err) return res.json({ success: false, leaderboard: [] });
        res.json({ success: true, leaderboard: rows || [] });
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/student.html', (req, res) => res.sendFile(path.join(__dirname, 'student.html')));
app.get('/teacher.html', (req, res) => res.sendFile(path.join(__dirname, 'teacher.html')));

app.listen(PORT, () => console.log(`Server ishlamoqda: ${PORT}`));