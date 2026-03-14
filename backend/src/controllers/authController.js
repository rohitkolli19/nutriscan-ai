const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

const generateTokens = (userId, email) => {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { accessToken };
};

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    // Check existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = uuidv4();

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        password_hash: passwordHash,
        name,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select('id, email, name, created_at')
      .single();

    if (error) {
      logger.error('Signup DB error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    const { accessToken } = generateTokens(user.id, user.email);

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, name: user.name },
      accessToken
    });
  } catch (err) {
    logger.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const { accessToken } = generateTokens(user.id, user.email);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      accessToken
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
};

const refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { accessToken } = generateTokens(decoded.userId, decoded.email);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  // In production, send email with reset link
  // For now, return success message (prevents email enumeration)
  logger.info(`Password reset requested for: ${email}`);
  res.json({ message: 'If this email exists, a reset link has been sent.' });
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and password required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', decoded.userId);

    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, last_login')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    logger.error('GetMe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { signup, login, logout, refreshToken, forgotPassword, resetPassword, getMe };
