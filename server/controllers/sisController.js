const {
  getSISByUserId,
  createSIS,
  updateSIS,
  getAllStudentSIS,
  getStudentSISByUserId,
  markSISRemindersRead,
  hasUnreadSISReminder,
} = require("../models/sisModel");

const { notifyUser } = require("../services/notificationService");

function mapSIS(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    studentId: row.student_id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    sex: row.sex,
    civilStatus: row.civil_status,
    nationality: row.nationality,

    email: row.email,
    mobileNumber: row.mobile_number,
    currentAddress: row.current_address,
    permanentAddress: row.permanent_address,

    programCourse: row.program_course,
    yearLevel: row.year_level,
    sectionBlock: row.section_block,
    academicYear: row.academic_year,

    emergencyContactName: row.emergency_contact_name,
    emergencyContactRelationship: row.emergency_contact_relationship,
    emergencyContactNumber: row.emergency_contact_number,
    emergencyContactAddress: row.emergency_contact_address,

    parentGuardianName: row.parent_guardian_name,
    parentGuardianRelationship: row.parent_guardian_relationship,
    parentGuardianContact: row.parent_guardian_contact,
    parentGuardianOccupation: row.parent_guardian_occupation,

    preferredCommunicationMethod: row.preferred_communication_method,
    learningCommunicationPreferences:
      row.learning_communication_preferences,
    additionalSupportNotes: row.additional_support_notes,

    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateSISData(data) {
  if (!data || typeof data !== "object") {
    return "SIS data is required.";
  }

  if (!data.fullName || !String(data.fullName).trim()) {
    return "Full name is required.";
  }

  if (
    data.status &&
    !["not_started", "in_progress", "completed"].includes(data.status)
  ) {
    return "Invalid SIS status.";
  }

  return null;
}

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

async function getMySIS(req, res) {
  try {
    const userId = req.user.id;

    const sis = await getSISByUserId(userId);

    if (!sis) {
      return res.json({
        sis: null,
        status: "not_started",
      });
    }

    res.json({
      sis: mapSIS(sis),
      status: sis.status,
    });
  } catch (err) {
    console.error("getMySIS error:", err);
    res.status(500).json({
      message: "Server error while fetching SIS.",
    });
  }
}

async function saveMySIS(req, res) {
  try {
    const userId = req.user.id;
    const validationError = validateSISData(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existing = await getSISByUserId(userId);

    const data = {
      ...req.body,
      status: req.body.status || "in_progress",
    };

    let sis;

    if (existing) {
      sis = await updateSIS(userId, data);
    } else {
      sis = await createSIS(userId, data);
    }

    if (data.status === "completed") {
      await markSISRemindersRead(userId);
    } else {
      const hasReminder = await hasUnreadSISReminder(userId);

      if (!hasReminder) {
        await notifyUser(userId, {
          type: "sis_reminder",
          title: "Complete your Student Information Sheet",
          body: "Your Student Information Sheet is not yet complete.",
          sourceType: "sis",
          sourceId: sis.id,
          senderId: null,
        });
      }
    }

    res.json({
      message:
        data.status === "completed"
          ? "SIS completed successfully."
          : "SIS saved successfully.",
      sis: mapSIS(sis),
      status: sis.status,
    });
  } catch (err) {
    console.error("saveMySIS error:", err);
    res.status(500).json({
      message: "Server error while saving SIS.",
    });
  }
}

async function getGuidanceSISList(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json({
        message: "Only Guidance personnel can access SIS records.",
      });
    }

    const { status, search } = req.query;

    const rows = await getAllStudentSIS(
      status || null,
      search || null,
    );

    res.json({
      students: rows.map(mapSIS),
    });
  } catch (err) {
    console.error("getGuidanceSISList error:", err);
    res.status(500).json({
      message: "Server error while fetching student SIS records.",
    });
  }
}

async function getGuidanceStudentSIS(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json({
        message: "Only Guidance personnel can access SIS records.",
      });
    }

    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        message: "Invalid student ID.",
      });
    }

    const sis = await getStudentSISByUserId(studentId);

    if (!sis) {
      return res.json({
        sis: null,
        status: "not_started",
      });
    }

    res.json({
      sis: mapSIS(sis),
      status: sis.status,
    });
  } catch (err) {
    console.error("getGuidanceStudentSIS error:", err);
    res.status(500).json({
      message: "Server error while fetching student SIS.",
    });
  }
}

module.exports = {
  getMySIS,
  saveMySIS,
  getGuidanceSISList,
  getGuidanceStudentSIS,
};