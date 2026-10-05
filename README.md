
```
IncluEd
├─ .claude
│  └─ settings.json
├─ AGENTS.md
├─ app
│  ├─ (app)
│  │  ├─ accessibility-map.tsx
│  │  ├─ accessibility.tsx
│  │  ├─ announcements.tsx
│  │  ├─ basic-info.tsx
│  │  ├─ belonging.tsx
│  │  ├─ change-password.tsx
│  │  ├─ checkins.tsx
│  │  ├─ create-session.tsx
│  │  ├─ display-name.tsx
│  │  ├─ documents.tsx
│  │  ├─ edit-profile.tsx
│  │  ├─ events.tsx
│  │  ├─ explore.tsx
│  │  ├─ guidance
│  │  │  ├─ accessibility-reports.tsx
│  │  │  ├─ appointments.tsx
│  │  │  ├─ message
│  │  │  │  └─ [id].tsx
│  │  │  ├─ messages.tsx
│  │  │  ├─ reports.tsx
│  │  │  ├─ student
│  │  │  │  └─ [id].tsx
│  │  │  └─ students.tsx
│  │  ├─ guidance-dashboard.tsx
│  │  ├─ guidance-hub.tsx
│  │  ├─ join.tsx
│  │  ├─ messages.tsx
│  │  ├─ my-classes.tsx
│  │  ├─ my-reports.tsx
│  │  ├─ my-sessions.tsx
│  │  ├─ notifications.tsx
│  │  ├─ profile.tsx
│  │  ├─ quick-talk.tsx
│  │  ├─ referrals.tsx
│  │  ├─ report-issue.tsx
│  │  ├─ schedule.tsx
│  │  ├─ settings.tsx
│  │  ├─ sis.tsx
│  │  ├─ student.tsx
│  │  ├─ teacher.tsx
│  │  ├─ tts.tsx
│  │  └─ _layout.tsx
│  ├─ class
│  │  └─ [id].tsx
│  ├─ class-calendar
│  │  └─ [id].tsx
│  ├─ index.tsx
│  ├─ index.tsx.bak
│  ├─ index.web.tsx
│  ├─ login.tsx
│  ├─ modal.tsx
│  ├─ reader
│  │  └─ [docId].tsx
│  ├─ register.tsx
│  ├─ role-select.tsx
│  ├─ session
│  │  └─ [id]
│  │     ├─ index.tsx
│  │     ├─ live.tsx
│  │     └─ summary.tsx
│  ├─ staff-login.tsx
│  ├─ staff-register.tsx
│  ├─ support-needs.tsx
│  ├─ viewboard
│  │  └─ [id].tsx
│  └─ _layout.tsx
├─ app.json
├─ assets
│  ├─ fonts
│  │  ├─ AtkinsonHyperlegible-Bold.ttf
│  │  ├─ AtkinsonHyperlegible-BoldItalic.ttf
│  │  ├─ AtkinsonHyperlegible-Italic.ttf
│  │  └─ AtkinsonHyperlegible-Regular.ttf
│  └─ images
│     ├─ campus-map.jpg
│     ├─ favicon.png
│     ├─ icon.png
│     ├─ partial-react-logo.png
│     ├─ react-logo.png
│     ├─ react-logo@2x.png
│     ├─ react-logo@3x.png
│     └─ splash-icon.png
├─ CLAUDE.md
├─ components
│  ├─ AddReminderForm.tsx
│  ├─ appointments
│  │  └─ SlotPicker.tsx
│  ├─ AskTeacherPanel.tsx
│  ├─ auth
│  │  ├─ AuthFooter.tsx
│  │  ├─ AuthHeader.tsx
│  │  ├─ AuthInput.tsx
│  │  ├─ PasswordInput.tsx
│  │  └─ PrimaryButton.tsx
│  ├─ BelongingSection.tsx
│  ├─ BreakButton.tsx
│  ├─ ClassCard.tsx
│  ├─ ClassExperienceInsights.tsx
│  ├─ ClassPulse.tsx
│  ├─ common
│  │  ├─ ScreenContainer.tsx
│  │  └─ ToastConfig.tsx
│  ├─ DateTimePicker.tsx
│  ├─ external-link.tsx
│  ├─ haptic-tab.tsx
│  ├─ hello-wave.tsx
│  ├─ navigation
│  │  └─ Sidebar.tsx
│  ├─ notifications
│  │  └─ NotificationBell.tsx
│  ├─ parallax-scroll-view.tsx
│  ├─ ReachOutModal.tsx
│  ├─ SensorySettingsSection.tsx
│  ├─ SensorySync.tsx
│  ├─ SessionDocuments.tsx
│  ├─ SessionRoster.tsx
│  ├─ SupportReferralModal.tsx
│  ├─ TeacherSignalToast.tsx
│  ├─ themed-text.tsx
│  ├─ themed-view.tsx
│  ├─ ui
│  │  ├─ collapsible.tsx
│  │  ├─ icon-symbol.ios.tsx
│  │  └─ icon-symbol.tsx
│  └─ WhatsActiveBanner.tsx
├─ constants
│  ├─ a11yTheme.ts
│  ├─ config.ts
│  ├─ courses.ts
│  ├─ featureInfo.ts
│  ├─ featureMap.ts
│  ├─ sensoryTheme.ts
│  ├─ supportNeedsPresets.ts
│  └─ theme.ts
├─ context
│  ├─ AccessibilityContext.tsx
│  ├─ AuthContext.tsx
│  ├─ NotificationContext.tsx
│  └─ ThemeContext.tsx
├─ eslint.config.js
├─ hooks
│  ├─ use-color-scheme.ts
│  ├─ use-color-scheme.web.ts
│  ├─ use-theme-color.ts
│  ├─ useAuth.ts
│  ├─ useCaptionSession.ts
│  ├─ useClassroomSignals.ts
│  ├─ useDashboardHome.ts
│  ├─ useDocumentReader.ts
│  ├─ useFeatures.ts
│  ├─ useLiveRefresh.ts
│  ├─ useMicCaptioning.ts
│  ├─ useQuickTalkListener.ts
│  ├─ useQuickTalkSpeech.ts
│  └─ useWantsLiveCaptions.ts
├─ inclued_backup.sql
├─ metro.config.js
├─ package-lock.json
├─ package.json
├─ README.md
├─ scripts
│  └─ reset-project.js
├─ server
│  ├─ config
│  │  └─ db.js
│  ├─ controllers
│  │  ├─ accessibilityProfileController.js
│  │  ├─ accommodationController.js
│  │  ├─ announcementController.js
│  │  ├─ appointmentController.js
│  │  ├─ authController.js
│  │  ├─ basicInfoController.js
│  │  ├─ belongingController.js
│  │  ├─ belongingOverviewController.js
│  │  ├─ breakController.js
│  │  ├─ checkinController.js
│  │  ├─ classController.js
│  │  ├─ classPulseController.js
│  │  ├─ documentController.js
│  │  ├─ eventController.js
│  │  ├─ followupController.js
│  │  ├─ guidanceController.js
│  │  ├─ guidanceReportController.js
│  │  ├─ mapController.js
│  │  ├─ messageController.js
│  │  ├─ notificationController.js
│  │  ├─ profileController.js
│  │  ├─ referralController.js
│  │  ├─ reportController.js
│  │  ├─ scheduleController.js
│  │  ├─ sensoryController.js
│  │  ├─ sessionController.js
│  │  ├─ sisController.js
│  │  ├─ transcribeController.js
│  │  └─ transcriptController.js
│  ├─ index.js
│  ├─ middleware
│  │  └─ authMiddleware.js
│  ├─ models
│  │  ├─ accessibilityProfileModel.js
│  │  ├─ accessibilityReportModel.js
│  │  ├─ accommodationModel.js
│  │  ├─ announcementModel.js
│  │  ├─ appointmentModel.js
│  │  ├─ basicInfoModel.js
│  │  ├─ belongingModel.js
│  │  ├─ belongingOverviewModel.js
│  │  ├─ breakModel.js
│  │  ├─ campusEventModel.js
│  │  ├─ Checkin.js
│  │  ├─ classModel.js
│  │  ├─ classPostModel.js
│  │  ├─ ClassPulse.js
│  │  ├─ Document.js
│  │  ├─ followupModel.js
│  │  ├─ guidanceModel.js
│  │  ├─ guidanceReportModel.js
│  │  ├─ mapModel.js
│  │  ├─ messageModel.js
│  │  ├─ MotorSettings.js
│  │  ├─ needsHelpModel.js
│  │  ├─ notificationModel.js
│  │  ├─ PeerShare.js
│  │  ├─ PresenceTap.js
│  │  ├─ profileModel.js
│  │  ├─ referralModel.js
│  │  ├─ ScheduleItem.js
│  │  ├─ SensorySettings.js
│  │  ├─ sessionModel.js
│  │  ├─ sisModel.js
│  │  └─ transcriptModel.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ accessibilityProfile.js
│  │  ├─ accommodationRoutes.js
│  │  ├─ announcement.js
│  │  ├─ appointments.js
│  │  ├─ auth.js
│  │  ├─ basicInfo.js
│  │  ├─ breakRoutes.js
│  │  ├─ checkinRoutes.js
│  │  ├─ classPulseRoutes.js
│  │  ├─ classRoutes.js
│  │  ├─ documentRoutes.js
│  │  ├─ events.js
│  │  ├─ guidance.js
│  │  ├─ map.js
│  │  ├─ message.js
│  │  ├─ notification.js
│  │  ├─ profile.js
│  │  ├─ referrals.js
│  │  ├─ reports.js
│  │  ├─ scheduleRoutes.js
│  │  ├─ sensoryRoutes.js
│  │  ├─ session.js
│  │  ├─ sis.js
│  │  ├─ transcribe.js
│  │  └─ transcript.js
│  ├─ services
│  │  ├─ calendarSyncService.js
│  │  ├─ documentTextService.js
│  │  ├─ notificationService.js
│  │  └─ scheduleReminderService.js
│  ├─ sockets
│  │  ├─ captionSocket.js
│  │  └─ notificationSocket.js
│  ├─ uploads
│  │  ├─ map
│  │  │  ├─ 1791121198410-aca2b003fe45a73c.jpg
│  │  │  ├─ 1791121499074-02b5e668c7ab80ed.jpg
│  │  │  ├─ 1791184301731-be4601fdf7e2a45e.jpg
│  │  │  ├─ 1791184506364-56a0640c3cbc46d1.jpg
│  │  │  ├─ 1791184797130-3e3b254604a18f4f.jpg
│  │  │  ├─ 1791185052530-daab111b931d57ca.jpg
│  │  │  ├─ 1791185174155-0f26a29a1f4d7c72.jpg
│  │  │  ├─ 1791185329504-fc158bbfe3b2511b.jpg
│  │  │  ├─ 1791185424857-d9ab98a17c006cf4.jpg
│  │  │  ├─ 1791185541601-3748771b076388ca.jpg
│  │  │  ├─ 1791185652472-2e6f1984bd4b6111.jpg
│  │  │  ├─ 1791185717611-e09178a93f76ce90.jpg
│  │  │  ├─ 1791185786391-2bec470d19d1463a.jpg
│  │  │  ├─ 1791185854349-1ce5bbf6651fcb3b.jpg
│  │  │  └─ 1791186050744-c85086f26c0c5f0b.jpg
│  │  └─ reports
│  │     └─ 1791097800961-73e6932e4b924c42.jpg
│  └─ utils
│     ├─ generateSessionReport.js
│     └─ ioRegistry.js
├─ theme
│  ├─ colors.ts
│  ├─ radius.ts
│  ├─ spacing.ts
│  └─ typography.ts
├─ tsconfig.json
├─ utils
│  ├─ accessibilityApi.ts
│  ├─ api.ts
│  ├─ belongingApi.ts
│  ├─ campusApi.ts
│  ├─ checkinApi.ts
│  ├─ classSchedule.ts
│  ├─ crossAlert.ts
│  ├─ documentApi.ts
│  ├─ guidanceDashboardApi.ts
│  ├─ guidanceReportApi.ts
│  ├─ liveApi.ts
│  ├─ notificationRouter.ts
│  ├─ reportApi.ts
│  ├─ reportPdf.ts
│  ├─ scheduleApi.ts
│  ├─ sensoryApi.ts
│  ├─ socket.ts
│  ├─ speakPrompt.ts
│  ├─ stt.ts
│  └─ validators
│     └─ auth.ts
└─ _backend_frozen
   ├─ db.js
   ├─ FROZEN.md
   ├─ package-lock.json
   ├─ package.json
   ├─ routes
   │  └─ auth.js
   └─ server.js

```