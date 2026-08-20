# 홈 헤더 인증 연결 및 메뉴 추가

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-20

## 배경과 목적

홈 헤더에 로그인 사용자의 실제 이름을 표시하고 중앙에서 검사성적서 메뉴로 이동할 수 있게 한다.

## 범위

### 포함

- 서버에서 현재 Auth 사용자와 `public.users.name` 조회
- 로그인 사용자 이름 및 비로그인 로그인 링크 표시
- 중앙 `검사성적서` 메뉴와 준비 상태 페이지

### 제외

- 사용자 드롭다운 동작과 로그아웃
- 검사성적서 CRUD 기능
- DB schema 및 migration 변경

## 완료 조건

- [x] 로그인 사용자의 프로필 이름을 헤더에 표시한다.
- [x] 프로필이 없으면 Auth metadata 또는 이메일로 안전하게 대체한다.
- [x] 중앙 검사성적서 메뉴가 목적 페이지로 이동한다.
- [x] 모바일에서도 헤더가 수평으로 넘치지 않는다.

## 현재 구현 조사

- 관련 route/component: `src/app/page.tsx`, `src/app/login`, `src/components/layout/container.tsx`
- 관련 Supabase table/bucket: `auth.users`, `public.users`
- 재사용할 기존 패턴: 서버 Supabase client, Container
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 브랜드·사용자 텍스트를 숨기고 중앙 메뉴 유지
- 태블릿/데스크톱: 브랜드, 중앙 메뉴, 사용자 이름의 3열 헤더
- 로딩/빈 상태/오류/권한: 비로그인은 로그인 링크, 프로필 조회 실패는 Auth 정보로 대체
- 접근성: 주요 메뉴와 사용자 메뉴에 각각 접근성 이름 제공

### Server/Client 경계

- Server Component/Action: 홈에서 인증 사용자 및 프로필 조회
- Client Component/Zustand: 해당 없음

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 기존 본인 프로필 조회 정책 사용
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. 홈을 async Server Component로 전환하고 사용자 이름을 조회한다.
2. 반응형 중앙 메뉴와 사용자 상태를 렌더링한다.
3. 검사성적서 준비 페이지를 연결하고 검증한다.

## 위험과 승인 사항

- 사용자 버튼의 드롭다운 동작은 후속 범위다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 관련 단위/통합 테스트
- [x] 모바일 360px
- [x] 태블릿 768px
- [x] 데스크톱 1280px
- [x] 키보드와 접근성
- [x] 프로덕션 빌드

## 결과

- 변경: 홈 헤더 사용자 이름 조회, 비로그인 로그인 링크, 중앙 검사성적서 메뉴와 준비 페이지 추가
- 검증: ESLint, TypeScript, webpack 프로덕션 빌드 통과. 360/768/1280px 헤더 overflow, 접근성 이름과 메뉴 이동 확인
- 미실행: 실제 로그인 세션에서 원격 `public.users.name` 표시 확인
- 남은 위험/후속 작업: 사용자 메뉴 드롭다운과 검사성적서 CRUD는 후속 작업
