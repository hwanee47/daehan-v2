# 검사성적서 디테일을 검사항목·측정결과로 분리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

현재 `inspection_report_details`는 검사항목의 기준치수·공차와 시료 측정결과를 한 행에 함께 저장한다. 검사항목 정의와 측정결과의 책임을 분리해 구조를 명확히 하고, 기존 데이터는 손실 없이 새 구조로 이관한다.

## 범위

### 포함

- 기존 `inspection_report_details`를 `inspection_report_items`로 이름 변경
- 검사항목 테이블에 일련번호, 정렬순서, 마스터 FK, 기준치수, 공차 min/max와 감사 컬럼 유지
- `inspection_report_measurements` 신규 생성
- 측정결과 테이블에 마스터 FK, 검사항목 FK, 결과 1~10, 비고와 감사 컬럼 생성
- 기존 결과 1~10·비고를 측정결과 테이블로 전량 이관
- 측정결과와 검사항목의 마스터가 일치하도록 복합 FK 적용
- 검사항목당 측정결과 한 행만 허용
- 기존 RLS·grant를 새 테이블명과 구조에 맞게 정리
- 원격 dry run, 적용, migration 기록·후속 dry run·schema lint 확인

### 제외

- 검사성적서 화면 DB 연결
- 여러 차수의 재검사 결과 저장
- 결과값 자동 판정
- 마스터 테이블 구조 변경

## 완료 조건

- [x] 기존 디테일이 검사항목으로 이름과 역할이 변경된다.
- [x] 결과 1~10과 비고가 측정결과 테이블로 손실 없이 이관된다.
- [x] 검사항목에는 기준치수와 공차만 남는다.
- [x] 측정결과의 마스터와 검사항목 마스터가 항상 일치한다.
- [x] 한 검사항목에 측정결과가 한 행만 연결된다.
- [x] 마스터 또는 검사항목 삭제 시 하위 데이터가 함께 삭제된다.
- [x] 기존 작성자·관리자 권한 규칙이 두 테이블에 유지된다.
- [x] 원격 migration 적용 후 최신 상태와 schema lint를 확인한다.

## 현재 구현 조사

- 관련 route/component: 검사성적서 화면은 아직 정적 데이터만 사용해 애플리케이션 호출부 변경이 없다.
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_report_details`; Storage 해당 없음
- 재사용할 기존 패턴: 공통 감사 trigger, 마스터 작성자 또는 admin 기반 RLS, column grant
- 문서와 구현의 차이: 기존 작업 문서는 단일 디테일 테이블을 설명하므로 이번 작업 결과로 대체되는 구조를 별도 기록한다.

## 설계

### UI와 반응형

- 모바일: 해당 없음, DB migration만 포함
- 태블릿: 해당 없음
- 데스크톱: 해당 없음
- 로딩/빈 상태/오류/권한: UI 변경 없음. RLS 권한은 기존과 동일하게 유지한다.
- 접근성: 해당 없음

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: `inspection_report_items`로 rename, 결과 컬럼 제거, `inspection_report_measurements` 생성
- PK/FK/index: 검사항목 `(inspection_report_seq, seq)` unique, 측정결과의 마스터 직접 FK와 검사항목 복합 FK, 검사항목 1:1 unique
- RLS 정책: authenticated select, 마스터 작성자 또는 admin insert/update/delete
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 기존 행마다 측정결과 한 행을 먼저 생성하고 행 수 일치 확인 후 결과 컬럼을 제거한다. rollback은 결과 컬럼을 복구해 측정값을 되돌린 뒤 측정결과를 삭제하고 테이블명을 원복한다.

## 변경 계획

1. 승인 내용을 기록한 작업 문서를 작성한다.
2. rename, 데이터 이관, 컬럼 제거, 새 FK·RLS·grant를 포함한 migration을 작성한다.
3. migration 내부에 검사항목·측정결과 행 수 일치 검증을 추가한다.
4. 원격 dry run으로 적용 대상을 확인한다.
5. 원격 migration을 적용한다.
6. migration 기록, 후속 dry run과 schema lint를 확인한다.

## 위험과 승인 사항

- 결과 1~10이 시료 전체를 표현하므로 검사항목과 측정결과를 1:1로 제한한다.
- `inspection_report_seq`는 관계상 중복되지만 요청대로 측정결과에 유지하고 복합 FK로 불일치를 차단한다.
- 기존 데이터가 있으면 빈 결과 행을 포함해 검사항목마다 측정결과 한 행을 생성한다.
- 현재 애플리케이션은 정적 예시 데이터만 사용하므로 코드 호출부는 영향을 받지 않는다.

## 검증 계획

- [x] ESLint — 해당 없음, 애플리케이션 코드 변경 없음
- [x] TypeScript — 해당 없음, 애플리케이션 코드 변경 없음
- [x] 관련 단위/통합 테스트 — migration 내부 행 수 검증, 원격 dry run·적용·후속 dry run과 schema lint로 대체
- [x] 모바일 360px — 해당 없음
- [x] 태블릿 768px — 해당 없음
- [x] 데스크톱 1280px — 해당 없음
- [x] 키보드와 접근성 — 해당 없음
- [x] Supabase 허용/거부 정책 — RLS·column grant 정적 검토, 원격 schema lint 통과
- [x] 프로덕션 빌드 — 해당 없음, 애플리케이션 코드 변경 없음

## 결과

- 변경: 기존 디테일을 `inspection_report_items`로 rename하고 결과 1~10·비고를 신규 `inspection_report_measurements`로 이관했다. 복합 FK, 검사항목당 한 행 unique, 감사 trigger, RLS와 column grant를 적용했다.
- 검증: 최초 dry run에서 migration 한 건만 확인하고 적용했다. migration 내부에서 검사항목·측정결과 행 수 일치를 검증했으며, 후속 dry run 최신 상태, `20260826010000` 로컬·원격 기록 일치, 원격 schema lint 오류 없음, `git diff --check` 통과.
- 미실행: 별도 인증 사용자 세션으로 작성자·다른 사용자·관리자별 실제 CRUD 허용·거부 테스트는 실행하지 못했다.
- 남은 위험/후속 작업: 검사성적서 화면 DB 연결과 완료 상태에서 시료수만큼 결과값을 필수화하는 업무 규칙은 후속 작업이다.
