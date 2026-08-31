# 측정 이력 품목별 보기

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-31
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-31

## 배경과 목적

측정 이력을 회차별 목록뿐 아니라 품목 단위로 집계하고, 선택한 품목에 속한 모든 품목상세 검사 이력을 조회할 수 있게 한다.

## 범위

### 포함

- 측정 이력 화면에 `검사서별`, `품목별` 보기 추가
- 품목별 목록에 품목코드, 품명, 기종, 품목상세 수, 검사 횟수와 최근 검사일 표시
- 품목의 `검사서 보기`에서 모든 품목상세 측정 이력을 서버 페이징으로 조회
- 개별 측정 회차의 기존 성적서 보기 재사용
- 안정적인 그룹핑을 위한 마스터·측정 이력 `item_seq` 저장
- 기존 행 backfill 및 품목별 집계 RPC 추가

### 제외

- 신규 최상위 메뉴 추가
- 여러 성적서 일괄 인쇄
- 품목별 통계 차트

## 완료 조건

- [x] 동일 품목의 여러 품목상세가 한 품목 그룹에 집계된다.
- [x] 품목별 보기에서 검색조건과 50건 서버 페이징이 동작한다.
- [x] 품목 검사서 보기에서 해당 품목의 모든 상세코드 측정 이력을 페이지 단위로 조회한다.
- [x] 개별 이력을 기존 검사성적서 양식으로 열 수 있다.
- [x] 직접 URL과 작업영역 탭에서 동일한 컴포넌트를 사용한다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurement-history`, `inspection-reports/types.ts`, `(app)/layout.tsx`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_measurement_runs`
- 재사용할 기존 패턴: 측정 이력 검색 Server Action, AG Grid, 검사성적서 보기 dialog
- 문서와 구현의 차이: 현재 회차별 보기만 있고 품목을 안정적으로 묶을 `item_seq` 스냅샷이 없다.

## 설계

### UI와 반응형

- 모바일/좁은 패널: 보기 탭과 검색조건은 가로 스크롤을 허용하고 그리드는 최소 폭을 유지한다.
- 데스크톱: 기존 전체 폭 그리드를 유지한다.
- 품목 검사서 dialog: 품목상세코드 컬럼이 포함된 이력 그리드와 페이지 이동 제공
- 로딩/빈 상태/오류: 보기별 독립 상태와 메시지 제공
- 접근성: tablist, aria-selected, 버튼 이름과 키보드 Enter 열기 지원

### Server/Client 경계

- Server Action/RPC: 조건별 품목 집계, 품목별 측정회차 페이지와 상세 조회
- Client: 보기 모드, 적용 검색조건, 선택 품목과 dialog 상태

### 데이터와 Supabase

- schema 변경: `inspection_reports.item_seq`, `inspection_measurement_runs.item_seq`
- PK/FK/index: `items(seq)` FK, 측정 이력 품목·일시 인덱스 추가
- RLS 정책: 기존 authenticated select 정책 사용, 집계 함수는 security invoker
- Storage: 변경 없음
- migration과 rollback: 컬럼·인덱스·집계 함수 제거와 snapshot trigger 복원으로 rollback 가능

## 변경 계획

1. `item_seq` backfill, snapshot trigger와 집계 RPC migration을 작성한다.
2. 타입과 서버 조회 action을 추가한다.
3. 품목별 AG Grid와 품목 검사서 dialog를 구현한다.
4. 정적 검사와 빌드 후 원격 dry run·적용·사후 검증을 수행한다.

## 위험과 승인 사항

- 기존 행의 `item_seq`는 현재 품목상세 관계로 backfill한다.
- 집계 화면은 측정회차가 존재하는 품목만 표시한다.
- DB 변경과 원격 적용 사용자 승인 완료.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 프로덕션 빌드
- [x] 검사서별 기존 조회 코드 회귀 검토
- [x] 품목별 검색·페이징·빈 상태 코드 검토
- [x] 품목 검사서 목록·페이징·개별 보기 코드 검토
- [x] migration dry run·적용·후속 dry run

## 결과

- 변경: 측정 이력에 검사서별/품목별 보기를 추가했다. 품목별 집계에서 품목 검사서 목록을 열고 개별 회차를 기존 양식으로 조회할 수 있다. 마스터와 측정회차에 안정적인 `item_seq`를 저장한다.
- 검증: ESLint, TypeScript, production build 통과. 원격 migration 적용 완료, local/remote 기록 일치, 후속 dry run `upToDate: true` 확인.
- 미실행: 인증된 브라우저에서 실제 데이터로 수행하는 종단 간 수동 테스트
- 남은 위험/후속 작업: 품목별 집계는 측정회차가 존재하는 품목만 표시한다.
