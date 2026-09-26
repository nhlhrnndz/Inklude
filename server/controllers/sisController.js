//sisController.js
const {
  getSISByUserId,
  createSIS,
  updateSIS,
  getAllStudentSIS,
  getStudentSISByUserId,
  markSISRemindersRead,
  hasUnreadSISReminder,
} = require("../models/sisModel");

const { getBasicInfoByUserId } = require("../models/basicInfoModel");

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
    learningCommunicationPreferences: row.learning_communication_preferences,
    additionalSupportNotes: row.additional_support_notes,

    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBasicInfo(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    yearLevel: row.year_level,
    age: row.age,
    dateOfBirth: row.date_of_birth,
    course: row.course,
    section: row.section,
    updatedAt: row.updated_at,
  };
}

// Basic Information is the single source of truth for Year Level, Course,
// Section, and Date of Birth. Whenever it exists, it overrides whatever is
// stored on the SIS record so the two forms can never drift apart.
function applyBasicInfoOverride(sis, basicInfo) {
  if (!sis || !basicInfo) {
    return sis;
  }

  return {
    ...sis,
    dateOfBirth: basicInfo.dateOfBirth ?? sis.dateOfBirth,
    programCourse: basicInfo.course ?? sis.programCourse,
    yearLevel: basicInfo.yearLevel ?? sis.yearLevel,
    sectionBlock: basicInfo.section ?? sis.sectionBlock,
  };
}

function validateSISData(data) {
  if (!data || typeof data !== "object") {
    return "SIS data is required.";
  }

  if (
    data.status &&
    !["not_started", "in_progress", "completed"].includes(data.status)
  ) {
    return "Invalid SIS status.";
  }

  // Full name is only mandatory once the student marks the SIS as completed.
  // Saving progress (in_progress) should accept partial data.
  if (
    data.status === "completed" &&
    (!data.fullName || !String(data.fullName).trim())
  ) {
    return "Full name is required to complete the SIS.";
  }

  return null;
}

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

async function getMySIS(req, res) {
  try {
    const userId = req.user.id;

    const [sisRow, basicInfoRow] = await Promise.all([
      getSISByUserId(userId),
      getBasicInfoByUserId(userId),
    ]);

    const basicInfo = mapBasicInfo(basicInfoRow);

    if (!sisRow) {
      return res.json({
        sis: null,
        status: "not_started",
        basicInfo,
      });
    }

    const mergedSIS = applyBasicInfoOverride(mapSIS(sisRow), basicInfo);

    res.json({
      sis: mergedSIS,
      status: sisRow.status,
      basicInfo,
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
    const basicInfoRow = await getBasicInfoByUserId(userId);
    const basicInfo = mapBasicInfo(basicInfoRow);

    const data = {
      ...req.body,
      status: req.body.status || "in_progress",
    };

    // Basic Information always wins for these fields so the two forms
    // never disagree, regardless of what the client sent.
    if (basicInfo) {
      data.dateOfBirth = basicInfo.dateOfBirth ?? data.dateOfBirth;
      data.programCourse = basicInfo.course ?? data.programCourse;
      data.yearLevel = basicInfo.yearLevel ?? data.yearLevel;
      data.sectionBlock = basicInfo.section ?? data.sectionBlock;
    }

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
      sis: applyBasicInfoOverride(mapSIS(sis), basicInfo),
      status: sis.status,
      basicInfo,
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

    const rows = await getAllStudentSIS(status || null, search || null);

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

    const [sisRow, basicInfoRow] = await Promise.all([
      getStudentSISByUserId(studentId),
      getBasicInfoByUserId(studentId),
    ]);

    const basicInfo = mapBasicInfo(basicInfoRow);

    if (!sisRow) {
      return res.json({
        sis: null,
        status: "not_started",
        basicInfo,
      });
    }

    res.json({
      sis: applyBasicInfoOverride(mapSIS(sisRow), basicInfo),
      status: sisRow.status,
      basicInfo,
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
