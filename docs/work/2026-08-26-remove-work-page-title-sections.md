# 업무 화면 타이틀·설명 섹션 제거

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

업무 탭과 메뉴에서 현재 화면 이름을 이미 확인할 수 있는데 각 업무 화면 본문에도 큰 제목과 설명이 반복되어 세로 공간을 차지한다. 반복되는 상단 타이틀·설명 영역을 제거해 실제 관리 콘텐츠가 더 위에서 시작되도록 한다.

## 범위

### 포함

- 성적서 관리 `/inspection-reports`의 상단 제목·설명 제거
- 측정결과 입력 `/inspection-measurements`의 상단 제목·설명 제거
- 품목관리 `/master/items`의 상단 제목·설명 제거
- 코드관리 `/master/codes`의 상단 제목·설명 제거
- 공차관리 `/master/tolerance-ranges`의 상단 제목·설명 제거
- 제거 후 불필요한 상단 여백과 `aria-labelledby` 연결 정리
- 각 화면의 실제 관리 컴포넌트, 오류 상태 및 작업 기능은 유지

### 제외

- 홈 화면의 소개/상태 콘텐츠
- 로그인·회원가입 화면의 인증 안내 제목
- 프로필 화면의 사용자 정보 제목
- Dialog, 카드, 목록 및 상세 영역 내부의 기능 제목
- 브라우저 탭에 사용하는 Next.js metadata title/description

## 완료 조건

- [x] 지정한 5개 업무 화면에서 큰 페이지 제목과 설명이 표시되지 않는다.
- [x] 화면의 실제 관리 콘텐츠가 불필요한 상단 공백 없이 시작된다.
- [x] section의 접근성 이름이 제거된 제목을 참조하지 않는다.
- [x] 직접 URL과 작업영역 탭/분할화면에서 동일한 page 마크업이 적용된다.
- [x] 데이터 조회, 저장, 오류 상태와 metadata는 변경되지 않는다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports/page.tsx`, `inspection-measurements/page.tsx`, `master/items/page.tsx`, `master/codes/page.tsx`, `master/tolerance-ranges/page.tsx`
- 관련 Supabase table/bucket: 화면별 기존 조회 대상만 사용하며 변경 없음
- 재사용할 기존 패턴: 각 page의 `@container/workspace`, `Container`, 실제 관리 컴포넌트 구조 유지
- 문서와 구현의 차이: 현재 다섯 업무 화면이 동일한 큰 `h1`과 설명 문단 패턴을 반복한다.

## 설계

### UI와 반응형

- 모바일: 큰 제목 영역과 그 여백을 제거해 관리 콘텐츠를 상단 여백 직후 표시한다.
- 태블릿: 동일
- 데스크톱: 동일
- 로딩/빈 상태/오류/권한: 기존 상태 UI를 유지한다.
- 접근성: 제거된 `h1`을 가리키던 `aria-labelledby`를 제거하고 각 관리 컴포넌트 내부의 제목 구조는 유지한다. 문서 제목은 metadata로 유지한다.

### Server/Client 경계

- Server Component/Action: page의 표현 마크업과 여백만 변경한다.
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 해당 없음. page 마크업을 되돌리면 복구된다.

## 변경 계획

1. 다섯 업무 page에서 상단 `h1`과 설명 문단을 제거한다.
2. 제거된 제목을 참조하는 section 속성과 컴포넌트의 상단 margin을 정리한다.
3. metadata 및 내부 기능 제목이 유지되는지 확인한다.
4. lint, typecheck, build를 실행한다.

## 위험과 승인 사항

- 홈·인증·프로필 화면은 페이지 목적을 설명하는 제목이 기능적으로 필요하므로 이번의 반복 업무 타이틀 제거 범위에서는 제외한다.
- 페이지 내부에 시각적 `h1`이 없어지지만 브라우저 문서 제목과 각 기능 영역의 의미 있는 제목은 유지한다.
- DB 및 외부 시스템 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — DB 변경이 없어 제외
- [x] 프로덕션 빌드
- [ ] 직접 URL 및 단일·2분할 workspace 확인

## 결과

- 변경: 다섯 업무 화면의 직접 URL page와 탭에서 실제 사용하는 `workspace-panels.tsx` 양쪽에서 반복 `h1`과 설명을 제거했다. 첫 콘텐츠의 상단 여백 및 제거된 제목 참조를 정리했고 홈·인증·프로필, metadata와 내부 기능 제목은 유지했다.
- 검증: 직접 page와 workspace panel의 대상 제목 ID·설명 문구 검색 결과 없음, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 인증된 브라우저 세션이 없어 실제 viewport 및 단일·2분할 시각 QA는 미실행
- 남은 위험/후속 작업: 현재 인앱 브라우저에 열린 탭이 없어 실제 화면 캡처 QA는 수행하지 못했다. 코드상 직접 URL과 탭 panel 양쪽의 중복 출력은 모두 제거됐다.
