const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SQLite Ma'lumotlar bazasi
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Baza ulanishda xato:", err.message);
    else console.log("SQLite bazasi ulandi.");
});

// Jadvallarni yaratish va standart o'qituvchi hisobini qo'shish
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // O'qituvchi logini mavjud bo'lmasa yaratish (login: teacher / parol: admin123)
    db.run(`INSERT OR IGNORE INTO users (name, username, password, role) 
            VALUES ('Oqituvchi', 'teacher', 'admin123', 'teacher')`);
});

// API: Ro'yxatdan o'tish (O'quvchilar uchun)
app.post('/api/register', (req, res) => {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
        return res.json({ success: false, message: "Barcha maydonlarni to'ldiring!" });
    }

    const query = `INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'student')`;
    db.run(query, [name, username, password], function(err) {
        if (err) {
            return res.json({ success: false, message: "Bu login allaqachon mavjud!" });
        }
        res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
    });
});

// API: Tizimga kirish
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

    db.get(query, [username, password], (err, user) => {
        if (err) {
            return res.json({ success: false, message: "Serverda xatolik!" });
        }
        if (user) {
            res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
        } else {
            res.json({ success: false, message: "Login yoki parol noto'g'ri!" });
        }
    });
});

// HTML Sahifalarni uzatish uchun yo'llar
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/student.html', (req, res) => res.sendFile(path.join(__dirname, 'student.html')));
app.get('/teacher.html', (req, res) => res.sendFile(path.join(__dirname, 'teacher.html')));

app.listen(PORT, () => {
    console.log(`Server ishlamoqda: port ${PORT}`);
});