# 측정 관리 입력·이력 화면 분리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

현재 `측정결과 입력` 화면에서 최신값 입력과 과거 회차 조회가 한 화면에 섞여 있다. 최상위 메뉴 수는 늘리지 않으면서 입력 업무와 과거 이력 조회 업무를 명확히 구분한다.

## 범위

### 포함

- 메뉴명 `측정결과 입력`을 `측정 관리`로 변경
- 측정 관리 화면 상단에 `결과 입력`, `측정 이력` 전환 탭 추가
- 결과 입력 화면은 최신값 입력·저장·신규 인쇄에 집중
- 측정 이력 화면은 성적서 목록, 회차 목록, 과거 스냅샷 조회와 재인쇄에 집중
- 기존 회차 선택 dropdown을 입력 화면에서 제거하고 이력 화면으로 이동
- 직접 URL과 작업영역 탭 양쪽에서 동일하게 동작
- 현재 이력 테이블과 조회 데이터를 그대로 재사용

### 제외

- 새 최상위/2레벨 메뉴 추가
- DB schema와 migration 변경
- 이력 수정 또는 삭제 기능
- 성적서 관리 화면 변경

## 완료 조건

- [x] 앱 메뉴와 열린 탭에서 `측정 관리`로 표시된다.
- [x] 결과 입력과 측정 이력을 화면 안의 명확한 탭으로 전환할 수 있다.
- [x] 결과 입력에서는 최신값만 편집·저장·인쇄할 수 있다.
- [x] 측정 이력에서는 회차별 전체 스냅샷을 읽기 전용으로 조회하고 재인쇄할 수 있다.
- [x] 메뉴 수는 현재 2개를 유지한다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/page.tsx`, `inspection-measurement-sheet.tsx`, `workspace-panels.tsx`
- 관련 메뉴: `src/lib/app-tabs.ts`, `src/app/inspection-report-menu.tsx`
- 관련 Supabase table/bucket: 기존 `inspection_measurement_runs`, `inspection_measurement_run_items`와 signed image URL 재사용
- 재사용할 기존 패턴: 작업영역 tab 유지, container query, 현재 측정 양식과 이력 selector
- 문서와 구현의 차이: 현재 이력 회차 selector가 입력 form 위에 있어 입력/조회 목적이 혼재한다.

## 설계

### UI와 반응형

- 화면 breadcrumb와 앱 탭 명칭을 `측정 관리`로 통일한다.
- 화면 상단에는 `결과 입력`, `측정 이력` 두 개의 접근 가능한 탭을 배치한다.
- 결과 입력: 기존 좌측 성적서 목록과 우측 편집 양식을 유지하되 이력 selector를 제거한다.
- 측정 이력: 좌측 성적서 목록, 우측 회차 선택과 읽기 전용 성적서 양식을 배치한다.
- 좁은 작업 패널에서는 목록과 본문을 세로로 배치하고 넓은 패널에서는 좌우로 배치한다.
- 로딩/빈 상태/오류/권한: 회차가 없으면 `저장 또는 인쇄 이력이 없어요`를 표시한다.
- 접근성: tablist/tab/tabpanel과 aria-selected를 제공하고 방향키 전환을 지원한다.

### Server/Client 경계

- Server Component/Action: 기존 조회 및 저장·인쇄 이력 Action을 재사용한다.
- Client Component/Zustand: 화면 내부 모드, 선택 성적서와 회차는 지역 상태로 관리한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 해당 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: migration 없음. 메뉴명과 UI 분리 변경만 되돌리면 된다.

## 변경 계획

1. 메뉴, 작업영역 탭과 breadcrumb 명칭을 `측정 관리`로 통일한다.
2. 측정 화면을 결과 입력과 이력 조회 모드로 분리한다.
3. 과거 회차 선택과 읽기 전용 출력 기능을 이력 모드로 이동한다.
4. 직접 URL, 앱 탭, 단일·2분할 container 반응형을 검증한다.
5. lint, typecheck와 production build를 수행한다.

## 위험과 승인 사항

- 동일 route 안에서 화면 모드를 전환하므로 최상위 앱 탭은 하나만 열린다.
- 과거 회차의 재인쇄는 기존 이력을 출력하며 새 이력을 추가 생성하지 않는다.
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

- 변경: 메뉴명을 `측정 관리`로 통일하고 화면 내부를 결과 입력과 측정 이력 탭으로 분리했다. 이력 탭은 선택 성적서의 최신 회차를 자동 선택한다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과.
- 미실행: 브라우저 격리 환경에서 localhost 연결이 거부되어 실제 viewport 자동 확인은 수행하지 못했다.
- 남은 위험/후속 작업: 이력이 매우 많은 경우 현재 native select 대신 검색 가능한 회차 목록을 후속 검토할 수 있다.
