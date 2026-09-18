const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'maxfiy-kalit-proyekt-uchun',
    resave: false,
    saveUninitialized: true
}));

// Foydalanuvchilar ma'lumotlari ro'yxati
const users = [
    {
        username: "admin",
        password: "123",
        name: "Ali Valiyev",
        email: "ali@gmail.com",
        job: "Frontend Dasturchi"
    },
    {
        username: "sanjar",
        password: "777",
        name: "Sanjar Karimov",
        email: "sanjar@mail.ru",
        job: "Backend Dasturchi"
    }
];

// Asosiy sahifa (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login qilish tekshiruvi
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (foundUser) {
        req.session.user = foundUser;
        res.redirect('/dashboard');
    } else {
        res.send('<h2>Xatolik: Login yoki parol noto\'g\'ri!</h2><a href="/">Orqaga qaytish</a>');
    }
});

// Shaxsiy kabinet sahifasi
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// Foydalanuvchi ma'lumotlarini jo'natuvchi API
app.get('/user-data', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.json({ error: "Tizimga kirmagansiz" });
    }
});

// Tizimdan chiqish
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// PORT 5000 ga o'zgartirildi
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server ishladi! Brauzerdan bering: http://localhost:${PORT}`);
});