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
    else console.log("Baza ulandi.");
});

// Jadvallar: foydalanuvchilar, testlar va javoblar
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, username TEXT UNIQUE, password TEXT, role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_option TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO users (name, username, password, role) 
            VALUES ('Oqituvchi', 'teacher', 'admin123', 'teacher')`);
});

// AUTH API
app.post('/api/register', (req, res) => {
    const { name, username, password } = req.body;
    db.run(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'student')`,
        [name, username, password], function(err) {
            if (err) return res.json({ success: false, message: "Login band!" });
            res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
        });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (user) res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
        else res.json({ success: false, message: "Login yoki parol xato!" });
    });
});

// TEST API (O'qituvchi savol qo'shadi, O'quvchi yechadi)
app.post('/api/quizzes', (req, res) => {
    const { title, question, a, b, c, d, correct } = req.body;
    db.run(`INSERT INTO quizzes (title, question, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, question, a, b, c, d, correct], function(err) {
            if (err) return res.json({ success: false, message: "Test qo'shishda xatolik!" });
            res.json({ success: true, message: "Test muvaffaqiyatli qo'shildi!" });
        });
});

app.get('/api/quizzes', (req, res) => {
    db.all(`SELECT * FROM quizzes`, [], (err, rows) => {
        res.json({ success: true, quizzes: rows });
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/student.html', (req, res) => res.sendFile(path.join(__dirname, 'student.html')));
app.get('/teacher.html', (req, res) => res.sendFile(path.join(__dirname, 'teacher.html')));

app.listen(PORT, () => console.log(`Server yurgizildi: ${PORT}`));