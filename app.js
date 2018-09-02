'use strict'
const express = require('express');
const app = express();
const redis = require('redis');
const client = redis.createClient();
const limiter = require('./middleware/limiter');

client.on('error', (err) => {
  console.error(err)
});

const NS_PER_SEC = 1e9;

// Middleware
app.use((req, res, next) => {
  const time = process.hrtime();
  const statement = `${new Date()} ${req.path} ${req.method}`;

  req.on('end', () => {
    const diff = process.hrtime(time);
    const elapsed = (diff[0] * NS_PER_SEC + diff[1])/1e6;
    console.log(`${statement} ${elapsed}ms ${res.statusCode}`);
  })

  next();
});

app.use((req, res, next) => {
  const user = req.header('Authorization') || 'foo-user';
  req.user = user;
  next();
});
app.use(limiter(client));

// API routes.
app.get('/foo', (req, res) => {
  res
    .status(200)
    .json({ ok: true });
});

// Standard error handlers.
app.use((req, res, next) => {
  res
    .status(404)
    .json({
      message: `No route for path ${req.path}.`
    });
  next();
});

app.use((err, req, res, next) => {
  res
    .status(err.status || 500)
    .json({
      message: err.message
    });
});

module.exports = app;