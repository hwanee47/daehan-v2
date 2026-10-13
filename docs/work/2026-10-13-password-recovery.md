# 비밀번호 복구와 재설정

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-10-13
- 작업 분류: Architecture — 인증 복구 경로 추가
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-10-13, 제안 문서 공유 후 응답

## 배경과 목적

Supabase에서 보낸 복구 메일의 localhost 이동 문제는 사용자가 URL 설정을 변경했다. 현재 앱에는 복구 링크 처리와 새 비밀번호 입력 화면이 없어, 메일 확인부터 비밀번호 변경 완료까지의 흐름을 추가한다.

## 범위

### 포함

- 로그인 화면에 비밀번호 찾기 링크 추가
- `/forgot-password`에서 이메일을 입력하고 복구 메일 요청
- 복구 링크를 검증해 재설정 화면으로 연결하는 인증 처리
- `/reset-password`에서 새 비밀번호와 확인값 입력 및 서버 검증 후 저장
- 만료·재사용·잘못된 링크, 인증 없음, 입력 오류, 발송 제한과 네트워크 오류 안내
- 완료 후 복구 세션 정리와 로그인 화면 이동
- Supabase 대시보드 발송 메일 및 앱 발송 메일을 위한 URL·복구 이메일 템플릿 설정 안내
- 필요한 경우 서버 전용 `SITE_URL` 환경변수와 README/`.env.example` 설명 추가. 운영 환경에서 localhost로 조용히 대체하지 않는다.

### 제외

- DB 스키마, RLS, Storage, migration 변경
- 자동로그인 기간 변경, 계정 하드코딩, 관리자 비밀번호 강제 변경
- 배포 및 원격 Supabase 설정의 직접 변경, 실제 사용자 대상 테스트 메일 발송
- 공통 인증 체계 리팩터링 및 `docs/architecture.md` 변경

## 완료 조건

- [x] 로그인 화면에서 복구 메일 요청으로 이동할 수 있다.
- [x] 메일의 유효한 복구 링크로 재설정 화면에 접근할 수 있다.
- [x] 서버에서 인증 및 새 비밀번호/확인값을 검증하고 Supabase Auth로 저장한다.
- [x] 만료되거나 잘못된 링크로는 변경을 허용하지 않고 재요청을 안내한다.
- [x] 토큰과 비밀번호를 로그, Zustand, 별도 브라우저 저장소에 기록하지 않는다.
- [x] 복구 요청 응답으로 이메일 가입 여부를 노출하지 않는다.
- [x] 운영에 필요한 URL과 이메일 템플릿 설정, 테스트 한계를 안내한다.

## 현재 구현 조사

- 관련 route/component: `src/app/login/*`, `src/app/signup/actions.ts`, `src/app/(app)/profile/actions.ts`, `src/lib/supabase/{server,client,auth-cookies}.ts`, `src/proxy.ts`
- 관련 Supabase table/bucket: Supabase Auth 사용. 앱 테이블과 bucket 변경 없음.
- 재사용할 기존 패턴: Server Action, `useActionState`, `Container`, `Button`, 서버 cookie adapter, 기존 가입 화면의 8~72자 비밀번호 검증
- 문서와 구현의 차이: README가 안내하는 `.env.example`이 현재 없다. 복구 관련 route와 API 호출이 없다. 실제 운영 도메인과 원격 이메일 템플릿 내용은 미확인이다.
- 현재 git 작업 트리는 제안 작성 전 변경이 없었다.

## 설계

승인 후 Next.js Route Handler/Server Action/cookies 가이드와 Supabase 이메일 템플릿/verifyOtp 문서를 확인했다. 기존 작업 디렉터리에서 순차 구현하며, 이 문서를 계획과 검증 기록으로 사용한다.

- `/auth/recovery`는 `token_hash`와 `type=recovery`만 받아 `verifyOtp`로 검증하고 고정된 `/reset-password` 경로로 이동한다. 외부 `next` 주소는 사용하지 않는다.
- `src/lib/supabase/recovery.ts`에 별도 쿠키 이름, HttpOnly, 15분 수명의 복구 전용 서버 client를 둔다. 일반 로그인 쿠키를 비밀번호 변경 권한으로 사용하지 않는다.
- `/forgot-password`의 발송용 client는 세션을 저장하지 않는다. 서버 전용 `SITE_URL`을 검증하고 운영 환경 누락/HTTP/localhost를 거부한다.
- 재설정 Server Action은 복구 client의 `getUser()`를 검증한 뒤 `updateUser()`를 호출한다. 성공 후 복구 세션을 종료하고 쿠키를 제거한다. 기존 다른 계정 로그인과 혼동되지 않도록 복구 UI에서 대상 이메일을 표시한다.
- 복구 메일 템플릿은 `{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery`를 사용한다. 대시보드와 앱 발송 모두 적용되며 다른 브라우저에서 링크를 열 수 있다.
- 성공 화면은 로그인 화면으로 이동하는 명시적인 링크를 제공한다. 기존 로그인 세션이 있으면 기존 로그인 페이지 동작에 따라 홈으로 이동할 수 있다.

### 구현 순서와 검증 지점

1. `tests/password-recovery.test.mjs`: Node 내장 test와 TypeScript 변환으로 Server Action/Route Handler 경계 테스트 작성 후 실패 확인. 별도 테스트 라이브러리 설치 없음.
2. `src/app/forgot-password/{actions.ts,page.tsx,forgot-password-form.tsx}`, `src/lib/supabase/recovery.ts`, `src/lib/site-url.ts`: 입력 검증, 발송, 분리된 쿠키 처리. 환경변수 누락/잘못된 origin과 rate limit/예외 테스트.
3. `src/app/auth/recovery/route.ts`, `src/app/reset-password/{actions.ts,page.tsx,reset-password-form.tsx}`: 토큰 종류/누락/만료, 미인증 저장 차단, 비밀번호 확인, 저장 실패 및 성공 뒤 정리 테스트.
4. `src/components/auth/auth-shell.tsx`, 로그인 링크, README와 `.env.example`: 인증 화면 재사용 및 배포 설정 안내.
5. 테스트, lint, typecheck, webpack build와 가능한 브라우저 검증. 원격 계정 변경/메일 발송 없이 수행 가능한 범위를 명시한다.

### UI와 반응형

- 모바일: 기존 로그인 화면과 동일한 단일 열, 360px 검증
- 태블릿: 기존 Container와 폼 폭 기준, 768px 검증
- 데스크톱: 기존 인증 화면 톤과 제한된 폼 폭, 1280px 검증
- 로딩/빈 상태/오류/권한: 발송·저장 대기 및 중복 제출 방지, 성공 안내, 유효한 인증 없는 접근과 만료 링크 처리
- 접근성: label, 오류 연결, 상태 알림, 키보드 순서, 비밀번호 자동완성 속성
- 작업영역 탭·분할 검증: 해당 없음. 공통 업무 layout 밖의 인증 화면이다.

### Server/Client 경계

- Server Component/Action: 입력·인증 검증과 비밀번호 저장. 인증 링크 검증은 서버 경계에서 처리하는 방식을 우선 검토한다.
- Client Component/Zustand: 폼 상호작용에만 최소 클라이언트 경계를 둔다. 인증 정보의 전역 상태 추가 없음.

### 데이터와 Supabase

- schema 변경: 해당 없음. 기존 Supabase Auth API 사용.
- PK/FK/index: 해당 없음. 테이블 변경 없음.
- RLS 정책: 해당 없음. 기존 정책 변경 없음.
- Storage bucket/path/policy: 해당 없음. 파일 처리 없음.
- migration과 rollback: migration 없음. 추가 route와 링크를 되돌리고, 적용한 복구 메일 템플릿/URL 설정을 함께 복원한다.

## 변경 계획

1. 제안 승인 후 복구 링크 형식과 서버 인증 처리, 완료 후 세션 정리 방식을 확정한다.
2. 메일 요청 화면과 Server Action, 로그인 화면의 진입 링크를 추가한다.
3. 복구 링크 검증 및 새 비밀번호 입력·저장 흐름을 구현한다.
4. URL과 메일 템플릿 설정 및 환경변수 누락 시 동작을 문서화한다.
5. 인증 실패·성공 분기, 정적 검사, 반응형·키보드를 검증하고 결과를 기록한다.

## 위험과 승인 사항

- 이 제안 범위에 대한 별도 명시적 승인 후 구현한다.
- Site URL은 기본 서비스 주소로 유지한다. 실제 복구 링크 형식에 맞는 Redirect URLs와 이메일 템플릿 설정이 필요할 수 있다.
- Supabase 대시보드 발송과 앱 PKCE 발송은 링크 처리 조건이 다를 수 있어, 양쪽에 사용할 복구 메일 템플릿을 함께 안내한다.
- 기존 발송 링크는 변경 후 흐름과 호환되지 않을 수 있으므로 새 메일로 검증한다.
- 원격 Auth의 비밀번호 정책 및 메일 발송 제한은 로컬에서 확정할 수 없다. Supabase 오류를 사용자용 메시지로 처리한다.
- 실제 계정의 비밀번호 변경 테스트는 지정된 테스트 계정과 별도 실행 허용이 있을 때 수행한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 관련 단위/통합 테스트: 잘못된 입력, 인증 없는 저장, 유효/만료 복구 링크, 발송 실패 분기
- [x] 모바일 360px — 메일 요청·오류 화면, 실제 복구 세션의 입력 화면은 미검증
- [x] 태블릿 768px — 메일 요청·미인증 화면
- [x] 데스크톱 1280px — 메일 요청 화면
- [x] 키보드와 접근성 — 이메일 입력→발송 버튼→로그인 링크, focus ring과 오류 안내 확인
- [x] Supabase 허용/거부 정책: DB RLS 변경은 해당 없음. 모의 Auth 응답으로 저장 허용/거부 검증. 실제 계정 검증은 미실행
- [x] 프로덕션 빌드

## 결과

- 변경: 로그인 화면 진입 링크, 메일 요청 화면/Server Action, TokenHash 검증 Route Handler, 재설정 화면/Server Action, 별도 복구 client, SITE_URL 검증, README와 `.env.example`, 회귀 테스트를 구현했다. DB와 원격 설정은 변경하지 않았다.
- 검증: `node --test tests/password-recovery.test.mjs` 16개 통과, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과. 최초 미구현 상태의 실패 및 다중 계정/상대 redirect 수정 전 실패를 확인했다. 실제 SSR SDK를 사용하고 fetch만 대체한 쿠키 발급·복원·삭제 테스트도 통과했다.
- UI 검증: 프로덕션 서버에서 360/768/1280px 메일 요청 화면, 360px 잘못된 링크 화면의 가로 넘침 없음, 이메일 오류, 키보드 이동과 focus ring, 로그인→메일 요청 링크, 미인증 진입 및 완료 화면의 로그인 링크를 확인했다. 완료 화면은 테스트 URL로 표시만 검증했으며 실제 비밀번호 변경 증거가 아니다.
- 검토 반영: 별도 코드 리뷰에서 발견한 다중 탭 계정 변경을 `expectedUserId`와 서버 `getUser()`의 ID 비교로 차단했다. 브라우저 검증에서 callback의 내부 localhost origin 이동을 발견해 303 상대 Location으로 수정했고 현재 도메인 유지도 확인했다. 재검토에서 중요 차단 사항 없음.
- 미실행: 실제 메일 수신·링크 만료/재사용·다른 브라우저·비밀번호 저장 후 재로그인, 유효 복구 세션 입력 화면의 브라우저 검증. 실제 사용자 변경 및 메일 발송은 승인 범위에서 제외했으므로 실행하지 않았다. Supabase 응답을 대체한 테스트와 실제 SDK 쿠키 테스트로 서버 분기를 검증했다.
- 남은 위험/후속 작업: 배포 환경 `SITE_URL`, Supabase Site URL/Redirect URLs/Reset Password 템플릿 설정 후 새 메일로 테스트해야 한다. 실제 원격 설정과 계정은 변경하지 않았다. 메일 보안 스캐너가 GET 링크를 먼저 열면 일회용 토큰을 소비할 수 있다.
- 세션 제한: 15분은 브라우저 쿠키 보존 정책이며 별도 서버 복구 만료 증명이 아니다. 원격 JWT 수명이 15분보다 짧은 구성에서는 Server Component가 갱신 쿠키를 쓸 수 없어 재시도 시 세션 복원이 실패할 수 있으므로 해당 원격 설정은 배포 전 확인 대상이다. 일반 로그인과 복구 쿠키는 분리하지만 유효한 본인 토큰을 인위적으로 복구 쿠키에 넣는 경우까지 별도 용도 검증을 하지는 않는다.
- 작업 기록: 최초 린트의 CJS import 규칙 오류는 테스트를 MJS로 변경해 해결했다. 로컬 서버 포트 권한은 승인 도구로 허용받아 검증했다. 개발 의존성 설치, 커밋, 푸시, 배포는 하지 않았다.
