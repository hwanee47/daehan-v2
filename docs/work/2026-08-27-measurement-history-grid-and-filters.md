# 측정 이력 조회조건·그리드 개선

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: `조회조건 이력유형은 빼고 승인`, 2026-08-27

## 배경과 목적

현재 측정 이력은 성적서 목록과 회차 카드 목록으로 구성되어 있어 데이터가 많아질수록 원하는 이력을 빠르게 찾고 비교하기 어렵다. 전체 이력을 조회조건으로 필터링하고 AG Grid에서 일관되게 탐색하도록 변경한다.

## 범위

### 포함

- 측정 이력 화면 상단에 조회조건 영역 추가
- 조회조건: 시작일, 종료일, 검색 유형(기종·품번/도번·품명·고객명), 검색어
- 조회·초기화 버튼과 조회 결과 건수 표시
- 성적서/회차 카드 목록을 하나의 AG Grid로 통합
- 그리드 컬럼: 성적서번호, 회차, 유형, 저장일시, 기종, 품번/도번, 품명, 고객명, 제품구분, 시료수, 성적서 보기
- 최신 일시순 기본 정렬, 단일 행 선택, 행 더블클릭과 `성적서 보기` 버튼으로 팝업 열기
- 기존 성적서 보기 Dialog와 재인쇄 기능 유지
- 직접 URL과 작업 탭, 단일·2분할 container 반응형 지원

### 제외

- DB schema와 migration 변경
- 서버 페이지네이션·서버 검색 — 현재 로드된 이력 데이터 범위에서 클라이언트 필터 적용
- 이력 수정·삭제
- CSV/Excel 내보내기

## 완료 조건

- [x] 조회조건으로 여러 성적서의 이력을 한 번에 필터링할 수 있다.
- [x] 이력이 AG Grid 한 화면에 최신순으로 표시된다.
- [x] 선택 포커스는 공통 AG Grid 기준에 따라 한 행만 유지된다.
- [x] 행 더블클릭 또는 보기 버튼으로 과거 성적서를 조회·재인쇄할 수 있다.
- [x] 좁은 패널에서는 조회조건이 세로로 재배치되고 그리드는 필요한 경우 가로 스크롤을 제공한다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurement-history/inspection-measurement-history.tsx`, `page.tsx`, `workspace-panels.tsx`
- 관련 Supabase table/bucket: 기존 `inspection_measurement_runs`, `inspection_measurement_run_items` 조회 결과 재사용
- 재사용할 기존 패턴: `AgGridProvider`, `AgGridReact`, `appGridTheme`, `appGridSingleRowSelection`, `syncSelectedGridRow`, 조회/초기화 form
- 문서와 구현의 차이: 현재 이력은 왼쪽 성적서 목록과 오른쪽 회차 카드 목록이며 조회조건이 없다.

## 설계

### UI와 반응형

- 조회조건 영역은 평면 surface 안에 한 줄로 배치하고 좁은 workspace에서는 영역 내부만 가로 스크롤한다.
- 날짜는 native date input을 사용한다. 검색 유형 선택박스에서 기종·품번/도번·품명·고객명을 고르고 하나의 검색어 입력란으로 부분일치 검색한다. 이력유형은 조회조건에서 제외하고 그리드 컬럼으로만 표시한다.
- 조회를 눌러야 조건이 적용되며 초기화는 입력값과 적용 조건을 모두 비운다.
- 그리드는 화면의 남은 높이를 사용하고 최소 너비를 제공해 좁은 panel에서 가로 스크롤한다.
- 보기 버튼은 고정된 action column에 두고 행 더블클릭도 같은 Dialog를 연다.
- 빈 상태는 전체 데이터 없음과 조회 결과 없음으로 구분한다.
- 로딩/오류/권한: 기존 오류 경계를 유지한다.
- 접근성: 모든 조회조건에 label을 연결하고 그리드 키보드 탐색 및 Enter로 성적서 보기를 지원한다.

### Server/Client 경계

- Server Component/Action: 기존 `getInspectionReportData`를 그대로 사용한다.
- Client Component/Zustand: 조회조건 draft/applied, 선택 이력과 Dialog 상태는 화면 지역 상태로 관리한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: migration 없음. 이력 컴포넌트 UI 변경만 되돌리면 된다.

## 변경 계획

1. 조회조건 draft/applied 상태와 필터 함수를 추가한다.
2. 성적서·품목 정보를 이력 행에 결합한 grid row model을 구성한다.
3. 카드 목록을 공통 AG Grid로 교체하고 보기/더블클릭 동작을 연결한다.
4. 기존 성적서 보기 Dialog와 인쇄 흐름을 유지한다.
5. 직접 URL과 단일·2분할에서 조회조건, grid overflow와 선택 상태를 검증한다.
6. lint, typecheck와 production build를 수행한다.

## 위험과 승인 사항

- 현재는 페이지 진입 시 전체 이력을 가져온 뒤 클라이언트에서 필터링한다. 데이터가 수천~수만 건으로 증가하면 서버 검색과 페이지네이션을 별도 작업으로 전환해야 한다.
- DB 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — DB 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 이력유형을 제외한 조회조건과 통합 AG Grid를 추가했다. 기종·품번/도번·품명·고객명은 하나의 검색 유형 선택박스와 검색어 입력란으로 통합하고 날짜·버튼과 한 줄에 배치했다. 보기·더블클릭·Enter 동작으로 기존 과거 성적서 Dialog를 연결했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 실제 브라우저에서 모바일·태블릿·분할 패널 시각 검증 및 키보드 보조기기 검증
- 남은 위험/후속 작업: 이력 규모 증가 시 서버 페이지네이션 전환 기준을 확인한다.
