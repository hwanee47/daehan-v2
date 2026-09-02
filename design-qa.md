# 측정결과 입력 화면 디자인 QA

- source visual truth path: `/var/folders/fn/gqkhf09d0n11ty34yz_txn_r0000gn/T/codex-clipboard-009743e8-e5fd-4fe6-82ce-4975db62fb6c.png`
- source dimensions: 626 × 892px
- implementation URL: `http://127.0.0.1:3000/inspection-measurements`
- implementation screenshot path: 없음 — 인증 화면에서 대상 화면으로 진입하지 못함
- viewport / CSS size / density: 대상 화면 미진입으로 측정 불가
- state: 로그인되지 않은 인앱 브라우저가 `/login`으로 이동함

## Findings

- [P0] 실제 측정 양식을 캡처하고 원본과 비교할 수 없음
  - 위치: `/inspection-measurements`
  - 근거: 로컬 앱은 정상 응답했지만 인증 세션이 없어 `/login`으로 redirect됨. 브라우저 console error는 없음.
  - 영향: 원본과 구현의 타이포그래피, 선 굵기, 행·열 비율, 이미지 크기, 모바일·분할 overflow를 시각적으로 판정할 수 없음.
  - 조치: 사용자가 인앱 브라우저에서 로그인한 뒤 실제 데이터가 선택된 측정 양식을 캡처해 원본과 함께 비교해야 함.

## Required fidelity surfaces

- Fonts and typography: 브라우저 렌더링 검증 대기
- Spacing and layout rhythm: 원본 순서와 980px 종이형 canvas를 코드에 반영했으나 시각 검증 대기
- Colors and visual tokens: 양식 내부는 흰 배경·검정 1px 선, 외부 도구는 프로젝트 semantic token을 사용했으나 시각 검증 대기
- Image quality and asset fidelity: 품목상세의 실제 이미지를 사용하도록 연결했으나 실제 데이터 상태 검증 대기
- Copy and content: 제목·결재란·기본정보·약도·중요항목·측정표·특기사항·최종판정 구조를 반영했으나 시각 검증 대기

## Full-view and focused comparison evidence

- source image는 원본 크기로 확인함.
- implementation은 로그인 화면만 확인되어 full-view 및 측정표 focused comparison을 수행하지 못함.

## Comparison history

- 최초 확인: 인증 redirect로 대상 화면 캡처 차단. 수정 비교 반복 없음.

## Implementation checklist

1. 인앱 브라우저에서 로그인
2. 실제 성적서를 선택한 1280px 화면과 종이 canvas 캡처
3. 원본과 full-view 및 측정표 focused comparison
4. 모바일 360px과 분할 25:75·50:50·75:25 overflow 확인
5. P0/P1/P2 수정 후 재캡처

final result: blocked

---

# Design QA — 최근 작업 검사성적서 카드 캐러셀

- source visual truth path: `/Users/hwaneehwanee/.codex/generated_images/01a0361a-d3c4-7043-8d79-4db15e815dd8/exec-f41f9f36-dc0e-4feb-bfdf-41a90274776f.png`
- implementation screenshot path: 없음 (인증 화면으로 리디렉션되어 캡처 불가)
- viewport: 데스크톱 기본 in-app browser viewport
- source pixels: 2087 × 754 (표시 과정에서 2048 × 740으로 축소됨)
- implementation pixels / CSS size / density normalization: 확인 불가
- state: 결과 입력 최초 진입, 최근 작업 성적서 Top 5 카드 레일

## Full-view comparison evidence

- 소스 시안은 열어 확인했다.
- 구현 URL `http://127.0.0.1:3000/inspection-measurements`는 `/login`으로 리디렉션되어 동일 상태의 렌더링 증거를 확보하지 못했다.

## Focused region comparison evidence

- 인증 때문에 최근 작업 카드 영역이 렌더링되지 않아 집중 비교를 수행하지 못했다.

## Findings

- [P1] 인증으로 구현 화면 비교 불가
  - 위치: 측정결과 입력 최초 화면
  - 근거: 구현 URL 접근 시 로그인 화면으로 리디렉션됨
  - 영향: 카드 폭, 겹침, 타이포그래피와 실제 드래그 동작을 시각적으로 확정할 수 없음
  - 조치: 로그인된 세션에서 동일 화면을 열고 소스 시안과 같은 상태로 캡처한 뒤 비교

## Required fidelity surfaces

- Fonts and typography: 코드상 기존 Pretendard/font-sans와 디자인 시스템 크기를 사용했으나 렌더링 비교는 차단됨
- Spacing and layout rhythm: workspace container query 기반으로 구현했으나 렌더링 비교는 차단됨
- Colors and visual tokens: semantic token과 단일 primary 강조를 사용했으나 렌더링 비교는 차단됨
- Image quality and asset fidelity: 별도 이미지 자산이 없는 UI이며 Lucide 기존 아이콘을 사용함
- Copy and content: `검사성적서`, `기종`, `품명`, `품번/도번`, `최근 작업`만 카드에 유지함

## Comparison history

- 첫 비교: 로그인 리디렉션으로 P1 차단. 시각 수정 미실시.

## Implementation checklist

- 로그인된 상태에서 데스크톱 및 분할 패널 캡처
- 마우스 드래그 후 카드 오클릭 방지 확인
- 터치 스와이프와 스크롤 스냅 확인
- 소스 시안과 카드 비율·간격·타이포그래피 재비교

## Follow-up polish

- 실제 데이터 길이에 따른 말줄임과 카드 겹침 정도를 렌더링 후 조정

final result: blocked
