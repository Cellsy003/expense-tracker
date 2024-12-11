const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Root route
app.get('/', (req, res) => res.redirect('/login'));

// Authentication routes
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));
app.get('/welcome', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('welcome', { username: req.session.user.username });
});

// Routes
app.use('/', authRoutes);
app.use('/expenses', expenseRoutes);

// Start the server
const PORT = process.env.PORT ;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
