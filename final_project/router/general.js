const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const axios = require('axios');
const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;


public_users.post("/register", (req,res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ message: "Unable to register user. Username and password are required." });
  }

  if (isValid(username)) {
    return res.status(409).json({ message: "User already exists!" });
  }

  users.push({ username: username, password: password });
  return res.status(200).json({ message: "User successfully registered. Now you can login" });
});

// Promise helpers — enable non-blocking concurrent book lookups
function getAllBooks() {
  return new Promise((resolve, reject) => {
    try {
      resolve(books);
    } catch (err) {
      reject(err);
    }
  });
}

function getBookByISBN(isbn) {
  return new Promise((resolve, reject) => {
    const book = books[isbn];
    if (book) {
      resolve(book);
    } else {
      reject(new Error("Book not found"));
    }
  });
}

function getBooksByAuthor(author) {
  // Use Axios to fetch the canonical book list over HTTP, then filter by author.
  return new Promise((resolve, reject) => {
    axios
      .get(`${BASE_URL}/`)
      .then((response) => {
        const data = response.data || {};
        const matchingBooks = Object.keys(data)
          .filter((key) => data[key].author === author)
          .map((key) => data[key]);

        if (matchingBooks.length > 0) {
          resolve(matchingBooks);
        } else {
          reject(new Error('No books found for this author'));
        }
      })
      .catch((err) => {
        if (err.response) {
          reject(new Error(`Upstream error: ${err.response.status} ${err.response.statusText}`));
        } else if (err.request) {
          reject(new Error('Failed to fetch books: no response from data source'));
        } else {
          reject(new Error(`Failed to fetch books: ${err.message}`));
        }
      });
  });
}

function getBooksByTitle(title) {
  return new Promise((resolve, reject) => {
    const matchingBooks = Object.keys(books)
      .filter((key) => books[key].title === title)
      .map((key) => books[key]);

    if (matchingBooks.length > 0) {
      resolve(matchingBooks);
    } else {
      reject(new Error("No books found with this title"));
    }
  });
}

function getBookReviews(isbn) {
  return new Promise((resolve, reject) => {
    if (books[isbn]) {
      resolve(books[isbn].reviews);
    } else {
      reject(new Error("Book not found"));
    }
  });
}

// Get the book list available in the shop (Async/Await)
public_users.get('/', async function (req, res) {
  try {
    const bookList = await getAllBooks();
    // return JSON with proper content-type
    res.json(bookList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get book details based on ISBN (Promise)
public_users.get('/isbn/:isbn', function (req, res) {
  getBookByISBN(req.params.isbn)
    .then((book) => res.send(book))
    .catch((err) => res.status(404).json({ message: err.message }));
});
  
// Get book details based on author (Promise)
public_users.get('/author/:author', function (req, res) {
  getBooksByAuthor(req.params.author)
    .then((matchingBooks) => res.json(matchingBooks))
    .catch((err) => {
      const msg = err && err.message ? err.message : 'Unknown error';
      if (msg.includes('No books found')) {
        return res.status(404).json({ message: msg });
      }
      if (msg.includes('Failed to fetch') || msg.startsWith('Upstream error')) {
        return res.status(502).json({ message: msg });
      }
      return res.status(500).json({ message: msg });
    });
});

// Get all books based on title (Async/Await)
public_users.get('/title/:title', async function (req, res) {
  try {
    const matchingBooks = await getBooksByTitle(req.params.title);
    res.send(matchingBooks);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// Get book review (Callback-style via Promise then)
public_users.get('/review/:isbn', function (req, res) {
  getBookReviews(req.params.isbn)
    .then((reviews) => res.send(reviews))
    .catch((err) => res.status(404).json({ message: err.message }));
});

module.exports.general = public_users;
