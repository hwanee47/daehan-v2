# AG Grid 선택 상태 공통화

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

현재 각 화면의 `selectedSeq` 기반 행 강조와 AG Grid 자체 row selection이 동시에 동작한다. 이 때문에 이전 `selectedSeq` 행과 새로 클릭한 AG Grid 선택 행이 함께 파란색으로 남는다. 화면의 단일 지역 상태를 유일한 선택 기준으로 사용하고 AG Grid 공통 theme를 한 곳에서 관리한다.

## 범위

### 포함

- `src/lib/ag-grid.ts`에 공통 AG Grid theme, 단일 선택과 초기 선택 동기화 helper 추가
- 품목/품목상세, 코드그룹/상세코드, 품목/오차범위 grid에 공통 설정 적용
- 중복 custom `getRowClass` 제거
- AG Grid의 `singleRow` 선택을 유일한 행 배경 기준으로 사용하고 기존 `selected*Seq`는 업무 선택값으로 동기화
- 새 행 선택 시 이전 행을 흰색으로 복구
- 셀 focus와 키보드 탐색 유지

### 제외

- AG Grid를 사용하지 않는 일반 HTML table
- master/detail 각각의 업무 선택 상태를 하나로 합치는 변경
- 조회, 저장, 삭제와 DB 변경

## 완료 조건

- [x] 같은 grid에서 파란 선택 행이 동시에 두 개 표시되지 않는다.
- [x] 다른 행을 클릭하면 이전 행이 즉시 기본 흰색으로 돌아간다.
- [x] 세 화면의 모든 AG Grid가 동일한 공통 theme/helper를 사용한다.
- [x] 기존 마스터·상세 연동과 버튼 활성화가 유지된다.
- [x] 셀 focus 테두리와 키보드 탐색이 유지된다.

## 현재 구현 조사

- 관련 route/component: `item-management.tsx`, `code-management.tsx`, `tolerance-range-management.tsx`
- 관련 Supabase table/bucket: 변경 없음
- 재사용할 기존 패턴: 각 컴포넌트의 단일 `selected*Seq` 지역 상태
- 문서와 구현의 차이: 동일한 Quartz theme가 세 파일에 중복되고, 앱 상태 강조와 AG Grid 선택이 동시에 적용된다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 선택된 한 행만 accent 배경으로 표시하고 나머지는 기본 배경을 사용한다.
- 로딩/빈 상태/오류/권한: 변경 없음
- 접근성: AG Grid의 셀 focus는 유지하며, 행 선택에 따른 업무 상태는 기존 클릭 handler로 갱신한다.

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 공통 설정은 정적 module이며 선택값은 기존 지역 state에 둔다.

### 데이터와 Supabase

- schema/PK/FK/index/RLS/Storage/migration: 모두 변경 없음

## 변경 계획

1. 공통 AG Grid theme와 선택 class helper를 만든다.
2. 세 화면의 중복 theme와 `singleRowSelection`을 제거한다.
3. 여섯 grid가 공통 theme/helper와 기존 `selectedSeq`만 사용하도록 연결한다.
4. lint, typecheck와 build를 검증한다.

## 위험과 승인 사항

- AG Grid 자체 선택 API를 사용하지 않지만 이 화면들은 checkbox, 선택 목록 API나 다중 선택을 사용하지 않아 기능 손실이 없다.
- 마스터 grid와 상세 grid는 서로 다른 업무 문맥이므로 각각 하나의 선택 행은 유지한다.
- DB 및 외부 시스템 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [x] 키보드와 접근성
- [x] 프로덕션 빌드

## 결과

- 변경: 최초 custom 행 class와 AG Grid 선택을 함께 사용해 이전 class가 남는 원인을 제거했다. `src/lib/ag-grid.ts`에 공통 theme, `singleRow` 설정과 row data 갱신 시 초기 선택을 동기화하는 helper를 두고, 여섯 grid의 배경은 AG Grid 단일 선택만 결정하도록 변경했다. 행 hover 배경은 투명하게 유지했다.
- 검증: master 경로 내 `rowSelection`과 중복 local theme 검색 결과 없음, 공통 설정 사용 6곳 확인, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 현재 인앱 브라우저에 열린 인증 화면이 없어 실제 클릭 상호작용 QA는 미실행
- 남은 위험/후속 작업: 실제 화면에서 새 행 선택 시 이전 행이 흰색으로 돌아오는지 최종 시각 확인할 수 있다.
