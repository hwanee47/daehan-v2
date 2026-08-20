# 사용자 역할 추가

> 참고사항: 신규 작업 문서는 문서 작성일을 기준으로 `docs/work/YYYY-MM-DD-작업명.md` 형식의 파일명을 사용한다.

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-21
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-21 08:21 KST

## 배경과 목적

향후 관리자 기능의 접근 권한을 구분할 수 있도록 애플리케이션 사용자에게 `admin`과 `user` 두 역할을 부여한다.

## 범위

### 포함

- `public.users.role` 컬럼 추가
- `admin`, `user` 값만 허용하는 제약조건 추가
- 기존 사용자와 신규 사용자의 기본 역할을 `user`로 설정
- migration dry run, 원격 적용과 최신 상태 재검증

### 제외

- 관리자 지정 UI
- 기준정보 메뉴 노출 조건 변경
- 개별 페이지와 데이터에 대한 관리자 전용 RLS
- 역할 추가 또는 다중 역할 구조

## 완료 조건

- [x] `public.users.role`이 `not null default 'user'`로 추가된다.
- [x] `role`은 `admin` 또는 `user`만 허용한다.
- [x] 일반 인증 사용자는 자신의 역할을 변경할 수 없다.
- [x] 원격 `daehan` 프로젝트에 migration이 적용된다.
- [x] 후속 dry run에서 원격 migration 상태가 최신으로 확인된다.

## 현재 구현 조사

- 관련 route/component: `src/app/page.tsx`, `src/app/profile/page.tsx`에서 `public.users`를 조회하지만 이번 변경에서는 수정하지 않는다.
- 관련 Supabase table/bucket: `public.users`; bucket 해당 없음
- 재사용할 기존 패턴: `supabase/migrations/20260820000000_create_users.sql`의 제약조건, comment, RLS와 column-level update grant
- 문서와 구현의 차이: 현재 `public.users`에는 역할 컬럼이 없다.

## 설계

### UI와 반응형

- 모바일: 해당 없음 — UI 변경이 없다.
- 태블릿: 해당 없음 — UI 변경이 없다.
- 데스크톱: 해당 없음 — UI 변경이 없다.
- 로딩/빈 상태/오류/권한: 해당 없음 — 역할 저장 기반만 추가한다.
- 접근성: 해당 없음 — UI 변경이 없다.

### Server/Client 경계

- Server Component/Action: 이번 범위에서 변경하지 않는다.
- Client Component/Zustand: 이번 범위에서 변경하지 않는다.

### 데이터와 Supabase

- schema 변경: `public.users.role text not null default 'user'`
- PK/FK/index: 기존 PK/FK 유지, 두 값만 사용하는 컬럼이므로 인덱스는 추가하지 않는다.
- RLS 정책: 기존 본인 행 조회·수정 정책을 유지한다. `authenticated`에는 `name` 컬럼 update만 허용되어 `role` 자체 변경은 거부된다.
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 컬럼과 check constraint를 추가한다. rollback은 constraint와 `role` 컬럼을 제거한다.

## 변경 계획

1. 역할 컬럼, 기본값, 허용값 제약과 설명을 포함한 migration을 작성한다.
2. 연결된 원격 프로젝트에 dry run을 실행한다.
3. 승인된 migration을 원격에 적용한다.
4. 원격 migration 기록과 후속 dry run을 확인한다.

## 위험과 승인 사항

- 기존 사용자는 모두 `user`로 설정되므로 최초 `admin` 지정은 별도 관리 작업이 필요하다.
- 이번 변경만으로 메뉴나 API 접근이 제한되지는 않으며, 기능별 서버 검사와 RLS는 후속 작업에서 연결해야 한다.
- 사용자 승인: `admin | user` 두 역할과 제안된 migration 범위를 2026-08-21 08:21 KST에 승인받았다.

## 검증 계획

- [x] ESLint — SQL과 문서만 변경하여 미실행
- [x] TypeScript — 애플리케이션 타입을 변경하지 않아 미실행
- [x] 관련 단위/통합 테스트 — 해당 없음
- [x] 모바일 360px — 해당 없음
- [x] 태블릿 768px — 해당 없음
- [x] 데스크톱 1280px — 해당 없음
- [x] 키보드와 접근성 — 해당 없음
- [x] Supabase 허용/거부 정책 — 기존 `grant update (name)`만 유지되어 `role` 직접 수정 권한이 없음을 확인
- [x] 프로덕션 빌드 — 애플리케이션 코드 변경이 없어 미실행

## 결과

- 변경: `public.users.role`에 `admin | user` 역할, `user` 기본값과 허용값 제약을 추가했다.
- 검증: 적용 전 dry run에서 대상 migration 한 건만 확인하고 원격 적용 후 후속 dry run에서 최신 상태를 확인했다.
- 미실행: 실제 인증 세션을 사용한 역할 변경 거부 통합 테스트는 실행하지 않았다. SQL 권한상 `authenticated`는 `name`만 수정할 수 있다.
- 남은 위험/후속 작업: 기존 사용자는 모두 `user`이며 최초 관리자는 별도 관리 작업으로 `admin` 지정이 필요하다. 기능별 서버 검사와 RLS 연결은 후속 범위다.
