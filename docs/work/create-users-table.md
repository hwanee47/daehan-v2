# 사용자 테이블 생성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-20

## 배경과 목적

Supabase Auth 사용자에 연결되는 애플리케이션 사용자 프로필과 모든 신규 테이블에 적용할 감사 컬럼 규칙을 정의한다.

## 범위

### 포함

- `public.users` 테이블과 Auth 사용자 생성 trigger
- Auth 이메일 변경 시 `public.users.email` 동기화
- 본인 프로필 조회·이름 수정 RLS 및 권한
- 공통 감사 컬럼과 자동 갱신 trigger
- 데이터베이스 작성 규칙 문서

### 제외

- 기존 Auth 사용자의 프로필 backfill
- 로그인·회원가입 UI

## 완료 조건

- [x] 사용자 프로필 migration이 재현 가능하다.
- [x] RLS와 최소 권한 정책이 정의되어 있다.
- [x] 비밀번호는 Supabase Auth만 관리한다.
- [x] 공통 감사 컬럼 규칙이 문서화되어 있다.

## 현재 구현 조사

- 관련 route/component: 해당 없음
- 관련 Supabase table/bucket: 기존 migration 없음, Supabase Auth client만 구성됨
- 재사용할 기존 패턴: `src/lib/supabase/server.ts`
- 문서와 구현의 차이: `docs/architecture.md`가 예고한 `supabase/migrations` 디렉터리가 아직 없었음

## 설계

### UI와 반응형

- 해당 없음: DB migration 작업

### Server/Client 경계

- Server Component/Action: 향후 프로필 조회·변경은 서버 Supabase client 사용
- Client Component/Zustand: 해당 없음

### 데이터와 Supabase

- schema 변경: `public.users`, 감사 trigger 함수, Auth 사용자 생성 trigger 함수
- PK/FK/index: `id`는 Auth UUID PK/FK, `seq`는 identity/unique 보조 순번, `email` unique
- RLS 정책: 인증 사용자는 본인 행만 조회하고 `name`만 수정
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 신규 migration 적용. rollback은 trigger, 함수, 테이블 순서로 제거 가능

`pw` 컬럼은 만들지 않는다. Supabase Auth가 비밀번호를 안전하게 저장·검증하며 public schema에 별도 비밀번호를 두면 인증 정보가 중복되고 노출 위험이 커진다. 이메일은 애플리케이션 조회를 위해 복제하고 Auth 이메일 변경 trigger로 동기화한다.

## 변경 계획

1. 사용자 프로필 및 감사 필드 migration을 추가한다.
2. 공통 데이터베이스 규칙을 문서화한다.
3. SQL을 정적 검토하고 프로젝트 검증을 실행한다.

## 위험과 승인 사항

- 기존 Auth 사용자가 있다면 별도 backfill 승인 및 migration이 필요하다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] Supabase 허용/거부 정책 정적 검토

## 결과

- 변경: 사용자 프로필 migration과 DB 공통 규칙 추가
- 검증: `npm run lint`, `npx tsc --noEmit`, `git diff --check` 통과. 원격 `daehan` 프로젝트 적용, migration 기록 일치 및 후속 dry run 최신 상태 확인
- 미실행: 실제 인증 세션을 사용한 RLS 허용·거부 통합 테스트
- 남은 위험/후속 작업: 기존 Auth 사용자 존재 여부 확인 후 backfill 결정
