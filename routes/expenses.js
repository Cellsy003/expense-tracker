const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

const prisma = new PrismaClient();

// Middleware to ensure the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// View all expenses
router.get('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId },
    });
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.render('expenses', { expenses, total });
  } catch (error) {
    res.status(500).send('Error fetching expenses');
  }
});

// Add a new expense
router.post('/add', isAuthenticated, async (req, res) => {
  const { description, amount } = req.body;
  const userId = req.session.user.id;
  try {
    await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        userId,
      },
    });
    res.redirect('/expenses');
  } catch (error) {
    res.status(500).send('Error adding expense');
  }
});

// Route to display the update form with the current expense data
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  const expenseId = parseInt(req.params.id);
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) {
      return res.render('update', { error: 'Expense not found' });
    }
    res.render('update', { expense, error: null });
  } catch (error) {
    console.error('Error fetching expense for edit:', error);
    res.render('update', { error: 'Error fetching expense data' });
  }
});

// Route to handle the update form submission
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  const { description, amount } = req.body;
  const expenseId = parseInt(req.params.id);

  // Validate inputs
  if (!description || isNaN(amount) || amount <= 0) {
    return res.render('update', { expense: { id: expenseId, description, amount }, error: 'Invalid description or amount' });
  }

  try {
    // Update the expense
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: parseFloat(amount), // Ensure amount is parsed as a float
      },
    });

    res.redirect('/expenses'); // Redirect back to the expenses list
  } catch (error) {
    console.error('Error updating expense:', error);
    res.render('update', { expense: { id: expenseId, description, amount }, error: 'Error updating expense' });
  }
});
  

// Delete an expense
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  const expenseId = parseInt(req.params.id);
  try {
    await prisma.expense.delete({
      where: { id: expenseId },
    });
    res.redirect('/expenses');
  } catch (error) {
    res.status(500).send('Error deleting expense');
  }
});

module.exports = router;
