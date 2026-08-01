import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const dataDir = path.resolve(process.env.WORKBENCH_DATA_DIR || path.join(__dirname, 'data'));
const obsidianDir = process.env.WORKBENCH_OBSIDIAN_DIR
  ? path.resolve(process.env.WORKBENCH_OBSIDIAN_DIR)
  : '';
const contentRoot = process.env.WORKBENCH_CONTENT_ROOT
  ? path.resolve(process.env.WORKBENCH_CONTENT_ROOT)
  : '';
const enableLocalCommands = process.env.WORKBENCH_ENABLE_LOCAL_COMMANDS === 'true';
const enableFeishu = process.env.WORKBENCH_ENABLE_FEISHU === 'true';
const port = Number(process.env.XYXH_WORKBENCH_PORT || 8787);
const host = process.env.XYXH_WORKBENCH_HOST || '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data, null, 2));
}

function textResponse(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function readJsonOrDefault(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function emptyDashboardData() {
  return {
    meta: {
      workspaceName: '内容运营工作台',
      owner: '',
      updatedAt: '',
      mode: 'local-first',
      principle: '事实数据进入主系统，个人理解进入知识库，重复工作沉淀为可复用流程，工作台负责聚合和执行。'
    },
    boundaries: [],
    dailyGrowth: {
      date: '',
      account: '',
      totalFollowers: 0,
      dailyIncrease: 0,
      weeklyIncrease: 0,
      monthlyIncrease: 0,
      goalFollowers: 0,
      goalDate: '',
      platforms: [],
      insights: []
    },
    hotContentLab: {
      source: '',
      categories: [],
      filters: [],
      taxonomy: {
        categories: [],
        topics: [],
        audiences: []
      },
      ideas: []
    },
    sourceCards: [],
    workflowQueue: [],
    systemStatus: [],
    customerFollowUp: {
      segments: [],
      fields: []
    },
    skills: [],
    tasks: [],
    sync: {
      feishuBaseUrl: '',
      obsidianPath: '',
      scripts: []
    }
  };
}

async function readDashboardData(filePath = path.join(dataDir, 'dashboard-data.json')) {
  return readJsonOrDefault(filePath, emptyDashboardData());
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

let feishuTokenCache = { token: '', expiresAt: 0 };

async function getFeishuTenantAccessToken() {
  if (feishuTokenCache.token && feishuTokenCache.expiresAt > Date.now() + 60_000) {
    return feishuTokenCache.token;
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(payload.msg || `获取飞书访问令牌失败（HTTP ${response.status}）`);
  }

  feishuTokenCache = {
    token: payload.tenant_access_token,
    expiresAt: Date.now() + Number(payload.expire || 7200) * 1000
  };
  return feishuTokenCache.token;
}

async function upsertFeishuRecord(fields, recordId = '') {
  const token = await getFeishuTenantAccessToken();
  const baseUrl = process.env.FEISHU_API_BASE_URL || 'https://open.feishu.cn';
  const appToken = encodeURIComponent(process.env.FEISHU_BASE_TOKEN);
  const tableId = encodeURIComponent(process.env.FEISHU_TABLE_ID);
  const recordPath = `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
  const url = `${baseUrl}${recordPath}${recordId ? `/${encodeURIComponent(recordId)}` : ''}`;
  const response = await fetch(url, {
    method: recordId ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ fields })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `写入飞书多维表失败（HTTP ${response.status}）`);
  }
  return payload.data?.record?.record_id || recordId || '';
}

function publicDashboard(data) {
  const hotContentLab = data.hotContentLab || {};
  const normalizedPageSettings = normalizePageSettings(data);
  return {
    ...data,
    pageSettings: normalizedPageSettings,
    hotContentLab: {
      ...hotContentLab,
      taxonomy: normalizeHotContentTaxonomy(hotContentLab)
    },
    sync: {
      ...data.sync,
      scripts: (data.sync?.scripts || []).map(({ command, ...script }) => script)
    }
  };
}

const defaultPageSettings = {
  dashboard: {
    title: '任务计划',
    groups: [
      { key: 'collections', label: '合集', items: ['发布会筹备', '内容运营', '飞书OS', '资源管理', '产品协同', '个人成长'] },
      { key: 'systems', label: '归属', items: ['飞书', '本地', 'Obsidian', 'Skills'] },
      { key: 'statuses', label: '状态', items: ['待开始', '进行中', '待确认', '已完成'] },
      { key: 'priorities', label: '优先级', items: ['P0', 'P1', 'P2'] }
    ]
  },
  growth: {
    title: '增长日报',
    groups: [
      { key: 'platforms', label: '平台', items: ['小红书', '视频号', '公众号', '抖音', 'B站', '小宇宙', '微博', '其他平台'] },
      { key: 'metricTypes', label: '指标', items: ['粉丝', '日增', '互动', '线索', '私信', '报名', 'B端咨询'] },
      { key: 'entrySources', label: '录入来源', items: ['手动录入', '粘贴解析', '后台导入', '采集工具'] }
    ]
  },
  hot: {
    title: '爆款选题Lab',
    groups: [
      { key: 'categories', label: '领域', items: [] },
      { key: 'topics', label: '话题', items: [] },
      { key: 'audiences', label: '受众', items: [] },
      { key: 'models', label: '模型', items: [] }
    ]
  },
  library: {
    title: '作品库管理',
    groups: [
      { key: 'platforms', label: '平台', items: ['小红书', '视频号', '公众号', '抖音'] },
      { key: 'formats', label: '形式', items: ['图文', '视频', '直播切片'] },
      { key: 'engagementLevels', label: '互动分层', items: ['高互动', '低互动', '0互动'] },
      { key: 'layouts', label: '呈现方式', items: ['卡片', '时间线', '表格', '榜单'] }
    ]
  },
  follow: {
    title: '客户跟进',
    groups: [
      { key: 'customerTypes', label: '客户类型', items: [] },
      { key: 'sources', label: '来源平台', items: ['小红书', '视频号', '公众号', '官网', '其他'] },
      { key: 'stages', label: '跟进阶段', items: ['初次沟通', '已发资料', '待回复', '需求访谈', '已成交', '暂缓'] }
    ]
  },
  skills: {
    title: 'Skills 管理',
    groups: [
      { key: 'categories', label: '能力分类', items: ['内容增长', '运营支持', '供应链', '产品测试', '复盘沉淀'] },
      { key: 'statuses', label: '状态', items: ['首版可用', '待接入', '可配置', '待沉淀'] },
      { key: 'owners', label: '负责人', items: [] }
    ]
  },
  experience: {
    title: '经验复盘',
    groups: [
      { key: 'types', label: '类型', items: ['加分行为', '减分行为', '中性观察'] },
      { key: 'categories', label: '经验分类', items: ['内容大原则', '简单/品牌', 'AI/工作流', '访谈方法', '脚本撰写', '选题', '标题', '结构'] },
      { key: 'topics', label: '话题簇', items: ['全簇通用', '职场', '友谊', '职业转型', '亲密关系', '大师名家'] },
      { key: 'levels', label: '经验级别', items: ['核心原则', '普通经验'] }
    ]
  },
  'lark-minutes': {
    title: '飞书妙记',
    groups: [
      { key: 'todoTypes', label: '待办类型', items: ['任务', 'SOP候选', '风险', '下一步动作'] },
      { key: 'riskLevels', label: '风险等级', items: ['高', '中', '低'] },
      { key: 'destinations', label: '去向', items: ['任务计划', '经验复盘', '飞书文档', '暂存'] }
    ]
  },
  review: {
    title: '复盘中心',
    groups: [
      { key: 'sections', label: '复盘字段', items: ['今天推进了什么', '风险', '新增理解', '明天最重要的事'] },
      { key: 'noteTypes', label: '笔记类型', items: ['日复盘', '项目复盘', '沟通复盘', '方法论'] },
      { key: 'destinations', label: '沉淀去向', items: ['Obsidian', '飞书', 'Skills'] }
    ]
  },
  sync: {
    title: '同步中心',
    groups: [
      { key: 'scriptTypes', label: '脚本类型', items: ['采集', '汇总', '飞书同步', '报告生成'] },
      { key: 'riskLevels', label: '风险等级', items: ['低', '中', '高'] },
      { key: 'runModes', label: '运行方式', items: ['手动', '确认后运行', '禁止自动运行'] }
    ]
  },
  settings: {
    title: '后台设置',
    groups: [
      { key: 'systems', label: '系统', items: ['飞书', 'Obsidian', '本地工作台', 'Skills'] },
      { key: 'roles', label: '角色', items: ['公司事实库', '个人理解库', '个人驾驶舱', '可复用方法库'] },
      { key: 'dataSources', label: '数据源', items: ['手动录入', '灵造/平台导入', '浏览器采集', '飞书同步'] }
    ]
  }
};

function normalizeSettingItems(items = []) {
  const seen = new Set();
  return items
    .map((item) => {
      if (typeof item === 'string') return { name: item };
      return {
        name: String(item?.name || '').trim(),
        note: String(item?.note || '').trim(),
        words: splitWords(item?.words || [])
      };
    })
    .filter((item) => {
      if (!item.name || seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

function normalizeSettingGroup(group = {}) {
  return {
    key: String(group.key || '').trim(),
    label: String(group.label || group.key || '').trim(),
    items: normalizeSettingItems(group.items || [])
  };
}

function mergeSettingGroups(savedGroups = [], defaultGroups = []) {
  const savedMap = new Map(savedGroups.map((group) => [group.key, group]));
  const groups = defaultGroups.map((group) => {
    const saved = savedMap.get(group.key);
    const fallback = normalizeSettingItems(group.items || []);
    const savedItems = normalizeSettingItems(saved?.items || []);
    return normalizeSettingGroup({
      key: group.key,
      label: saved?.label || group.label,
      items: [...savedItems, ...fallback]
    });
  });

  savedGroups.forEach((group) => {
    if (!groups.some((item) => item.key === group.key)) {
      groups.push(normalizeSettingGroup(group));
    }
  });

  return groups;
}

function normalizePageSettings(data = {}) {
  const savedSettings = data.pageSettings || {};
  const pages = {};
  Object.entries(defaultPageSettings).forEach(([view, defaults]) => {
    const saved = savedSettings[view] || {};
    pages[view] = {
      title: saved.title || defaults.title,
      groups: mergeSettingGroups(saved.groups || [], defaults.groups || [])
    };
  });

  Object.entries(savedSettings).forEach(([view, saved]) => {
    if (!pages[view]) {
      pages[view] = {
        title: saved.title || view,
        groups: (saved.groups || []).map(normalizeSettingGroup)
      };
    }
  });

  const hotTaxonomy = normalizeHotContentTaxonomy(data.hotContentLab || {});
  if (pages.hot) {
    pages.hot.groups = pages.hot.groups.map((group) => {
      if (group.key === 'categories') return { ...group, items: hotTaxonomy.categories };
      if (group.key === 'topics') return { ...group, items: hotTaxonomy.topics };
      if (group.key === 'audiences') return { ...group, items: hotTaxonomy.audiences };
      return group;
    });
  }

  return pages;
}

const defaultTopicRules = {
  '职场': ['职场', '工作', '上班', '加班', '求职', '失业', '压力'],
  '友谊': ['友谊', '朋友', '同伴', '伙伴', '社交', '关系'],
  '亲密关系': ['亲密关系', '伴侣', '恋爱', '情感', '关系', '连接'],
  '家庭': ['家庭', '亲子', '父母', '孩子', '家人'],
  '自我关系': ['自我', '独处', '内耗', '身体', '情绪', '状态'],
  '城市生活': ['城市', '通勤', '周末', '睡眠', '过载', '疲惫'],
  '个人成长': ['成长', '学习', '练习', '习惯', '方法'],
  '职业转型': ['转型', '转行', '收入', '培训', '职业', '能力']
};

const defaultAudienceRules = [
  { name: '普通消费者', words: ['消费者', '用户', '体验', '购买', '报名'] },
  { name: '企业客户', words: ['企业', '团队', 'HR', '行政', '合作', '采购'] },
  { name: '职场人群', words: ['职场', '白领', '打工', '上班', '求职', '失业', '转行'] },
  { name: '女性', words: ['女性', '女生', '独居', '她'] },
  { name: '高敏感者', words: ['高敏感', '敏感', '内耗', '过载', '情绪', '疲惫'] },
  { name: '创作者', words: ['创作者', '内容', '账号', '脚本', '拍摄', '发布'] }
];

function uniqueTextList(values = []) {
  const seen = new Set();
  return values
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function splitWords(value = []) {
  if (Array.isArray(value)) return uniqueTextList(value);
  return uniqueTextList(String(value || '').split(/[,，、\s]+/));
}

function normalizeRuleList(list = [], fallback = []) {
  const seen = new Set();
  return [...list, ...fallback]
    .map((item) => {
      if (typeof item === 'string') return { name: item, words: [] };
      return {
        name: String(item?.name || '').trim(),
        words: splitWords(item?.words || [])
      };
    })
    .filter((item) => {
      if (!item.name || seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

function normalizeHotContentTaxonomy(hotContentLab = {}) {
  const taxonomy = hotContentLab.taxonomy || {};
  const hasTopics = Array.isArray(taxonomy.topics);
  const hasAudiences = Array.isArray(taxonomy.audiences);
  const categories = uniqueTextList([
    ...(Array.isArray(taxonomy.categories) ? taxonomy.categories.map((item) => item.name || item) : []),
    ...(hotContentLab.categories || [])
  ]);
  const topics = normalizeRuleList(
    Array.isArray(taxonomy.topics) ? taxonomy.topics : [],
    hasTopics ? [] : (hotContentLab.filters || []).map((item) => ({
      name: item.name,
      words: defaultTopicRules[item.name] || []
    }))
  );
  const audiences = normalizeRuleList(
    Array.isArray(taxonomy.audiences) ? taxonomy.audiences : [],
    hasAudiences ? [] : defaultAudienceRules
  );

  return {
    categories: categories.map((name) => ({ name })),
    topics: topics.map((item) => ({
      name: item.name,
      words: item.words.length ? item.words : (defaultTopicRules[item.name] || [])
    })),
    audiences
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  return JSON.parse(text);
}

function safeSlug(text) {
  return String(text || 'untitled')
    .trim()
    .replace(/[\\/:*?"<>|#\[\]]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'untitled';
}

function normalizeDate(value = '') {
  const text = String(value || '')
    .replace(/年|\.|\//g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .trim();
  const match = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (!match) return '';
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function detailIsDone(status) {
  return status === '已补详情' || status === '手动补详情';
}

function todayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function getObsidianNotes() {
  if (!obsidianDir) {
    return (await readJsonOrDefault(path.join(dataDir, 'obsidian-notes.json'), { notes: [] })).notes || [];
  }

  const dir = obsidianDir;
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const notes = [];

  for (const file of files.filter((item) => item.endsWith('.md')).sort()) {
    const fullPath = path.join(dir, file);
    const text = await fs.readFile(fullPath, 'utf8');
    const title = text.match(/^#\s+(.+)$/m)?.[1] || file.replace(/\.md$/, '');
    const summary = text
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith('#'))
      .slice(0, 2)
      .join(' ')
      .slice(0, 180);
    notes.push({
      file,
      title,
      summary,
      path: path.relative(dir, fullPath)
    });
  }

  return notes;
}

async function getContentAssets() {
  const bundled = await readJsonOrDefault(path.join(dataDir, 'content-assets.json'), null);
  if (Array.isArray(bundled?.assets)) return bundled.assets;

  if (!contentRoot) return [];

  const files = [
    {
      source: '小红书运营作品库',
      path: path.join(contentRoot, 'lingzao-research/01-小红书运营作品库.md')
    },
    {
      source: '微信公众号作品库',
      path: path.join(contentRoot, 'wechat-official-account/01-微信公众号作品库.md')
    },
    {
      source: '30天选题规划',
      path: path.join(contentRoot, 'lingzao-research/03-30天选题规划.md')
    },
    {
      source: '发布会预热内容包',
      path: path.join(contentRoot, 'lingzao-research/04-发布会预热内容包.md')
    }
  ];

  const assets = [];

  for (const file of files) {
    let text = '';
    try {
      text = await fs.readFile(file.path, 'utf8');
    } catch {
      continue;
    }

    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.length < 3 || cells[0].startsWith('---') || cells.some((cell) => /^---/.test(cell))) {
        continue;
      }

      if (file.source === '小红书运营作品库' && /^\d+$/.test(cells[0])) {
        const category = cells[4] || '待分类';
        assets.push({
          source: file.source,
          title: cells[1],
          type: category || '待分类',
          line: category || '待归类',
          use: `总互动 ${cells[2] || '待补'} / 评论 ${cells[3] || '待补'}`,
          next: cells[cells.length - 1] || '待补下一步'
        });
        continue;
      }

      if (file.source === '微信公众号作品库' && /^WX-/.test(cells[0])) {
        assets.push({
          source: file.source,
          title: cells[2],
          type: cells[3] || '待分类',
          line: cells[4] || '待归类',
          use: cells[5] || cells[6] || '待补用途',
          next: cells[cells.length - 1] || '待补下一步'
        });
        continue;
      }

      if ((file.source === '30天选题规划' || file.source === '发布会预热内容包') && !cells[0].includes('周次') && !cells[0].includes('阶段')) {
        assets.push({
          source: file.source,
          title: cells[2] || cells[0],
          type: cells[3] || cells[0] || '待分类',
          line: cells[3] || cells[0] || '待归类',
          use: cells[5] || cells[2] || '待补用途',
          next: cells[cells.length - 1] || '待补下一步'
        });
      }
    }
  }

  return assets
    .filter((item) => item.title && !['标题', '选题', '内容表达', '内容重点'].includes(item.title))
    .slice(0, 80);
}

async function getLarkMinutesDigest() {
  const filePath = path.join(dataDir, 'lark-minutes-digest.json');
  return readJsonOrDefault(filePath, {
    generatedAt: '',
    mode: 'empty',
    source: '飞书妙记 v1',
    status: {
      label: '未生成',
      tone: 'empty',
      message: '还没有本地草稿。可以先生成示例草稿查看版式。'
    },
    period: {
      today: todayString(),
      range: '',
      timezone: 'Asia/Shanghai'
    },
    meetings: [],
    summary: [],
    todos: [],
    sopCandidates: [],
    risks: [],
    nextActions: [],
    aggregates: {
      totalMeetings: 0,
      todayCount: 0,
      weekCount: 0,
      pendingTodos: 0,
      sopCandidates: 0,
      highRisks: 0,
      mediumRisks: 0,
      lowRisks: 0
    }
  });
}

async function createReflection(payload) {
  const date = payload.date || todayString();
  const title = payload.title || `${date} 工作复盘`;
  const fileName = `${date}-${safeSlug(title)}.md`;
  const reflectionRoot = obsidianDir || path.join(dataDir, 'reflections');
  const filePath = path.join(reflectionRoot, fileName);
  const content = `# ${title}

日期：${date}

## 今天推进了什么

${payload.progress || '- '}

## 今天发现的风险

${payload.risks || '- '}

## 新增业务理解

${payload.learning || '- '}

## 明天最重要的三件事

${payload.next || '1. \n2. \n3. '}

## 应该同步到飞书的事项

${payload.feishu || '- '}

## 一句话复盘

${payload.oneLine || '- '}
`;

  await fs.mkdir(reflectionRoot, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return {
    ok: true,
    file: fileName,
    path: path.relative(reflectionRoot, filePath)
  };
}

async function saveGrowthEntry(payload) {
  const filePath = path.join(dataDir, 'growth-entries.json');
  const entries = await readJsonOrDefault(filePath, []);

  const entry = {
    id: `GE-${Date.now()}`,
    createdAt: new Date().toISOString(),
    date: payload.date || todayString(),
    platform: payload.platform || '待补平台',
    followers: Number(payload.followers || 0),
    dailyIncrease: Number(payload.dailyIncrease || 0),
    interactions: Number(payload.interactions || 0),
    leads: Number(payload.leads || 0),
    note: payload.note || ''
  };

  entries.unshift(entry);
  await writeJson(filePath, entries.slice(0, 200));
  return { ok: true, entry, count: entries.length };
}

async function saveTask(payload) {
  const filePath = path.join(dataDir, 'dashboard-data.json');
  const data = await readDashboardData(filePath);
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const title = String(payload.title || '').trim();

  if (!title) {
    return { ok: false, error: '缺少任务标题' };
  }

  const maxNo = tasks.reduce((max, item) => {
    const match = String(item.id || '').match(/TASK-(\d+)/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  const now = new Date().toISOString();
  const task = {
    id: `TASK-${String(maxNo + 1).padStart(3, '0')}`,
    title,
    collection: payload.collection || '其他任务',
    system: payload.system || '本地',
    owner: payload.owner || '运营负责人',
    assignee: payload.assignee || '运营负责人',
    collaborator: payload.collaborator || '',
    priority: payload.priority || 'P1',
    status: payload.status || '待开始',
    dueDate: payload.dueDate || '待定',
    nextAction: payload.nextAction || '待补下一步动作',
    evidence: payload.evidence || '新增任务，待补交付物或飞书记录',
    createdAt: now
  };

  data.tasks = [task, ...tasks].slice(0, 500);
  data.meta = {
    ...data.meta,
    updatedAt: now.replace('T', ' ').slice(0, 16)
  };
  await writeJson(filePath, data);
  return { ok: true, task, count: data.tasks.length, updatedAt: data.meta.updatedAt };
}

async function updateTask(taskId, payload) {
  const filePath = path.join(dataDir, 'dashboard-data.json');
  const data = await readDashboardData(filePath);
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const index = tasks.findIndex((item) => item.id === taskId);

  if (index === -1) {
    return { ok: false, error: '未找到任务' };
  }

  const current = tasks[index];
  const allowed = ['title', 'collection', 'system', 'owner', 'assignee', 'collaborator', 'priority', 'status', 'previousStatus', 'dueDate', 'nextAction', 'evidence', 'steps'];
  const patch = {};
  allowed.forEach((key) => {
    if (Object.hasOwn(payload, key)) patch[key] = payload[key];
  });

  const now = new Date().toISOString();
  const nextTask = {
    ...current,
    ...patch,
    updatedAt: now
  };

  if (patch.status === '已完成' && !current.completedAt) {
    nextTask.completedAt = now;
  }
  if (patch.status && patch.status !== '已完成') {
    delete nextTask.completedAt;
    delete nextTask.previousStatus;
  }

  tasks[index] = nextTask;
  data.tasks = tasks;
  data.meta = {
    ...data.meta,
    updatedAt: now.replace('T', ' ').slice(0, 16)
  };

  await writeJson(filePath, data);
  return { ok: true, task: nextTask, updatedAt: data.meta.updatedAt };
}

async function updateHotContentTaxonomy(payload) {
  const filePath = path.join(dataDir, 'dashboard-data.json');
  const data = await readDashboardData(filePath);
  const hotContentLab = data.hotContentLab || {};
  const taxonomy = normalizeHotContentTaxonomy(hotContentLab);
  const group = String(payload.group || '').trim();
  const action = String(payload.action || '').trim();
  const name = String(payload.name || '').trim();
  const words = splitWords(payload.words || []);
  const map = {
    categories: 'categories',
    category: 'categories',
    topics: 'topics',
    topic: 'topics',
    audiences: 'audiences',
    audience: 'audiences'
  };
  const key = map[group];

  if (!key) return { ok: false, error: '未知分类组' };
  if (!['add', 'delete'].includes(action)) return { ok: false, error: '未知操作' };
  if (!name) return { ok: false, error: '缺少名称' };

  if (action === 'add') {
    const exists = taxonomy[key].some((item) => item.name === name);
    if (!exists) {
      taxonomy[key].push(key === 'categories' ? { name } : { name, words });
    } else if (key !== 'categories') {
      taxonomy[key] = taxonomy[key].map((item) => item.name === name
        ? { ...item, words: words.length ? words : item.words }
        : item);
    }
  }

  if (action === 'delete') {
    taxonomy[key] = taxonomy[key].filter((item) => item.name !== name);
  }

  const now = new Date().toISOString();
  data.hotContentLab = {
    ...hotContentLab,
    taxonomy,
    categories: taxonomy.categories.map((item) => item.name),
    filters: taxonomy.topics.map((item) => ({
      name: item.name,
      count: Number((hotContentLab.filters || []).find((entry) => entry.name === item.name)?.count || 0)
    }))
  };
  data.meta = {
    ...data.meta,
    updatedAt: now.replace('T', ' ').slice(0, 16)
  };

  await writeJson(filePath, data);
  return { ok: true, taxonomy, updatedAt: data.meta.updatedAt };
}

async function updatePageSetting(payload) {
  const filePath = path.join(dataDir, 'dashboard-data.json');
  const data = await readDashboardData(filePath);
  const view = String(payload.view || '').trim();
  const groupKey = String(payload.group || '').trim();
  const action = String(payload.action || '').trim();
  const name = String(payload.name || '').trim();
  const note = String(payload.note || '').trim();
  const words = splitWords(payload.words || []);

  if (!view) return { ok: false, error: '缺少页面' };
  if (!groupKey) return { ok: false, error: '缺少管理组' };
  if (!['add', 'delete'].includes(action)) return { ok: false, error: '未知操作' };
  if (!name) return { ok: false, error: '缺少名称' };

  if (view === 'hot' && ['categories', 'topics', 'audiences'].includes(groupKey)) {
    const result = await updateHotContentTaxonomy({
      group: groupKey,
      action,
      name,
      words
    });
    const nextData = await readDashboardData(filePath);
    return {
      ok: result.ok,
      error: result.error,
      pageSettings: normalizePageSettings(nextData),
      updatedAt: result.updatedAt
    };
  }

  const pageSettings = normalizePageSettings(data);
  const page = pageSettings[view] || {
    title: view,
    groups: []
  };
  let group = page.groups.find((item) => item.key === groupKey);
  if (!group) {
    group = { key: groupKey, label: groupKey, items: [] };
    page.groups.push(group);
  }

  if (action === 'add') {
    const exists = group.items.some((item) => item.name === name);
    if (!exists) {
      group.items.push({ name, note, words });
    } else {
      group.items = group.items.map((item) => item.name === name
        ? { ...item, note: note || item.note, words: words.length ? words : item.words }
        : item);
    }
  }

  if (action === 'delete') {
    group.items = group.items.filter((item) => item.name !== name);
  }

  const now = new Date().toISOString();
  pageSettings[view] = page;
  data.pageSettings = pageSettings;
  data.meta = {
    ...data.meta,
    updatedAt: now.replace('T', ' ').slice(0, 16)
  };

  await writeJson(filePath, data);
  return {
    ok: true,
    pageSettings,
    updatedAt: data.meta.updatedAt
  };
}

async function getGrowthEntries() {
  const filePath = path.join(dataDir, 'growth-entries.json');
  return readJsonOrDefault(filePath, []);
}

async function getCrawlSummary() {
  const filePath = path.join(dataDir, 'crawl-summary.json');
  return readJsonOrDefault(filePath, {
    updatedAt: '',
    batches: [],
    totals: {
      batchCount: 0,
      itemCount: 0,
      totalInteractions: 0
    }
  });
}

async function getXhsLibrarySummary() {
  const operationsPath = path.join(dataDir, 'xhs-operations-library.json');
  const operations = await readJsonOrDefault(operationsPath, null);
  if (operations?.summary) {
    const topWorks = [...(operations.items || [])]
      .sort((a, b) => (b.metrics?.interactions || 0) - (a.metrics?.interactions || 0))
      .slice(0, 10)
      .map((item) => ({
        index: item.profileOrder,
        title: item.title,
        interactions: item.metrics?.interactions || 0,
        liked: item.metrics?.liked || 0,
        collected: item.metrics?.collected || 0,
        commented: item.metrics?.commented || 0,
        shared: item.metrics?.shared || 0,
        category: item.category,
        source: '统一运营作品库'
      }));
    return {
      updatedAt: operations.updatedAt,
      totalWorks: operations.summary.totalWorks || 0,
      totalInteractions: operations.summary.totalInteractions || 0,
      averageInteractions: operations.summary.totalWorks ? Math.round((operations.summary.totalInteractions || 0) / operations.summary.totalWorks) : 0,
      totalComments: operations.summary.totalComments || 0,
      highPriorityCount: operations.summary.highPriorityCount || 0,
      topWorks,
      byCategory: operations.summary.byCategory || {},
      keyInsights: operations.summary.keyInsights || []
    };
  }

  return {
    updatedAt: '',
    totalWorks: 0,
    totalInteractions: 0,
    averageInteractions: 0,
    topWorks: [],
    byCategory: {}
  };
}

function applyManualOverrides(items) {
  return readJsonOrDefault(path.join(dataDir, 'xhs-manual-overrides.json'), { overrides: {} })
    .then((manual) => {
      const overrides = manual.overrides || {};
      return items.map((item) => {
        const override = overrides[item.id];
        if (!override) return item;
        return { ...item, ...override, _hasManualOverride: true };
      });
    });
}

async function getXhsWorks() {
  const operationsPath = path.join(dataDir, 'xhs-operations-library.json');
  const operations = await readJsonOrDefault(operationsPath, null);
  if (operations?.items?.length) {
    const items = await applyManualOverrides(operations.items.map((item) => ({
      index: item.profileOrder,
      ...item,
      date: item.publishDate || '',
      liked: item.metrics?.liked || 0,
      collected: item.metrics?.collected || 0,
      commented: item.metrics?.commented || 0,
      shared: item.metrics?.shared || 0,
      interactions: item.metrics?.interactions || 0,
      detailStatus: item.dataQuality?.detailStatus || '',
      detailUpdatedAt: item.dataQuality?.lastCrawledAt || '',
      detailMetricScope: item.dataQuality?.metricScope || '',
      needsDetail: !item.dataQuality?.hasContent
    })));
    return {
      updatedAt: operations.updatedAt,
      totalWorks: operations.summary?.totalWorks || operations.items.length,
      detailDone: operations.summary?.withContent || 0,
      pendingDetail: operations.items.filter((item) => !item.dataQuality?.hasContent).length,
      totalComments: operations.summary?.totalComments || 0,
      withComments: operations.summary?.withComments || 0,
      highPriorityCount: operations.summary?.highPriorityCount || 0,
      byCategory: operations.summary?.byCategory || {},
      keyInsights: operations.summary?.keyInsights || [],
      items,
      recentRuns: []
    };
  }

  const libraryPath = path.join(dataDir, 'xhs-library-full.json');
  const detailPath = path.join(dataDir, 'xhs-note-details.json');
  const library = await readJsonOrDefault(libraryPath, {
    updatedAt: '',
    totalWorks: 0,
    items: []
  });
  const detailPayload = await readJsonOrDefault(detailPath, {
    updatedAt: '',
    details: {},
    runs: []
  });
  const details = detailPayload.details || {};
  const items = (library.items || []).map((item, index) => {
    const detail = details[item.id] || {};
    const content = detail.content || detail.description || '';
    return {
      index: index + 1,
      ...item,
      date: detail.publishDate || item.date || '',
      detailStatus: detail.status || (content ? '已补详情' : '待补详情'),
      detailUpdatedAt: detail.lastCrawledAt || '',
      content,
      description: detail.description || '',
      tags: detail.tags || [],
      detailMetricScope: detail.metricScope || '',
      contentLength: content.length,
      needsDetail: !content || content.length < 40 || !(detail.publishDate || item.date)
    };
  });

  return {
    updatedAt: library.updatedAt,
    detailUpdatedAt: detailPayload.updatedAt || '',
    totalWorks: items.length,
    detailDone: items.filter((item) => detailIsDone(item.detailStatus)).length,
    pendingDetail: items.filter((item) => item.needsDetail).length,
    items,
    recentRuns: detailPayload.runs || []
  };
}

async function saveXhsWorkDetail(payload) {
  const detailPath = path.join(dataDir, 'xhs-note-details.json');
  const id = String(payload.id || '').trim();
  const content = String(payload.content || '').trim();

  if (!id) return { ok: false, error: '缺少作品ID' };
  if (content.length < 10) return { ok: false, error: '正文太短，未保存' };

  const current = await readJsonOrDefault(detailPath, {
    updatedAt: '',
    source: 'playwright-note-detail',
    details: {},
    runs: []
  });
  const now = new Date().toISOString();
  const tags = String(payload.tags || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.startsWith('#') ? item : `#${item}`);
  const publishDate = normalizeDate(payload.publishDate);

  current.details[id] = {
    ...(current.details[id] || {}),
    id,
    sourceTitle: payload.title || payload.sourceTitle || '',
    sourceUrl: payload.url || payload.sourceUrl || '',
    title: payload.title || payload.sourceTitle || '',
    content,
    description: content,
    publishDate,
    tags,
    status: '手动补详情',
    lastCrawledAt: now,
    metricScope: '手动补充：浏览器公开可见内容',
    manual: true
  };
  current.updatedAt = now;
  current.runs = [{
    id: `XHS-MANUAL-${Date.now()}`,
    startedAt: now,
    finishedAt: now,
    maxItems: 1,
    results: [{
      id,
      title: payload.title || payload.sourceTitle || '',
      ok: true,
      status: '手动补详情',
      contentLength: content.length
    }]
  }, ...(current.runs || []).slice(0, 20)];

  await writeJson(detailPath, current);
  return { ok: true, id, status: '手动补详情', contentLength: content.length, publishDate };
}

function generateFollowUp(data, payload) {
  const customerType = payload.customerType || '普通客户咨询';
  const question = payload.question || '';
  const source = payload.source || '小红书';
  const matched = data.customerFollowUp.segments.find((item) => item.segment === customerType)
    || data.customerFollowUp.segments[0]
    || { template: '', trigger: '', goal: '' };

  return {
    customerType,
    source,
    question,
    message: matched.template,
    fields: {
      客户类型: customerType,
      来源平台: source,
      触发动作: matched.trigger,
      核心问题: question || '待补',
      推荐产品: matched.goal,
      下一步动作: '发送说明 -> 记录反馈 -> 判断是否转入正式客户库',
      跟进状态: '待跟进'
    },
    note: '这是本地生成的跟进草稿，发送前应按真实客户语气和公司口径微调。'
  };
}

async function saveFollowUpDraft(payload) {
  const filePath = path.join(dataDir, 'followup-drafts.json');
  const drafts = await readJsonOrDefault(filePath, []);
  const draft = {
    id: `FU-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customerType: payload.customerType || '待补客户类型',
    source: payload.source || '待补来源',
    stage: payload.stage || '待跟进',
    question: payload.question || '',
    message: payload.message || '',
    nextAction: payload.nextAction || '待补下一步',
    feishuFields: payload.feishuFields || {}
  };

  drafts.unshift(draft);
  await writeJson(filePath, drafts.slice(0, 200));
  return { ok: true, draft, count: drafts.length };
}

async function getFollowUpDrafts() {
  const filePath = path.join(dataDir, 'followup-drafts.json');
  return readJsonOrDefault(filePath, []);
}

async function runScript(scriptName) {
  if (!enableLocalCommands) {
    return { ok: false, error: '公开版默认禁用本地命令。设置 WORKBENCH_ENABLE_LOCAL_COMMANDS=true 后再启用。' };
  }

  const data = await readJson(path.join(dataDir, 'dashboard-data.json'));
  const script = data.sync.scripts.find((item) => item.name === scriptName);
  if (!script) {
    return { ok: false, error: '找不到脚本配置' };
  }

  const logPath = path.join(dataDir, 'logs', `${Date.now()}-${safeSlug(scriptName)}.log`);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const child = spawn('/bin/zsh', ['-lc', script.command], {
    cwd: rootDir,
    env: process.env
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  const result = await new Promise((resolve) => {
    child.on('close', (code) => resolve({ code }));
  });

  await fs.writeFile(logPath, output, 'utf8');
  return {
    ok: result.code === 0,
    code: result.code,
    log: path.relative(rootDir, logPath),
    output: output.slice(-3000)
  };
}

async function runSafeCommand(commandName) {
  if (!enableLocalCommands) {
    return { ok: false, error: '公开版默认禁用采集和本地命令。请在私有环境中启用。' };
  }

  const allowed = {
    '生成采集汇总': ['npm run crawl:summary', 'npm run xhs:merge', 'npm run xhs:summary'],
    '补采3条详情': ['npm run xhs:details -- --max=3 --pause=3500 --login-wait-ms=90000', 'npm run xhs:summary'],
    '补采10条详情': ['npm run xhs:details -- --max=10 --pause=4000 --login-wait-ms=90000', 'npm run xhs:summary'],
    'OpenCLI补采3条详情': ['npm run xhs:opencli-details -- --max=3 --profile-limit=20 --pause=2500 --include-comments=true --comment-limit=all', 'npm run xhs:summary'],
    'OpenCLI补采10条详情': ['npm run xhs:opencli-details -- --max=10 --profile-limit=40 --pause=3000 --include-comments=true --comment-limit=all', 'npm run xhs:summary'],
    '生成飞书妙记示例草稿': ['node scripts/lark-minutes-digest.mjs --mock']
  };
  const commands = allowed[commandName];
  if (!commands) return { ok: false, error: '不允许的命令' };

  const logPath = path.join(dataDir, 'logs', `${Date.now()}-${safeSlug(commandName)}.log`);
  await fs.mkdir(path.dirname(logPath), { recursive: true });

  let output = '';
  let exitCode = 0;

  for (const command of commands) {
    output += `\n$ ${command}\n`;
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd: rootDir,
      env: process.env
    });

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    const result = await new Promise((resolve) => {
      child.on('close', (code) => resolve({ code }));
    });

    if (result.code !== 0) {
      exitCode = result.code;
      break;
    }
  }

  await fs.writeFile(logPath, output, 'utf8');
  return {
    ok: exitCode === 0,
    code: exitCode,
    log: path.relative(rootDir, logPath),
    output: output.slice(-3000)
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const requested = path.normalize(path.join(__dirname, 'public', pathname));
  const publicDir = path.join(__dirname, 'public');

  if (!requested.startsWith(publicDir)) {
    textResponse(res, 403, 'Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(requested);
    const ext = path.extname(requested);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch {
    textResponse(res, 404, 'Not found');
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const dataPath = path.join(dataDir, 'dashboard-data.json');

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const data = await readDashboardData(dataPath);
    jsonResponse(res, 200, publicDashboard(data));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/growth-entries') {
    jsonResponse(res, 200, { entries: await getGrowthEntries() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/crawl-summary') {
    jsonResponse(res, 200, await getCrawlSummary());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/xhs-library-summary') {
    jsonResponse(res, 200, await getXhsLibrarySummary());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/xhs-works') {
    jsonResponse(res, 200, await getXhsWorks());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/followups') {
    jsonResponse(res, 200, { drafts: await getFollowUpDrafts() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/obsidian') {
    jsonResponse(res, 200, { notes: await getObsidianNotes() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/content-assets') {
    jsonResponse(res, 200, { assets: await getContentAssets() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/lark-minutes-digest') {
    jsonResponse(res, 200, await getLarkMinutesDigest());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reflection') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await createReflection(payload));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/sync-task-to-feishu') {
    if (!enableFeishu || !process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET || !process.env.FEISHU_BASE_TOKEN || !process.env.FEISHU_TABLE_ID) {
      jsonResponse(res, 501, {
        ok: false,
        error: '飞书同步未启用。请配置 WORKBENCH_ENABLE_FEISHU=true、FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_BASE_TOKEN 和 FEISHU_TABLE_ID。'
      });
      return;
    }

    const payload = await readBody(req);
    const task = (await readDashboardData(dataPath)).tasks?.find((t) => t.id === payload.id);
    if (!task) { jsonResponse(res, 404, { ok: false, error: '任务不存在' }); return; }

    // 格式化步骤列表：始终生成完整清单
    let stepsList = [];
    // 1. 从已有 steps 数组读取
    const existingSteps = task.steps || [];
    if (existingSteps.length) {
      stepsList = existingSteps.map((s) => ({
        label: typeof s === 'string' ? s : (s.label || ''),
        done: typeof s === 'string' ? false : Boolean(s.done || s.checked)
      }));
    }
    // 2. 补充 nextAction（如果还没在列表中）
    if (task.nextAction && task.nextAction !== '待补下一步动作') {
      if (!stepsList.some((s) => s.label === task.nextAction)) {
        stepsList.push({ label: task.nextAction, done: false });
      }
    }
    // 3. 补充 evidence（如果还没在列表中）
    if (task.evidence && task.evidence !== '新增任务，待补交付物或飞书记录' && task.evidence !== '下一步完成后补充证据') {
      if (!stepsList.some((s) => s.label === task.evidence)) {
        stepsList.push({ label: task.evidence, done: task.status === '已完成' });
      }
    }
    const stepsText = stepsList.map((s) => (s.done ? '☑ ' : '☐ ') + s.label).join('\n');

    const fields = {
      '任务编号': task.id,
      '任务名称': task.title,
      '负责人': task.assignee || task.owner || '运营负责人',
      '协作人': task.collaborator || '',
      '优先级': task.priority || 'P1',
      '当前状态': task.status || '待开始',
      '截止日期': task.dueDate || '',
      '下一步动作': task.nextAction || '',
      '阶段验收证据': task.evidence || '',
      '任务类型': task.collection || '',
      '任务步骤': stepsText
    };

    const mapPath = path.join(dataDir, 'feishu-task-map.json');
    const map = await readJsonOrDefault(mapPath, {});
    const existingRecordId = map[task.id];

    try {
      const recordId = await upsertFeishuRecord(fields, existingRecordId);
      if (recordId) {
        map[task.id] = recordId;
        await writeJson(mapPath, map);
      }
      jsonResponse(res, 200, { ok: true, created: !existingRecordId, recordId: recordId || existingRecordId || 'unknown' });
    } catch (error) {
      jsonResponse(res, 502, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/growth-entry') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await saveGrowthEntry(payload));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await saveTask(payload));
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/hot-content-taxonomy') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await updateHotContentTaxonomy(payload));
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/page-setting') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await updatePageSetting(payload));
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/task\/([^/]+)$/);
  if (req.method === 'PATCH' && taskMatch) {
    const payload = await readBody(req);
    jsonResponse(res, 200, await updateTask(decodeURIComponent(taskMatch[1]), payload));
    return;
  }
  if (req.method === 'DELETE' && taskMatch) {
    const taskId = decodeURIComponent(taskMatch[1]);
    const data = await readDashboardData(dataPath);
    const idx = (data.tasks || []).findIndex((t) => t.id === taskId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '任务不存在' }); return; }
    data.tasks.splice(idx, 1);
    const now = new Date().toISOString();
    data.meta = { ...data.meta, updatedAt: now.replace('T', ' ').slice(0, 16) };
    await writeJson(dataPath, data);
    jsonResponse(res, 200, { ok: true, updatedAt: data.meta.updatedAt });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/xhs-work-detail') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await saveXhsWorkDetail(payload));
    return;
  }

  const workOverrideMatch = url.pathname.match(/^\/api\/xhs-work\/([^/]+)$/);
  if (req.method === 'PATCH' && workOverrideMatch) {
    const workId = decodeURIComponent(workOverrideMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'xhs-manual-overrides.json');
    const manual = await readJsonOrDefault(filePath, { updatedAt: '', overrides: {} });
    const now = new Date().toISOString();

    const allowedFields = ['category', 'score', 'audience', 'businessGoal', 'emotionHook', 'operationInsight', 'nextTopicDirection', 'contentDirection', 'topicTags'];
    const patch = {};
    allowedFields.forEach((key) => {
      if (Object.hasOwn(payload, key)) patch[key] = payload[key];
    });

    if (!Object.keys(patch).length) {
      jsonResponse(res, 400, { ok: false, error: '没有可保存的字段' });
      return;
    }

    manual.overrides[workId] = {
      ...(manual.overrides[workId] || {}),
      ...patch,
      _manuallyEditedAt: now
    };
    manual.updatedAt = now;

    await writeJson(filePath, manual);
    jsonResponse(res, 200, { ok: true, id: workId, patch, updatedAt: now });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/followup') {
    const payload = await readBody(req);
    const data = await readDashboardData(dataPath);
    jsonResponse(res, 200, generateFollowUp(data, payload));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/followup-draft') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await saveFollowUpDraft(payload));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run-script') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await runScript(payload.name));
    return;
  }

  const ideaMatch = url.pathname.match(/^\/api\/idea\/([^/]+)$/);
  if (req.method === 'PATCH' && ideaMatch) {
    const ideaId = decodeURIComponent(ideaMatch[1]);
    const payload = await readBody(req);
    const data = await readDashboardData(dataPath);
    const ideas = data.hotContentLab?.ideas || [];
    const idx = ideas.findIndex((item) => item.id === ideaId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到选题' }); return; }

    const fields = ['title', 'line', 'contentDirection', 'hook', 'audience', 'product', 'cta', 'pain', 'structure', 'emotion', 'materialNeeds', 'conversionGoal', 'nextAction', 'status', 'score', 'platform', 'publishPlan', 'authorization', 'diffAnchor'];
    fields.forEach((key) => { if (Object.hasOwn(payload, key)) ideas[idx][key] = payload[key]; });

    const now = new Date().toISOString();
    data.meta = { ...data.meta, updatedAt: now.replace('T', ' ').slice(0, 16) };
    await writeJson(dataPath, data);
    jsonResponse(res, 200, { ok: true, idea: ideas[idx], updatedAt: data.meta.updatedAt });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run-safe-command') {
    const payload = await readBody(req);
    jsonResponse(res, 200, await runSafeCommand(payload.name));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/investors') {
    const data = await readJsonOrDefault(path.join(dataDir, 'investors.json'), { updatedAt: '', investors: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/investor') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'investors.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', investors: [] });
    if (!payload.name) { jsonResponse(res, 400, { ok: false, error: '缺少资方名称' }); return; }
    const maxNo = data.investors.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('INV-','')) || 0), 0);
    const item = {
      id: `INV-${String(maxNo+1).padStart(3,'0')}`,
      name: payload.name, type: payload.type||'', contact: payload.contact||'',
      stage: payload.stage||'初次接触', round: payload.round||'', amount: payload.amount||'',
      focus: payload.focus||'', liaison: payload.liaison||'',
      roadshowScheduled: payload.roadshowScheduled||'未安排', roadshowDate: payload.roadshowDate||'',
      hasReview: payload.hasReview||'待整理', reviewUrl: payload.reviewUrl||'',
      intent: payload.intent||'待评估', nextStep: payload.nextStep||'', notes: payload.notes||'',
      fundSize: payload.fundSize||'', investStage: payload.investStage||'',
      historyCases: payload.historyCases||'', lpBackground: payload.lpBackground||'',
      decisionProcess: payload.decisionProcess||'', expectedClose: payload.expectedClose||'',
      lastContact: payload.lastContact||''
    };
    data.investors.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.investors.length });
    return;
  }

  const investorMatch = url.pathname.match(/^\/api\/investor\/([^/]+)$/);
  if (req.method === 'PATCH' && investorMatch) {
    const invId = decodeURIComponent(investorMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'investors.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', investors: [] });
    const idx = data.investors.findIndex(a => a.id === invId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['name','type','contact','stage','round','amount','focus','liaison','roadshowScheduled','roadshowDate','hasReview','reviewUrl','intent','nextStep','notes','fundSize','investStage','historyCases','lpBackground','decisionProcess','expectedClose','lastContact'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.investors[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.investors[idx] });
    return;
  }

  if (req.method === 'DELETE' && investorMatch) {
    const invId = decodeURIComponent(investorMatch[1]);
    const filePath = path.join(dataDir, 'investors.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', investors: [] });
    const idx = data.investors.findIndex(a => a.id === invId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.investors.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: invId });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/schedules') {
    const data = await readJsonOrDefault(path.join(dataDir, 'schedules.json'), { updatedAt: '', schedules: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/schedule') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'schedules.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', schedules: [] });
    if (!payload.title || !payload.date) { jsonResponse(res, 400, { ok: false, error: '标题和日期为必填项' }); return; }
    const maxNo = data.schedules.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('SCH-','')) || 0), 0);
    const item = {
      id: `SCH-${String(maxNo+1).padStart(3,'0')}`,
      title: payload.title, date: payload.date, time: payload.time||'',
      platform: payload.platform||'', location: payload.location||'',
      meetingNumber: payload.meetingNumber||'', notes: payload.notes||''
    };
    data.schedules.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.schedules.length });
    return;
  }

  const scheduleMatch = url.pathname.match(/^\/api\/schedule\/([^/]+)$/);
  if (req.method === 'PATCH' && scheduleMatch) {
    const schId = decodeURIComponent(scheduleMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'schedules.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', schedules: [] });
    const idx = data.schedules.findIndex(a => a.id === schId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['title','date','time','platform','location','meetingNumber','notes'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.schedules[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.schedules[idx] });
    return;
  }

  if (req.method === 'DELETE' && scheduleMatch) {
    const schId = decodeURIComponent(scheduleMatch[1]);
    const filePath = path.join(dataDir, 'schedules.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', schedules: [] });
    const idx = data.schedules.findIndex(a => a.id === schId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.schedules.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: schId });
    return;
  }

  // 人脉推荐管理
  if (req.method === 'GET' && url.pathname === '/api/referrals') {
    const data = await readJsonOrDefault(path.join(dataDir, 'referrals.json'), { updatedAt: '', referrals: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/referral') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'referrals.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', referrals: [] });
    if (!payload.name) { jsonResponse(res, 400, { ok: false, error: '缺少姓名' }); return; }
    const maxNo = data.referrals.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('REF-','')) || 0), 0);
    const item = {
      id: `REF-${String(maxNo+1).padStart(3,'0')}`,
      name: payload.name, organization: payload.organization||'', position: payload.position||'',
      contact: payload.contact||'', investorsReferred: payload.investorsReferred||'',
      notes: payload.notes||'', lastContact: payload.lastContact||''
    };
    data.referrals.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.referrals.length });
    return;
  }

  const referralMatch = url.pathname.match(/^\/api\/referral\/([^/]+)$/);
  if (req.method === 'PATCH' && referralMatch) {
    const refId = decodeURIComponent(referralMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'referrals.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', referrals: [] });
    const idx = data.referrals.findIndex(a => a.id === refId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['name','organization','position','contact','investorsReferred','notes','lastContact'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.referrals[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.referrals[idx] });
    return;
  }

  if (req.method === 'DELETE' && referralMatch) {
    const refId = decodeURIComponent(referralMatch[1]);
    const filePath = path.join(dataDir, 'referrals.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', referrals: [] });
    const idx = data.referrals.findIndex(a => a.id === refId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.referrals.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: refId });
    return;
  }

  // 飞书文档链接管理
  if (req.method === 'GET' && url.pathname === '/api/feishu-docs') {
    const data = await readJsonOrDefault(path.join(dataDir, 'feishu-docs.json'), { updatedAt: '', docs: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/feishu-doc') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'feishu-docs.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', docs: [] });
    if (!payload.title || !payload.url) { jsonResponse(res, 400, { ok: false, error: '标题和链接为必填项' }); return; }
    const maxNo = data.docs.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('FD-','')) || 0), 0);
    const item = {
      id: `FD-${String(maxNo+1).padStart(3,'0')}`,
      title: payload.title, url: payload.url, category: payload.category||'',
      docType: payload.docType||'', version: payload.version||'',
      docStatus: payload.docStatus||'草稿', relatedInvestor: payload.relatedInvestor||'',
      notes: payload.notes||'', createdAt: new Date().toISOString().slice(0, 10)
    };
    data.docs.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.docs.length });
    return;
  }

  const feishuDocMatch = url.pathname.match(/^\/api\/feishu-doc\/([^/]+)$/);
  if (req.method === 'PATCH' && feishuDocMatch) {
    const docId = decodeURIComponent(feishuDocMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'feishu-docs.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', docs: [] });
    const idx = data.docs.findIndex(a => a.id === docId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['title','url','category','docType','version','docStatus','relatedInvestor','notes'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.docs[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.docs[idx] });
    return;
  }

  if (req.method === 'DELETE' && feishuDocMatch) {
    const docId = decodeURIComponent(feishuDocMatch[1]);
    const filePath = path.join(dataDir, 'feishu-docs.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', docs: [] });
    const idx = data.docs.findIndex(a => a.id === docId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.docs.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: docId });
    return;
  }

  // 会议纪要
  if (req.method === 'GET' && url.pathname === '/api/meeting-notes') {
    const data = await readJsonOrDefault(path.join(dataDir, 'meeting-notes.json'), { updatedAt: '', notes: [] });
    jsonResponse(res, 200, data);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/meeting-note') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'meeting-notes.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', notes: [] });
    if (!payload.date) { jsonResponse(res, 400, { ok: false, error: '会议日期为必填项' }); return; }
    const maxNo = data.notes.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('MN-','')) || 0), 0);
    const item = {
      id: `MN-${String(maxNo+1).padStart(3,'0')}`,
      date: payload.date, relatedInvestor: payload.relatedInvestor||'',
      meetingType: payload.meetingType||'其他', feishuUrl: payload.feishuUrl||'',
      questions: payload.questions||'', answers: payload.answers||'',
      objections: payload.objections||'', followUp: payload.followUp||'',
      notes: payload.notes||''
    };
    data.notes.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.notes.length });
    return;
  }
  const mnMatch = url.pathname.match(/^\/api\/meeting-note\/([^/]+)$/);
  if (req.method === 'PATCH' && mnMatch) {
    const mnId = decodeURIComponent(mnMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'meeting-notes.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', notes: [] });
    const idx = data.notes.findIndex(a => a.id === mnId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['date','relatedInvestor','meetingType','feishuUrl','questions','answers','objections','followUp','notes'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.notes[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.notes[idx] });
    return;
  }
  if (req.method === 'DELETE' && mnMatch) {
    const mnId = decodeURIComponent(mnMatch[1]);
    const filePath = path.join(dataDir, 'meeting-notes.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', notes: [] });
    const idx = data.notes.findIndex(a => a.id === mnId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.notes.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: mnId });
    return;
  }

  // 业务数据台账
  if (req.method === 'GET' && url.pathname === '/api/metrics') {
    const data = await readJsonOrDefault(path.join(dataDir, 'metrics.json'), { updatedAt: '', metrics: [] });
    jsonResponse(res, 200, data);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/metric') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'metrics.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', metrics: [] });
    if (!payload.name || !payload.date) { jsonResponse(res, 400, { ok: false, error: '指标名称和数据日期为必填项' }); return; }
    const maxNo = data.metrics.reduce((max, a) => Math.max(max, parseInt((a.id||'').replace('MET-','')) || 0), 0);
    const item = {
      id: `MET-${String(maxNo+1).padStart(3,'0')}`,
      name: payload.name, category: payload.category||'其他',
      value: payload.value||'', unit: payload.unit||'',
      period: payload.period||'', date: payload.date,
      notes: payload.notes||''
    };
    data.metrics.push(item);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.metrics.length });
    return;
  }
  const metMatch = url.pathname.match(/^\/api\/metric\/([^/]+)$/);
  if (req.method === 'PATCH' && metMatch) {
    const metId = decodeURIComponent(metMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'metrics.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', metrics: [] });
    const idx = data.metrics.findIndex(a => a.id === metId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    ['name','category','value','unit','period','date','notes'].forEach(k => {
      if (Object.hasOwn(payload, k)) data.metrics[idx][k] = payload[k];
    });
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item: data.metrics[idx] });
    return;
  }
  if (req.method === 'DELETE' && metMatch) {
    const metId = decodeURIComponent(metMatch[1]);
    const filePath = path.join(dataDir, 'metrics.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', metrics: [] });
    const idx = data.metrics.findIndex(a => a.id === metId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到' }); return; }
    data.metrics.splice(idx, 1);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, deleted: metId });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/wiki-toc') {
    const spaceId = process.env.FEISHU_WIKI_SPACE_ID;
    if (!enableFeishu || !spaceId) {
      jsonResponse(res, 200, { ok: false, docs: [], count: 0, error: '飞书知识库未配置' });
      return;
    }

    const cp = await import('node:child_process');
    const child = cp.spawn('/bin/zsh', ['-lc', `lark-cli wiki +node-list --space-id ${spaceId} 2>/dev/null`], { env: process.env });
    let output = '';
    child.stdout.on('data', (c) => output += c.toString());
    child.stderr.on('data', (c) => output += c.toString());
    await new Promise((resolve) => child.on('close', resolve));
    try {
      const result = JSON.parse(output);
      const docs = (result.data?.nodes || []).filter(n => n.obj_type === 'docx').map(n => ({
        title: n.title, url: (process.env.FEISHU_BASE_URL || 'https://open.feishu.cn') + '/docx/' + n.obj_token,
        isHomepage: n.title === '首页'
      }));
      jsonResponse(res, 200, { ok: true, docs, count: docs.length, updatedAt: new Date().toISOString() });
    } catch { jsonResponse(res, 500, { ok: false, error: output.slice(-200) }); }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/books') {
    const data = await readJsonOrDefault(path.join(dataDir, 'books-library.json'), { updatedAt: '', books: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/competitor-accounts') {
    const data = await readJsonOrDefault(path.join(dataDir, 'competitor-accounts.json'), { updatedAt: '', accounts: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/competitor-account') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'competitor-accounts.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', accounts: [] });
    const name = String(payload.name || '').trim();

    if (!name) { jsonResponse(res, 400, { ok: false, error: '缺少账号名称' }); return; }

    const maxNo = data.accounts.reduce((max, a) => {
      const m = String(a.id || '').match(/COMP-(\d+)/);
      return Math.max(max, m ? Number(m[1]) : 0);
    }, 0);
    const now = new Date().toISOString();

    const account = {
      id: `COMP-${String(maxNo + 1).padStart(3, '0')}`,
      name,
      platform: payload.platform || '小红书',
      url: payload.url || '',
      followers: payload.followers || '',
      contentDirection: payload.contentDirection || '',
      postFrequency: payload.postFrequency || '',
      strengths: Array.isArray(payload.strengths) ? payload.strengths : String(payload.strengths || '').split('\n').filter(Boolean),
      weaknesses: Array.isArray(payload.weaknesses) ? payload.weaknesses : String(payload.weaknesses || '').split('\n').filter(Boolean),
      ourOpportunity: payload.ourOpportunity || '',
      notes: payload.notes || '',
      lastUpdated: now.slice(0, 10)
    };

    data.accounts.unshift(account);
    data.updatedAt = now;
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, account, count: data.accounts.length });
    return;
  }

  const competitorMatch = url.pathname.match(/^\/api\/competitor-account\/([^/]+)$/);
  if (req.method === 'PATCH' && competitorMatch) {
    const accountId = decodeURIComponent(competitorMatch[1]);
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'competitor-accounts.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', accounts: [] });
    const idx = data.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '未找到账号' }); return; }

    const fields = ['name', 'platform', 'url', 'followers', 'contentDirection', 'postFrequency', 'strengths', 'weaknesses', 'ourOpportunity', 'notes'];
    fields.forEach((key) => { if (Object.hasOwn(payload, key)) data.accounts[idx][key] = payload[key]; });
    data.accounts[idx].lastUpdated = new Date().toISOString().slice(0, 10);
    data.updatedAt = new Date().toISOString();
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, account: data.accounts[idx] });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/experiences') {
    const filePath = path.join(dataDir, 'experience-items.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', items: [] });
    jsonResponse(res, 200, data);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/experience') {
    const payload = await readBody(req);
    const filePath = path.join(dataDir, 'experience-items.json');
    const data = await readJsonOrDefault(filePath, { updatedAt: '', items: [] });
    const title = String(payload.title || '').trim();
    const body = String(payload.body || '').trim();

    if (!title) {
      jsonResponse(res, 400, { ok: false, error: '缺少经验标题' });
      return;
    }
    if (body.length < 10) {
      jsonResponse(res, 400, { ok: false, error: '经验内容太短，至少10个字' });
      return;
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const maxNo = data.items.reduce((max, item) => {
      const match = String(item.id || '').match(/EXP-(\d+)/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);

    const item = {
      id: `EXP-${String(maxNo + 1).padStart(3, '0')}`,
      library: payload.library || 'library',
      type: payload.type || '中性观察',
      category: payload.category || '待分类',
      topic: payload.topic || '全簇通用',
      level: payload.level || '普通经验',
      title,
      body,
      caseId: payload.caseId || '手动新增',
      date: today,
      pending: false
    };

    data.items.unshift(item);
    data.updatedAt = now;
    await writeJson(filePath, data);
    jsonResponse(res, 200, { ok: true, item, count: data.items.length });
    return;
  }

  jsonResponse(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
    } else {
      await serveStatic(req, res);
    }
  } catch (error) {
    jsonResponse(res, 500, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

server.listen(port, host, () => {
  console.log(`运营工作台：http://${host}:${port}`);
});
