// NEW CODE
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));



// Add these routes to your server.js file
// Make sure to install required packages: npm install multer path

const multer = require('multer');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads', 'assignments');
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = /pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only PDF, DOC, DOCX, TXT, and ZIP files are allowed!');
    }
  }
});

// Assignment Schema (add this to your models)
const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseCode: { type: String, required: true },
  description: { type: String },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  fileName: { type: String },
  filePath: { type: String },
  originalName: { type: String },
  dueDate: { type: Date, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'graded', 'pending', 'late'], default: 'submitted' },
  grade: { type: String },
  feedback: { type: String },
  gradedBy: { type: String },
  gradedAt: { type: Date }
});

const Assignment = mongoose.model('Assignment', assignmentSchema);


async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('🌱 Seeding database...');
      
      const initialUsers = [
        {
          username: 'admin',
          email: 'admin@educhain.com',
          password: 'password123',
          name: 'System Administrator',
          role: 'admin'
        },
        {
          username: 'lecturer',
          email: 'lecturer@educhain.com',  
          password: 'password123',
          name: 'Dr. Jane Smith',
          role: 'lecturer'
        },
        {
          username: 'student',
          email: 'student@educhain.com',
          password: 'password123', 
          name: 'John Student',
          role: 'student'
        }
      ];

      await User.insertMany(initialUsers);
      console.log('✅ Initial users created');
    }
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}
// ROUTES

// Submit Assignment
app.post('/api/assignments/submit', upload.single('assignmentFile'), async (req, res) => {
  try {
    const { title, courseCode, description, studentId, studentName, dueDate } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Check if assignment is late
    const due = new Date(dueDate);
    const now = new Date();
    const status = now > due ? 'late' : 'submitted';
    
    const assignment = new Assignment({
      title,
      courseCode,
      description,
      studentId,
      studentName,
      fileName: req.file.filename,
      filePath: req.file.path,
      originalName: req.file.originalname,
      dueDate: due,
      status
    });
    
    const savedAssignment = await assignment.save();
    
    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      assignment: {
        id: savedAssignment._id,
        title: savedAssignment.title,
        status: savedAssignment.status,
        submittedAt: savedAssignment.submittedAt
      }
    });
    
  } catch (error) {
    console.error('Assignment submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit assignment'
    });
  }
});

// Get student's submissions
app.get('/api/assignments/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const submissions = await Assignment.find({ studentId })
      .sort({ submittedAt: -1 }) // Most recent first
      .select('-filePath'); // Don't send file path for security
    
    res.json({
      success: true,
      submissions
    });
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// Get specific submission details
app.get('/api/assignments/submission/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await Assignment.findById(submissionId)
      .select('-filePath'); // Don't send file path for security
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      submission
    });
    
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission details'
    });
  }
});

// Download assignment file
app.get('/api/assignments/download/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await Assignment.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    const filePath = submission.filePath;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${submission.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// Get all assignments (for lecturers/admin)
app.get('/api/assignments/all', async (req, res) => {
  try {
    const assignments = await Assignment.find({})
      .sort({ submittedAt: -1 })
      .select('-filePath');
    
    res.json({
      success: true,
      assignments
    });
    
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments'
    });
  }
});

// Grade assignment (for lecturers)
app.put('/api/assignments/grade/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, gradedBy } = req.body;
    
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      submissionId,
      {
        grade,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded'
      },
      { new: true }
    ).select('-filePath');
    
    if (!updatedAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assignment graded successfully',
      assignment: updatedAssignment
    });
    
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grade assignment'
    });
  }
});

// Replace your User Schema in server.js with this simpler version

// User Schema (without bcrypt complexity)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Plain text for development
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'lecturer', 'admin'], required: true },
  walletAddress: { type: String, sparse: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Simple password comparison (no hashing)
userSchema.methods.comparePassword = function(candidatePassword) {
  return candidatePassword === this.password;
};

const User = mongoose.model('User', userSchema);



// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/educhain')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedDatabase();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));



// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Replace the login route in your server.js with this fixed version

// Replace your login route in server.js with this simpler version

// Simple login route (no bcrypt)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, walletAddress } = req.body;
    
    console.log('Login attempt:', { username, password, walletAddress });

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    // Find user
    const user = await User.findOne({ username: username.trim() });
    console.log('User found:', user ? { username: user.username, role: user.role } : 'Not found');
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Simple password check
    console.log('Password check:', password, '===', user.password, '?', password === user.password);
    
    if (password !== user.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update wallet address if provided
    if (walletAddress && walletAddress !== user.walletAddress) {
      user.walletAddress = walletAddress;
      await user.save();
    }

    // Log audit event
    await AuditLog.create({
      user: user.name,
      action: 'Login',
      details: `User logged in from ${req.ip}`,
      ipAddress: req.ip
    });

    console.log('Login successful for user:', user.username);

    // Return user info
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update fields
    user.name = name;
    user.email = email;
    user.role = role;

    await user.save();

    await AuditLog.create({
      user: 'Admin',
      action: 'User Updated',
      details: `User updated: ${user.username}`,
      ipAddress: req.ip
    });

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get all assignments - FIXED VERSION
app.get('/api/assignments', async (req, res) => {
  try {
    // Don't use populate since studentId is a string, not ObjectId reference
    const assignments = await Assignment.find()
      .sort({ submittedAt: -1 })
      .select('-filePath'); // Don't send file paths for security
    
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user assignments - FIXED VERSION  
app.get('/api/assignments/user/:userId', async (req, res) => {
  try {
    // Use studentId field instead of student
    const assignments = await Assignment.find({ studentId: req.params.userId })
      .sort({ submittedAt: -1 })
      .select('-filePath');
    
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Submit assignment
app.post('/api/assignments', async (req, res) => {
  try {
    const { studentId, title, filename, fileHash, blockchainTx } = req.body;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Check for duplicate hash
    const existingAssignment = await Assignment.findOne({ fileHash });
    if (existingAssignment) {
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate file detected. This file has already been submitted.' 
      });
    }

    const assignment = new Assignment({
      student: studentId,
      studentName: student.name,
      title,
      filename,
      fileHash,
      blockchainTx
    });

    await assignment.save();

    await AuditLog.create({
      user: student.name,
      action: 'Assignment Submitted',
      details: `${title} uploaded with hash: ${fileHash.substring(0, 16)}...`,
      ipAddress: req.ip
    });

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Assignment submission error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Verify assignment
app.post('/api/assignments/:id/verify', async (req, res) => {
  try {
    const { lecturerId } = req.body;

    const lecturer = await User.findById(lecturerId);
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Update status to verified
    assignment.status = 'verified';
    await assignment.save();

    await AuditLog.create({
      user: lecturer.name,
      action: 'Assignment Verified',
      details: `${assignment.title} verified successfully`,
      ipAddress: req.ip
    });

    res.json({ 
      success: true, 
      verification: {
        isValid: true,
        hash: assignment.fileHash,
        status: 'verified'
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Grade assignment
app.put('/api/assignments/:id/grade', async (req, res) => {
  try {
    const { grade, feedback, lecturerId } = req.body;

    const lecturer = await User.findById(lecturerId);
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    if (assignment.grade) {
      return res.status(400).json({ success: false, error: 'Assignment already graded' });
    }

    assignment.grade = `${grade}%`;
    assignment.feedback = feedback;
    assignment.status = 'graded';
    assignment.gradedBy = lecturer ? lecturer.name : 'Unknown';
    assignment.gradeDate = new Date();

    await assignment.save();

    await AuditLog.create({
      user: lecturer ? lecturer.name : 'System',
      action: 'Assignment Graded',
      details: `${assignment.title} graded: ${grade}%`,
      ipAddress: req.ip
    });

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get audit logs
app.get('/api/audit', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).limit(1000);
    res.json({ success: true, auditLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Add this temporary endpoint to your server.js file (before the "Serve frontend" section)

// Manual seed endpoint (REMOVE THIS IN PRODUCTION)
app.post('/api/manual-seed', async (req, res) => {
  try {
    // Clear existing users first
    await User.deleteMany({});
    await Assignment.deleteMany({});
    await AuditLog.deleteMany({});
    
    console.log('🧹 Cleared existing data');
    
    const initialUsers = [
      {
        username: 'admin',
        email: 'admin@educhain.com',
        password: 'password123',
        name: 'System Administrator',
        role: 'admin'
      },
      {
        username: 'lecturer',
        email: 'lecturer@educhain.com',
        password: 'password123',
        name: 'Dr. Jane Smith',
        role: 'lecturer'
      },
      {
        username: 'student',
        email: 'student@educhain.com',
        password: 'password123',
        name: 'John Student',
        role: 'student'
      }
    ];

    const createdUsers = await User.insertMany(initialUsers);
    console.log('✅ Users created:', createdUsers.length);

    // Add initial audit log
    await AuditLog.create({
      user: 'System',
      action: 'Manual Database Seed',
      details: 'Database manually seeded with initial users',
      ipAddress: req.ip || 'localhost'
    });

    res.json({ 
      success: true, 
      message: 'Database seeded successfully',
      users: createdUsers.map(u => ({ username: u.username, role: u.role }))
    });

  } catch (error) {
    console.error('❌ Manual seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add this debug endpoint to your server.js to check MongoDB connection

app.get('/api/debug', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    // Count documents in collections
    const userCount = await User.countDocuments();
    const assignmentCount = await Assignment.countDocuments();
    const auditCount = await AuditLog.countDocuments();

    // Try to find test users
    const testUsers = await User.find().select('username role');

    res.json({
      mongodb: {
        status: mongoStates[mongoStatus] || 'unknown',
        connectionString: process.env.MONGODB_URI ? 'configured' : 'missing'
      },
      collections: {
        users: userCount,
        assignments: assignmentCount,
        auditLogs: auditCount
      },
      testUsers: testUsers
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      mongodb: 'connection failed'
    });
  }
});

// Add this to your server.js (before the "Serve frontend" section)

app.get('/api/reset-passwords', async (req, res) => {
  try {
    console.log('🔄 Resetting all user passwords...');
    
    const users = await User.find();
    let resetCount = 0;
    
    for (let user of users) {
      // Force password reset
      user.password = 'password123';
      await user.save();
      console.log(`✅ Password reset for: ${user.username}`);
      resetCount++;
    }

    res.json({ 
      success: true, 
      message: 'All passwords reset to: password123',
      resetCount: resetCount,
      users: users.map(u => ({ username: u.username, role: u.role }))
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Serve frontend
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
});
