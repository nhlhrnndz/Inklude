// utils/notificationRouter.ts
//
// ONE place that decides where a notification goes when tapped.
// Returns an app route, or null when the notification has no screen of its
// own (the notifications list then just expands it to show the full text).
//
// A notification's destination is its sourceType + sourceId:
//   class                -> /class/:id            (teacher + accommodation -> Requests tab)
//   session              -> /session/:id
//   appointment          -> /guidance/appointments
//   message_thread       -> student: /messages, guidance: /guidance/message/:id
//   schedule_item        -> /schedule (that exact item highlighted)
//   class_post           -> /schedule (the exam/assignment highlighted)
//   accessibility_report -> student: /my-reports, guidance: /guidance/accessibility-reports
//   campus_event         -> /events (that event highlighted)
//   sis                  -> /sis
//   support_referral     -> teacher: /referrals (Guidance -> teacher referrals),
//                           guidance/admin: /guidance-dashboard
//   teacher_referral     -> teacher: /my-students (status of referrals they sent),
//                           guidance/admin: /guidance/teacher-referrals

export type NotificationLike = {
  type: string;
  sourceType: string | null;
  sourceId: number | null;
};

const isAccommodation = (type: string) =>
  type === "accommodation_request" || type === "accommodation_response";

export function resolveNotificationRoute(
  n: NotificationLike,
  role?: string | null,
): string | null {
  const id = n.sourceId;

  // Type-based (older notifications that carry no useful sourceType)
  if (n.sourceType === "sis" || n.type === "sis_reminder") return "/sis";
  if (n.type === "checkin" || n.type === "checkin_reply") return "/checkins";

  switch (n.sourceType) {
    case "class": {
      if (!id) return "/my-classes";
      const teacherRequests = role === "teacher" && isAccommodation(n.type);
      return teacherRequests ? `/class/${id}?tab=support` : `/class/${id}`;
    }

    case "session":
      return id ? `/session/${id}` : null;

    case "appointment":
      return id
        ? `/guidance/appointments?highlight=${id}`
        : "/guidance/appointments";

    case "message_thread":
      if (role === "guidance" || role === "admin") {
        return id ? `/guidance/message/${id}` : "/guidance/messages";
      }
      return "/messages";

    case "schedule_item":
      return id ? `/schedule?highlight=${id}` : "/schedule";

    case "class_post":
      return id
        ? `/schedule?sourceType=class_post&sourceId=${id}`
        : "/schedule";

    case "accessibility_report":
      if (role === "guidance" || role === "admin") {
        return id
          ? `/guidance/accessibility-reports?highlight=${id}`
          : "/guidance/accessibility-reports";
      }
      return id ? `/my-reports?highlight=${id}` : "/my-reports";

    case "campus_event":
      return id ? `/events?highlight=${id}` : "/events";

    // Guidance -> teacher referrals (and the teacher's replies to Guidance)
    case "support_referral":
      if (role === "teacher") return "/referrals";
      if (role === "guidance" || role === "admin") return "/guidance-dashboard";
      return null;

    // Teacher -> Guidance referrals
    case "teacher_referral":
      if (role === "teacher") return "/my-students";
      if (role === "guidance" || role === "admin") {
        return "/guidance/teacher-referrals";
      }
      return null;

    default:
      return null;
  }
}

// Short label for the "arrow" chip on a notification card.
export function getNotificationActionLabel(
  n: NotificationLike,
  role?: string | null,
): string | null {
  if (!resolveNotificationRoute(n, role)) return null;

  if (n.sourceType === "sis" || n.type === "sis_reminder") return "Open SIS";
  if (n.type === "checkin" || n.type === "checkin_reply")
    return "Open check-ins";

  switch (n.sourceType) {
    case "class":
    case "session":
      return "Open class";
    case "appointment":
      return "Open appointment";
    case "message_thread":
      return "Open messages";
    case "schedule_item":
    case "class_post":
      return "Open schedule";
    case "accessibility_report":
      return "Open report";
    case "campus_event":
      return "Open event";
    case "support_referral":
    case "teacher_referral":
      return "Open referral";
    default:
      return null;
  }
}
