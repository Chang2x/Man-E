const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  courseCode: {
    type: String,
    required: true
  },
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedDate: {
    type: Date,
    default: Date.now
  },
  dateRange: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  attendanceSummary: {
    totalSessions: {
      type: Number,
      required: true
    },
    studentStats: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      fullName: String,
      totalPresent: Number,
      totalAbsent: Number,
      totalLate: Number,
      attendancePercentage: Number,
      sessions: [{
        date: Date,
        status: {
          type: String,
          enum: ['present', 'absent', 'late']
        },
        location: {
          coordinates: {
            latitude: Number,
            longitude: Number
          },
          address: String
        },
        photoProof: String // URL to the photo if applicable
      }]
    }]
  },
  format: {
    type: String,
    enum: ['pdf', 'csv'],
    required: true
  }
});

// Add indexes for better query performance
reportSchema.index({ courseId: 1, generatedDate: -1 });
reportSchema.index({ lecturerId: 1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
