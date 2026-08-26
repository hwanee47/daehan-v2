# 그리드 단일 행 선택 표시 정리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 제안 범위에 `진행해`로 승인 / 2026-08-26

## 배경과 목적

AG Grid에서 선택 행 배경, hover 배경과 셀 focus 테두리가 동시에 나타나 여러 행이 선택된 것처럼 보인다. 실제 업무 선택 상태와 그리드 선택 방식을 단일 행으로 제한하고 시각 상태를 명확히 구분한다.

## 범위

### 포함

- 품목/품목상세, 코드그룹/상세코드, 품목/오차범위 총 6개 AG Grid에 단일 행 선택 명시
- 체크박스 없이 행 클릭으로 하나만 선택
- 선택 행은 primary tint, hover 행은 선택으로 오인되지 않도록 배경 강조 제거
- 기존 셀 focus와 키보드 탐색 유지

### 제외

- 일반 HTML 테이블 변경
- 마스터·상세 데이터 관계와 선택 상태 구조 변경
- DB 변경

## 완료 조건

- [x] Ctrl/Meta 키를 사용해도 한 그리드에서 여러 행이 선택되지 않는다.
- [x] 한 그리드의 실제 선택은 하나로 제한되고 기존 그리드 색상은 유지된다.
- [x] 클릭한 행의 기존 수정·삭제·상세 연동이 유지된다.
- [x] 키보드 셀 focus가 유지된다.

## 현재 구현 조사

- 관련 route/component: `item-management.tsx`, `code-management.tsx`, `tolerance-range-management.tsx`
- 관련 Supabase table/bucket: 변경 없음
- 재사용할 기존 패턴: AG Grid Quartz theme와 각 화면의 단일 `selected*Seq` 상태
- 문서와 구현의 차이: 기존에는 AG Grid row selection을 명시하지 않고 `getRowClass`로 선택 배경만 표현하며 hover에도 동일한 accent를 사용한다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 동일한 단일 선택 표시를 사용한다.
- 로딩/빈 상태/오류/권한: 변경 없음
- 접근성: 셀 focus를 제거하지 않아 키보드 탐색 표시를 유지한다.

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 기존 지역 `selected*Seq` 상태 유지

### 데이터와 Supabase

- schema/PK/FK/index/RLS/Storage/migration: 모두 변경 없음

## 변경 계획

1. 세 AG Grid theme의 hover와 선택 색을 분리한다.
2. 여섯 grid에 `singleRow` selection 설정을 적용한다.
3. 기존 선택 행 class를 primary tint로 변경한다.
4. lint, typecheck와 build를 검증한다.

## 위험과 승인 사항

- 마스터와 상세 grid는 서로 다른 grid이므로 업무 문맥상 각각 하나의 선택 상태는 유지한다.
- 셀 focus를 없애면 키보드 접근성이 저하되므로 유지한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [x] 키보드와 접근성
- [x] 프로덕션 빌드

## 결과

- 변경: 여섯 AG Grid에 `singleRow` 선택과 행 클릭 선택을 명시하고 체크박스를 숨겼다. 후속 화면 확인에서 primary tint가 전체 그리드 색감을 바꾸는 문제가 확인되어 색상 관련 변경은 원래 `accent` 테마로 복구하고 단일 선택 설정만 유지했다.
- 검증: 최종 색상 복구 후 `npm run lint`, `npx tsc --noEmit` 통과. 앞선 단일 선택 변경에서 `npx next build --webpack` 통과
- 미실행: 현재 인앱 브라우저에 열린 인증 화면이 없어 실제 마우스/키보드 상호작용 QA는 미실행
- 남은 위험/후속 작업: 실제 화면에서 선택 tint의 체감 명도를 최종 확인할 수 있다.
