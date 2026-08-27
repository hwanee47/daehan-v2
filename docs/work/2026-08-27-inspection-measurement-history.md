# 검사성적서 측정 이력 관리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

하나의 검사성적서를 반복 측정하면서 최신 입력값은 계속 수정하되, 저장 또는 인쇄를 요청한 시점의 성적서 정보와 측정결과를 회차별로 다시 조회하고 출력할 수 있어야 한다.

## 범위

### 포함

- 측정 저장·인쇄 요청별 append-only 이력과 검사항목 스냅샷 테이블
- 현재값 갱신과 이력 생성을 한 트랜잭션으로 처리하는 DB 함수
- 기존 측정값이 있는 성적서의 최초 이력 변환
- 최신 입력/과거 회차 선택, 과거 회차 읽기 전용 표시와 재인쇄
- 인증 사용자 조회 및 소유자·관리자 저장 권한

### 제외

- 이미 덮어쓴 과거 측정값 복구
- 기존 최신값 테이블 제거
- Storage 이미지 파일의 자동 버전 복제
- 브라우저 인쇄 대화상자에서 실제 출력 성공 여부 확인

## 완료 조건

- [x] 저장과 인쇄 요청마다 새 회차가 생성된다.
- [x] 회차에는 헤더, 품목 정보, 제품구분, 이미지 경로, 검사항목과 측정값이 함께 보존된다.
- [x] 최신 화면은 수정 가능하고 과거 회차는 읽기 전용으로 조회·재인쇄할 수 있다.
- [x] DB 변경이 원격 프로젝트에 재현 가능한 migration으로 적용된다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements`, `inspection-reports/actions.ts`, `data.ts`, `types.ts`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_report_items`, `inspection_report_measurements`, item image bucket
- 재사용할 기존 패턴: Server Action, 서버 Supabase client, Storage signed URL, 작업영역 container
- 문서와 구현의 차이: 없음

## 설계

### UI와 반응형

- 모바일: 목록과 상세가 세로 배치되며 회차 선택은 상세 상단에 표시한다.
- 태블릿: 작업영역 container 폭에 따라 기존 측정 양식 overflow를 유지한다.
- 데스크톱: 좌측 성적서 목록, 우측 최대 너비 측정 양식과 회차 선택을 유지한다.
- 로딩/빈 상태/오류/권한: 이력이 없으면 최신 입력만 표시하고 저장 오류는 하단 상태 영역에 표시한다.
- 접근성: 회차 select에 label을 연결하고 과거 입력 필드는 disabled 처리한다.

### Server/Client 경계

- Server Component/Action: 회차 조회, signed URL 생성, 입력 검증과 원자적 DB 함수 호출
- Client Component/Zustand: 선택한 성적서/회차, 최신 입력값, 인쇄 대화상자 호출의 지역 상태. Zustand 미사용

### 데이터와 Supabase

- schema 변경: `inspection_measurement_runs`, `inspection_measurement_run_items`, `save_inspection_measurement_run` 함수
- PK/FK/index: identity PK, report/run FK, report별 회차 unique와 최신 조회 index
- RLS 정책: authenticated select, 직접 insert/update/delete 미허용. 함수에서 소유자/관리자 검사
- Storage bucket/path/policy: 기존 bucket/policy 유지. 스냅샷에는 당시 경로를 저장한다.
- migration과 rollback: 기존 테이블을 보존하는 추가 migration. 앱 rollback은 기존 저장 흐름으로 복귀 가능하며 새 이력 테이블은 데이터 보존을 위해 자동 삭제하지 않는다.

## 변경 계획

1. 이력 테이블, 제약, RLS, 원자 저장 함수와 기존값 backfill migration을 작성한다.
2. 이력 타입과 조회 데이터를 추가하고 이미지 signed URL을 연결한다.
3. 저장·인쇄 Server Action을 DB 함수에 연결한다.
4. 최신/과거 회차 선택과 읽기 전용 표시·재인쇄를 구현한다.
5. 원격 dry run/apply/post-dry-run과 정적 검증을 수행한다.

## 위험과 승인 사항

- 같은 입력을 반복 저장해도 요구사항에 따라 매번 새 이력이 생성된다.
- 인쇄 이력은 실제 인쇄 완료가 아니라 브라우저 인쇄 요청 시점을 의미한다.
- 이미지 경로의 파일이 향후 같은 경로로 덮어써지면 과거 이미지도 달라질 수 있으므로 기존 파일 불변 경로 규칙을 유지해야 한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: 측정 회차/회차 검사항목 스냅샷, 원자 저장 함수, 기존값 backfill, 최신/이력 선택과 읽기 전용 재출력을 구현했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과. 원격 migration 적용 및 후속 dry run 최신 상태 확인.
- 미실행: 실제 인증 화면 수동 저장·인쇄 확인은 브라우저에 테스트 가능한 열린 로컬 앱 탭이 없어 수행하지 못했다.
- 남은 위험/후속 작업: 브라우저는 실제 프린터 출력 성공 여부를 제공하지 않으므로 `print`는 인쇄 요청 이력이다. 같은 Storage 경로의 이미지 파일을 덮어쓰지 않아야 과거 이미지가 유지된다.
