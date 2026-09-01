# 검사성적서 측정 화면 기본정보 및 빈 검사항목 입력

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-01
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-09-01

## 배경과 목적

검사성적서 측정 화면에서 재질, 경도, 열처리를 바로 보완하고, 성적서 하단의 빈 행에 기준치수와 공차를 추가한 뒤 측정결과와 함께 저장할 수 있게 한다.

## 범위

### 포함

- 입력 화면의 재질, 경도, 열처리 수정
- 빈 행의 기준치수, 공차 상한·하한 입력
- 신규 검사항목과 측정결과의 원자적 저장
- 수정된 기본정보를 새 측정 이력에 스냅샷으로 기록
- 과거 이력의 읽기 전용 유지

### 제외

- 기존 검사항목의 기준치수·공차 수정
- 과거 측정 이력 수정
- 테이블·컬럼·RLS 정책 변경
- 순번 위치 자동 지정

## 완료 조건

- [x] 입력 화면에서 재질, 경도, 열처리를 수정할 수 있다.
- [x] 빈 행에 기준치수와 공차를 입력할 수 있다.
- [x] 완전히 빈 행은 무시하고 일부만 입력한 행은 저장하지 않는다.
- [x] 신규 검사항목, 측정값, 기본정보와 이력이 한 트랜잭션으로 저장된다.
- [x] 과거 이력 화면과 인쇄 레이아웃은 읽기 전용 형태를 유지한다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/inspection-measurement-sheet.tsx`, `inspection-reports/actions.ts`, `inspection-reports/types.ts`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_report_items`, `inspection_report_measurements`, `inspection_measurement_runs`, `inspection_measurement_run_items`; Storage 변경 없음
- 재사용할 기존 패턴: `save_inspection_measurement_run` RPC와 측정 이력 스냅샷 trigger
- 문서와 구현의 차이: 화면의 최소 10행 중 DB 검사항목이 없는 행은 현재 정적 빈 셀이라 입력이나 저장이 불가능하다.

## 설계

### UI와 반응형

- 모바일: 기존 최소 성적서 너비와 가로 스크롤 유지
- 태블릿: 기존 성적서 배치 유지
- 데스크톱: 중요항목 행과 빈 검사항목 셀 안에서 직접 입력
- 로딩/빈 상태/오류/권한: 저장 중 비활성화, 부분 입력 행별 오류 메시지 제공, 기존 권한 오류 경계 유지
- 접근성: 입력별 `aria-label`, 키보드 입력과 기존 저장 단축키 유지

### Server/Client 경계

- Server Component/Action: Server Action에서 입력을 재검증하고 신규 RPC 호출
- Client Component/Zustand: 화면별 임시 입력은 지역 상태에만 보관

### 데이터와 Supabase

- schema 변경: 컬럼 변경 없음. 원자적 저장 RPC 추가 및 `inspection_reports.material` update grant 추가
- PK/FK/index: 변경 없음
- RLS 정책: 기존 작성자 또는 관리자 제한 유지
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 신규 RPC 제거 및 material update grant 회수로 롤백

## 변경 계획

1. 원자적 측정 저장 RPC migration을 작성한다.
2. Server Action의 검증과 반환 타입을 확장한다.
3. 측정 화면에 기본정보 및 빈 검사항목 입력 상태를 연결한다.
4. 원격 dry run·적용과 정적·빌드 검증을 수행한다.

## 위험과 승인 사항

- 신규 행은 기준치수, 공차 하한, 공차 상한을 모두 입력해야 한다.
- 기존 검사항목은 이 화면에서 구조를 변경하지 않는다.
- 새 행의 순번 위치는 미지정 상태로 저장한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 관련 입력 검증
- [x] 화면·인쇄 읽기 전용 전환
- [x] 원격 migration dry run 및 적용
- [x] 후속 migration 최신 상태
- [x] 프로덕션 빌드

## 결과

- 변경: 측정 입력 화면에서 재질·경도·열처리와 빈 행의 기준치수·공차를 입력하고 측정결과와 함께 원자적으로 저장하도록 구현했다.
- 검증: ESLint, TypeScript, `git diff --check`, Next.js webpack 프로덕션 빌드가 통과했다. 원격 migration `20260901030000` 적용과 후속 dry run 최신 상태를 확인했다.
- 미실행: 운영 성적서 데이터가 생성·변경되는 실제 저장 버튼 테스트는 수행하지 않았다.
- 남은 위험/후속 작업: 사용 중인 운영 성적서 한 건에서 신규 빈 행 입력과 저장 후 재조회 흐름을 확인하는 것이 권장된다. 빌드 중 Supabase SDK가 Node.js 20 지원 중단 예정 경고를 출력했다.
