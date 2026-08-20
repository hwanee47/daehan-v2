# 로그아웃 기능 추가

> 참고사항: 신규 작업 문서는 문서 작성일을 기준으로 `docs/work/YYYY-MM-DD-작업명.md` 형식의 파일명을 사용한다.

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-21
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-21 08:41 KST

## 배경과 목적

로그인 사용자가 프로필 화면에서 현재 Supabase 인증 세션을 안전하게 종료할 수 있게 한다.

## 범위

### 포함

- 프로필 화면에 `로그아웃` 버튼 추가
- Server Action에서 현재 Supabase 세션 종료
- 성공 시 로그인 화면으로 이동
- 실패 시 프로필 화면에 오류 메시지 표시
- 처리 중 버튼 비활성화 및 상태 문구 표시

### 제외

- 모든 기기의 세션 일괄 종료
- 회원 탈퇴
- 비밀번호 변경
- 헤더 사용자 메뉴 구조 변경
- DB schema와 RLS 변경

## 완료 조건

- [x] 로그인 사용자가 프로필 화면에서 로그아웃할 수 있다.
- [x] 로그아웃 성공 후 `/login`으로 이동한다.
- [x] 로그아웃 후 보호된 `/profile`에 접근하면 로그인 화면으로 이동한다.
- [x] 로그아웃 실패 시 세션을 유지하고 오류 메시지를 표시한다.
- [x] 처리 중 중복 제출을 방지한다.

## 현재 구현 조사

- 관련 route/component: `src/app/profile/page.tsx`, `src/app/login/actions.ts`, `src/lib/supabase/server.ts`
- 관련 Supabase table/bucket: Supabase Auth 세션만 사용; 애플리케이션 table과 bucket 해당 없음
- 재사용할 기존 패턴: 로그인 Server Action의 서버 Supabase client와 `redirect()` 사용, 기존 Button 컴포넌트
- 문서와 구현의 차이: 현재 로그인과 보호된 프로필 접근은 있으나 세션 종료 동작은 없다.

## 설계

### UI와 반응형

- 모바일: 프로필 정보 아래에 충분한 터치 영역을 가진 로그아웃 버튼을 표시한다.
- 태블릿: 모바일과 동일한 흐름을 유지한다.
- 데스크톱: 프로필 정보 아래에 로그아웃 버튼을 표시한다.
- 로딩/빈 상태/오류/권한: 처리 중 버튼을 비활성화하고 실패 메시지를 `role="alert"`로 표시한다.
- 접근성: 실제 `button`과 `form`을 사용하고 처리 상태 및 오류를 스크린 리더에 전달한다.

### Server/Client 경계

- Server Component/Action: Server Action에서 `supabase.auth.signOut()`을 호출하고 성공 시 `/login`으로 이동한다.
- Client Component/Zustand: 작은 로그아웃 폼에서 action 상태와 pending 상태만 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음 — Auth 세션 종료만 수행한다.
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. 프로필 route에 로그아웃 Server Action을 추가한다.
2. 로그아웃 처리·오류 상태를 표시하는 작은 Client Component를 추가한다.
3. 프로필 화면에 로그아웃 폼을 배치한다.
4. lint, typecheck와 성공·실패·중복 제출 흐름을 검증한다.

## 위험과 승인 사항

- 이번 로그아웃은 현재 브라우저의 Supabase 세션만 종료한다.
- 인증 동작 변경이므로 구현 전 사용자 승인이 필요하다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 관련 단위/통합 테스트 — 별도 테스트가 없어 action 분기와 프로덕션 빌드로 대체
- [x] 모바일 360px — 전체 너비 버튼 스타일을 적용하고 코드로 검토
- [x] 태블릿 768px — `sm`부터 내용 너비 버튼 스타일을 적용하고 코드로 검토
- [x] 데스크톱 1280px — 프로필 Container 안 배치를 코드로 검토
- [x] 키보드와 접근성 — 실제 form/button, disabled, `role="alert"`와 `aria-live` 적용
- [x] Supabase 허용/거부 정책 — 해당 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 프로필 화면에 로그아웃 폼을 추가하고 Server Action에서 현재 Supabase 세션을 종료하도록 구현했다.
- 검증: ESLint, TypeScript와 `npx next build --webpack`을 통과했다.
- 미실행: 실제 로그인 세션을 종료하는 브라우저 통합 테스트는 사용자 세션에 영향을 주므로 실행하지 않았다.
- 남은 위험/후속 작업: 여러 기기에서 동시에 로그아웃하는 기능은 이번 범위에 포함되지 않는다.
