import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 공공데이터포털 특일 정보 API 에서 공휴일을 받아 src/data/holidays.json 을 갱신한다.
// 조회 범위는 현재−1 ~ 현재+2 년이고, 저장 파일에는 그 범위만 남긴다.
// 커밋된 파일을 기준으로, 조회에 실패했거나 응답이 불완전해 보이는 연도는 기존 데이터를 유지한다.
// 그런 연도가 하나라도 있거나 키가 없으면 exit 1 로 알린다 (성공한 연도는 저장한 뒤).
// CI 에서는 continue-on-error 로 커밋된 데이터로 배포를 계속한다.

const 현재파일경로 = fileURLToPath(import.meta.url);
const 프로젝트루트 = resolve(dirname(현재파일경로), "..");
const 출력경로 = resolve(프로젝트루트, "src/data/holidays.json");

const 엔드포인트 =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

// 포털이 주는 '인코딩' 키(%2B, %3D 포함)를 그대로 넣어도 되게 한 번 풀어 둔다. URLSearchParams 가 다시 인코딩한다
const 서비스키 = 키디코딩(process.env.DATA_GO_KR_KEY);
function 키디코딩(키) {
  if (!키) return 키;
  try { return decodeURIComponent(키); } catch { return 키; }
}

// API 의 dateName 표기를 화면에 쓰는 이름으로 통일
const 이름정규화 = { "1월1일": "신정" };
// 일시적인 네트워크·서버 오류에 대비한 재시도 횟수와 간격(ms)
const 재시도횟수 = 3;
const 재시도간격 = 2000;
// 응답 없는 연결에 오래 붙잡히지 않도록 요청마다 두는 제한 시간(ms)
const 요청제한시간 = 10_000;
// 기존보다 이만큼까지 줄어든 응답은 정정(임시공휴일 취소 등)으로 보고 받아들인다. 그보다 크게 줄면 불완전한 응답으로 본다.
// 건수만으로는 '정정'과 '일부 누락'을 구분할 수 없어 택한 절충값이다. 더 크게 줄어드는 실제 정정은 holidays.json 을 직접 고쳐 커밋한다.
const 허용감소 = 2;

/** 다시 보내도 결과가 같은 오류(키 거부, 잘못된 요청)는 기다리지 않고 바로 포기한다. 429 는 잠시 뒤 재시도 */
function 재시도가치없음(오류) {
  const 상태 = 오류?.status;
  return typeof 상태 === "number" && 상태 >= 400 && 상태 < 500 && 상태 !== 429;
}

/** 실패하면 간격을 늘려 가며 다시 시도한다 (네트워크·시간 초과·5xx·429 만) */
async function 재시도(작업) {
  let 마지막오류;
  for (let 시도 = 0; 시도 < 재시도횟수; 시도++) {
    try {
      return await 작업();
    } catch (오류) {
      마지막오류 = 오류;
      if (재시도가치없음(오류)) break;
      if (시도 < 재시도횟수 - 1) await new Promise((r) => setTimeout(r, 재시도간격 * (시도 + 1)));
    }
  }
  throw 마지막오류;
}

// 한 번에 받는 건수와 최대 쪽수. 한 해의 특일은 수십 건이라 보통 한 쪽이면 끝난다
const 쪽크기 = 100;
const 최대쪽수 = 10;

/** 연도의 특일 항목을 쪽을 넘겨 가며 모두 받는다 */
async function 공휴일가져오기(연도) {
  const 항목들 = [];
  let 직전첫날 = null;
  for (let 쪽 = 1; 쪽 <= 최대쪽수; 쪽++) {
    const { 배열, 전체수 } = await 쪽가져오기(연도, 쪽);
    // pageNo 를 무시하고 첫 쪽을 되풀이하는 응답을 완료로 오해하지 않게 (중복은 항목정리에서 합쳐져 티가 안 난다)
    const 첫날 = 배열[0]?.locdate ?? null;
    if (첫날 != null && 첫날 === 직전첫날) throw new Error(`같은 쪽이 반복됩니다 (${연도}년, ${쪽}쪽)`);
    직전첫날 = 첫날;
    항목들.push(...배열);
    if (항목들.length >= 전체수 || 배열.length === 0) {
      if (항목들.length < 전체수) throw new Error(`불완전한 응답: ${전체수}건 중 ${항목들.length}건만 수신 (${연도}년)`);
      return 항목정리(항목들);
    }
  }
  throw new Error(`쪽이 너무 많습니다 (${연도}년, ${최대쪽수}쪽 초과)`);
}

async function 쪽가져오기(연도, 쪽) {
  const 쿼리 = new URLSearchParams({
    serviceKey: 서비스키,
    solYear: String(연도),
    numOfRows: String(쪽크기),
    pageNo: String(쪽),
    _type: "json",
  });
  const 응답 = await fetch(`${엔드포인트}?${쿼리}`, { signal: AbortSignal.timeout(요청제한시간) });
  if (!응답.ok) {
    throw Object.assign(new Error(`HTTP ${응답.status} (${연도}년)`), { status: 응답.status });
  }
  // 키가 틀리면 200 에 XML(SERVICE_KEY_IS_NOT_REGISTERED 등)이 온다. 다시 보내도 같으므로 재시도하지 않는 오류로 올린다
  const 글 = await 응답.text();
  let 본문;
  try {
    본문 = JSON.parse(글);
  } catch {
    const 요약 = 글.replace(/\s+/g, " ").slice(0, 160);
    // 키·계정·한도 문제면 다시 보내도 같다. 그 밖의 XML 오류 페이지(일시 장애)는 재시도한다
    const 키문제 = /SERVICE_KEY|NOT_REGISTERED|UNAUTHORIZED|ACCESS_DENIED|DEADLINE_HAS_EXPIRED|UNREGISTERED_IP|LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS/i.test(글); // 하루 한도. 초당 한도(…_PER_SECOND_…)는 재시도
    throw Object.assign(
      new Error(`JSON 이 아닌 응답${키문제 ? " — 서비스 키·활용 신청 기간·호출 한도를 확인하세요" : ""} (${연도}년): ${요약}`),
      키문제 ? { status: 400 } : {},
    );
  }

  const 결과코드 = 본문?.response?.header?.resultCode;
  if (결과코드 && 결과코드 !== "00") {
    const 메시지 = 본문?.response?.header?.resultMsg ?? "알 수 없는 오류";
    // 일시 오류(01 애플리케이션 · 02 DB · 04 HTTP · 05 시간 초과 · 23 초당 요청 한도)는 잠시 뒤 다시 시도한다.
    // 22(하루 요청 한도)·키 미등록·파라미터 오류처럼 몇 초 뒤에 다시 보내도 같은 답이 오는 나머지는 바로 알린다
    const 일시오류 = ["01", "02", "04", "05", "23"].includes(String(결과코드));
    throw Object.assign(new Error(`API 오류 ${결과코드}: ${메시지} (${연도}년)`), 일시오류 ? {} : { status: 400 });
  }

  const 본체 = 본문?.response?.body;
  if (!본체) throw new Error(`응답 형식이 예상과 다릅니다 (${연도}년)`);
  const 항목들 = 본체.items?.item;
  const 배열 = !항목들 ? [] : Array.isArray(항목들) ? 항목들 : [항목들];
  return { 배열, 전체수: Number(본체.totalCount ?? 0) };
}

/** API 항목 → { 날짜, 이름 } 목록. 같은 날 겹치는 공휴일은 이름을 합친다 */
function 항목정리(배열) {
  const 날짜별 = new Map();
  for (const 항목 of 배열) {
    if (항목.isHoliday !== "Y") continue;
    const locdate = String(항목.locdate);
    const 이름 = 이름정규화[항목.dateName] ?? 항목.dateName;
    const 날짜 = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
    // 같은 날짜에 공휴일이 겹치면(예: 어린이날·부처님오신날) 이름을 합쳐 한 항목으로
    const 기존 = 날짜별.get(날짜);
    if (!기존) 날짜별.set(날짜, { 날짜, 이름 });
    else if (!기존.이름.split(" · ").includes(이름)) 기존.이름 += ` · ${이름}`;
  }
  return [...날짜별.values()].sort((a, b) => a.날짜.localeCompare(b.날짜));
}

async function 기존데이터() {
  try {
    return JSON.parse(await readFile(출력경로, "utf-8"));
  } catch {
    return {};
  }
}

async function 메인() {
  const 기존전체 = await 기존데이터();

  if (!서비스키) {
    console.error("환경변수 DATA_GO_KR_KEY 가 없어 공휴일을 갱신하지 못했습니다. 기존 데이터는 그대로입니다.");
    console.error("로컬: .env.local 또는 export DATA_GO_KR_KEY=... / CI: GitHub Secrets 에 등록");
    process.exitCode = 1;
    return;
  }

  const 현재연도 = new Date().getFullYear();
  const 연도범위 = [현재연도 - 1, 현재연도, 현재연도 + 1, 현재연도 + 2];
  // 범위 안의 연도만 남긴다 (지나간 연도는 화면에서 고를 수 없으므로 번들에서도 뺀다)
  const 결과 = Object.fromEntries(연도범위.filter((연도) => 기존전체[연도]).map((연도) => [연도, 기존전체[연도]]));

  // 연도별 조회는 서로 독립이므로 동시에 보낸다
  const 응답들 = await Promise.allSettled(연도범위.map((연도) => 재시도(() => 공휴일가져오기(연도))));

  let 변경 = false;
  let 실패수 = 0;
  연도범위.forEach((연도, i) => {
    const 응답 = 응답들[i];
    if (응답.status === "rejected") {
      실패수++;
      console.warn(`✗ ${연도}년 갱신 실패, 기존 데이터 유지: ${응답.reason?.message ?? 응답.reason}`);
      return;
    }
    const 데이터 = 응답.value;
    const 기존 = 결과[연도] ?? [];
    if ((데이터.length === 0 && 기존.length > 0) || 데이터.length < 기존.length - 허용감소) {
      실패수++;
      console.warn(`△ ${연도}년: API 응답(${데이터.length}일)이 기존(${기존.length}일)보다 크게 적어 불완전한 응답으로 보고 기존을 유지합니다`);
      return;
    }
    if (JSON.stringify(데이터) !== JSON.stringify(기존)) 변경 = true;
    결과[연도] = 데이터;
    console.log(`✓ ${연도}년: ${데이터.length}일`);
  });
  // 연도 집합이 달라졌는지는 갱신이 끝난 뒤에 본다 (지난 해가 빠지거나, 새 해가 빈 채로라도 들어온 경우)
  const 연도집합 = (객체) => Object.keys(객체).sort().join(",");
  if (연도집합(결과) !== 연도집합(기존전체)) 변경 = true;

  // 갱신하지 못한 연도가 하나라도 있으면 exit 1 로 알린다 (성공한 연도는 아래에서 그대로 저장)
  if (실패수 > 0) {
    console.error(`\n${연도범위.length}개 연도 중 ${실패수}개를 갱신하지 못했습니다. 해당 연도는 기존 데이터를 유지합니다.`);
    process.exitCode = 1;
  }
  if (!변경) {
    console.log("\n변경 없음");
    return;
  }
  await mkdir(dirname(출력경로), { recursive: true });
  await writeFile(출력경로, JSON.stringify(결과, null, 2) + "\n", "utf-8");
  console.log(`\n저장: ${출력경로}`);
}

메인().catch((오류) => {
  console.error(`공휴일 갱신 중 오류, 기존 데이터 유지: ${오류.message}`);
  process.exitCode = 1;
});
