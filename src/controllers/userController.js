import crypto from 'crypto';
import db from '../utils/db';
import {
  create,
  read,
  remove,
  search,
  updateToken,
  searchToken,
  updatePassword
} from '../models/userModel';
import { isBlank, isEmail } from '../middleware/validator';
import { encrypt, decrypt, generateJwtToken } from '../middleware/auth';
import transporter from '../services/mailer';

const createUser = async (req, res) => {
  const { email, password, isAdmin } = req.body;
  try {
    if (isBlank(email) || isBlank(password)) {
      res.status(400).send({ error: "There's a blank field!" });
    } else if (!isEmail(email)) {
      res.status(400).send({ error: 'Invalid email address!' });
    } else {
      await db.query(create(email, encrypt(password), isAdmin));
      res.status(201).send({ message: 'User succesfully created!' });
    }
  } catch (error) {
    const { routine } = error;
    if (routine === '_bt_check_unique') {
      res.status(400).send({ error: 'That email is already registered!' });
    }
  }
};

const displayUsers = async (req, res, next) => {
  try {
    const { rows } = await db.query(read());
    const users = rows[0];

    if (!users) {
      res.status(200).send({ message: 'No user is currently registered!' });
    } else {
      res.status(200).send(rows);
    }
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  const { email } = req.params;
  const { rows } = await db.query(search(email));
  const user = rows[0];
  try {
    if (isBlank(email)) {
      res.status(400).send({ error: 'Please provide user email!' });
    } else if (!user) {
      res.status(400).send({ error: 'That email is not registered!' });
    } else {
      await db.query(remove(email));
      res.status(200).send({ message: 'User succefully deleted' });
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const { rows } = await db.query(search(email));
  const user = rows[0];
  try {
    if (isBlank(email) || isBlank(password)) {
      res.status(400).send({ error: "There's a blank field!" });
    } else if (!isEmail(email)) {
      res.status(400).send({ error: 'Invalid email address!' });
    } else if (!user) {
      res.status(400).send({ error: 'That email is not registered!' });
    } else if (!decrypt(password, user.password)) {
      res.status(401).send({ error: 'Wrong password!' });
    } else {
      const generatedData = generateJwtToken(user);
      const { token } = generatedData;

      res.status(200).send({ message: 'Login successful!', token });
    }
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).send({ status: 200, message: 'Logout successful!' });
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.params;
  const token = crypto.randomBytes(20).toString('hex');
  const expiry = new Date(Date.now() + 14400000).toGMTString();
  const { rows } = await db.query(search(email));
  const options = {
    to: 'barxwells@gmail.com',
    from: 'barxwells@gmail.com',
    subject: 'Password Reset',
    text:
      `${
        'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n'
        + 'Please click on the following link, or paste this into your browser to complete the process:\n\n'
        + 'http://'
      }${req.headers.host}/auth/reset/${token}\n\n`
      + 'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  };
  const user = rows[0];

  try {
    if (!isEmail(email)) {
      res.status(400).send({ error: 'Invalid email address!' });
    } else if (!user) {
      res.status(400).send({ error: 'The email provided is not registered!' });
    } else {
      await db.query(updateToken(user.email, token, expiry));
      transporter.sendMail(options, (error) => {
        next(error);
      });
      res
        .status(200)
        .send({ message: 'Password reset link sent successfully!' });
    }
  } catch (error) {
    next(error);
  }
};

const resetToken = async (req, res) => {
  const { token } = req.params;
  const { rows } = await db.query(searchToken(token));
  const user = rows[0];
  if (user) {
    req.user = user;
    res.status(200).send({ message: 'Token retrieved successfully', token });
  }
};

const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const now = new Date(Date.now() + 10800000).toGMTString();
  const { rows } = await db.query(searchToken(token));
  const user = rows[0];
  const tokenExpiry = Date.parse(user.password_reset_token_expiry) + 10800000;

  if (!user) {
    res.status(400).send({ error: 'Invalid password reset token' });
  } else if (Date.parse(now) > tokenExpiry) {
    res.status(400).send({ error: 'Password reset token is expired!' });
  } else {
    user.password_reset_token_expiry = now;
    await db.query(
      updatePassword(
        user.email,
        encrypt(password),
        user.password_reset_token_expiry
      )
    );
    res.status(200).send({ message: 'Password updated successfully' });
  }
};

export {
  createUser,
  deleteUser,
  displayUsers,
  login,
  logout,
  updatePassword,
  forgotPassword,
  resetPassword,
  resetToken
};
