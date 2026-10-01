
```
IncluEd
├─ .claude
│  └─ settings.json
├─ AGENTS.md
├─ app
│  ├─ (app)
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
│  │  ├─ explore.tsx
│  │  ├─ guidance
│  │  │  ├─ message
│  │  │  │  └─ [id].tsx
│  │  │  ├─ messages.tsx
│  │  │  ├─ student
│  │  │  │  └─ [id].tsx
│  │  │  └─ students.tsx
│  │  ├─ guidance-dashboard.tsx
│  │  ├─ join.tsx
│  │  ├─ messages.tsx
│  │  ├─ my-classes.tsx
│  │  ├─ my-sessions.tsx
│  │  ├─ notifications.tsx
│  │  ├─ profile.tsx
│  │  ├─ quick-talk.tsx
│  │  ├─ schedule.tsx
│  │  ├─ settings.tsx
│  │  ├─ sis.tsx
│  │  ├─ student.tsx
│  │  ├─ teacher.tsx
│  │  ├─ tts.tsx
│  │  └─ _layout.tsx
│  ├─ class
│  │  └─ [id].tsx
│  ├─ index.tsx
│  ├─ index.tsx.bak
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
│     ├─ favicon.png
│     ├─ icon.png
│     ├─ partial-react-logo.png
│     ├─ react-logo.png
│     ├─ react-logo@2x.png
│     ├─ react-logo@3x.png
│     └─ splash-icon.png
├─ CLAUDE.md
├─ components
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
│  ├─ ClassPulse.tsx
│  ├─ common
│  │  ├─ ScreenContainer.tsx
│  │  └─ ToastConfig.tsx
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
│  └─ useQuickTalkSpeech.ts
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
│  │  ├─ announcementController.js
│  │  ├─ authController.js
│  │  ├─ basicInfoController.js
│  │  ├─ belongingController.js
│  │  ├─ belongingOverviewController.js
│  │  ├─ breakController.js
│  │  ├─ checkinController.js
│  │  ├─ classController.js
│  │  ├─ classPulseController.js
│  │  ├─ documentController.js
│  │  ├─ guidanceController.js
│  │  ├─ messageController.js
│  │  ├─ notificationController.js
│  │  ├─ profileController.js
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
│  │  ├─ announcementModel.js
│  │  ├─ basicInfoModel.js
│  │  ├─ belongingModel.js
│  │  ├─ belongingOverviewModel.js
│  │  ├─ breakModel.js
│  │  ├─ Checkin.js
│  │  ├─ classModel.js
│  │  ├─ ClassPulse.js
│  │  ├─ Document.js
│  │  ├─ guidanceModel.js
│  │  ├─ messageModel.js
│  │  ├─ MotorSettings.js
│  │  ├─ notificationModel.js
│  │  ├─ PeerShare.js
│  │  ├─ PresenceTap.js
│  │  ├─ profileModel.js
│  │  ├─ ScheduleItem.js
│  │  ├─ SensorySettings.js
│  │  ├─ sessionModel.js
│  │  ├─ sisModel.js
│  │  └─ transcriptModel.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ accessibilityProfile.js
│  │  ├─ announcement.js
│  │  ├─ auth.js
│  │  ├─ basicInfo.js
│  │  ├─ breakRoutes.js
│  │  ├─ checkinRoutes.js
│  │  ├─ classPulseRoutes.js
│  │  ├─ classRoutes.js
│  │  ├─ documentRoutes.js
│  │  ├─ guidance.js
│  │  ├─ message.js
│  │  ├─ notification.js
│  │  ├─ profile.js
│  │  ├─ scheduleRoutes.js
│  │  ├─ sensoryRoutes.js
│  │  ├─ session.js
│  │  ├─ sis.js
│  │  ├─ transcribe.js
│  │  └─ transcript.js
│  ├─ services
│  │  ├─ documentTextService.js
│  │  ├─ notificationService.js
│  │  └─ scheduleReminderService.js
│  ├─ sockets
│  │  ├─ captionSocket.js
│  │  └─ notificationSocket.js
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
│  ├─ checkinApi.ts
│  ├─ crossAlert.ts
│  ├─ documentApi.ts
│  ├─ liveApi.ts
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