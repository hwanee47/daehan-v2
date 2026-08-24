# 품목별 오차범위 테이블 생성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 2026-08-24에 제안 DDL 확인 후 "승인"으로 응답함.

## 배경과 목적

품목마스터에 연결된 기준 치수 구간별 상한·하한 편차를 구조적으로 관리한다. 대칭 공차뿐 아니라 `+0.10 / 0`, `-0.05 / -0.10`처럼 비대칭이거나 음수로만 구성된 편차도 저장할 수 있어야 한다.

## 범위

### 포함

- `public.item_tolerance_ranges` 테이블 생성
- `public.items.seq`를 참조하는 FK와 삭제 제한
- 치수 구간·편차 순서 및 동일 품목 내 구간 중복 방지 제약
- 감사 컬럼과 기존 감사 trigger 적용
- 인증 사용자 조회, 관리자 변경 RLS와 최소 권한 grant
- 연결된 원격 `daehan` 프로젝트 dry run, 적용 및 migration 상태 재검증

### 제외

- 오차범위 관리 UI와 Server Action
- 초기 오차범위 데이터 입력
- TypeScript DB 타입 생성
- 기존 품목 또는 품목상세 데이터 변경

## 완료 조건

- [x] 품목별 치수 범위와 상한·하한 편차를 저장할 수 있다.
- [x] `item_seq`가 존재하는 `items.seq`만 참조한다.
- [x] 같은 품목에서 `(하한, 상한]` 치수 구간이 겹치지 않는다.
- [x] 상한 편차가 하한 편차보다 작은 값은 거부한다.
- [x] 인증 사용자는 조회할 수 있고 관리자만 변경할 수 있다.
- [x] migration이 원격 프로젝트에 적용되고 최신 상태로 확인된다.

## 현재 구현 조사

- 관련 route/component: 이번 범위에는 없음. 기존 품목관리 화면은 `/master/items`에 있다.
- 관련 Supabase table/bucket: `public.items`, `public.users`; Storage는 해당 없음.
- 재사용할 기존 패턴: identity `bigint` PK, `items.seq on delete restrict` FK, `public.set_audit_fields()`, 인증 사용자 조회·관리자 변경 RLS, 컬럼 단위 grant.
- 문서와 구현의 차이: 확인된 차이 없음.

## 설계

### UI와 반응형

- 모바일: 해당 없음.
- 태블릿: 해당 없음.
- 데스크톱: 해당 없음.
- 로딩/빈 상태/오류/권한: UI는 제외하며 DB 권한은 RLS로 제한한다.
- 접근성: 해당 없음.

### Server/Client 경계

- Server Component/Action: 해당 없음.
- Client Component/Zustand: 해당 없음.

### 데이터와 Supabase

- schema 변경: `public.item_tolerance_ranges`와 구간 중복 검사용 `btree_gist` extension을 추가한다.
- PK/FK/index: `seq` identity PK, `item_seq → items.seq on delete restrict`, `(item_seq, nominal_min)` 조회 index, 품목별 `numrange(nominal_min, nominal_max, '(]')` exclusion constraint.
- 값 규칙: `nominal_min >= 0`, `nominal_max > nominal_min`, `upper_deviation >= lower_deviation`. 편차는 양수·0·음수를 모두 허용한다.
- RLS 정책: 인증 사용자는 select 가능하고 `public.users.role = 'admin'`인 사용자만 insert/update/delete 가능하다. `anon` 권한은 부여하지 않는다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 신규 SQL migration으로 적용한다. rollback은 `public.item_tolerance_ranges`를 삭제하며, 다른 객체가 사용할 수 있는 `btree_gist` extension은 유지한다.

## 변경 계획

1. 작업 문서에 승인 범위와 데이터 규칙을 기록한다.
2. 테이블, 제약, index, comment, 감사 trigger, RLS와 grant를 migration으로 작성한다.
3. migration SQL과 변경 범위를 정적 검토한다.
4. 연결된 원격 프로젝트에 dry run 후 적용한다.
5. 원격 migration 기록과 후속 dry run으로 최신 상태를 검증한다.

## 위험과 승인 사항

- 구간은 이미지 표현에 맞춰 하한 제외·상한 포함 `(하한, 상한]`으로 정의한다.
- `numeric(12,4)`를 사용하므로 mm 단위로 소수점 넷째 자리까지 저장한다.
- 초기 데이터와 관리 UI는 포함하지 않는다.
- 위 범위는 2026-08-24 사용자 승인을 받았다.

## 검증 계획

- [x] SQL 및 migration diff 정적 검토
- [x] Supabase dry run
- [x] 원격 migration 적용 및 기록 확인
- [x] 구간·편차 제약 정의 검토 및 원격 schema lint
- [x] Supabase 허용/거부 정책 정의 검토 및 원격 schema lint
- [ ] ESLint (애플리케이션 코드 변경이 없어 생략)
- [ ] TypeScript (애플리케이션 코드 변경이 없어 생략)
- [ ] 프로덕션 빌드 (애플리케이션 코드 변경이 없어 생략)

## 결과

- 변경: `public.item_tolerance_ranges` 테이블과 관계·제약·index·감사 trigger·RLS·최소 권한을 migration으로 작성하고 연결된 원격 프로젝트에 적용했다.
- 검증: 최초 dry run에서 신규 migration 한 개만 적용 대상으로 확인했다. 적용 후 migration 목록에서 로컬·원격 `20260824010000` 일치를 확인했고, 후속 dry run은 `Remote database is up to date`, 원격 `db lint --level warning`은 `No schema errors found`를 반환했다.
- 미실행: 애플리케이션 코드를 변경하지 않아 ESLint, TypeScript와 프로덕션 빌드는 실행하지 않았다. 실제 업무 데이터를 생성하는 허용/거부 테스트는 초기 데이터 미입력 범위를 지키기 위해 실행하지 않았다.
- 남은 위험/후속 작업: 관리 UI와 초기 허용오차 데이터는 별도 작업이 필요하다. 실제 로그인 사용자별 RLS 통합 테스트는 해당 기능 구현 시 수행한다.
