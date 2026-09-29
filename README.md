
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
│  │  ├─ change-password.tsx
│  │  ├─ checkins.tsx
│  │  ├─ create-session.tsx
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
├─ backend
│  ├─ db.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  └─ auth.js
│  └─ server.js
├─ CLAUDE.md
├─ components
│  ├─ auth
│  │  ├─ AuthFooter.tsx
│  │  ├─ AuthHeader.tsx
│  │  ├─ AuthInput.tsx
│  │  ├─ PasswordInput.tsx
│  │  └─ PrimaryButton.tsx
│  ├─ BreakButton.tsx
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
│  ├─ SensorySettingsSection.tsx
│  ├─ SensorySync.tsx
│  ├─ SessionDocuments.tsx
│  ├─ SessionRoster.tsx
│  ├─ themed-text.tsx
│  ├─ themed-view.tsx
│  ├─ ui
│  │  ├─ collapsible.tsx
│  │  ├─ icon-symbol.ios.tsx
│  │  └─ icon-symbol.tsx
│  └─ WhatsActiveBanner.tsx
├─ constants
│  ├─ config.ts
│  ├─ courses.ts
│  ├─ featureInfo.ts
│  ├─ featureMap.ts
│  ├─ sensoryTheme.ts
│  └─ theme.ts
├─ context
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
│  ├─ useDashboardHome.ts
│  ├─ useDocumentReader.ts
│  ├─ useFeatures.ts
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
│  │  ├─ announcementController.js
│  │  ├─ authController.js
│  │  ├─ basicInfoController.js
│  │  ├─ breakController.js
│  │  ├─ checkinController.js
│  │  ├─ classPulseController.js
│  │  ├─ documentController.js
│  │  ├─ guidanceController.js
│  │  ├─ messageController.js
│  │  ├─ notificationController.js
│  │  ├─ profileController.js
│  │  ├─ scheduleController.js
│  │  ├─ sensoryController.js
│  │  ├─ sensoryRoutes.js
│  │  ├─ sessionController.js
│  │  ├─ sisController.js
│  │  ├─ transcribeController.js
│  │  └─ transcriptController.js
│  ├─ index.js
│  ├─ middleware
│  │  └─ authMiddleware.js
│  ├─ models
│  │  ├─ announcementModel.js
│  │  ├─ basicInfoModel.js
│  │  ├─ breakModel.js
│  │  ├─ Checkin.js
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
│  │  ├─ announcement.js
│  │  ├─ auth.js
│  │  ├─ basicInfo.js
│  │  ├─ checkinRoutes.js
│  │  ├─ classPulseRoutes.js
│  │  ├─ documentRoutes.js
│  │  ├─ guidance.js
│  │  ├─ message.js
│  │  ├─ notification.js
│  │  ├─ profile.js
│  │  ├─ scheduleRoutes.js
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
│     └─ ioRegistry.js
├─ theme
│  ├─ colors.ts
│  ├─ radius.ts
│  ├─ spacing.ts
│  └─ typography.ts
├─ tsconfig.json
└─ utils
   ├─ api.ts
   ├─ checkinApi.ts
   ├─ crossAlert.ts
   ├─ documentApi.ts
   ├─ liveApi.ts
   ├─ scheduleApi.ts
   ├─ sensoryApi.ts
   ├─ socket.ts
   ├─ speakPrompt.ts
   ├─ stt.ts
   └─ validators
      └─ auth.ts

```