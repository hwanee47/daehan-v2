# 로그인 페이지 구현

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-20

## 배경과 목적

가입한 사용자가 이메일과 비밀번호로 Supabase Auth 세션을 만들 수 있는 화면을 제공한다.

## 범위

### 포함

- `/login` 페이지와 로그인 폼
- Server Action 기반 입력 검증 및 Supabase Auth 로그인
- 로딩과 오류 상태, 회원가입 화면과의 상호 링크
- 이미 로그인한 사용자의 홈 이동

### 제외

- 비밀번호 재설정, 소셜 로그인과 로그인 후 전용 대시보드
- DB schema 및 migration 변경

## 완료 조건

- [x] 이메일과 비밀번호로 로그인할 수 있다.
- [x] 서버에서 입력값을 다시 검증한다.
- [x] 인증 실패 시 내부 정보를 노출하지 않는 오류를 제공한다.
- [x] 성공하거나 이미 로그인된 사용자는 홈으로 이동한다.

## 현재 구현 조사

- 관련 route/component: `src/app/signup`, `src/components/layout/container.tsx`, `src/components/ui/button.tsx`
- 관련 Supabase table/bucket: `auth.users`
- 재사용할 기존 패턴: 회원가입 폼, 서버 Supabase client, Container, Button
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 한 열 전체 너비 폼
- 태블릿: 가운데 정렬된 최대 448px 폼
- 데스크톱: 가운데 정렬된 최대 448px 폼
- 로딩/빈 상태/오류/권한: 제출 로딩, 필드 오류, 인증 실패 오류, 로그인 사용자 홈 이동
- 접근성: 연결된 label과 오류 설명, aria live 상태, 44px 이상 조작 영역

### Server/Client 경계

- Server Component/Action: 로그인 여부 확인, 입력 검증, Supabase Auth 로그인과 redirect
- Client Component/Zustand: `useActionState`를 사용하는 폼만 Client Component

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. 로그인 Server Action을 작성한다.
2. 접근 가능한 반응형 폼을 작성한다.
3. 회원가입 화면과 연결하고 검증한다.

## 위험과 승인 사항

- 인증 실패 메시지는 계정 존재 여부를 구분하지 않는다.

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

- 변경: `/login` 페이지, 로그인 Server Action과 상태별 폼 UI, 회원가입 상호 링크 추가
- 검증: ESLint, TypeScript, webpack 프로덕션 빌드 통과. 360/768/1280px 레이아웃, 서버 검증 오류와 회원가입 링크 확인
- 미실행: 실제 사용자 자격 증명을 사용한 원격 로그인 성공·실패 테스트
- 남은 위험/후속 작업: 로그인 후 전용 화면이 생기면 홈 redirect 경로 조정 필요
