import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { search } from '../models/userModel';
import db from '../utils/db';

dotenv.config();

const encrypt = (password) => bcrypt.hashSync(password, bcrypt.genSaltSync(10));

const decrypt = (password, encryptedPassword) => bcrypt.compareSync(password, encryptedPassword);

const generateJwtToken = (user) => {
  const expiresIn = 60 * 10;
  const secret = process.env.SECRET;
  const data = { id: user.id, email: user.email, isAdmin: user.is_admin };
  return { expiresIn, token: jwt.sign(data, secret, { expiresIn }) };
};

const authMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;
  const token = authorization.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const { email } = decoded;
    const { rows } = await db.query(search(email));
    const user = rows[0];
    if (user) {
      req.user = user;
      next();
    }
  } catch (error) {
    res.status(401).send(error);
  }
};

export {
  encrypt, decrypt, generateJwtToken, authMiddleware
};
