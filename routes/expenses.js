const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { startOfWeek, endOfWeek, format } = require('date-fns');
const PDFDocument = require('pdfkit');

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


// Route to view weekly expenses and show the report
router.get('/weekly-report', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Get the current week's start and end date
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());

    // Format the start and end dates
    const formattedStart = format(start, 'yyyy-MM-dd');
    const formattedEnd = format(end, 'yyyy-MM-dd');

    // Query the expenses for the current week
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Format each expense's createdAt field
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      formattedDate: format(expense.createdAt, 'yyyy-MM-dd'),  // Format the date here
    }));

    // Calculate the total amount
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Render the weekly expenses page with formatted dates
    res.render('weeklyReport', {
      expenses: formattedExpenses,  // Pass the formatted expenses
      total,
      formattedStart,
      formattedEnd,
    });
  } catch (error) {
    console.error('Error fetching weekly expenses:', error);
    res.status(500).send('Error fetching weekly expenses');
  }
});

router.get('/download-weekly-report', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Get the current week's start and end date
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());

    // Query the expenses for the current week
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate the total amount for the week
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-report.pdf');

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add the title to the PDF
    doc.fontSize(18).text(`Weekly Expenses Report (${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')})`, {
      align: 'center',
    });

    doc.moveDown();

    // List expenses in the PDF
    expenses.forEach((expense) => {
      doc.fontSize(12).text(`${expense.description}:  NGN${expense.amount.toFixed(2)}`, {
        continued: true,
      }).text(`   (${format(expense.createdAt, 'yyyy-MM-dd')})`);
    });

    doc.moveDown();

    // Add the total amount in Naira
    doc.fontSize(14).text(`Total Expenses:  NGN${total.toFixed(2)}`);

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error('Error generating weekly report PDF:', error);
    res.status(500).send('Error generating weekly report PDF');
  }
});



module.exports = router;
