require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  // No hardcoded fallback: auth.js reads JWT_SECRET itself and refuses to use a guessable default.
  jwtSecret: process.env.JWT_SECRET,
};
