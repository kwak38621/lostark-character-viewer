# 로스트아크 캐릭터 정보 조회 서비스

Lost Ark 공식 API를 활용해 캐릭터 장비·스킬·아크 패시브 등을 시각화하는 풀스택 웹 애플리케이션입니다.

![tech](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?logo=springboot&logoColor=white)
![tech](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![tech](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![tech](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss&logoColor=white)

---

## 주요 기능

| 탭 | 설명 |
|---|---|
| **장비** | 방어구·무기 강화 수치·품질바, 악세서리 연마/팔찌 옵션 상/중/하 뱃지, 보석(피해·쿨감) |
| **스킬** | 사용 중인 스킬 레벨·트라이포드·룬 시각화 |
| **보유 원정대** | 서버별 보유 캐릭터 그리드, 클릭 시 해당 캐릭터 즉시 조회 |
| **아크 그리드** | 아크 그리드 효과 및 슬롯 구성 |
| **아크 패시브** | 진화·깨달음·도약 포인트별 효과 목록 |
| **주간 영수증** | 아이템 레벨 기반 상위 3 레이드 골드 자동 계산, 지평의 성당 포함/제외 토글 |

### 팔찌 딜 효율 계산기
팔찌 옵션에서 DPS 기여도를 자동으로 계산합니다.

- **계수 출처**: [inven.co.kr 분석 게시글](https://www.inven.co.kr/board/lostark/6334/9604) 역산 적용
- 치피 1% → **0.41%**, 치적 1% → **0.97%**, 적주피 1% → **1.0%**
- 치명·특화·신속 포인트 + 힘/민/지·무기공격력도 반영
- 서포터 팔찌는 아군 피해 증가 옵션을 감지해 **"파티 기여"** 레이블로 표시

---

## 기술 스택

```
Browser
  └─ React 18 + TypeScript 5 (Vite, :3000)
       └─ /api 프록시
            └─ Spring Boot 3.3 (:8080)
                 └─ Lost Ark 공식 REST API
```

| 레이어 | 기술 |
|---|---|
| Frontend | React 18, TypeScript 5, Tailwind CSS 3, Axios |
| Backend | Spring Boot 3.3, Java 17, RestTemplate |
| DB | MySQL 8 (최근 검색 기록 등 로컬 용도) |
| 빌드 | Vite (FE), Maven (BE) |

---

## 시작하기

### 사전 요구사항
- Java 17+
- Node.js 18+
- MySQL 8+
- [Lost Ark 개발자 API 키](https://developer-lostark.game.onstove.com/)

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/lostark-project.git
cd lostark-project
```

### 2. 백엔드 설정
```bash
cp backend/src/main/resources/application.yml.example \
   backend/src/main/resources/application.yml
```

`application.yml`을 열어 아래 항목을 채웁니다.
```yaml
spring:
  datasource:
    username: YOUR_DB_USERNAME
    password: YOUR_DB_PASSWORD

lostark:
  api:
    key: YOUR_LOSTARK_API_KEY
```

```bash
cd backend
./mvnw spring-boot:run
```

### 3. 프론트엔드 설정
```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 프로젝트 구조

```
lostark-project/
├── backend/
│   └── src/main/java/.../
│       ├── controller/   # REST API 엔드포인트
│       ├── service/      # 비즈니스 로직
│       ├── client/       # Lost Ark API 호출
│       ├── dto/          # 요청·응답 DTO (Java Record)
│       └── exception/    # 전역 예외 처리 (@RestControllerAdvice)
│
└── frontend/
    └── src/
        ├── pages/        # SearchPage
        ├── components/   # CharacterCard (탭 6개), RecentSearchList
        ├── services/     # api.ts (Axios + 에러 인터셉터)
        └── types/        # 전역 타입 정의
```

---

## API 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/characters/{name}` | 캐릭터 기본 정보 |
| GET | `/api/characters/{name}/siblings` | 보유 캐릭터 목록 |
| GET | `/api/characters/{name}/siblings/enriched` | 캐릭터 목록 + 이미지·노드 |
| GET | `/api/characters/{name}/skills` | 스킬 정보 |
| GET | `/api/characters/{name}/arkpassive` | 아크 패시브 |
| GET | `/api/characters/{name}/arkgrid` | 아크 그리드 |
| GET | `/api/characters/{name}/cards` | 카드 세트 |
| GET | `/api/characters/{name}/gems` | 보석 |

---

## 에러 처리

| 상황 | HTTP 코드 |
|---|---|
| 존재하지 않는 캐릭터 | 404 |
| Lost Ark API 호출 실패 | 502 |
| 요청 타임아웃 | 504 |
| API 키 만료 / 요청 한도 초과 | 401 / 429 |

프론트엔드 Axios 인터셉터가 서버 에러 메시지를 파싱해 탭별 `TabError` 컴포넌트로 표시합니다.

---

## 스크린샷

> *(추후 추가 예정)*

---

## 라이선스

MIT
