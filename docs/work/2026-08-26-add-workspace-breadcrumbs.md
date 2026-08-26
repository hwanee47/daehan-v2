# 업무 화면 메뉴 경로 표시

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

업무 화면의 큰 타이틀과 설명을 제거한 뒤 콘텐츠 상단에 여백만 남아 현재 메뉴 위치를 파악하기 어렵다. 빈 영역을 compact한 breadcrumb로 사용해 상위 메뉴와 현재 화면의 관계를 보여준다.

## 범위

### 포함

- 공통 업무 breadcrumb 컴포넌트 추가
- 성적서 관리: `검사성적서 > 성적서 관리`
- 측정결과 입력: `검사성적서 > 측정결과 입력`
- 품목관리: `기준정보 > 품목관리`
- 오차범위관리: `기준정보 > 오차범위관리`
- 코드관리: `기준정보 > 코드관리`
- 직접 URL page와 탭 workspace panel 양쪽에 동일하게 표시
- 상단 padding과 breadcrumb 아래 간격을 compact하게 조정

### 제외

- breadcrumb 항목의 링크 또는 드롭다운 기능
- 홈, 로그인, 회원가입, 프로필 화면 적용
- 메뉴명이나 탭명 변경
- DB 및 데이터 처리 변경

## 완료 조건

- [x] 다섯 업무 화면 상단에 올바른 2단계 메뉴 경로가 표시된다.
- [x] 상위 단계는 muted, 현재 단계는 명확한 텍스트로 구분된다.
- [x] 스크린 리더에서 `현재 위치` navigation과 현재 페이지를 인식할 수 있다.
- [x] 직접 URL과 탭/분할화면에서 동일하게 표시된다.
- [x] 기존보다 상단 여백이 compact해지고 실제 콘텐츠와 자연스럽게 연결된다.

## 현재 구현 조사

- 관련 route/component: 다섯 업무 `page.tsx`, `src/app/(app)/workspace-panels.tsx`, `src/lib/app-tabs.ts`
- 관련 Supabase table/bucket: 해당 없음
- 재사용할 기존 패턴: `Container`, semantic token, workspace container query
- 문서와 구현의 차이: 직접 URL과 탭 panel이 별도 마크업을 가지므로 양쪽에 공통 컴포넌트를 연결해야 한다.

## 설계

### UI와 반응형

- 모바일: 한 줄의 작은 텍스트로 표시하고 너무 길면 자연스럽게 줄바꿈한다.
- 태블릿: 동일
- 데스크톱: 상위 메뉴는 `text-muted-foreground`, 현재 메뉴는 `font-medium`, 단계 사이는 작은 `ChevronRight` 아이콘으로 구분한다.
- 로딩/빈 상태/오류/권한: 데이터 상태와 무관하게 허용된 업무 화면에서 경로를 표시한다.
- 접근성: `<nav aria-label="현재 위치"><ol>` 구조와 현재 항목의 `aria-current="page"`를 사용하고 구분 아이콘은 숨긴다.

### Server/Client 경계

- Server Component/Action: 공통 breadcrumb는 상태가 없는 Server-compatible 컴포넌트로 구현한다.
- Client Component/Zustand: workspace panel에서도 직렬화 가능한 문자열 props로 재사용하며 상태를 추가하지 않는다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. `src/components/layout`에 공통 breadcrumb 컴포넌트를 추가한다.
2. 다섯 직접 URL page에 메뉴 경로를 배치한다.
3. 다섯 workspace panel에 동일한 메뉴 경로를 배치한다.
4. 반복되는 Container 상단 padding과 breadcrumb 아래 간격을 정리한다.
5. lint, typecheck, build 및 중복/누락 검색을 수행한다.

## 위험과 승인 사항

- 상위 메뉴는 실제 독립 페이지가 없으므로 링크가 아닌 텍스트로 표시한다.
- 직접 URL과 탭 panel의 중복 구현 누락을 막기 위해 동일한 공통 컴포넌트를 사용한다.
- DB 및 외부 시스템 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [x] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — DB 변경이 없어 제외
- [x] 프로덕션 빌드
- [ ] 직접 URL 및 단일·2분할 workspace 확인

## 결과

- 변경: semantic `nav`/`ol` 기반 공통 `WorkspaceBreadcrumb`를 추가하고 다섯 업무 화면의 직접 page와 workspace panel에 연결했다. 상단 padding을 40~64px에서 20~24px로 줄였다.
- 검증: breadcrumb 사용 위치 10곳 확인, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 현재 인앱 브라우저에 열린 탭이 없어 viewport별 실제 시각 QA는 미실행
- 남은 위험/후속 작업: 실제 화면에서 breadcrumb와 첫 콘텐츠 사이의 20px 간격을 최종 확인할 수 있다.
