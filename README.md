# Friendly

AI 기반 강의 녹음 및 전사, 스마트 일정 관리, PDF 분석, GPA 추적, 학교 인증 커뮤니티 기능을 제공하는 크로스 플랫폼 모바일 애플리케이션입니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [API 문서](#api-문서)
- [데이터베이스 구조](#데이터베이스-구조)
- [개발 가이드](#개발-가이드)
- [배포](#배포)
- [인프라 및 백업](#인프라-및-백업)

## 프로젝트 개요

Friendly는 학생들의 학업 생산성을 향상시키기 위해 설계된 종합적인 모바일 애플리케이션입니다. AI 기술을 활용하여 강의 녹음, 일정 관리, 문서 분석, 성적 추적 등 다양한 기능을 제공합니다.

### 지원 플랫폼

- iOS (네이티브 앱)
- Android (네이티브 앱)
- Web (브라우저)

### 주요 특징

- 실시간 AI 기반 강의 전사 (한국어/영어 지원)
- 이미지 기반 일정 자동 추출 및 관리
- PDF 문서 AI 분석 및 챗봇
- GPA 계산 및 졸업 요건 추적
- 학교 인증 커뮤니티 플랫폼
- Google Calendar 연동

## 주요 기능

### 1. AI 기반 강의 녹음 및 전사

- 실시간 오디오 녹음 및 라이브 전사
- 다국어 지원 (한국어, 영어)
- AI 기반 강의 요약 및 액션 아이템 생성
- 강의별 컨텍스트 인식 챗봇
- 채팅 히스토리 관리

### 2. 스마트 일정 관리

- 이미지 기반 일정 업로드 및 AI 추출
- 드래그 앤 드롭 캘린더 인터페이스
- 일정 항목 편집 및 확인
- 강의 레코드로 자동 변환
- Google Calendar 동기화

### 3. PDF 분석 및 챗봇

- PDF 문서 업로드 및 텍스트 추출
- AI 기반 문서 분석 (전체 문서 및 페이지별)
- PDF 전용 챗봇 (선택 텍스트 컨텍스트 지원)
- PDF 뷰어 및 페이지 네비게이션

### 4. GPA 계산기 및 졸업 요건 추적

- 학기별 과목 관리 및 GPA 계산
- 졸업 요건 문서 업로드 및 AI 분석
- 한국어 학사 문서 지원
- 학점 이수 현황 추적
- AI 기반 수강 과목 추천

### 5. 학교 인증 커뮤니티

- 학교 이메일 인증 시스템
- 이미지 포함 게시글 작성
- 좋아요 및 댓글 기능
- 카테고리 및 대학별 필터링
- 사용자 프로필 관리

### 6. 클래스 관리 시스템

- 클래스 생성 및 조직화
- 과제 추적
- 파일 및 리소스 관리
- 강의 녹음 연결
- 노트 관리

## 기술 스택

### 프론트엔드

**핵심 프레임워크**
- React Native 0.81.5
- Expo SDK 54.0.22
- Expo Router 6.0.14
- TypeScript 5.9.2

**UI 및 스타일링**
- NativeWind 4.2.1 (Tailwind CSS)
- Radix UI (Dialog, Select, Avatar 등)
- Lucide React Native 0.544.0
- Recharts 3.2.1

**상태 관리 및 네비게이션**
- React Context API
- React Navigation 7
- AsyncStorage 2.2.0

**미디어 및 파일 처리**
- Expo Camera 17.0.9
- Expo Image Picker 17.0.8
- Expo Document Picker 14.0.7
- Expo Audio 1.0.14
- PDF.js 4.0.379

**Firebase 통합**
- Firebase 12.4.0 (Authentication, Firestore, Storage)

**Google 서비스**
- Google Sign-In SDK 16.0.0
- Google APIs 164.1.0 (Calendar)

**애니메이션 및 제스처**
- React Native Reanimated 4.1.1
- React Native Gesture Handler 2.28.0
- React Native Draggable FlatList 4.0.3

### 백엔드

**핵심 프레임워크**
- Node.js
- Express.js 5.1.0
- JavaScript (ES6+)

**데이터베이스 및 스토리지**
- Firebase Admin SDK 13.5.0
- Firestore (NoSQL 데이터베이스)
- Firebase Storage (클라우드 파일 스토리지)
- Multer 2.0.2 (파일 업로드)

**AI 및 머신러닝**
- OpenAI API 6.7.0
  - GPT-4o-mini (텍스트 생성)
  - GPT-3.5-turbo (채팅 완성)
  - Whisper API (오디오 전사)
  - Vision API (이미지 분석)

**PDF 처리**
- PDF-Parse 2.4.5

**HTTP 및 네트워킹**
- Axios 1.13.2
- Node-Fetch 3.3.2
- CORS 2.8.5

**개발 도구**
- Nodemon 3.1.10 (개발 자동 재시작)
- PM2 (프로덕션 프로세스 관리)
- Dotenv 17.2.3 (환경 변수 관리)

### 인프라

- Firebase Firestore (NoSQL 데이터베이스)
- Firebase Storage (파일 스토리지)
- Firebase Authentication (사용자 인증)
- Google Calendar API (캘린더 통합)

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Expo CLI
- Firebase 프로젝트 설정
- OpenAI API 키
- Google OAuth 자격 증명 (선택사항)

### 설치

#### 1. 저장소 클론

```bash
git clone <repository-url>
cd friendly
```

#### 2. 백엔드 설정

```bash
cd friendly-backend
npm install
```

환경 변수 설정 (`.env` 파일 생성):

```env
# Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Google Drive Backup Configuration
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_CLIENT_EMAIL=your_service_account_email@project_id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Backup Settings
ENABLE_DRIVE_BACKUP=true

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Feature Flags
ENABLE_LOCAL_UPLOADS=false
```

#### 3. 프론트엔드 설정

```bash
cd friendly-frontend
npm install
```

환경 변수 설정 (`.env` 파일 생성):

```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 실행

#### 백엔드 실행

개발 모드:
```bash
cd friendly-backend
npm run dev
```

프로덕션 모드 (PM2 사용):
```bash
npm run pm2:start
```

백엔드 서버는 `http://localhost:4000`에서 실행됩니다.

#### 프론트엔드 실행

```bash
cd friendly-frontend
npx expo start
```

플랫폼별 실행:
```bash
npm run ios      # iOS 시뮬레이터
npm run android  # Android 에뮬레이터
npm run web      # 웹 브라우저
```

## 프로젝트 구조

### 백엔드 구조

```
friendly-backend/
├── routes/              # API 라우트 핸들러
│   ├── auth.js          # 인증 엔드포인트
│   ├── calendar.js      # Google Calendar 통합
│   ├── classes.js       # 클래스 관리
│   ├── community.js     # 커뮤니티 게시글
│   ├── document.js      # 문서 관리
│   ├── gpa.js           # GPA 계산 및 추적
│   ├── lectures.js      # 강의 녹음 및 전사
│   ├── pdfs.js          # PDF 업로드 및 분석
│   ├── schedules.js     # 일정 관리
│   ├── transcribe.js    # 전사 엔드포인트
│   └── users.js         # 사용자 프로필 관리
├── services/            # 비즈니스 로직 레이어
│   ├── authService.js           # 인증 로직
│   ├── firebaseAdmin.js         # Firebase Admin SDK 초기화
│   ├── firestoreService.js      # Firestore 데이터베이스 작업
│   ├── googleCalendarService.js # Google Calendar API 통합
│   ├── gpaRequirementsService.js # GPA 요건 분석
│   ├── gpaService.js            # GPA 계산 로직
│   ├── lectureService.js       # 강의 전사 및 AI 기능
│   ├── pdfAnalysisService.js    # PDF 분석 (OpenAI)
│   ├── pdfChatService.js       # PDF 챗봇 기능
│   ├── pdfService.js           # PDF 텍스트 추출
│   ├── pdfStorageService.js    # PDF 스토리지 관리
│   └── scheduleService.js      # 일정 AI 분석
├── uploads/             # 파일 업로드 디렉토리
│   ├── audio/          # 오디오 녹음
│   ├── pdfs/           # PDF 파일
│   ├── profiles/       # 프로필 사진
│   ├── schedules/      # 일정 이미지
│   ├── documents/      # 문서 파일
│   └── gpa-requirements/ # GPA 요건 이미지
├── backup/             # 백업 파일 디렉토리
├── logs/                # PM2 로그 파일
│   ├── pm2-error.log   # 에러 로그
│   ├── pm2-out.log     # 출력 로그
│   └── pm2-combined.log # 통합 로그
├── scripts/             # 유틸리티 스크립트
│   ├── backupToDrive.js    # Google Drive 백업
│   └── restoreFromDrive.js # Google Drive 복원
├── src/
│   ├── index.js        # Express 서버 진입점
│   ├── config/         # 설정 파일
│   ├── middlewares/    # 미들웨어
│   ├── jobs/           # 스케줄 작업
│   └── utils/          # 유틸리티 함수
└── ecosystem.config.js # PM2 설정
```

### 프론트엔드 구조

```
friendly-frontend/
├── app/                 # Expo Router 라우트
│   ├── (tabs)/         # 탭 네비게이션 화면
│   │   ├── index.tsx   # GPA 계산기 (홈)
│   │   ├── explore.tsx # 클래스 목록
│   │   ├── community.tsx # 커뮤니티 피드
│   │   └── profile.tsx # 사용자 프로필
│   ├── assignment/     # 과제 화면
│   ├── class/          # 클래스 상세 화면
│   ├── post/           # 게시글 상세 화면
│   ├── auth.tsx       # 인증 플로우
│   ├── login.tsx       # 로그인 화면
│   ├── signup.tsx      # 회원가입 화면
│   ├── onboarding.tsx # 온보딩 플로우
│   ├── record.tsx      # 강의 녹음 화면
│   └── schedule-review.tsx # 일정 검토 화면
├── src/
│   ├── components/     # 재사용 가능한 UI 컴포넌트
│   │   ├── classes/    # 클래스 관련 컴포넌트
│   │   ├── common/     # 공통 UI 컴포넌트
│   │   ├── community/  # 커뮤니티 컴포넌트
│   │   ├── gpa/        # GPA 계산기 컴포넌트
│   │   ├── lecture/    # 강의 컴포넌트
│   │   ├── pdf/        # PDF 뷰어 및 분석
│   │   ├── schedule/   # 일정 컴포넌트
│   │   ├── tutorial/   # 튜토리얼 오버레이
│   │   └── ui/         # 기본 UI 컴포넌트
│   ├── screens/        # 화면 컴포넌트
│   ├── services/       # API 서비스 레이어
│   │   ├── auth/       # 인증 서비스
│   │   ├── calendar/   # Google Calendar 서비스
│   │   ├── classes/    # 클래스 관리
│   │   ├── community/  # 커뮤니티 API 호출
│   │   ├── firestore/  # Firestore 작업
│   │   ├── gpa/        # GPA 서비스
│   │   ├── lecture/    # 강의 서비스
│   │   ├── pdf/        # PDF 서비스
│   │   ├── profile/    # 프로필 관리
│   │   ├── schedule/   # 일정 서비스
│   │   └── tutorial/   # 튜토리얼 서비스
│   ├── context/        # React Context (AppContext)
│   ├── config/         # 설정 파일
│   ├── types/          # TypeScript 타입 정의
│   └── utils/          # 유틸리티 함수
└── assets/             # 이미지 및 정적 자산
```

## API 문서

### 인증 (`/api/auth`)

- `POST /api/auth/signup` - 사용자 회원가입
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/verify` - Firebase 토큰 검증
- `POST /api/auth/google` - Google OAuth 로그인
- `POST /api/auth/signout` - 로그아웃
- `GET /api/auth/user/:uid` - 사용자 정보 조회
- `PATCH /api/auth/user/:uid` - 사용자 정보 수정
- `DELETE /api/auth/user/:uid` - 사용자 삭제

### 강의 (`/api/lectures`)

- `POST /api/lectures` - 강의 생성
- `GET /api/lectures` - 강의 목록 조회 (필터 지원: userId, status, limit, offset)
- `GET /api/lectures/user/:userId` - 사용자 강의 목록 조회
- `GET /api/lectures/:lectureId` - 강의 상세 조회
- `PATCH /api/lectures/:lectureId` - 강의 수정
- `DELETE /api/lectures/:lectureId` - 강의 삭제
- `POST /api/lectures/:lectureId/start-transcribing` - 전사 시작
- `POST /api/lectures/:lectureId/transcribe` - 오디오 전사 (전체)
- `POST /api/lectures/:lectureId/transcribe-chunk` - 실시간 전사 (청크)
- `GET /api/lectures/:lectureId/transcripts` - 전사 버전 목록 조회
- `DELETE /api/lectures/:lectureId/transcript` - 전사 삭제
- `GET /api/lectures/class/:lectureId/recordings` - 클래스 녹음 조회
- `GET /api/lectures/transcription/:transcriptionId/transcript` - 특정 전사 조회
- `POST /api/lectures/transcription/:transcriptionId/summary` - 요약 생성
- `GET /api/lectures/transcription/:transcriptionId/summary` - 요약 조회
- `POST /api/lectures/transcription/:transcriptionId/checklist` - 체크리스트 생성
- `GET /api/lectures/transcription/:transcriptionId/checklist` - 체크리스트 조회
- `PATCH /api/lectures/transcription/:transcriptionId/checklist` - 체크리스트 수정
- `PATCH /api/lectures/transcription/:transcriptionId/checklist/:itemId/toggle` - 체크리스트 항목 토글
- `POST /api/lectures/chat` - 전역 강의 챗봇
- `POST /api/lectures/transcription/:transcriptionId/chat` - 특정 전사 챗봇
- `GET /api/lectures/chat/history` - 채팅 히스토리 조회
- `DELETE /api/lectures/chat/:chatId` - 채팅 메시지 삭제
- `DELETE /api/lectures/chat/history/all` - 전체 채팅 히스토리 삭제

### 일정 (`/api/schedule`)

- `POST /api/schedule/:userId/analyze-image` - 일정 이미지 분석
- `POST /api/schedule` - 일정 저장
- `GET /api/schedule/:userId` - 사용자 일정 조회
- `GET /api/schedule/schedule/:scheduleId` - 일정 상세 조회
- `GET /api/schedule/id/:id` - ID로 일정 조회
- `GET /api/schedule/list/all` - 전체 일정 목록 조회
- `PATCH /api/schedule/schedule/:scheduleId` - 일정 수정
- `DELETE /api/schedule/schedule/:scheduleId` - 일정 삭제
- `POST /api/schedule/schedule/:scheduleId/confirm` - 일정 확인 및 강의 변환

### PDF (`/api/pdfs`)

- `POST /api/pdfs` - PDF 업로드
- `GET /api/pdfs` - PDF 목록 조회
- `GET /api/pdfs/:fileId` - PDF 상세 조회
- `DELETE /api/pdfs/:fileId` - PDF 삭제
- `POST /api/pdfs/:fileId/analyze` - PDF 분석
- `POST /api/pdfs/:fileId/analyze-page/:pageNumber` - 페이지별 분석
- `POST /api/pdfs/:fileId/chat` - PDF 챗봇

### 커뮤니티 (`/api/community`)

- `GET /api/community/verify/:userId` - 학교 인증 상태 확인
- `POST /api/community/verify-school-email` - 학교 이메일 인증
- `POST /api/community/posts` - 게시글 작성
- `GET /api/community/posts` - 게시글 목록 조회 (필터 지원)
- `GET /api/community/posts/:postId` - 게시글 상세 조회
- `PATCH /api/community/posts/:postId` - 게시글 수정
- `DELETE /api/community/posts/:postId` - 게시글 삭제
- `POST /api/community/posts/:postId/like` - 좋아요 토글
- `POST /api/community/posts/:postId/comments` - 댓글 추가

### GPA (`/api/gpa`)

- `GET /api/gpa/:userId` - GPA 데이터 조회
- `POST /api/gpa/:userId` - GPA 데이터 저장
- `POST /api/gpa/:userId/courses` - 과목 추가
- `PATCH /api/gpa/:userId/courses/:courseId` - 과목 수정
- `DELETE /api/gpa/:userId/courses/:courseId` - 과목 삭제
- `POST /api/gpa/:userId/suggestions` - 수강 과목 추천
- `POST /api/gpa/:userId/requirements/analyze` - 졸업 요건 분석 (다중 이미지 지원)

### 사용자 (`/api/users`)

- `GET /api/users` - 전체 사용자 목록 조회 (관리자)
- `POST /api/users/:uid/profile` - 프로필 생성/병합
- `GET /api/users/:uid/profile` - 프로필 조회
- `PATCH /api/users/:uid/profile` - 프로필 수정
- `POST /api/users/:uid/profile/nickname` - 닉네임 업데이트
- `POST /api/users/:uid/profile/picture` - 프로필 사진 업로드
- `GET /api/users/:uid/profile/picture` - 프로필 사진 조회

### 캘린더 (`/api/calendar`)

- `GET /api/calendar/events` - Google Calendar 이벤트 조회
- `POST /api/calendar/events` - 이벤트 생성
- `PUT /api/calendar/events/:eventId` - 이벤트 수정
- `DELETE /api/calendar/events/:eventId` - 이벤트 삭제
- `GET /api/calendar/calendars` - 캘린더 목록 조회
- `POST /api/calendar/sync-to-schedule` - 일정으로 동기화
- `POST /api/calendar/disconnect` - Google Calendar 연결 해제

### 클래스 (`/api/classes`)

- `POST /api/classes/:classId/files` - 클래스에 파일 업로드
- `GET /api/classes/:classId/files` - 클래스 파일 목록 조회
- `GET /api/classes/:classId/recordings` - 클래스 녹음 목록 조회
- `GET /api/classes/assignments` - 전체 과제 목록 조회
- `GET /api/classes/:classId/assignments` - 클래스 과제 목록 조회
- `POST /api/classes/:classId/assignments` - 과제 생성
- `GET /api/classes/:classId/assignments/:assignmentId` - 과제 상세 조회
- `PATCH /api/classes/:classId/assignments/:assignmentId` - 과제 수정
- `DELETE /api/classes/:classId/assignments/:assignmentId` - 과제 삭제
- `GET /api/classes/:classId/notes` - 클래스 노트 조회
- `GET /api/classes/:classId/exams` - 클래스 시험 목록 조회
- `GET /api/classes/:classId/exams/:examId` - 시험 상세 조회
- `POST /api/classes/:classId/exams` - 시험 생성
- `PATCH /api/classes/:classId/exams/:examId` - 시험 수정
- `DELETE /api/classes/:classId/exams/:examId` - 시험 삭제

### 문서 (`/api/documents`)

- `POST /api/documents` - PDF 문서 업로드 (최대 8개 파일, multipart/form-data)

### 전사 (`/api/transcribe`)

- `POST /api/transcribe` - 일반 오디오 전사 (multipart/form-data, language 파라미터 지원)

### 채팅 (`/chat`)

- `POST /chat` - 일반 AI 챗봇 (루트 레벨 엔드포인트)

전체 API 엔드포인트는 100개 이상입니다.

## 데이터베이스 구조

### Firestore 컬렉션

**users / userProfiles**
- 사용자 인증 및 프로필 데이터
- 필드: `uid`, `email`, `name`, `profile`, `schoolVerified`, `university`, `onboardingCompleted`

**lectures**
- 강의 녹음 및 전사 데이터
- 필드: `id`, `userId`, `title`, `description`, `tags`, `status`, `transcript`, `summary`, `actionItems`, `chatHistory`

**userSchedules**
- 사용자 일정 데이터
- 필드: `id`, `userId`, `items[]`, `source`, `isActive`, `confirmed`, `lecturesCreated`

**pdfFiles**
- PDF 문서 메타데이터
- 필드: `id`, `userId`, `classId`, `title`, `storagePath`, `extractedText`, `analysis`, `pageAnalyses`, `chatHistory`

**communityPosts**
- 커뮤니티 게시글
- 필드: `id`, `userId`, `content`, `imageUrl`, `category`, `university`, `likes`, `comments`, `createdAt`

**gpa_data**
- GPA 및 과목 데이터
- 필드: `userId`, `courses[]`, `totalCreditsRequired`, `completedRequiredCourses`, `graduationRequirementsAnalysis`

**classes**
- 클래스/강의실 데이터
- 필드: `id`, `userId`, `name`, `description`, `assignments`, `resources`, `notes`

**chatHistory**
- 채팅 대화 히스토리
- 필드: `chatId`, `userId`, `question`, `answer`, `lecturesReferenced[]`, `timestamp`

**gpa-requirements**
- GPA 졸업 요건 분석 데이터 (임시 저장)

## 개발 가이드

### 코드 스타일

- TypeScript 사용 (프론트엔드)
- ESLint 설정 준수
- 컴포넌트 기반 아키텍처
- 서비스 레이어 패턴 (백엔드)

### 주요 개발 패턴

**프론트엔드**
- 컴포넌트 기반 설계
- Context API를 통한 전역 상태 관리
- 서비스 레이어를 통한 API 추상화
- 파일 기반 라우팅 (Expo Router)

**백엔드**
- RESTful API 설계
- 서비스 레이어 패턴
- 모듈화된 라우트 구조
- 포괄적인 에러 처리

### 환경 변수

백엔드와 프론트엔드 모두 `.env` 파일을 통해 환경 변수를 관리합니다. 각 디렉토리의 `.env.example` 파일을 참조하세요.

### 테스트

현재 테스트 스위트는 구현되지 않았습니다. 향후 Jest 및 React Native Testing Library를 사용한 테스트 추가를 계획하고 있습니다.

## 배포

### 백엔드 배포

PM2를 사용한 프로덕션 배포:

```bash
cd friendly-backend
npm run pm2:start
```

PM2 관리 명령어:
```bash
npm run pm2:stop      # 중지
npm run pm2:restart   # 재시작
npm run pm2:logs      # 로그 확인
npm run pm2:delete    # 삭제
```

### 프론트엔드 배포

Expo를 사용한 빌드:

```bash
cd friendly-frontend
expo build:ios        # iOS 빌드
expo build:android    # Android 빌드
expo build:web        # 웹 빌드
```

### 환경 설정

프로덕션 환경에서는 다음을 확인하세요:

- Firebase 프로젝트 설정
- 환경 변수 설정 (모든 필수 변수 포함)
- API 키 보안 관리
- CORS 설정
- 파일 업로드 크기 제한
- Google Drive 백업 설정 (선택사항)
- PM2 프로세스 관리 설정

## 인프라 및 백업

### PM2 프로세스 관리

프로덕션 환경에서 PM2를 사용하여 Node.js 프로세스를 관리합니다.

**주요 설정:**
- 메모리 제한: 500MB (초과 시 자동 재시작)
- 자동 재시작: 활성화 (최대 10회)
- 로그 관리: 자동 로테이션 (`logs/` 디렉토리)
- 환경 변수: 개발/프로덕션 분리

**PM2 명령어:**
```bash
npm run pm2:start    # 프로세스 시작
npm run pm2:stop     # 프로세스 중지
npm run pm2:restart  # 프로세스 재시작
npm run pm2:logs     # 로그 확인
npm run pm2:delete   # 프로세스 삭제
```

### 자동 백업 시스템

Google Drive를 사용한 자동 백업 시스템이 구현되어 있습니다.

**백업 설정:**
- 스케줄: 매일 오전 3시 자동 실행 (node-cron)
- 대상: `uploads/` 디렉토리
- 형식: ZIP 압축 (최대 압축률)
- 보관: 최신 7개 백업 유지
- 위치: Google Drive `friendly_upload_backups` 폴더

**백업 활성화:**
`.env` 파일에서 `ENABLE_DRIVE_BACKUP=true`로 설정 (기본값: true)

**수동 백업:**
```bash
cd friendly-backend
npm run backup
```

**백업 복원:**
```bash
cd friendly-backend
npm run restore
```

**필수 환경 변수:**
- `GOOGLE_PROJECT_ID` - Google Cloud 프로젝트 ID
- `GOOGLE_CLIENT_EMAIL` - 서비스 계정 이메일
- `GOOGLE_PRIVATE_KEY` - 서비스 계정 개인 키

### 로그 관리

PM2가 자동으로 로그를 관리합니다:

- **에러 로그**: `logs/pm2-error.log`
- **출력 로그**: `logs/pm2-out.log`
- **통합 로그**: `logs/pm2-combined.log`
- **타임스탬프**: 모든 로그에 타임스탬프 포함
- **자동 로테이션**: PM2가 자동으로 로그 파일 관리

### 스케줄 작업

node-cron을 사용하여 정기 작업을 실행합니다:

- **백업 작업**: 매일 오전 3시 (`jobs/backupJob.js`)
- **작업 비활성화**: `ENABLE_DRIVE_BACKUP=false` 설정

### 인프라 요구사항

**서버 요구사항:**
- Node.js 18 이상
- 최소 1GB RAM (권장 2GB)
- 최소 10GB 디스크 공간 (업로드 파일용)
- 네트워크: 인터넷 연결 (Firebase, OpenAI API 접근)

**외부 서비스:**
- Firebase (Firestore, Storage, Authentication)
- OpenAI API (GPT-4o-mini, GPT-3.5-turbo, Whisper)
- Google Drive API (백업용, 선택사항)
- Google Calendar API (캘린더 연동용, 선택사항)

## 프로젝트 통계

- 백엔드 라우트: 11개 파일
- 백엔드 서비스: 12개 파일
- 프론트엔드 화면: 17개 이상
- 프론트엔드 컴포넌트: 50개 이상
- API 엔드포인트: 100개 이상
- 데이터베이스 컬렉션: 8개 이상
- AI 모델 사용: 4개 (GPT-4o-mini, GPT-3.5-turbo, Whisper-1, GPT-4o Vision)
- 지원 플랫폼: iOS, Android, Web
- 자동 백업: Google Drive 통합
- 프로세스 관리: PM2

## 라이선스

2025년 국민대학교 모바일프로그래밍 팀5 

## 기여

프로젝트에 기여하고 싶으시다면 이슈를 생성하거나 풀 리퀘스트를 제출해주세요.

## 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 통하거나 [LinkedIn](https://www.linkedin.com/in/anu-bilegdemberel-445366318/)으로 연락주세요.

