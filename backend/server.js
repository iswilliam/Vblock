const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Assignment = require('./models/Assignment');
const AuditLog = require('./models/AuditLog');

// Import contract ABI (you'll get this after compilation)
const contractABI = require('../artifacts/contracts/AssignmentStorage.sol/AssignmentStorage.json').abi;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/educhain', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Ethereum connection
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.zip'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and ZIP files are allowed.'));
    }
  }
});

// Utility function to calculate file hash
const calculateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Utility function to log audit events
const logAuditEvent = async (userId, action, details, ipAddress) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      details,
      ipAddress,
      userAgent: 'Web App',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    blockchain: contract.address 
  });
});

// User authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, walletAddress } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update wallet address if provided
    if (walletAddress && walletAddress !== user.walletAddress) {
      user.walletAddress = walletAddress;
      user.lastLogin = new Date();
      await user.save();
    }

    await logAuditEvent(user._id, 'Login', `User logged in from ${req.ip}`, req.ip);

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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit assignment
app.post('/api/assignments/submit', upload.single('file'), async (req, res) => {
  try {
    const { title, studentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Calculate file hash
    const fileHash = calculateFileHash(file.path);

    // Check for duplicate hash in database
    const existingAssignment = await Assignment.findByHash(fileHash);
    if (existingAssignment) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      return res.status(409).json({ error: 'Duplicate file detected' });
    }

    // Get user info
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    // Check blockchain for duplicate
    const isDuplicate = await contract.checkDuplicateHash(fileHash);
    if (isDuplicate) {
      fs.unlinkSync(file.path);
      return res.status(409).json({ error: 'Assignment hash already exists on blockchain' });
    }

    // Submit to blockchain
    const tx = await contract.submitAssignment(
      student.name,
      title,
      file.originalname,
      fileHash
    );

    const receipt = await tx.wait();
    const assignmentId = receipt.events[0].args.assignmentId.toNumber();

    // Save to database
    const assignment = new Assignment({
      blockchainId: assignmentId,
      student: student._id,
      studentName: student.name,
      title,
      filename: file.filename,
      originalFilename: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      filePath: file.path,
      fileHash,
      blockchainTxHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toNumber(),
      status: 'confirmed'
    });

    await assignment.save();

    await logAuditEvent(
      student._id,
      'Assignment Submitted',
      `${title} - Hash: ${fileHash.substring(0, 16)}...`,
      req.ip
    );

    res.json({
      success: true,
      assignment: {
        id: assignment._id,
        blockchainId: assignmentId,
        title,
        hash: fileHash,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      }
    });

  } catch (error) {
    console.error('Assignment submission error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (error.message.includes('revert')) {
      res.status(400).json({ error: 'Blockchain transaction failed: ' + error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Verify assignment
app.post('/api/assignments/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { lecturerId } = req.body;

    const lecturer = await User.findById(lecturerId);
    if (!lecturer || !['lecturer', 'admin'].includes(lecturer.role)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get data from blockchain
    const blockchainData = await contract.verifyAssignment(assignment.blockchainId);
    
    if (!blockchainData.exists) {
      return res.status(404).json({ error: 'Assignment not found on blockchain' });
    }

    const isValid = blockchainData.fileHash === assignment.fileHash;

    // Add verification attempt
    await assignment.addVerificationAttempt(
      lecturer._id,
      isValid ? 'success' : 'failed',
      blockchainData.fileHash,
      assignment.fileHash
    );

    await logAuditEvent(
      lecturer._id,
      'Assignment Verified',
      `Verification ${isValid ? 'successful' : 'failed'} for ${assignment.title}`,
      req.ip
    );

    res.json({
      success: true,
      verification: {
        isValid,
        blockchainHash: blockchainData.fileHash,
        storedHash: assignment.fileHash,
        student: blockchainData.student,
        timestamp: new Date(blockchainData.timestamp * 1000)
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grade assignment
app.post('/api/assignments/:id/grade', async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, feedback, lecturerId } = req.body;

    const lecturer = await User.findById(lecturerId);
    if (!lecturer || !['lecturer', 'admin'].includes(lecturer.role)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.isGraded) {
      return res.status(400).json({ error: 'Assignment already graded' });
    }

    // Grade on blockchain
    const tx = await contract.gradeAssignment(assignment.blockchainId, grade, feedback);
    await tx.wait();

    // Update database
    assignment.isGraded = true;
    assignment.grade = grade;
    assignment.feedback = feedback;
    assignment.gradedBy = lecturer._id;
    assignment.gradedAt = new Date();
    assignment.status = 'graded';

    await assignment.save();

    await logAuditEvent(
      lecturer._id,
      'Assignment Graded',
      `${assignment.title} graded: ${grade}%`,
      req.ip
    );

    res.json({
      success: true,
      assignment: {
        id: assignment._id,
        grade,
        feedback,
        gradedBy: lecturer.name,
        gradedAt: assignment.gradedAt
      }
    });

  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user assignments
app.get('/api/assignments/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const assignments = await Assignment.getStudentAssignments(userId);
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all assignments (admin/lecturer)
app.get('/api/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('student', 'name username')
      .populate('gradedBy', 'name username')
      .sort({ submittedAt: -1 });
    
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit trail
app.get('/api/audit', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find()
      .populate('user', 'name username')
      .sort({ timestamp: -1 })
      .limit(1000);
    
    res.json({ success: true, auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve frontend
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Contract: ${process.env.CONTRACT_ADDRESS}`);
});