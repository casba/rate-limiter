'use strict'
const fs = require('fs');
const path = require('path');

const REPLENISH_RATE = 100;
const CAPACITY = 5*REPLENISH_RATE;
const SCRIPT = fs.readFileSync(path.join(__dirname, 'rate_limiter.lua'), { encoding: 'utf8' });
/**
 * A token is added every 1/r seconds.
 * A bucket can hold at most B tokens.
 * When a request comes in of byte size N
 * 
 *  - if N <= b conforms
 *  - else non-conform.
 * 
 * Every API actor has a bucket.
 * 
 * @param {*} connection 
 * @param {*} options 
 */
module.exports = (connection, options) => {

  // Middleware to check if the user has not exceeded their rate limit requests.
  return (req, res, next) => {
    const user = req.user;

    const prefix = `request_rate_limiter.${user}`;

    const args = [
      2,
      `${prefix}.tokens`, 
      `${prefix}.timestamp`,
      REPLENISH_RATE, 
      CAPACITY, 
      Math.round(new Date() / 1000),
      1
    ];

    connection.eval(SCRIPT, args, (err, response) => {
      if (err) {
        return next();
      }

      const [ allowed, remaining ] = response;
      res.set('X-Rate-Limit-Remaining', remaining);
      if (!allowed) {
        const error = new Error(`Over request limit.`)
        error.status = 429;
        return next(error);
      }
      return next();
    });
  }
}