import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const 현재파일경로 = fileURLToPath(import.meta.url);
const 프로젝트루트 = resolve(dirname(현재파일경로), "..");
const 출력경로 = resolve(프로젝트루트, "src/data/공휴일.json");

const 엔드포인트 =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

const 서비스키 = process.env.DATA_GO_KR_KEY;

async function 연도별공휴일가져오기(연도) {
  const 쿼리 = new URLSearchParams({
    serviceKey: 서비스키,
    solYear: String(연도),
    numOfRows: "100",
    _type: "json",
  });
  const 응답 = await fetch(`${엔드포인트}?${쿼리}`);
  if (!응답.ok) {
    throw new Error(`HTTP ${응답.status} (${연도}년)`);
  }
  const 본문 = await 응답.json();

  const 결과코드 = 본문?.response?.header?.resultCode;
  if (결과코드 && 결과코드 !== "00") {
    const 메시지 = 본문?.response?.header?.resultMsg ?? "알 수 없는 오류";
    throw new Error(`API 오류 ${결과코드}: ${메시지} (${연도}년)`);
  }

  const 항목들 = 본문?.response?.body?.items?.item;
  if (!항목들) return [];
  const 배열 = Array.isArray(항목들) ? 항목들 : [항목들];

  return 배열
    .filter((항목) => 항목.isHoliday === "Y")
    .map((항목) => {
      const locdate = String(항목.locdate);
      const 날짜 = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
      return { 날짜, 이름: 항목.dateName };
    })
    .sort((a, b) => a.날짜.localeCompare(b.날짜));
}

async function 메인() {
  if (!서비스키) {
    console.error("환경변수 DATA_GO_KR_KEY가 설정되지 않았습니다.");
    console.error("로컬: .env.local 또는 export DATA_GO_KR_KEY=...");
    console.error("CI:   GitHub Secrets에 DATA_GO_KR_KEY 등록");
    process.exit(1);
  }

  const 현재연도 = new Date().getFullYear();
  const 연도범위 = [현재연도 - 1, 현재연도, 현재연도 + 1, 현재연도 + 2];

  const 결과 = {};
  for (const 연도 of 연도범위) {
    const 데이터 = await 연도별공휴일가져오기(연도);
    결과[연도] = 데이터;
    console.log(`✓ ${연도}년: ${데이터.length}일`);
  }

  await mkdir(dirname(출력경로), { recursive: true });
  await writeFile(출력경로, JSON.stringify(결과, null, 2) + "\n", "utf-8");
  console.log(`\n저장: ${출력경로}`);
}

메인().catch((오류) => {
  console.error(오류.message);
  process.exit(1);
});
