# 공통 Select 컴포넌트 도입

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: `승인`, 2026-08-27

## 배경과 목적

현재 프로젝트에는 공통 Select가 없어 화면별 native `select`의 모양과 상호작용이 일관되지 않다. Base UI Select를 기반으로 Daehan 디자인 시스템에 맞는 공통 선택박스를 만들고, 우선 측정 이력의 검색 유형에 적용한다.

## 범위

### 포함

- `src/components/ui/select.tsx`에 Base UI 기반 공통 Select 추가
- 옵션 배열, 선택값, 값 변경, placeholder, disabled, 접근성 이름과 class 확장을 지원
- `rounded-sm`, semantic token, 40px 입력 높이, focus ring과 선택 표시 적용
- 팝업을 Portal로 렌더링하여 작업 패널 overflow에 잘리지 않도록 처리
- 키보드 방향키, Enter, Escape와 focus 복귀 유지
- 측정 이력 화면의 `검색 유형` native select를 공통 Select로 교체

### 제외

- 성적서 관리와 측정결과 화면 등 기존의 다른 native select 일괄 교체
- 검색 가능한 combobox 또는 다중 선택 기능
- DB schema, query, 상태 구조 변경

## 완료 조건

- [x] 측정 이력 검색 유형이 커스텀 Select로 표시된다.
- [x] 기종, 품번/도번, 품명, 고객명 중 하나를 선택하면 기존 검색 동작이 유지된다.
- [x] 마우스와 키보드로 열기, 이동, 선택과 닫기가 가능하다.
- [x] 직접 URL과 작업 탭/분할 패널에서 팝업이 잘리지 않는다.
- [x] 공통 Select가 다른 화면에서도 옵션만 전달해 재사용 가능한 API를 가진다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurement-history/inspection-measurement-history.tsx`, `src/components/ui`
- 관련 Supabase table/bucket: 해당 없음. 화면 지역 필터 UI만 변경한다.
- 재사용할 기존 패턴: `@base-ui/react/select`, Button의 `cn` 및 variant 전달 방식, semantic token
- 문서와 구현의 차이: 디자인 시스템은 기존 공통 컴포넌트 우선을 요구하지만 현재 `src/components/ui`에는 Button만 있고 공통 Select는 없다.

## 설계

### UI와 반응형

- 모바일: Trigger 너비는 부모가 결정하며 popup은 viewport 가용 너비 안에서 표시한다.
- 태블릿: 작업 패널의 가로 스크롤과 독립적으로 popup을 Portal에 표시한다.
- 데스크톱: Trigger와 같은 최소 너비의 popup, 선택 항목 표시와 hover/focus 상태를 제공한다.
- 로딩/빈 상태/오류/권한: 정적 옵션 컴포넌트라 별도 서버 상태는 없다. 옵션 없음은 빈 목록으로 처리한다.
- 접근성: Base UI의 label/trigger/listbox semantics와 키보드 조작을 유지하고 focus ring을 표시한다.

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 공통 Select는 Base UI 상호작용을 사용하는 Client Component이며 측정 이력의 기존 지역 상태를 그대로 갱신한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음. 공통 컴포넌트와 적용부 변경을 되돌리면 된다.

## 변경 계획

1. Base UI Select를 감싼 공통 옵션 타입과 Select 컴포넌트를 추가한다.
2. 디자인 토큰, 선택 표시, 스크롤 화살표와 Portal popup 스타일을 적용한다.
3. 측정 이력 검색 유형 native select를 공통 Select로 교체한다.
4. 선택값에 따른 기존 검색 필터 동작과 한 줄 레이아웃을 확인한다.
5. lint, typecheck와 production build를 수행한다.

## 위험과 승인 사항

- 공통 컴포넌트 API는 이번 단일 선택 요구에 필요한 범위로만 정의한다. 검색형·다중 선택은 별도 Combobox로 다룬다.
- 기존 다른 화면의 select는 이번 범위에서 변경하지 않는다.

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

- 변경: Base UI 기반 공통 Select를 추가하고 측정 이력의 검색 유형 선택박스에 적용했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과
- 미실행: 실제 브라우저의 단일·분할 패널 시각 검증과 보조기기 검증
- 남은 위험/후속 작업: 사용처가 늘어나면 field 오류 상태와 form name 지원 범위를 확장한다.
