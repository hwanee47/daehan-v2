# 작업영역 전체화면 Portal 표시 보완

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-28
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-28

## 배경과 목적

작업영역 전체화면 중 Dialog, AlertDialog, Select와 자동완성 팝업이 전체화면 요소 바깥인 `body`에 Portal되어 보이지 않는 문제를 공통으로 해결한다.

## 범위

### 포함

- 현재 작업영역 `[data-workspace-root]`를 반환하는 공통 Portal container 훅 추가
- 성적서 등록·수정·삭제·이미지·순번 위치 팝업 적용
- 측정 이력 성적서 보기와 측정 이미지 팝업 적용
- 품목·코드·오차범위 Dialog 및 삭제 확인 적용
- 공통 Select와 기준치수·고객/업체 자동완성 Portal 적용
- 일반 화면에서는 기존처럼 body fallback 유지

### 제외

- Fullscreen API 대상 요소 변경
- 팝업 디자인·크기·기능 변경
- 헤더 메뉴 Portal 변경

## 완료 조건

- [x] 전체화면 상태에서 성적서 등록·수정 팝업이 전체화면 요소 안에 렌더링된다.
- [x] 전체화면 상태에서 Select와 자동완성 목록이 전체화면 요소 안에 렌더링된다.
- [x] 전체화면 상태에서 삭제 확인·이미지·성적서 보기 팝업이 전체화면 요소 안에 렌더링된다.
- [x] 전체화면 해제 후 body Portal로 복귀한다.
- [x] 단일·2분할 모두 현재 전체화면 요소를 공통 container로 사용한다.

## 현재 구현 조사

- 관련 route/component: `AppTabs`, 공통 `Select`, 각 업무 화면 Dialog/Autocomplete
- 관련 Supabase table/bucket: 변경 없음
- 재사용할 기존 패턴: `AppTabs`의 전체 닫기 AlertDialog가 이미 `container={workspaceRoot}` 사용
- 문서와 구현의 차이: 디자인 지침은 Portal이 패널에 잘리지 않아야 한다고 명시하지만 대부분 body Portal을 사용한다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 기존 viewport 고정 배치 유지
- 로딩/빈 상태/오류/권한: 변경 없음
- 접근성: Base UI Portal/focus trap 유지

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: DOM workspace root 조회만 공통 훅으로 제공. 전역 상태 추가 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index/RLS/Storage: 변경 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. hydration-safe workspace Portal container 훅을 추가한다.
2. 공통 Select와 모든 업무 Dialog/Autocomplete Portal에 container를 연결한다.
3. 전체화면·일반 화면의 렌더링과 focus를 검증한다.

## 위험과 승인 사항

- Portal은 전체화면 작업영역의 자식이 되지만 `position: fixed`와 기존 z-index를 유지한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 전체화면 Dialog/Select/Autocomplete
- [ ] 일반 화면 Dialog/Select/Autocomplete
- [ ] 단일·2분할
- [ ] 키보드와 focus 복귀
- [x] 프로덕션 빌드

## 결과

- 변경: fullscreenchange를 구독하는 공통 Portal wrapper를 추가하고 모든 업무 Dialog, AlertDialog, Select와 Autocomplete에 적용했다.
- 검증: ESLint, TypeScript, diff whitespace 검사와 프로덕션 build를 통과했다.
- 미실행: 로그인된 브라우저에서 실제 Fullscreen API 진입 후 팝업·focus 수동 확인.
- 남은 위험/후속 작업: 현재 브라우저 세션이 로그아웃 상태라 실제 전체화면 UI 확인은 사용자가 로그인 후 수행해야 한다.
