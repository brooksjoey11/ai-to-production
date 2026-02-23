// auth.ts

import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// Secret key for JWT signing and encryption
const SECRET_KEY = 'your_secret_key_here';

// User database simulation
let users = [];

// User signup function
export const signup = (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }
    const userExists = users.find(user => user.username === username);
    if (userExists) {
        return res.status(400).send('User already exists.');
    }
    users.push({ username, password }); // In a real app, hash the password!
    res.status(201).send('User registered successfully.');
};

// User login function
export const login = (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username);
    if (!user || user.password !== password) {
        return res.status(401).send('Invalid credentials.');
    }
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
};

// Middleware to authenticate JWT
export const authenticateJWT = (req: Request, res: Response, next: Function) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
    if (!token) {
        return res.sendStatus(401);
    }
    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Exporting functions for use in routes
export default { signup, login, authenticateJWT };