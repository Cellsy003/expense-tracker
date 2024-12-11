const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

const prisma = new PrismaClient();

// Registration
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
    res.redirect('/login');
  } catch (error) {
    console.error('Registration Error:', error);
    res.render('register', { error: 'Email or username exists. Please try again.' });
  }
});


// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    req.session.user = { id: user.id, username: user.username };
    res.redirect(`/welcome`);
  } catch (error) {
    console.error('Login Error:', error);
    res.render('login', { error: 'Error during login. Please try again.' });
  }
});


module.exports = router;
