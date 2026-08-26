# 검사성적서 마스터·디테일 테이블 생성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

현재 검사성적서 화면은 정적 예시 데이터만 표시하며 실제 업무 데이터를 저장할 테이블이 없다. 품목상세와 연결된 검사성적서 기본 정보와 최대 10개 시료의 항목별 측정 결과를 Supabase에 재현 가능한 구조로 저장한다.

## 범위

### 포함

- `public.inspection_reports` 마스터 테이블
- `public.inspection_report_details` 디테일 테이블
- 품목상세 FK와 발행 당시 기종·품목상세코드 스냅샷
- 제품구분·최종판정 코드 그룹 및 코드 소속 검증
- 수량, 시료수, 상태, 공차와 정렬순서 제약
- 공통 감사 컬럼과 trigger
- authenticated 조회·등록, 작성자 또는 admin 수정·삭제 RLS
- 필요한 index, grant와 sequence 권한
- 연결된 원격 `daehan` 프로젝트 dry run, migration 적용 및 상태 재검증

### 제외

- 제품구분·최종판정 실제 상세 코드 seed
- 검사성적서 화면의 조회·등록·수정·삭제 연결
- 성적서 번호 생성 규칙과 출력/PDF
- 결과값 자동 판정과 완료 상태 전환 규칙
- 기존 정적 예시 데이터 이관

## 완료 조건

- [x] 마스터와 디테일이 승인된 컬럼·타입·제약으로 생성된다.
- [x] 품목상세 삭제가 연결된 성적서 때문에 제한되고, 마스터 삭제 시 디테일은 함께 삭제된다.
- [x] 품목상세 선택 시 기종·품목상세코드 스냅샷이 자동 기록된다.
- [x] 제품구분과 최종판정 코드가 각각 지정 코드 그룹에 속하는지 검증된다.
- [x] 납품수량, 시료수 1~10, 공차 순서와 디테일 정렬순서가 검증된다.
- [x] authenticated는 조회·등록, 작성자 또는 admin은 수정·삭제할 수 있다.
- [x] migration이 원격 프로젝트에 적용되고 후속 dry run이 최신 상태다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/inspection-reports/page.tsx`, `inspection-reports-grid.tsx`
- 관련 Supabase table/bucket: `public.items`, `public.item_details`, `public.code_groups`, `public.code_details`, `public.users`; Storage 해당 없음
- 재사용할 기존 패턴: bigint identity PK, `public.set_audit_fields()`, 공통 감사 컬럼, authenticated/admin RLS와 컬럼 단위 grant
- 문서와 구현의 차이: 검사성적서 화면은 정적 배열만 사용하며 DB query와 mutation이 없다.

## 설계

### UI와 반응형

- 모바일: 해당 없음. 이번 범위는 DB 테이블 생성만 포함한다.
- 태블릿: 해당 없음
- 데스크톱: 해당 없음
- 로딩/빈 상태/오류/권한: UI 변경 없음. 데이터 권한은 RLS로 보장한다.
- 접근성: 해당 없음

### Server/Client 경계

- Server Component/Action: 이번 범위에서 애플리케이션 연결 없음
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: `inspection_reports`, `inspection_report_details`, 코드 검증 및 품목 스냅샷 trigger 함수 생성
- PK/FK/index: identity PK, 품목상세 및 코드 FK `on delete restrict`, 디테일 마스터 FK `on delete cascade`; 검사일·품목상세·상태와 디테일 조회 index
- RLS 정책: authenticated select/insert, `created_by = auth.uid()` 또는 admin update/delete
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 신규 SQL migration으로 적용한다. rollback은 디테일→마스터→전용 함수 순서로 제거한다. 코드 그룹은 향후 상세 코드가 연결될 수 있어 자동 삭제하지 않는다.

## 변경 계획

1. 승인 내용을 기록한 작업 문서를 작성한다.
2. 코드 그룹, 두 테이블, 제약·index·trigger·RLS·grant를 포함한 migration을 작성한다.
3. Supabase CLI dry run으로 적용 대상을 검토한다.
4. 원격 `daehan` 프로젝트에 migration을 적용한다.
5. 원격 migration 기록과 후속 dry run을 확인한다.
6. 가능한 schema lint와 허용·거부 케이스를 검토한다.

## 위험과 승인 사항

- 기종과 품목상세코드는 선택한 `item_details.seq`에서 trigger가 복사해 역사적 스냅샷으로 저장한다.
- `PRODUCT_TYPE`, `FINAL_JUDGMENT_STATUS` 코드 그룹만 생성하며 실제 코드값은 임의로 만들지 않는다.
- `product_type_code_seq`는 필수이고 `final_judgment_code_seq`는 판정 전 null을 허용한다.
- 상태는 `draft`, `completed`, `cancelled`만 허용하며 기본값은 `draft`다.
- 결과 1~10은 작성 중 저장을 위해 null을 허용한다. 완료 시 필수 결과 개수 검증은 후속 업무 규칙으로 남긴다.

## 검증 계획

- [x] ESLint — 해당 없음, 애플리케이션 코드 변경 없음
- [x] TypeScript — 해당 없음, 애플리케이션 코드 변경 없음
- [x] 관련 단위/통합 테스트 — 원격 dry run, 적용, 후속 dry run과 schema lint로 대체
- [x] 모바일 360px — 해당 없음
- [x] 태블릿 768px — 해당 없음
- [x] 데스크톱 1280px — 해당 없음
- [x] 키보드와 접근성 — 해당 없음
- [x] Supabase 허용/거부 정책 — RLS와 column grant 정적 검토, 원격 schema lint 통과
- [x] 프로덕션 빌드 — 해당 없음, 애플리케이션 코드 변경 없음

## 결과

- 변경: 검사성적서 마스터·디테일 테이블, 코드 그룹, 품목 스냅샷·코드 검증·감사 trigger, 제약·index·RLS·column grant를 migration으로 작성하고 원격 프로젝트에 적용했다.
- 검증: 최초 dry run에서 migration 한 건만 확인하고 적용했다. 후속 dry run은 원격 최신 상태, migration list는 `20260826000000` 로컬·원격 일치, `supabase db lint --linked`는 schema 오류 없음, `git diff --check` 통과.
- 미실행: 별도 인증 사용자 세션으로 작성자·다른 사용자·관리자별 실제 CRUD 허용·거부 테스트는 실행하지 못했다.
- 남은 위험/후속 작업: `PRODUCT_TYPE`, `FINAL_JUDGMENT_STATUS` 상세 코드 등록과 검사성적서 화면의 실제 DB 연결이 필요하다. 완료 상태에서 시료수만큼 결과를 필수화하는 규칙은 후속 업무 정의가 필요하다.
