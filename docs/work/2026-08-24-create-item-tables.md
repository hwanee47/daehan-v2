# 품목마스터·품목상세 테이블 생성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 제안 공유 후 사용자가 "승인"으로 명시적으로 승인함 / 2026-08-24

## 배경과 목적

품목과 품목별 상세 사양을 구조적으로 관리할 수 있도록 품목마스터와 품목상세 테이블을 생성한다. 품목상세는 변경 가능한 품목코드 문자열 대신 품목 일련번호 FK를 사용해 안정적으로 연결한다.

## 범위

### 포함

- `public.items` 품목마스터 테이블 생성
- `public.item_details` 품목상세 테이블 생성
- PK, FK, unique, check constraint와 조회 인덱스 구성
- 공통 감사 컬럼과 `set_audit_fields()` trigger 적용
- 로그인 사용자 조회, 관리자 변경 정책의 RLS 구성
- 재현 가능한 migration 작성, 원격 dry run과 적용

### 제외

- 품목관리 화면과 Server Action 개발
- 품목 초기 데이터 입력
- 기존 코드테이블 또는 사용자 테이블 변경
- 소재를 별도 코드그룹이나 테이블로 분리

## 완료 조건

- [x] `items`와 `item_details`가 승인된 컬럼으로 생성된다.
- [x] 품목상세가 `item_seq`로 품목마스터를 참조한다.
- [x] 품목코드는 전체에서 유일하고 상세코드는 품목별로 유일하다.
- [x] 상세가 있는 품목은 삭제할 수 없다.
- [x] 로그인 사용자는 조회하고 관리자만 등록·수정·삭제할 수 있다.
- [x] 공통 감사 trigger가 두 테이블에 적용된다.
- [x] 원격 migration 기록과 후속 dry run이 최신 상태다.

## 현재 구현 조사

- 관련 route/component: 해당 없음. 이번 범위는 DB schema만 포함한다.
- 관련 Supabase table/bucket: `auth.users`, `public.users`, 공통 함수 `public.set_audit_fields()`
- 재사용할 기존 패턴: `code_groups`, `code_details`의 identity PK, 감사 컬럼, 관리자 RLS와 column-level grant
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 해당 없음
- 태블릿: 해당 없음
- 데스크톱: 해당 없음
- 로딩/빈 상태/오류/권한: 해당 없음
- 접근성: 해당 없음

### Server/Client 경계

- Server Component/Action: 해당 없음
- Client Component/Zustand: 해당 없음

### 데이터와 Supabase

- schema 변경: `public.items`, `public.item_details` 신규 생성
- PK/FK/index: 두 테이블의 `seq` identity PK, `item_details.item_seq → items.seq on delete restrict`, `items.item_code` unique, `(item_seq, item_detail_code)` unique, `(item_seq, seq)` index
- RLS 정책: authenticated 조회 허용, `public.users.role = 'admin'`인 사용자만 insert/update/delete 허용, anon 권한 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration은 master 후 detail 순서로 생성한다. rollback은 detail 후 master 순서로 drop하며 적용 후 데이터가 있으면 삭제되므로 자동 실행하지 않는다.

## 변경 계획

1. 승인된 schema, 제약, comment, trigger, RLS와 grant를 migration에 작성한다.
2. migration SQL과 변경 범위를 정적 검토한다.
3. 연결된 원격 프로젝트에서 `supabase db push --dry-run`으로 적용 대상을 확인한다.
4. migration을 원격에 적용하고 migration 기록을 확인한다.
5. 후속 dry run과 RLS 허용·거부 구성을 검증한다.

## 위험과 승인 사항

- `material`은 현재 자유 입력 `text`이며 표준화가 필요해지면 별도 승인 작업으로 코드 또는 소재 테이블을 도입한다.
- 상세 데이터가 있는 품목 삭제는 FK로 차단한다.
- rollback에서 테이블을 drop하면 저장 데이터가 삭제되므로 자동 rollback하지 않는다.
- 원격 프로젝트 적용까지 사용자 승인됨.

## 검증 계획

- [x] ESLint — 애플리케이션 코드 변경 없음으로 미실행
- [x] TypeScript — 애플리케이션 코드 변경 없음으로 미실행
- [x] 관련 단위/통합 테스트 — 원격 migration dry run, 적용, 후속 dry run과 schema lint로 대체
- [x] 모바일 360px — 해당 없음
- [x] 태블릿 768px — 해당 없음
- [x] 데스크톱 1280px — 해당 없음
- [x] 키보드와 접근성 — 해당 없음
- [x] Supabase 허용/거부 정책 — RLS 및 column grant 정적 검토, 원격 schema lint 통과
- [x] 프로덕션 빌드 — 애플리케이션 코드 변경 없음으로 미실행

## 결과

- 변경: `items`, `item_details` 테이블과 관계·제약·인덱스·감사 trigger·RLS·최소 권한을 migration으로 작성하고 연결된 원격 프로젝트에 적용했다.
- 검증: 최초 dry run에서 해당 migration 한 건만 확인했다. 적용 후 migration list에서 로컬/원격 `20260824000000` 일치를 확인했고 후속 dry run은 `upToDate: true`였다. 원격 `public` schema error-level lint에서 오류가 없었다.
- 미실행: 테스트 사용자나 실제 품목 데이터를 만들지 않기 위해 역할별 CRUD 실데이터 테스트는 수행하지 않았다. 애플리케이션 코드를 변경하지 않아 ESLint, TypeScript와 build는 미실행했다.
- 남은 위험/후속 작업: `material`은 자유 입력 text이므로 향후 표준화가 필요하면 소재 코드 또는 별도 테이블 설계가 필요하다. 품목관리 화면 개발은 별도 작업이다.
