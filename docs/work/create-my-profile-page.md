# 내 프로필 조회 페이지

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-20
- 승인 상태: 승인
- 승인 응답/일시: “승인” / 2026-08-20

## 배경과 목적

홈 상단에 표시되는 로그인 사용자 이름을 눌러 본인의 기본 계정 정보를 확인할 수 있게 한다.

## 범위

### 포함

- 홈 상단 사용자 이름 영역을 `/profile` 링크로 변경
- 로그인 사용자의 이름, 이메일, 가입일을 보여주는 읽기 전용 프로필 페이지 추가
- 비로그인 사용자의 프로필 접근을 로그인 페이지로 이동
- 프로필 조회 실패 상태와 반응형·키보드 접근성 처리

### 제외

- 프로필 정보 수정
- 프로필 이미지 업로드
- DB schema, RLS, Storage 변경
- 사용자 메뉴 드롭다운

## 완료 조건

- [x] 로그인 사용자가 상단 이름을 눌러 `/profile`로 이동한다.
- [x] 프로필 페이지에서 본인의 이름, 이메일, 가입일을 확인한다.
- [x] 비로그인 접근은 `/login`으로 이동한다.
- [x] 기존 `public.users`와 본인 조회 RLS만 사용한다.

## 현재 구현 조사

- 관련 route/component: `src/app/page.tsx`, 신규 `src/app/profile/page.tsx`
- 관련 Supabase table/bucket: `public.users`; bucket 해당 없음
- 재사용할 기존 패턴: Server Component의 `auth.getUser()`, `Container`, `Link`, 로그인 페이지의 `redirect()`
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 단일 열 정보 카드, 360px에서 줄바꿈과 터치 영역 보장
- 태블릿: 동일한 읽기 흐름과 넉넉한 여백
- 데스크톱: 좁은 본문 폭으로 정보 집중
- 로딩/빈 상태/오류/권한: 서버 렌더링, 프로필 행 누락·조회 오류 안내, 비로그인은 로그인으로 이동
- 접근성: 이름 영역을 실제 링크로 제공하고 제목·설명 목록의 의미 구조 사용

### Server/Client 경계

- Server Component/Action: 프로필 페이지에서 인증과 `public.users` 조회
- Client Component/Zustand: 해당 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 기존 `users.id` PK 사용
- RLS 정책: 기존 본인 `select` 정책 사용
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음; 페이지와 링크 변경을 되돌리면 됨

## 변경 계획

1. 홈 사용자 이름 버튼을 프로필 링크로 변경한다.
2. 인증과 본인 데이터 조회를 수행하는 `/profile` 페이지를 추가한다.
3. 정적 검사와 반응형 UI를 검증한다.

## 위험과 승인 사항

- DB와 공개 API 변경은 없지만 Standard 작업이므로 구현 전 사용자의 명시적 승인이 필요하다.
- 가입일은 기존 `users.created_at`을 한국어 날짜로 표시한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: 홈 상단 이름을 `/profile` 링크로 변경하고 읽기 전용 내 프로필 페이지를 추가함
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 자동화 테스트와 실제 브라우저 viewport·키보드 확인, 원격 Supabase RLS 허용/거부 테스트
- 남은 위험/후속 작업: 실제 로그인 계정으로 이름·이메일·가입일 표시를 브라우저에서 확인할 필요가 있음
