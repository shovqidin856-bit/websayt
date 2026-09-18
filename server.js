const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rasmlar yuklanadigan joy sozlamasi
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Ma'lumotlar bazasini yaratish
const db = new sqlite3.Database('./math_quiz.db');

db.serialize(() => {
    // Foydalanuvchilar (O'qituvchi/O'quvchi)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // Testlar (Rasmli yoki Matnli)
    db.run(`CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_text TEXT,
        image_url TEXT,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_option TEXT
    )`);

    // Natijalar (Reyting)
    db.run(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT,
        score INTEGER,
        total INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Boshlang'ich O'qituvchi akkaunti (agar yo'q bo'lsa)
    db.run(`INSERT OR IGNORE INTO users (name, username, password, role) 
            VALUES ('Oqituvchi', 'teacher', 'admin123', 'teacher')`);
});

// --- API ENDPOINTLARI ---

// Ro'yxatdan o'tish (O'quvchilar uchun)
app.post('/api/register', (req, res) => {
    const { name, username, password } = req.body;
    db.run(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'student')`,
        [name, username, password],
        function (err) {
            if (err) return res.json({ success: false, message: 'Bu login band!' });
            res.json({ success: true });
        }
    );
});

// Tizimga kirish
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (user) {
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'Login yoki parol xato!' });
        }
    });
});

// Test qo'shish (O'qituvchi uchun)
app.post('/api/add-test', upload.single('image'), (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : '';

    db.run(`INSERT INTO tests (question_text, image_url, option_a, option_b, option_c, option_d, correct_option)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [question_text, image_url, option_a, option_b, option_c, option_d, correct_option],
        (err) => {
            if (err) return res.json({ success: false });
            res.json({ success: true });
        }
    );
});

// Testlarni olish (O'quvchi uchun)
app.get('/api/tests', (req, res) => {
    db.all(`SELECT * FROM tests`, [], (err, rows) => {
        res.json(rows || []);
    });
});

// Natijani saqlash
app.post('/api/submit-test', (req, res) => {
    const { student_name, score, total } = req.body;
    db.run(`INSERT INTO results (student_name, score, total) VALUES (?, ?, ?)`,
        [student_name, score, total],
        (err) => {
            res.json({ success: !err });
        }
    );
});

// Reytingni olish
app.get('/api/ratings', (req, res) => {
    db.all(`SELECT student_name, score, total, date FROM results ORDER BY score DESC, date ASC`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.listen(PORT, () => {
    console.log(`Server ishladi: http://localhost:${PORT}`);
});