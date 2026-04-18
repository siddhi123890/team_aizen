const jwt = require('jsonwebtoken');
const User = require('./user.model');
const logger = require('../../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'aizen-fraud-detection-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  /**
   * Register a new user
   */
  async register({ name, email, password }) {
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      const error = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Create user (password hashed automatically by pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate JWT
    const token = this._generateToken(user);

    logger.info(`New user registered: ${email} (${user._id})`);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Login an existing user
   */
  async login({ email, password }) {
    // Find user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = this._generateToken(user);

    logger.info(`User logged in: ${email} (${user._id})`);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Verify a JWT token and return user data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      const err = new Error('Invalid or expired token');
      err.statusCode = 401;
      throw err;
    }
  }

  /**
   * Generate JWT token
   */
  _generateToken(user) {
    return jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
