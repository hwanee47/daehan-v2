# 측정 이력 별도 메뉴 분리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

측정 입력과 이력 조회는 사용 목적과 정보 밀도가 다르다. 측정 이력을 별도 메뉴와 화면으로 분리하고, 회차 dropdown 대신 목록에서 이력을 탐색한 뒤 필요한 성적서만 팝업으로 확인하도록 개선한다.

## 범위

### 포함

- 검사성적서 하위 메뉴를 `성적서 관리`, `결과 입력`, `측정 이력`으로 구성
- 기존 `/inspection-measurements`는 최신 측정값 입력·저장·인쇄 전용 화면으로 단순화
- 신규 `/inspection-measurement-history` route와 작업영역 탭 추가
- 이력 화면 왼쪽에 검사성적서 목록, 오른쪽에 선택 성적서의 회차 목록 표시
- 회차 행에 회차, 저장/인쇄 구분, 일시, 제품구분, 시료수와 `성적서 보기` 제공
- `성적서 보기` 팝업에서 과거 스냅샷 전체 조회, 전체화면 이미지와 재인쇄 제공
- 이력 목록 내부 세로 스크롤과 최신순 정렬
- 직접 URL과 탭 작업영역, 단일·2분할 container 반응형 지원

### 제외

- DB schema와 migration 변경
- 이력 수정·삭제 기능
- 날짜 범위와 복합 검색 필터 — 실제 이력 증가 후 후속 검토
- 페이지네이션 — 현재 데이터 규모에서는 내부 스크롤로 시작

## 완료 조건

- [x] 검사성적서 하위 메뉴에 `측정 이력`이 별도로 표시된다.
- [x] 결과 입력 화면에는 과거 이력 전환 UI가 남지 않는다.
- [x] 측정 이력 화면에서 성적서를 선택하면 회차 목록을 최신순으로 확인할 수 있다.
- [x] `성적서 보기`를 눌러 선택한 회차의 전체 스냅샷을 팝업으로 조회·재인쇄할 수 있다.
- [x] 결과 입력 중인 상태와 이력 조회 탭이 서로 독립적으로 유지된다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/page.tsx`, `inspection-measurement-sheet.tsx`, `workspace-panels.tsx`, `(app)/layout.tsx`
- 관련 메뉴/tab: `src/app/inspection-report-menu.tsx`, `src/lib/app-tabs.ts`, workspace tab store
- 관련 Supabase table/bucket: 기존 `inspection_measurement_runs`, `inspection_measurement_run_items`, item image signed URL 재사용
- 재사용할 기존 패턴: 측정 성적서 양식, `MarkerFullscreenDialog`, 작업영역 panel, Base UI Dialog
- 문서와 구현의 차이: 현재 `측정 관리` 한 화면 안에 결과 입력과 측정 이력 탭이 함께 있다.

## 설계

### UI와 반응형

- 메뉴: `성적서 관리 / 결과 입력 / 측정 이력`의 3개 업무 메뉴로 분리한다.
- 결과 입력: 기존 좌측 성적서 목록과 우측 입력 양식만 유지한다.
- 측정 이력: 왼쪽 성적서 요약 목록, 오른쪽 회차 목록. 회차 선택만으로 큰 양식을 즉시 렌더링하지 않는다.
- 회차 행: 회차와 유형을 첫 줄, 생성 일시와 당시 제품정보를 둘째 줄에 배치하고 오른쪽에 `성적서 보기` 버튼을 둔다.
- 성적서 보기: viewport Portal Dialog로 열고 전체 양식을 독립 스크롤 영역에 표시한다. 하단에 닫기와 인쇄 버튼을 고정한다.
- 좁은 panel: 성적서 목록과 이력 목록을 세로 배치한다. Dialog는 viewport 기준으로 유지한다.
- 로딩/빈 상태/오류/권한: 성적서 없음, 선택 없음, 이력 없음 상태를 각각 구분한다.
- 접근성: 목록 button, Dialog focus trap/Escape, 이력별 명확한 `성적서 보기` 접근성 이름을 제공한다.

### Server/Client 경계

- Server Component/Action: 기존 `getInspectionReportData` 결과와 signed URL을 재사용한다.
- Client Component/Zustand: 이력 성적서/회차/팝업 선택은 이력 panel의 지역 상태로 둔다. 열린 앱 탭만 기존 Zustand를 사용한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 기존 이력 최신 조회 index 재사용
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 기존 signed URL 재사용, 변경 없음
- migration과 rollback: migration 없음. 신규 route/panel과 메뉴 항목을 제거하고 입력 화면 내부 이력 탭을 복원할 수 있다.

## 변경 계획

1. 메뉴와 앱 탭에 `결과 입력`, `측정 이력`을 분리 등록한다.
2. 결과 입력 컴포넌트에서 화면 내부 모드와 이력 dropdown을 제거한다.
3. 이력 목록 전용 컴포넌트와 신규 route/workspace panel을 추가한다.
4. 과거 성적서 보기 Dialog와 재인쇄를 기존 양식 기반으로 연결한다.
5. 직접 URL, 앱 탭, 단일·2분할에서 상태와 스크롤을 검증한다.
6. lint, typecheck와 production build를 수행한다.

## 위험과 승인 사항

- 최상위 작업 탭에서 `결과 입력`과 `측정 이력`이 각각 열리므로 열린 탭 최대 5개 제한을 각각 사용한다.
- 과거 성적서 재인쇄는 기존 이력을 출력하며 새 이력을 추가하지 않는다.
- 이력이 매우 많아지면 날짜 필터와 서버 페이지네이션이 필요할 수 있으나 이번 범위에는 포함하지 않는다.
- DB 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책 — DB 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: `결과 입력`과 `측정 이력`을 별도 메뉴·route·작업 탭으로 분리하고, 이력 목록과 성적서 보기 Dialog를 추가했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과.
- 미실행: 브라우저 격리 환경에서 localhost 연결이 거부되어 실제 viewport 자동 확인은 수행하지 못했다.
- 남은 위험/후속 작업: 이력 데이터가 매우 많아지면 날짜 필터와 서버 페이지네이션을 추가 검토한다.
