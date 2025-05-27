const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Generate a new report
router.post('/generate', async (req, res) => {
  try {
    const { courseId, startDate, endDate, format } = req.body;
    const lecturerId = req.body.lecturerId;

    // Validate course and lecturer
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.lecturerId.toString() !== lecturerId) {
      return res.status(403).json({ message: 'Unauthorized to generate report for this course' });
    }

    // Get all attendance records for the course within date range
    const attendanceRecords = await Attendance.find({
      courseId,
      generatedAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('scannedBy.studentId', 'firstName lastName idNumber');

    // Get all students enrolled in the course
    const students = await User.find({
      _id: { $in: course.enrolledStudents },
      role: 'student'
    });

    // Calculate statistics for each student
    const studentStats = students.map(student => {
      const stats = {
        studentId: student._id,
        fullName: `${student.firstName} ${student.lastName}`,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        sessions: []
      };

      attendanceRecords.forEach(record => {
        const studentScan = record.scannedBy.find(
          scan => scan.studentId._id.toString() === student._id.toString()
        );

        const sessionInfo = {
          date: record.generatedAt,
          status: 'absent',
          location: record.location
        };

        if (studentScan) {
          // Calculate if student was late (e.g., 15 minutes threshold)
          const scanTime = new Date(studentScan.scannedAt);
          const classTime = new Date(record.generatedAt);
          const timeDiff = (scanTime - classTime) / (1000 * 60); // difference in minutes

          if (timeDiff <= 15) {
            stats.totalPresent++;
            sessionInfo.status = 'present';
          } else {
            stats.totalLate++;
            sessionInfo.status = 'late';
          }
        } else {
          stats.totalAbsent++;
        }

        stats.sessions.push(sessionInfo);
      });

      const totalSessions = attendanceRecords.length;
      stats.attendancePercentage = totalSessions > 0
        ? ((stats.totalPresent + stats.totalLate) / totalSessions) * 100
        : 0;

      return stats;
    });

    // Create the report
    const report = new Report({
      courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      lecturerId,
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      attendanceSummary: {
        totalSessions: attendanceRecords.length,
        studentStats
      },
      format
    });

    await report.save();

    res.json({
      message: 'Report generated successfully',
      reportId: report._id
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reports for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const reports = await Report.find({ courseId })
      .sort({ generatedDate: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific report
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ generatedDate: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
