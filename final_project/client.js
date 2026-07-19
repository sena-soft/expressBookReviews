/**
 * Client script demonstrating concurrent access to the bookshop API
 * using Promises, Async/Await, and Callbacks (via Axios).
 *
 * Start the server first: npm start
 * Then run: node client.js
 */
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

// Task-style: Get all books using async callback (Axios)
function getAllBooksCallback(callback) {
  axios.get(`${BASE_URL}/`)
    .then((response) => callback(null, response.data))
    .catch((err) => callback(err, null));
}

// Get book by ISBN using Promises
function getBookByISBN(isbn) {
  return axios.get(`${BASE_URL}/isbn/${isbn}`)
    .then((response) => response.data);
}

// Get books by author using async/await
async function getBooksByAuthor(author) {
  const response = await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`);
  return response.data;
}

// Get books by title using async/await
async function getBooksByTitle(title) {
  const response = await axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`);
  return response.data;
}

async function runConcurrentRequests() {
  console.log('--- Concurrent bookshop requests ---\n');

  // Callback style
  getAllBooksCallback((err, books) => {
    if (err) {
      console.error('Callback getAllBooks error:', err.message);
    } else {
      console.log('Callback — all books retrieved. Count:', Object.keys(books).length);
    }
  });

  // Fire multiple Promise/async requests in parallel (do not wait on each other)
  const results = await Promise.allSettled([
    getBookByISBN(1),
    getBooksByAuthor('Jane Austen'),
    getBooksByTitle('Things Fall Apart'),
  ]);

  results.forEach((result, index) => {
    const labels = ['ISBN 1', 'Author Jane Austen', 'Title Things Fall Apart'];
    if (result.status === 'fulfilled') {
      console.log(`Promise/Async — ${labels[index]}:`, JSON.stringify(result.value, null, 2));
    } else {
      console.error(`Promise/Async — ${labels[index]} failed:`, result.reason.message);
    }
  });
}

runConcurrentRequests().catch((err) => {
  console.error('Client error (is the server running on port 5000?):', err.message);
});
