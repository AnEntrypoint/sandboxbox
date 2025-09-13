// Complex Express server with multiple issues for testing
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const Joi = require('joi');
const winston = require('winston');
const axios = require('axios');
const _ = require('lodash');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global state management (anti-pattern)
let globalCache = new Map();
let globalUserCount = 0;
let globalRequestCount = 0;

// Inefficient logging setup
const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// MongoDB connection (blocking)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/testdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Redis connection (blocking)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// User Schema with validation issues
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    firstName: String,
    lastName: String,
    age: Number,
    preferences: mongoose.Schema.Types.Mixed
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: Date,
    isActive: { type: Boolean, default: true }
  }
});

// Product Schema with inefficient design
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: String,
  tags: [String],
  inventory: {
    quantity: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 }
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// Middleware setup (inefficient ordering)
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware with performance issues
app.use((req, res, next) => {
  globalRequestCount++;

  // Inefficient logging for every request
  logger.info(`${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    requestCount: globalRequestCount
  });

  // Blocking cache check
  const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.body)}`;
  if (globalCache.has(cacheKey)) {
    const cachedResponse = globalCache.get(cacheKey);
    return res.json(cachedResponse);
  }

  next();
});

// Authentication middleware with security issues
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Insecure JWT verification (no secret validation)
  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes with various issues

// User registration with security vulnerabilities
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, profile } = req.body;

    // Input validation issues
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists (inefficient query)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Weak password hashing
    const hashedPassword = bcrypt.hashSync(password, 8);

    const user = new User({
      email,
      password: hashedPassword,
      profile: profile || {}
    });

    await user.save();
    globalUserCount++;

    // Generate JWT with security issues
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Inefficient cache update
    globalCache.set(`user:${user._id}`, user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Product management with performance issues
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { name, price, category, tags, inventory } = req.body;

    // Validation issues
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price required' });
    }

    // Inefficient duplicate check
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(409).json({ error: 'Product already exists' });
    }

    const product = new Product({
      name,
      price,
      category,
      tags: tags || [],
      inventory: inventory || { quantity: 0, reserved: 0 }
    });

    await product.save();

    // Inefficient cache invalidation
    for (const [key] of globalCache) {
      if (key.startsWith('products:')) {
        globalCache.delete(key);
      }
    }

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    logger.error('Product creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complex product search with performance issues
app.get('/api/products/search', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    // Build query dynamically (security risk)
    let mongoQuery = {};

    if (query) {
      mongoQuery.name = { $regex: query, $options: 'i' };
    }

    if (category) {
      mongoQuery.category = category;
    }

    if (minPrice || maxPrice) {
      mongoQuery.price = {};
      if (minPrice) mongoQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) mongoQuery.price.$lte = parseFloat(maxPrice);
    }

    // Inefficient pagination
    const skip = (page - 1) * limit;

    const products = await Product.find(mongoQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(mongoQuery);

    // Memory-intensive data processing
    const processedProducts = products.map(product => {
      const processed = {
        ...product.toObject(),
        discountedPrice: product.price * 0.9, // Hardcoded discount
        inStock: product.inventory.quantity > 0,
        tagsCount: product.tags.length,
        metadata: {
          ...product.metadata,
          searchScore: Math.random() // Random search score
        }
      };

      // Inefficient cache storage
      globalCache.set(`product:${product._id}`, processed);

      return processed;
    });

    res.json({
      products: processedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Product search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User analytics with performance bottlenecks
app.get('/api/analytics/users', authenticateToken, async (req, res) => {
  try {
    // Inefficient aggregation queries
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 'metadata.isActive': true });
    const recentUsers = await User.countDocuments({
      'metadata.createdAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // N+1 query problem
    const users = await User.find().limit(100);
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        // Inefficient additional queries for each user
        const userProducts = await Product.countDocuments({ /* no user association */ });
        return {
          ...user.toObject(),
          productCount: userProducts,
          accountAge: Date.now() - user.metadata.createdAt.getTime()
        };
      })
    );

    // Memory-intensive processing
    const analytics = {
      totalUsers,
      activeUsers,
      recentUsers,
      users: usersWithDetails,
      averages: {
        accountAge: usersWithDetails.reduce((sum, user) => sum + user.accountAge, 0) / usersWithDetails.length,
        productsPerUser: usersWithDetails.reduce((sum, user) => sum + user.productCount, 0) / usersWithDetails.length
      },
      generatedAt: new Date().toISOString()
    };

    // Cache the result
    globalCache.set('user-analytics', analytics);

    res.json(analytics);

  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk operations with memory issues
app.post('/api/products/bulk', authenticateToken, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array required' });
    }

    if (products.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 products allowed' });
    }

    // Memory-intensive processing
    const processedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        // Validation
        if (!product.name || !product.price) {
          errors.push({ index: i, error: 'Name and price required' });
          continue;
        }

        // Check for duplicates (inefficient)
        const existing = await Product.findOne({ name: product.name });
        if (existing) {
          errors.push({ index: i, error: 'Product already exists' });
          continue;
        }

        const newProduct = new Product({
          name: product.name,
          price: product.price,
          category: product.category,
          tags: product.tags || [],
          inventory: product.inventory || { quantity: 0, reserved: 0 }
        });

        await newProduct.save();
        processedProducts.push(newProduct);

      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    // Inefficient cache clearing
    globalCache.clear();

    res.json({
      message: 'Bulk operation completed',
      processedCount: processedProducts.length,
      errorCount: errors.length,
      errors,
      products: processedProducts
    });

  } catch (error) {
    logger.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check with external dependencies
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity (blocking)
    await mongoose.connection.db.admin().ping();

    // Check Redis connectivity (blocking)
    await redisClient.ping();

    // Check external API (blocking)
    const externalResponse = await axios.get('https://api.github.com/repos/octocat/Hello-World', {
      timeout: 5000
    });

    res.json({
      status: 'healthy',
      services: {
        database: 'connected',
        redis: 'connected',
        externalApi: externalResponse.status === 200 ? 'available' : 'unavailable'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: {
        globalCacheSize: globalCache.size,
        globalUserCount,
        globalRequestCount
      }
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error-prone file operations
app.post('/api/files/upload', authenticateToken, async (req, res) => {
  try {
    // No file upload handling - this will fail
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content required' });
    }

    // Inefficient file operations
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(__dirname, '../uploads', filename);

    // Blocking file write
    fs.writeFileSync(filePath, content);

    // Inefficient file stats
    const stats = fs.statSync(filePath);

    res.json({
      message: 'File uploaded successfully',
      file: {
        name: filename,
        size: stats.size,
        path: filePath,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Test server running on http://localhost:${PORT}`);
});

module.exports = app;