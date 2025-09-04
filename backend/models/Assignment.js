const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  blockchainId: {
    type: Number,
    required: true,
    unique: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true,
    unique: true
  },
  blockchainTxHash: {
    type: String,
    required: true
  },
  blockNumber: {
    type: Number,
    required: false
  },
  gasUsed: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'submitted', 'graded', 'rejected'],
    default: 'pending'
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  grade: {
    type: Number,
    min: 0,
    max: 100,
    required: false
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  gradedAt: {
    type: Date,
    required: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  verificationAttempts: [{
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    result: {
      type: String,
      enum: ['success', 'failed'],
      required: true
    },
    blockchainHash: String,
    storedHash: String
  }],
  metadata: {
    ipfsHash: String,
    encryptionKey: String,
    tags: [String],
    category: String,
    dueDate: Date,
    courseId: String,
    assignmentType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
assignmentSchema.index({ student: 1, submittedAt: -1 });
assignmentSchema.index({ fileHash: 1 });
assignmentSchema.index({ blockchainTxHash: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ isGraded: 1 });

// Update updatedAt field before saving
assignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for assignment age
assignmentSchema.virtual('age').get(function() {
  return Date.now() - this.submittedAt;
});

// Method to add verification attempt
assignmentSchema.methods.addVerificationAttempt = function(verifiedBy, result, blockchainHash, storedHash) {
  this.verificationAttempts.push({
    verifiedBy,
    result,
    blockchainHash,
    storedHash
  });
  return this.save();
};

// Static method to find duplicates
assignmentSchema.statics.findByHash = function(fileHash) {
  return this.findOne({ fileHash });
};

// Static method to get student assignments
assignmentSchema.statics.getStudentAssignments = function(studentId) {
  return this.find({ student: studentId })
    .sort({ submittedAt: -1 })
    .populate('gradedBy', 'name username');
};

module.exports = mongoose.model('Assignment', assignmentSchema);