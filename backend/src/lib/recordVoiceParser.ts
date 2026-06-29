export type VoiceParseStatus = "parsed" | "partial" | "unsupported" | "unrecognized";

export type VoiceRecordType =
  | "breast_milk"
  | "formula"
  | "sleep"
  | "temperature"
  | "diaper"
  | "medicine"
  | "jaundice"
  | "cord_care"
  | "bath_touch";

export type VoiceParseCandidate = {
  type: VoiceRecordType;
  recorded_at: string;
  data: Record<string, unknown>;
};

export type VoiceParseResult = {
  status: VoiceParseStatus;
  transcript: string;
  candidate?: VoiceParseCandidate;
  missing_fields?: string[];
  confidence: number;
  message: string;
};

type ParseContext = {
  transcript: string;
  recordedAtContext: string;
  recognitionStartedAt: string;
};

type TimePoint = {
  iso: string;
  date: string;
  hour: number;
  minute: number;
  period?: string;
};

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function normalizeTranscript(input: string): string {
  return input
    .replace(/[，。！？、；：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberish(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === "半") return 0.5;

  let total = 0;
  let section = 0;
  let current = 0;
  let consumed = false;

  for (const char of value) {
    if (char in CHINESE_DIGITS) {
      current = CHINESE_DIGITS[char];
      consumed = true;
      continue;
    }

    if (char === "十") {
      section += (current || 1) * 10;
      current = 0;
      consumed = true;
      continue;
    }

    if (char === "百") {
      section += (current || 1) * 100;
      current = 0;
      consumed = true;
      continue;
    }

    return null;
  }

  total += section + current;
  return consumed ? total : null;
}

function parseDurationMinutes(text: string): number | null {
  const normalized = text.replace(/一刻钟/g, "15分钟").replace(/半小时/g, "30分钟");
  const match = normalized.match(/([零一二两三四五六七八九十百\d]+(?:\.\d+)?)\s*(?:分钟|分)/);
  if (!match) return null;

  return parseNumberish(match[1]);
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalIso(date: Date): string {
  return `${localDateString(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

function shiftDay(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function parseTimePoints(text: string, baseDate: Date): TimePoint[] {
  const regex = /(今天|昨天)?\s*(凌晨|早上|上午|中午|下午|晚上)?\s*([零一二两三四五六七八九十百\d]+)\s*点\s*(半|([零一二两三四五六七八九十百\d]+)\s*分?)?/g;
  const points: TimePoint[] = [];
  let inheritedPeriod: string | undefined;
  let inheritedDate = localDateString(baseDate);

  for (const match of text.matchAll(regex)) {
    const dayWord = match[1];
    const periodWord = match[2] || inheritedPeriod;
    const hourValue = parseNumberish(match[3]);
    if (hourValue === null) continue;

    const minuteValue = match[4] === "半"
      ? 30
      : match[5]
        ? (parseNumberish(match[5]) ?? 0)
        : 0;

    let hour = hourValue;
    if (periodWord === "下午" || periodWord === "晚上") {
      if (hour < 12) hour += 12;
    } else if (periodWord === "中午") {
      if (hour < 11) hour += 12;
    } else if (periodWord === "凌晨" && hour === 12) {
      hour = 0;
    }

    if (hour > 23 || minuteValue > 59) continue;

    const dayBase = dayWord === "昨天"
      ? shiftDay(baseDate, -1)
      : baseDate;
    const date = localDateString(dayBase);
    inheritedDate = date;
    if (match[2]) inheritedPeriod = match[2];

    points.push({
      date: inheritedDate,
      hour,
      minute: minuteValue,
      iso: `${inheritedDate}T${String(hour).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}:00`,
      period: periodWord,
    });
  }

  return points;
}

function pickRecordedAt(text: string, contextIso: string, startedIso: string): string {
  if (/(刚刚|刚才|现在)/.test(text)) return startedIso;

  const base = new Date(startedIso);
  const points = parseTimePoints(text, base);
  if (points.length > 0) {
    return new Date(points[points.length - 1].iso).toISOString();
  }

  return new Date(contextIso).toISOString();
}

function hasKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferType(text: string): { type?: VoiceRecordType; status: VoiceParseStatus } {
  if (hasKeywords(text, ["奶粉", "配方奶", "毫升", "ml", "ML"])) {
    return { type: "formula", status: "parsed" };
  }
  if (hasKeywords(text, ["母乳", "亲喂", "左边", "右边", "左侧", "右侧", "双侧", "喂奶"])) {
    return { type: "breast_milk", status: "parsed" };
  }
  if (hasKeywords(text, ["体温", "发烧", "耳温", "额温", "腋温"]) || /(\d{2}(?:\.\d)?)\s*度/.test(text)) {
    return { type: "temperature", status: "parsed" };
  }
  if (hasKeywords(text, ["睡", "醒", "午睡", "入睡", "睡着"])) {
    return { type: "sleep", status: "parsed" };
  }

  const unsupportedMap: Array<{ type: VoiceRecordType; keywords: string[] }> = [
    { type: "diaper", keywords: ["尿布", "换尿布", "拉了", "大便", "小便", "便便"] },
    { type: "medicine", keywords: ["吃药", "喂药", "药", "药水"] },
    { type: "jaundice", keywords: ["黄疸"] },
    { type: "cord_care", keywords: ["脐带", "脐部", "脐护"] },
    { type: "bath_touch", keywords: ["洗澡", "抚触", "洗护"] },
  ];

  const unsupported = unsupportedMap.find((item) => hasKeywords(text, item.keywords));
  if (unsupported) {
    return { type: unsupported.type, status: "unsupported" };
  }

  return { status: "unrecognized" };
}

function parseBreastMilk(ctx: ParseContext): VoiceParseResult {
  const text = ctx.transcript;
  const leftMatch = text.match(/左(?:边|侧)?[^零一二两三四五六七八九十百\d]*(?:喂|吃)?[^零一二两三四五六七八九十百\d]*([零一二两三四五六七八九十百\d]+(?:\.\d+)?)\s*(?:分钟|分)/);
  const rightMatch = text.match(/右(?:边|侧)?[^零一二两三四五六七八九十百\d]*(?:喂|吃)?[^零一二两三四五六七八九十百\d]*([零一二两三四五六七八九十百\d]+(?:\.\d+)?)\s*(?:分钟|分)/);
  const genericDuration = parseDurationMinutes(text);

  const leftMin = leftMatch ? parseNumberish(leftMatch[1]) : null;
  const rightMin = rightMatch ? parseNumberish(rightMatch[1]) : null;

  if (leftMin !== null && rightMin !== null) {
    return {
      status: "parsed",
      transcript: text,
      confidence: 0.96,
      message: "已识别为母乳记录，请确认左右侧时长。",
      candidate: {
        type: "breast_milk",
        recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
        data: {
          side: "both",
          leftMin,
          rightMin,
          note: "",
        },
      },
    };
  }

  if (leftMin !== null) {
    return {
      status: "parsed",
      transcript: text,
      confidence: 0.92,
      message: "已识别为左侧母乳记录。",
      candidate: {
        type: "breast_milk",
        recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
        data: {
          side: "left",
          leftMin,
          rightMin: 0,
          note: "",
        },
      },
    };
  }

  if (rightMin !== null) {
    return {
      status: "parsed",
      transcript: text,
      confidence: 0.92,
      message: "已识别为右侧母乳记录。",
      candidate: {
        type: "breast_milk",
        recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
        data: {
          side: "right",
          leftMin: 0,
          rightMin,
          note: "",
        },
      },
    };
  }

  if (genericDuration !== null && /双侧/.test(text)) {
    return {
      status: "partial",
      transcript: text,
      confidence: 0.75,
      message: "已识别为母乳记录，请补全左右侧时长。",
      candidate: {
        type: "breast_milk",
        recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
        data: {
          side: "both",
          note: "",
        },
      },
      missing_fields: ["leftMin", "rightMin"],
    };
  }

  return {
    status: "partial",
    transcript: text,
    confidence: 0.64,
    message: "已识别为母乳记录，请补全侧别和时长。",
    candidate: {
      type: "breast_milk",
      recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
      data: {
        note: "",
      },
    },
    missing_fields: ["side", "leftMin/rightMin"],
  };
}

function parseFormula(ctx: ParseContext): VoiceParseResult {
  const text = ctx.transcript;
  const amountMatch = text.match(/([零一二两三四五六七八九十百\d]+(?:\.\d+)?)\s*(?:毫升|ml|ML)/);
  const amount = amountMatch ? parseNumberish(amountMatch[1]) : null;

  if (amount !== null) {
    return {
      status: "parsed",
      transcript: text,
      confidence: 0.95,
      message: "已识别为配方奶记录。",
      candidate: {
        type: "formula",
        recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
        data: {
          ml: amount,
          note: "",
        },
      },
    };
  }

  return {
    status: "partial",
    transcript: text,
    confidence: 0.7,
    message: "已识别为配方奶记录，请补全奶量。",
    candidate: {
      type: "formula",
      recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
      data: {
        note: "",
      },
    },
    missing_fields: ["ml"],
  };
}

function parseTemperature(ctx: ParseContext): VoiceParseResult {
  const text = ctx.transcript;
  const valueMatch = text.match(/([零一二两三四五六七八九十百\d]+(?:\.\d+)?)\s*度/);
  const value = valueMatch ? parseNumberish(valueMatch[1]) : null;
  const site = text.includes("耳温")
    ? "ear"
    : text.includes("额温")
      ? "forehead"
      : text.includes("腋温")
        ? "armpit"
        : null;

  const candidate: VoiceParseCandidate = {
    type: "temperature",
    recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
    data: {
      ...(value !== null ? { value } : {}),
      ...(site ? { site } : {}),
      note: "",
    },
  };

  if (value !== null && site) {
    return {
      status: "parsed",
      transcript: text,
      confidence: 0.95,
      message: "已识别为体温记录。",
      candidate,
    };
  }

  return {
    status: "partial",
    transcript: text,
    confidence: value !== null ? 0.78 : 0.58,
    message: "已识别为体温记录，请补全数值或测量部位。",
    candidate,
    missing_fields: [
      ...(value === null ? ["value"] : []),
      ...(!site ? ["site"] : []),
    ],
  };
}

function parseSleep(ctx: ParseContext): VoiceParseResult {
  const text = ctx.transcript;
  const base = new Date(ctx.recognitionStartedAt);
  const points = parseTimePoints(text, base);
  const isSleeping = /睡眠中|正在睡|还在睡/.test(text);

  if (points.length >= 2) {
    const [start, end] = points;
    const endDate = new Date(end.iso);
    const now = new Date(ctx.recordedAtContext);
    if (endDate.getTime() > now.getTime() + 60_000) {
      return {
        status: "partial",
        transcript: text,
        confidence: 0.62,
        message: "已识别为睡眠记录，但结束时间需要你再确认。",
        candidate: {
          type: "sleep",
          recorded_at: new Date(start.iso).toISOString(),
          data: {
            start: start.iso,
            note: "",
          },
        },
        missing_fields: ["end"],
      };
    }

    return {
      status: "parsed",
      transcript: text,
      confidence: 0.94,
      message: "已识别为睡眠记录。",
      candidate: {
        type: "sleep",
        recorded_at: endDate.toISOString(),
        data: {
          start: start.iso,
          end: end.iso,
          sleeping: false,
          note: "",
        },
      },
    };
  }

  if (points.length === 1) {
    const [start] = points;
    return {
      status: isSleeping ? "parsed" : "partial",
      transcript: text,
      confidence: isSleeping ? 0.88 : 0.73,
      message: isSleeping ? "已识别为睡眠中记录。" : "已识别为睡眠记录，请补全结束时间。",
      candidate: {
        type: "sleep",
        recorded_at: new Date(start.iso).toISOString(),
        data: {
          start: start.iso,
          ...(isSleeping ? { end: null, sleeping: true } : {}),
          note: "",
        },
      },
      ...(isSleeping ? {} : { missing_fields: ["end"] }),
    };
  }

  return {
    status: "partial",
    transcript: text,
    confidence: 0.55,
    message: "已识别为睡眠记录，请补全开始和结束时间。",
    candidate: {
      type: "sleep",
      recorded_at: pickRecordedAt(text, ctx.recordedAtContext, ctx.recognitionStartedAt),
      data: {
        note: "",
      },
    },
    missing_fields: ["start", "end"],
  };
}

export function parseRecordVoice(input: ParseContext): VoiceParseResult {
  const transcript = normalizeTranscript(input.transcript);
  if (!transcript) {
    return {
      status: "unrecognized",
      transcript: "",
      confidence: 0,
      message: "没有识别到语音内容，请再说一次。",
    };
  }

  const context: ParseContext = {
    ...input,
    transcript,
  };

  const inference = inferType(transcript);

  if (!inference.type) {
    return {
      status: "unrecognized",
      transcript,
      confidence: 0.2,
      message: "暂时没听懂这条记录，请改为手动填写。",
    };
  }

  if (inference.status === "unsupported") {
    return {
      status: "unsupported",
      transcript,
      confidence: 0.72,
      message: "该类型暂不支持语音解析，已为你准备手动录入。",
      candidate: {
        type: inference.type,
        recorded_at: pickRecordedAt(transcript, input.recordedAtContext, input.recognitionStartedAt),
        data: {},
      },
    };
  }

  switch (inference.type) {
    case "breast_milk":
      return parseBreastMilk(context);
    case "formula":
      return parseFormula(context);
    case "sleep":
      return parseSleep(context);
    case "temperature":
      return parseTemperature(context);
    default:
      return {
        status: "unrecognized",
        transcript,
        confidence: 0.2,
        message: "暂时没听懂这条记录，请改为手动填写。",
      };
  }
}
