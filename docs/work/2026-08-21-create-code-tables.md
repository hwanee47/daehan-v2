# 공통 코드 테이블 생성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-21
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-21

## 배경과 목적

검사성적서 등 여러 업무 기능에서 재사용할 코드 그룹과 상세 코드를 일관된 구조로 관리한다. 환경마다 달라질 수 있는 identity `seq`를 애플리케이션 식별자로 사용하지 않도록 안정적인 `group_code`를 함께 둔다.

## 범위

### 포함

- `public.code_groups` 테이블 생성
- `public.code_details` 테이블 생성
- PK, FK, unique, check constraint와 조회용 index 추가
- 공통 감사 컬럼과 `public.set_audit_fields()` trigger 연결
- 인증 사용자 조회 및 관리자 변경을 위한 RLS 정책과 최소 권한 grant
- 원격 `daehan` 프로젝트 dry run, migration 적용 및 상태 재검증

### 제외

- 초기 코드 데이터 입력
- 코드 관리 UI와 애플리케이션 query
- 기존 테이블 또는 데이터 변경
- 익명 사용자의 코드 조회

## 완료 조건

- [x] 코드 그룹과 상세 코드 테이블이 재현 가능한 migration으로 생성된다.
- [x] 상세 코드는 그룹 FK와 그룹 내 코드 unique 제약을 가진다.
- [x] 로그인 사용자는 조회할 수 있고 관리자만 생성·수정·삭제할 수 있다.
- [x] 감사 컬럼은 인증 사용자와 수정 시각을 기록한다.
- [x] 원격 migration 기록과 후속 dry run이 최신 상태다.

## 현재 구현 조사

- 관련 route/component: 해당 없음. 이번 작업은 DB schema만 변경한다.
- 관련 Supabase table/bucket: `public.users`, `auth.users`; Storage는 해당 없음.
- 재사용할 기존 패턴: `public.users`의 identity `seq`, 감사 컬럼, `public.set_audit_fields()` trigger, RLS와 명시적 revoke/grant 패턴을 재사용한다.
- 문서와 구현의 차이: 해당 없음.

## 설계

### UI와 반응형

- 모바일: 해당 없음.
- 태블릿: 해당 없음.
- 데스크톱: 해당 없음.
- 로딩/빈 상태/오류/권한: UI 작업이 아니므로 해당 없음.
- 접근성: 해당 없음.

### Server/Client 경계

- Server Component/Action: 이번 범위에서 애플리케이션 코드는 변경하지 않는다.
- Client Component/Zustand: 해당 없음.

### 데이터와 Supabase

- schema 변경: `code_groups`와 `code_details` 신규 생성. 두 테이블 모두 identity bigint PK, 활성 여부, 정렬 순서와 공통 감사 컬럼을 가진다.
- PK/FK/index: 상세의 `code_group_seq`가 그룹 `seq`를 `on delete restrict`로 참조한다. `group_code` unique, `(code_group_seq, code)` unique, `(code_group_seq, sort_order, seq)` index를 둔다.
- RLS 정책: `authenticated`는 두 테이블을 조회할 수 있다. `public.users`에서 자신의 `role = 'admin'`인 사용자만 insert/update/delete할 수 있다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 신규 migration을 원격에 적용한다. 롤백은 `code_details`, `code_groups` 순서로 삭제하며 이 migration 이전 상태로 복원한다. 운영 데이터 생성 후 롤백하면 데이터가 삭제되므로 별도 백업이 필요하다.

## 변경 계획

1. 신규 테이블, constraint, comments, index와 감사 trigger를 migration에 작성한다.
2. RLS와 관리자 쓰기 정책, 로그인 사용자 조회 정책, 컬럼 단위 grant를 작성한다.
3. 원격 연결 상태와 migration 목록을 확인하고 `supabase db push --dry-run`을 실행한다.
4. 승인 범위의 migration을 원격에 적용한다.
5. migration 목록과 후속 dry run으로 최신 상태를 재검증한다.

## 위험과 승인 사항

- 두 신규 테이블과 RLS, grant, trigger를 원격 Supabase에 생성하는 Data migration이다.
- 코드는 기본적으로 물리 삭제할 수 있지만 참조 데이터가 생기면 삭제 대신 `is_active = false` 사용을 권장한다.
- 코드 unique 비교는 PostgreSQL 기본 대소문자 구분을 따른다.

## 검증 계획

- [x] ESLint — 애플리케이션 코드 변경 없음
- [x] TypeScript — 애플리케이션 코드 변경 없음
- [ ] 관련 단위/통합 테스트 — 인증 사용자 테스트 세션이 없어 런타임 RLS 테스트 미실행
- [x] 모바일 360px — 해당 없음
- [x] 태블릿 768px — 해당 없음
- [x] 데스크톱 1280px — 해당 없음
- [x] 키보드와 접근성 — 해당 없음
- [x] Supabase 허용/거부 정책 — RLS 활성화, authenticated 조회, 관리자 쓰기 정책과 컬럼 단위 grant 적용 확인
- [x] 프로덕션 빌드 — 애플리케이션 코드 변경 없음

## 결과

- 변경: `code_groups`, `code_details` 테이블과 constraint, index, comments, 감사 trigger, RLS 정책 및 최소 권한 grant를 migration으로 생성하고 연결된 원격 프로젝트에 적용했다.
- 검증: 적용 전 migration list에서 기존 이력 일치를 확인했고 dry run에는 `20260821090000_create_code_tables.sql` 한 건만 표시됐다. 적용 후 local/remote migration 세 건이 모두 일치하며 후속 dry run은 `upToDate: true`, 적용 대상 없음으로 확인됐다. migration SQL은 원격 적용 과정에서 오류 없이 실행됐다.
- 미실행: 별도 일반 사용자·관리자 인증 세션이 없어 실제 클라이언트 요청을 통한 RLS 허용/거부 통합 테스트는 실행하지 않았다. 애플리케이션 코드 변경이 없어 lint, typecheck와 build는 별도로 재실행하지 않았다.
- 남은 위험/후속 작업: 초기 코드 데이터와 관리 UI는 별도 작업이다. 운영 데이터 생성 후 테이블 롤백은 데이터를 삭제하므로 백업 없이 수행하면 안 된다.
