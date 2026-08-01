let state = {
  data: null,
  notes: [],
  growthEntries: [],
  crawlSummary: null,
  xhsLibrarySummary: null,
  xhsWorks: [],
  activeWorkId: null,
  workKeyword: '',
  workCategory: '全部',
  workStatus: '全部',
  workFormat: '全部',
  workEngagement: '全部',
  workView: 'all',
  workLayout: 'cards',
  workSort: 'interactions_desc',
  followDrafts: [],
  contentAssets: [],
  activeCategory: '全部',
  activeTopic: '全部',
  activeAudience: '全部',
  activeModelType: '全部',
  activeTaxonomyGroup: 'categories',
  activeIdeaId: null,
  activeLabItemId: null,
  ideaKeyword: '',
  activeAssetTab: 'ideas',
  currentFollow: null,
  taskKeyword: '',
  taskStatus: '全部',
  taskSystem: '全部',
  taskCollection: '全部',
  taskMode: 'tasks',
  taskDomain: 'all',
  taskPriority: '全部',
  taskSort: 'priority',
  taskView: 'kanban',
  activeTaskId: null,
  experienceLibrary: 'library',
  experienceKeyword: '',
  experienceType: '全部',
  experienceCategory: '全部',
  experienceTopic: '全部',
  experienceLevel: '全部',
  experienceSort: 'default',
  experienceView: 'cards',
  experiencePendingOnly: false,
  activeExpId: null,
  activeExpCap: '全部',
  expCapTooltip: '',
  larkMinutesDigest: null,
  experiences: [],
  competitorAccounts: [],
  books: [],
  bookCategory: '全部',
  investors: [],
  investorFilter: '全部',
  schedules: [],
  feishuDocs: [],
  feishuDocFilter: '全部',
  referrals: [],
  referralFilter: '全部',
  showArchivedInvestors: false,
  investorView: 'cards',
  investorTypeFilter: '全部',
  investorRoadshowFilter: '全部',
  investorCoopFilter: '全部',
  meetingNotes: [],
  meetingNoteFilter: '全部',
  meetingNoteView: 'cards',
  metrics: [],
  metricFilter: '全部',
  metricView: 'cards'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function experienceItems() {
  return state.experiences || [];
}

function formatNumber(value) {
  const num = Number(value || 0);
  if (num >= 10000) return `${(num / 10000).toFixed(num >= 100000 ? 1 : 2)}万`;
  return num.toLocaleString('zh-CN');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return response.json();
}

function setView(view) {
  $$('.workspace').forEach((item) => item.classList.remove('active'));
  const target = $(`#view-${view}`);
  if (!target) return;
  target.classList.add('active');
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  const title = document.querySelector(`.nav-item[data-view="${view}"] span:nth-child(2)`)?.textContent || '工作台';
  const pageTitleText = $('#pageTitleText');
  if (pageTitleText) pageTitleText.textContent = title;
  // 顶栏按钮和副标题按页面显隐
  const copyIdeaBtn = $('#copyIdeaBtn');
  const refreshWorksBtn = $('#refreshWorksBtn');
  const subtitle = $('#pageSubtitle');
  const ideaSearch = $('#ideaSearch');
  const investorTopSearch = $('#investorTopSearch');
  if (copyIdeaBtn) copyIdeaBtn.style.display = view === 'hot' ? '' : 'none';
  if (refreshWorksBtn) refreshWorksBtn.style.display = view === 'library' ? '' : 'none';
  if (subtitle) subtitle.textContent = view === 'library' ? '  ·  小红书 · 视频号 · 公众号 · 抖音' : '';
  if (ideaSearch) ideaSearch.style.display = view === 'hot' ? '' : 'none';
  if (investorTopSearch) investorTopSearch.style.display = view === 'investor' ? '' : 'none';
  // 顶部按钮按页面显隐
  var isMain = view === 'dashboard';
  var addTask = $('#addTaskBtn'); if (addTask) addTask.style.display = isMain ? '' : 'none';
  var syncAll = $('#syncAllTasksBtn'); if (syncAll) syncAll.style.display = isMain ? '' : 'none';
  var addInvTop = $('#addInvestorTopBtn'); if (addInvTop) addInvTop.style.display = view === 'investor' ? '' : 'none';
  var addMNTop = $('#addMeetingNoteTopBtn'); if (addMNTop) addMNTop.style.display = view === 'meeting-notes' ? '' : 'none';
  var addMetricTop = $('#addMetricTopBtn'); if (addMetricTop) addMetricTop.style.display = view === 'metrics' ? '' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.activeView = view;
}

function normalizeTaskStatus(status = '') {
  const text = String(status || '');
  if (/完成/.test(text)) return '已完成';
  if (/归档/.test(text)) return '已归档';
  if (/进行/.test(text)) return '进行中';
  if (/确认|数据|手动|待/.test(text)) return '待办';
  return '待办';
}

function inferTaskCollection(task) {
  const text = `${task.title || ''} ${task.nextAction || ''} ${task.system || ''}`;
  if (/发布会|预热|邀约|议程/.test(text)) return '发布会筹备';
  if (/小红书|视频号|公众号|选题|内容|作品|直播/.test(text)) return '内容运营';
  if (/飞书|台账|视图|表格|Base|日程/.test(text)) return '中台建设';
  if (/供应商|主理人|酒店|民宿|景区|目的地|城市/.test(text)) return '资源管理';
  if (/小程序|AI|Bug|测试|需求|产品/.test(text)) return '产品协同';
  if (/复盘|Obsidian|成长|模板/.test(text)) return '个人成长';
  return '其他任务';
}

function normalizeTask(task) {
  return {
    ...task,
    boardStatus: normalizeTaskStatus(task.status),
    collection: task.collection || inferTaskCollection(task),
    owner: task.owner || '运营负责人',
    dueDate: task.dueDate || '待定',
    evidence: task.evidence || task.output || '下一步完成后补充证据'
  };
}

function isTaskDueSoon(task) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || '')) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  const days = Math.round((due - today) / 86400000);
  return days >= 0 && days <= 7;
}

function formatShortDate(value = '') {
  const match = String(value).match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}` : value || '待定';
}

function parseTaskDate(value = '') {
  if (!value) return null;
  const text = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTaskAge(task) {
  const source = task.lastResumedAt || task.updatedAt || task.createdAt;
  const date = parseTaskDate(source);
  if (!date) return '历史任务';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDay = new Date(date);
  taskDay.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((today - taskDay) / 86400000));
  if (days === 0) return '今天 任务';
  if (days === 1) return '昨天 任务';
  return `${days} 天前 任务`;
}

function priorityClass(priority = 'P1') {
  if (priority === 'P0') return 'p0';
  if (priority === 'P2') return 'p2';
  return 'p1';
}

function taskStatusClass(status = '') {
  if (status === '进行中') return 'status-doing';
  if (status === '已完成') return 'status-done';
  if (status === '已归档') return 'status-archived';
  return 'status-todo';
}

function uniqTaskStepLabels(labels) {
  const seen = new Set();
  return labels
    .map((item) => String(item || '').trim())
    .filter((item) => item && !seen.has(item) && seen.add(item));
}

function buildStepsEditor(steps) {
  const container = $('#stepsEditor');
  if (!container) return;
  container.innerHTML = '';
  (steps || []).forEach((s) => {
    const row = document.createElement('div');
    row.className = 'step-edit-row';
    const checked = s.done ? ' checked' : '';
    const label = escapeHtml(s.label || '');
    row.innerHTML = '<input type="checkbox" class="step-check"' + checked + '><input type="text" class="step-input" value="' + label + '"><button class="icon-btn step-delete-btn" type="button">×</button>';
    container.appendChild(row);
  });
}

function collectStepsFromEditor() {
  const rows = $$('.step-edit-row');
  return rows.map((row) => ({
    label: row.querySelector('.step-input')?.value?.trim() || '',
    done: row.querySelector('.step-check')?.checked || false
  })).filter((s) => s.label);
}

function taskChecklistItems(task) {
  if (Array.isArray(task.steps) && task.steps.length) {
    return task.steps.slice(0, 5).map((step, index) => {
      if (typeof step === 'string') return { label: step, done: task.boardStatus === '已完成', index };
      return {
        label: step.label || step.title || '待补步骤',
        done: Boolean(step.done || step.checked || task.boardStatus === '已完成'),
        index
      };
    });
  }

  const nextAction = task.nextAction && task.nextAction !== '待补下一步动作'
    ? task.nextAction
    : '补齐任务边界和下一步动作';
  const evidence = task.evidence && task.evidence !== '新增任务，待补交付物或飞书记录'
    ? task.evidence
    : '补齐交付物或验收证据';
  const syncStep = /飞书/.test(task.system || '')
    ? '同步飞书记录'
    : /Obsidian/.test(task.system || '')
      ? '更新 Obsidian 记录'
      : /Skills/.test(task.system || '')
        ? '沉淀为 Skill 或 SOP'
        : '更新本地任务记录';

  return uniqTaskStepLabels([
    nextAction,
    evidence,
    syncStep,
    '复盘结果并决定下一步'
  ]).slice(0, 4).map((label, index) => ({
    label,
    done: task.boardStatus === '已完成' || (task.boardStatus === '进行中' && index === 0),
    index
  }));
}

function renderTaskStepButton(task, step) {
  const done = Boolean(step.done);
  const label = done ? `取消步骤：${step.label}` : `完成步骤：${step.label}`;
  return `
    <button
      class="task-check-box task-step-toggle ${done ? 'done' : ''}"
      data-task-step-id="${escapeHtml(task.id)}"
      data-task-step-index="${step.index}"
      type="button"
      role="checkbox"
      aria-checked="${done ? 'true' : 'false'}"
      aria-label="${escapeHtml(label)}"
    >${done ? '✓' : ''}</button>
  `;
}

function renderTaskChecklist(task, compact = false) {
  return `
    <ul class="task-checklist ${compact ? 'compact' : ''}">
      ${taskChecklistItems(task).map((step) => `
        <li class="${step.done ? 'done' : ''}">
          ${renderTaskStepButton(task, step)}
          <span title="${escapeHtml(step.label)}">${escapeHtml(step.label)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function suggestedAgentForTask(task) {
  const text = `${task.title || ''} ${task.collection || ''} ${task.nextAction || ''}`;
  if (/UI|UX|设计|海报|视觉|交互|动效|页面|作品/.test(text)) return 'Antigravity';
  if (/飞书|Obsidian|知识|复盘|文档|SOP|流程|同步/.test(text)) return 'Hermes';
  return 'Claude Code';
}

function taskAssignText(task) {
  return `请接手这个任务：

目标 Agent：${suggestedAgentForTask(task)}
任务：${task.title}
优先级：${task.priority || 'P1'}
状态：${task.status || task.boardStatus}
负责人：${task.owner}
归属：${task.collection} / ${task.system || '本地'}
截止：${task.dueDate || '待定'}

下一步：${task.nextAction || '暂无下一步动作'}
验收证据：${task.evidence || '下一步完成后补充证据'}

执行要求：
1. 先确认任务边界和风险。
2. 完成后自检并输出中文报告。
3. 不要写入飞书或外部系统，除非我明确确认。`;
}

function taskCopyText(task) {
  return `${task.title}
下一步：${task.nextAction || '暂无下一步动作'}
负责人：${task.owner}
归属：${task.system || '本地'}
截止：${task.dueDate}
证据：${task.evidence}`;
}

function updateTaskInState(updatedTask) {
  const index = (state.data.tasks || []).findIndex((item) => item.id === updatedTask.id);
  if (index === -1) return;
  state.data.tasks[index] = updatedTask;
}

async function toggleTaskDone(taskId) {
  const task = (state.data.tasks || []).map(normalizeTask).find((item) => item.id === taskId);
  if (!task) return;

  const nextStatus = nextTaskStatusAfterToggle(task);
  const payload = {
    status: nextStatus,
    previousStatus: task.boardStatus === '已完成' ? undefined : task.status || task.boardStatus
  };

  const result = await api(`/api/task/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    toast(result.error || '任务状态更新失败');
    return;
  }

  updateTaskInState(result.task);
  if (result.updatedAt) {
    state.data.meta.updatedAt = result.updatedAt;
    $('#syncTime').textContent = `更新时间 ${state.data.meta.updatedAt}`;
  }
  if (state.activeTaskId === taskId && nextStatus === '已完成' && state.taskStatus !== '全部' && state.taskStatus !== '已完成') {
    state.activeTaskId = null;
  }
  renderTasks();
  toast(nextStatus === '已完成' ? '任务已标记完成' : '任务已恢复为待办');
}

function persistedTaskSteps(task) {
  const existing = Array.isArray(task.steps) && task.steps.length
    ? task.steps
    : taskChecklistItems(task);
  return existing.slice(0, 5).map((step) => {
    if (typeof step === 'string') return { label: step, done: task.boardStatus === '已完成' };
    return {
      label: step.label || step.title || '待补步骤',
      done: Boolean(step.done || step.checked || task.boardStatus === '已完成')
    };
  });
}

async function toggleTaskStep(taskId, stepIndex) {
  const task = (state.data.tasks || []).map(normalizeTask).find((item) => item.id === taskId);
  if (!task) return;

  const steps = persistedTaskSteps(task);
  const index = Number(stepIndex);
  if (!Number.isInteger(index) || !steps[index]) return;

  steps[index] = {
    ...steps[index],
    done: !steps[index].done
  };

  const allDone = steps.length > 0 && steps.every((step) => step.done);
  const anyDone = steps.some((step) => step.done);
  const nextStatus = allDone
    ? '已完成'
    : task.boardStatus === '已完成'
      ? '进行中'
      : anyDone && task.boardStatus === '待办' && /待开始|待办/.test(task.status || task.boardStatus)
        ? '进行中'
        : task.status || task.boardStatus;

  const payload = {
    steps,
    status: nextStatus,
    previousStatus: allDone ? (task.status || task.boardStatus) : undefined
  };

  const result = await api(`/api/task/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    toast(result.error || '步骤状态更新失败');
    return;
  }

  updateTaskInState(result.task);
  if (result.updatedAt) {
    state.data.meta.updatedAt = result.updatedAt;
    $('#syncTime').textContent = `更新时间 ${state.data.meta.updatedAt}`;
  }
  renderTasks();
  toast(allDone ? '步骤已全部完成，任务已完成' : '步骤已更新');
}

function nextTaskStatusAfterToggle(task) {
  if (task.boardStatus === '已完成') {
    return task.previousStatus && task.previousStatus !== '已完成'
      ? task.previousStatus
      : '待开始';
  }
  return '已完成';
}

function renderTaskDoneButton(task, className = '') {
  const done = task.boardStatus === '已完成';
  const label = done ? `取消完成：${task.title}` : `标记完成：${task.title}`;
  return `
    <button
      class="task-check-box task-done-toggle ${className} ${done ? 'done' : ''}"
      data-task-toggle-id="${escapeHtml(task.id)}"
      type="button"
      role="checkbox"
      aria-checked="${done ? 'true' : 'false'}"
      aria-label="${escapeHtml(label)}"
    >${done ? '✓' : ''}</button>
  `;
}

function renderTaskDetail(task) {
  const badgeClass = priorityClass(task.priority);
  const status = task.status || task.boardStatus;
  return `
    <section class="task-detail-panel" aria-label="任务详情">
      <div class="task-detail-head">
        <div>
          <span class="label">任务详情</span>
          <h3>${escapeHtml(task.title)}</h3>
        </div>
        <div class="task-detail-actions">
          <button class="small-btn secondary" data-edit-task-id="${escapeHtml(task.id)}" type="button">编辑</button>
          <button class="small-btn secondary" data-assign-task-id="${escapeHtml(task.id)}" type="button">派 AI</button>
          <button class="small-btn secondary" data-copy-task-id="${escapeHtml(task.id)}" type="button">复制</button>
          <button class="small-btn secondary" data-sync-task-id="${escapeHtml(task.id)}" type="button">同步到飞书</button>
          <button class="small-btn secondary" data-close-task-detail type="button">收起</button>
        </div>
      </div>
      <div class="task-detail-tags">
        <span class="badge ${badgeClass}">${escapeHtml(task.priority || 'P1')}</span>
        <span class="task-status-chip ${taskStatusClass(task.boardStatus)}">${escapeHtml(task.boardStatus)}</span>
        <span>${escapeHtml(task.collection)}</span>
        <span>${escapeHtml(task.system || '本地')}</span>
        <span>${escapeHtml(task.dueDate || '待定')}</span>
        <span>${escapeHtml(formatTaskAge(task))}</span>
      </div>
      ${renderTaskChecklist(task)}
      <div class="task-detail-block">
        <strong>${escapeHtml(task.id)} / ${escapeHtml(task.assignee || task.owner || '')} / ${escapeHtml(status)}</strong>
        <p>${escapeHtml(task.evidence || '下一步完成后补充证据')}</p>
      </div>
    </section>
  `;
}

function renderTaskCard(task) {
  const badgeClass = priorityClass(task.priority);
  const dueSoon = isTaskDueSoon(task);
  return `
    <article class="task-card ${dueSoon ? 'due-soon' : ''}" data-task-id="${escapeHtml(task.id)}" tabindex="0" role="button" aria-label="查看${escapeHtml(task.title)}任务详情">
      <div class="task-card-top">
        <span class="badge ${badgeClass}">${escapeHtml(task.priority || 'P1')}</span>
        <small>${escapeHtml(formatTaskAge(task))}</small>
      </div>
      <div class="task-title-row">
        ${renderTaskDoneButton(task, 'title-check')}
        <h3 title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</h3>
      </div>
      ${renderTaskChecklist(task)}
      <div class="task-chip-row">
        <span class="task-status-chip ${taskStatusClass(task.boardStatus)}">${escapeHtml(task.boardStatus)}</span>
        <span>${escapeHtml(task.collection)}</span>
        <span>${escapeHtml(task.system || '本地')}</span>
      </div>
      <div class="task-card-meta">
        <span>${escapeHtml(task.assignee || task.owner || '')}${task.collaborator ? ' + ' + escapeHtml(task.collaborator) : ''}</span>
        <span>${escapeHtml(formatShortDate(task.dueDate))}</span>
        <span>${escapeHtml(task.id)}</span>
      </div>
      <div class="task-card-actions">
        <button class="task-copy-btn task-assign-btn" data-assign-task-id="${escapeHtml(task.id)}" type="button">派 AI</button>
        <button class="task-copy-btn" data-copy-task-id="${escapeHtml(task.id)}" type="button">复制</button>
        <button class="task-copy-btn" data-sync-task-id="${escapeHtml(task.id)}" type="button">同步</button>
        ${task.boardStatus === '已完成' ? `<button class="task-copy-btn" data-archive-task-id="${escapeHtml(task.id)}" type="button" style="color:var(--amber)">归档</button>` : ''}
      </div>
    </article>
  `;
}

function renderTasks() {
  const tasks = (state.data.tasks || []).map(normalizeTask);
  const keyword = state.taskKeyword.trim().toLowerCase();
  const systems = ['全部', ...new Set(tasks.map((item) => item.system).filter(Boolean))];
  const collections = ['全部', ...new Set(tasks.map((item) => item.collection).filter(Boolean))];
  const statuses = ['全部', '待办', '进行中', '已完成', '已归档'];
  const domainMatchers = {
    all: () => true,
    today: (task) => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      return task.dueDate === todayStr || task.boardStatus === '进行中';
    },
    feishu: (task) => task.system === '飞书',
    content: (task) => task.collection === '内容运营' || task.collection === '发布会筹备',
    review: (task) => task.boardStatus === '已完成' || (task.evidence && task.evidence !== '下一步完成后补充证据'),
    risk: (task) => task.priority === 'P0' || isTaskDueSoon(task)
  };

  // Domain filter
  const domainFiltered = tasks.filter((task) => {
    return (domainMatchers[state.taskDomain] || domainMatchers.all)(task);
  });

  // Keyword + status + system + collection + priority filter
  const filtered = domainFiltered.filter((task) => {
    const text = JSON.stringify(task).toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchStatus = state.taskStatus === '全部' || task.boardStatus === state.taskStatus;
    const matchSystem = state.taskSystem === '全部' || task.system === state.taskSystem;
    const matchCollection = state.taskCollection === '全部' || task.collection === state.taskCollection;
    const matchPriority = state.taskPriority === '全部' || (state.taskPriority === 'dueSoon' ? isTaskDueSoon(task) : task.priority === state.taskPriority);
    return matchKeyword && matchStatus && matchSystem && matchCollection && matchPriority;
  });

  // Sort
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  const statusOrder = { '进行中': 0, '待办': 1, '待确认': 2, '已完成': 3, '已归档': 4 };
  const sorted = [...filtered].sort((a, b) => {
    if (state.taskSort === 'priority') {
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
    }
    if (state.taskSort === 'dueDate') {
      return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
    }
    if (state.taskSort === 'status') {
      const sa = statusOrder[a.boardStatus] ?? 5;
      const sb = statusOrder[b.boardStatus] ?? 5;
      if (sa !== sb) return sa - sb;
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      return pa - pb;
    }
    return 0;
  });

  // Sort label
  const sortLabels = { priority: '优先级', dueDate: '截止时间', status: '状态' };

  $('#taskNavCount').textContent = tasks.length;
  $$('.task-domain-tab').forEach((item) => {
    const domain = item.dataset.taskDomain;
    const baseLabel = item.dataset.baseLabel || item.textContent.trim().replace(/\s+\d+$/, '');
    item.dataset.baseLabel = baseLabel;
    const count = tasks.filter(domainMatchers[domain] || domainMatchers.all).length;
    item.innerHTML = `${escapeHtml(baseLabel)}<em>${count}</em>`;
    item.classList.toggle('active', domain === state.taskDomain);
  });
  $$('.task-plan-tab').forEach((item) => {
    item.classList.toggle('active', item.dataset.taskMode === state.taskMode);
  });

  // Render status filters
  $('#taskStatusFilters').innerHTML = statuses.map((status) => {
    const count = status === '全部' ? tasks.length : tasks.filter((task) => task.boardStatus === status).length;
    return `<button class="task-filter ${state.taskStatus === status ? 'active' : ''}" data-task-status="${status}" type="button">${status}<em>${count}</em></button>`;
  }).join('');

  // Render collection filters
  $('#taskCollectionFilters').innerHTML = collections.map((collection) => {
    const count = collection === '全部' ? tasks.length : tasks.filter((task) => task.collection === collection).length;
    return `<button class="task-filter ${state.taskCollection === collection ? 'active' : ''}" data-task-collection="${escapeHtml(collection)}" type="button">${escapeHtml(collection)}<em>${count}</em></button>`;
  }).join('');

  // 归属筛选已移除：对个人工作台来说，合集维度已足够区分任务性质
  if ($('#taskSystemFilters')) $('#taskSystemFilters').parentElement?.remove();

  // Render priority filters
  const priorities = ['全部', 'P0', 'P1', 'P2', '7天内到期'];
  $('#taskPriorityFilters').innerHTML = priorities.map((priority) => {
    const val = priority === '7天内到期' ? 'dueSoon' : priority;
    const count = priority === '全部' ? tasks.length : (priority === '7天内到期' ? tasks.filter(isTaskDueSoon).length : tasks.filter((task) => task.priority === priority).length);
    return `<button class="task-filter ${state.taskPriority === val ? 'active' : ''}" data-task-priority="${val}" type="button">${priority}<em>${count}</em></button>`;
  }).join('');

  // Render sort buttons
  $('#taskSortButtons').innerHTML = [
    { value: 'priority', label: '优先级' },
    { value: 'dueDate', label: '截止时间' },
    { value: 'status', label: '状态' }
  ].map((item) => `<button class="task-filter ${state.taskSort === item.value ? 'active' : ''}" data-task-sort="${item.value}" type="button">${item.label}</button>`).join('');

  // Render view buttons
  $('#taskViewButtons').innerHTML = [
    { value: 'kanban', label: '看板' },
    { value: 'cards', label: '卡片' },
    { value: 'compact', label: '紧凑列表' }
  ].map((item) => `<button class="task-filter ${state.taskView === item.value ? 'active' : ''}" data-task-view="${item.value}" type="button">${item.label}</button>`).join('');

  // Result summary
  const domainLabels = { all: '全部任务域', today: '今日推进', feishu: '飞书待同步', content: '内容/发布会', review: '复盘证据', risk: '风险看板' };
  const filterParts = [];
  if (state.taskDomain !== 'all') filterParts.push(domainLabels[state.taskDomain] || state.taskDomain);
  if (state.taskStatus !== '全部') filterParts.push(state.taskStatus);
  if (state.taskCollection !== '全部') filterParts.push(state.taskCollection);
  if (state.taskPriority !== '全部') filterParts.push(state.taskPriority === 'dueSoon' ? '7天内到期' : state.taskPriority);
  const filterText = filterParts.length ? `筛选：${filterParts.join(' / ')}` : '';
  $('#taskResultSummary').innerHTML = filterText || '';
  const activeTask = (state.data.tasks || []).map(normalizeTask).find((task) => task.id === state.activeTaskId);
  const midRow = $('#taskMidRow');
  if (activeTask) {
    $('#taskDetailSlot').innerHTML = renderTaskDetail(activeTask);
    midRow?.classList.add('with-detail');
  } else {
    $('#taskDetailSlot').innerHTML = '';
    midRow?.classList.remove('with-detail');
  }

  // Metrics (always from all tasks, not filtered)
  const urgent = tasks.filter((task) => task.priority === 'P0').length;
  const doing = tasks.filter((task) => task.boardStatus === '进行中').length;
  const dueSoon = tasks.filter(isTaskDueSoon).length;
  const pending = tasks.filter((task) => /确认|数据|手动/.test(task.status || '')).length;
  $('#taskMetrics').innerHTML = [
    ['总任务', tasks.length],
    ['P0事项', urgent],
    ['进行中', doing],
    ['7天内到期', dueSoon],
    ['待补条件', pending]
  ].map(([label, value]) => `<div class="task-metric"><span>${label}</span><strong>${value}</strong></div>`).join('');

  // Board / Cards / Compact view
  if (state.taskView === 'compact') {
    renderCompactTaskList(sorted);
    return;
  }

  if (state.taskView === 'cards') {
    renderTaskCardGrid(sorted);
    return;
  }

  // Kanban view (default)
  const columns = state.taskMode === 'collections'
    ? collections.filter((item) => item !== '全部').map((name) => ({ name, hint: '同一工作模块下的任务包', matcher: (task) => task.collection === name }))
    : [
      { name: '待办', hint: '需要排优先级或补条件', matcher: (task) => task.boardStatus === '待办' },
      { name: '进行中', hint: '今天真正推进的任务', matcher: (task) => task.boardStatus === '进行中' },
      { name: '已完成', hint: '可以沉淀复盘和证据', matcher: (task) => task.boardStatus === '已完成' },
      { name: '已归档', hint: '暂时不占用注意力', matcher: (task) => task.boardStatus === '已归档' }
    ];
  $('#taskBoard').classList.remove('card-mode', 'compact-mode');
  $('#taskBoard').classList.toggle('collection-mode', state.taskMode === 'collections');
  $('#taskBoard').innerHTML = columns.map((column) => {
    const list = sorted.filter(column.matcher);
    return `
      <section class="task-column">
        <div class="task-column-head">
          <div><strong>${escapeHtml(column.name)}</strong><span>${escapeHtml(column.hint)}</span></div>
          <em>${list.length}</em>
        </div>
        <div class="task-column-list">
          ${list.map(renderTaskCard).join('') || '<p class="empty-text">暂无任务</p>'}
        </div>
      </section>
    `;
  }).join('');
}

function renderCompactTaskList(tasks) {
  $('#taskBoard').classList.remove('card-mode', 'collection-mode');
  $('#taskBoard').classList.add('compact-mode');
  $('#taskBoard').innerHTML = tasks.length
    ? `<div class="compact-task-list">
        ${tasks.map((task) => `
          <article class="compact-task-row" data-task-id="${escapeHtml(task.id)}" tabindex="0" role="button" aria-label="查看${escapeHtml(task.title)}任务详情">
            <span class="badge ${priorityClass(task.priority)}">${escapeHtml(task.priority || 'P1')}</span>
            <div class="compact-task-body">
              <strong title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</strong>
              ${renderTaskChecklist(task, true)}
            </div>
            <span class="task-status-chip ${taskStatusClass(task.boardStatus)}">${escapeHtml(task.boardStatus)}</span>
            <span class="compact-task-owner">${escapeHtml(task.assignee || task.owner)}${task.collaborator ? ' +' + escapeHtml(task.collaborator) : ''}</span>
            <span class="compact-task-due ${isTaskDueSoon(task) ? 'due-soon-text' : ''}">${escapeHtml(formatTaskAge(task))}</span>
            <span class="compact-task-collection">${escapeHtml(task.collection)}</span>
            <div class="compact-task-actions">
              <button class="task-copy-btn compact-copy task-assign-btn" data-assign-task-id="${escapeHtml(task.id)}" type="button">派 AI</button>
              <button class="task-copy-btn compact-copy" data-copy-task-id="${escapeHtml(task.id)}" type="button">复制</button>
              <button class="task-copy-btn compact-copy" data-sync-task-id="${escapeHtml(task.id)}" type="button">同步</button>
              ${task.boardStatus === '已完成' ? `<button class="task-copy-btn compact-copy" data-archive-task-id="${escapeHtml(task.id)}" type="button" style="color:var(--amber)">归档</button>` : ''}
            </div>
          </article>
        `).join('')}
      </div>`
    : '<p class="empty-text">暂无匹配任务</p>';
}

function renderTaskCardGrid(tasks) {
  $('#taskBoard').classList.remove('collection-mode', 'compact-mode');
  $('#taskBoard').classList.add('card-mode');
  $('#taskBoard').innerHTML = tasks.length
    ? `<div class="task-card-grid">${tasks.map(renderTaskCard).join('')}</div>`
    : '<p class="empty-text">暂无匹配任务</p>';
}

function renderGrowth() {
  const data = state.data.dailyGrowth;
  $('#growthTitle').textContent = `${data.date} 增长日报`;
  $('#totalFollowers').textContent = formatNumber(data.totalFollowers);
  $('#growthDelta').textContent = `日 +${formatNumber(data.dailyIncrease)} / 周 +${formatNumber(data.weeklyIncrease)} / 月 +${formatNumber(data.monthlyIncrease)}`;
  $('#goalDate').textContent = data.goalDate;
  $('#goalText').textContent = `目标粉丝 ${formatNumber(data.goalFollowers)}`;
  $('#goalProgress').style.width = `${Math.min(100, Math.round(data.totalFollowers / data.goalFollowers * 100))}%`;
  const platformLogos = {
    '小红书': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="xhs" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff3b30"/><stop offset="100%" stop-color="#ff6b5f"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#xhs)"/><circle cx="20" cy="16" r="8" fill="none" stroke="white" stroke-width="2.5"/><path d="M14 22 Q20 30 26 22" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>'),
    '抖音': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#111"/><path d="M24 8h-4v16a4 4 0 11-4-4v-4a8 8 0 108 8V15h4V8z" fill="#00f2ea"/><path d="M24 8v7h4v-7z" fill="#ff0050"/></svg>'),
    'B站': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#fb7299"/><path d="M28 14c-2-1-3 0-4 2l-4 4-4-4c-1-2-2-3-4-2s-1 5 2 9l6 7 6-7c3-4 4-8 2-9z" fill="white"/></svg>'),
    '视频号': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#07c160"/><polygon points="16,12 30,20 16,28" fill="white"/></svg>'),
    '公众号': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#576b95"/><circle cx="20" cy="14" r="7" fill="white"/><path d="M12 28 Q12 22 20 22 Q28 22 28 28" fill="white"/></svg>'),
    '微博': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#e6162d"/><circle cx="14" cy="16" r="6" fill="white"/><circle cx="26" cy="14" r="4" fill="white"/><path d="M12 24 Q14 28 20 27 Q26 26 28 22" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>'),
    '小宇宙': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#6366f1"/><circle cx="20" cy="20" r="9" fill="none" stroke="white" stroke-width="2.5"/><circle cx="20" cy="20" r="3" fill="white"/><ellipse cx="20" cy="20" rx="14" ry="5" fill="none" stroke="white" stroke-width="1.5" transform="rotate(-20 20 20)"/></svg>'),
    '其他平台': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#6f8d55"/><circle cx="20" cy="12" r="4" fill="white"/><path d="M10 30 L20 20 L30 30" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>')
  };
  $('#platformGrid').innerHTML = data.platforms.map((item) => `
    <article class="platform-card">
      <img class="platform-logo" src="${platformLogos[item.name] || platformLogos['其他平台']}" alt="${item.name}" width="36" height="36">
      <div class="platform-info">
        <strong>${item.name}</strong>
        <em>${formatNumber(item.followers)}</em>
        <small>日 +${formatNumber(item.dailyIncrease)}</small>
      </div>
    </article>
  `).join('');
  $('#growthInsights').innerHTML = data.insights.map((item) => `<li>${item}</li>`).join('');
  renderWorkflowQueue();
}

function renderGrowthHistory() {
  const target = $('#growthHistory');
  if (!target) return;

  const platforms = state.data?.dailyGrowth?.platforms || [];
  $('#growthNavCount').textContent = platforms.filter(function(p){return p.followers > 0}).length || platforms.length || 0;
  if (!state.growthEntries.length) {
    target.innerHTML = '<p class="empty-text">还没有本地日报记录。可以先用左侧表单录入一条测试数据。</p>';
    return;
  }

  target.innerHTML = state.growthEntries.slice(0, 10).map((item) => `
    <article class="record-card">
      <div>
        <strong>${item.date}｜${item.platform}</strong>
        <span>粉丝 ${formatNumber(item.followers)} / 日增 ${Number(item.dailyIncrease) >= 0 ? '+' : ''}${formatNumber(item.dailyIncrease)} / 互动 ${formatNumber(item.interactions)} / 线索 ${formatNumber(item.leads)}</span>
        <small>${item.note || '无备注'}</small>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="small-btn secondary convert-to-task" data-convert-source="growth" data-convert-title="${escapeHtml(item.platform + '日报跟进：' + (item.note || '检查数据'))}" data-convert-collection="内容运营" data-convert-next="根据${escapeHtml(item.platform)}数据变化调整内容策略" type="button">转任务</button>
        <em>${item.id}</em>
      </div>
    </article>
  `).join('');
}

function renderWorkflowQueue() {
  const target = $('#workflowQueue');
  if (!target) return;

  target.innerHTML = state.data.workflowQueue.map((item) => `
    <article class="workflow-card">
      <span>${item.stage}</span>
      <strong>${item.name}</strong>
      <p><b>输入：</b>${item.input}</p>
      <p><b>输出：</b>${item.output}</p>
      <small>${item.next}</small>
    </article>
  `).join('');
}

function renderCrawlSummary() {
  const target = $('#crawlSummary');
  if (!target) return;
  const summary = state.crawlSummary;
  const library = state.xhsLibrarySummary;
  const libraryHtml = library && library.totalWorks ? `
    <div class="library-summary">
      <div class="section-head compact">
        <div>
          <h4>小红书作品库</h4>
          <p class="section-note">已整合标题、正文、话题、公开评论、互动数据和运营判断。</p>
        </div>
        <span class="status">统一运营库</span>
      </div>
      <div class="crawl-metrics">
        <div><span>已入库作品</span><strong>${library.totalWorks}</strong></div>
        <div><span>互动合计</span><strong>${formatNumber(library.totalInteractions)}</strong></div>
        <div><span>公开评论</span><strong>${formatNumber(library.totalComments || 0)}</strong></div>
        <div><span>更新时间</span><strong>${library.updatedAt ? new Date(library.updatedAt).toLocaleString('zh-CN') : '待生成'}</strong></div>
      </div>
      <div class="record-list compact-list">
        ${library.topWorks.slice(0, 5).map((item, index) => `
          <article class="record-card">
            <div>
              <strong>Top ${index + 1}｜${item.title}</strong>
              <span>互动 ${formatNumber(item.interactions)} / 赞 ${formatNumber(item.liked)} / 藏 ${formatNumber(item.collected)} / 评 ${formatNumber(item.commented)} / 分享 ${formatNumber(item.shared)}</span>
              <small>${item.category} / ${item.source}</small>
            </div>
            <em>${item.index}</em>
          </article>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="library-summary">
      <p class="empty-text">小红书作品库汇总未生成。运行 <code>npm run xhs:summary</code> 后刷新。</p>
    </div>
  `;

  if (!summary || !summary.batches?.length) {
    target.innerHTML = `
      ${libraryHtml}
      <p class="empty-text">还没有真实采集批次。先在终端运行上方命令，手动登录并采集公开数据，再点击“生成汇总”。</p>
    `;
    return;
  }

  target.innerHTML = `
    ${libraryHtml}
    <div class="crawl-metrics">
      <div><span>采集批次</span><strong>${summary.totals.batchCount}</strong></div>
      <div><span>作品数</span><strong>${summary.totals.itemCount}</strong></div>
      <div><span>互动合计</span><strong>${formatNumber(summary.totals.totalInteractions)}</strong></div>
      <div><span>更新时间</span><strong>${summary.updatedAt ? new Date(summary.updatedAt).toLocaleString('zh-CN') : '待生成'}</strong></div>
    </div>
    <div class="record-list">
      ${summary.batches.slice(0, 8).map((item) => `
        <article class="record-card">
          <div>
            <strong>${item.keyword}｜${item.count}条</strong>
            <span>总互动 ${formatNumber(item.totalInteractions)} / 平均 ${formatNumber(item.averageInteractions)} / 最高 ${formatNumber(item.topInteractions)}</span>
            <small>${item.topTitle || item.file}</small>
          </div>
          <em>${item.file}</em>
        </article>
      `).join('')}
    </div>
  `;
}

function contentPreview(text = '', length = 90) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value ? value.slice(0, length) : '正文待补';
}

function workDate(item) {
  return item.publishDate || item.date || '';
}

function workDetailStatus(item) {
  return item.dataQuality?.detailStatus || item.detailStatus || (item.content ? '已有正文' : '待补详情');
}

function workInteractions(item) {
  return Number(item.metrics?.interactions || item.interactions || 0);
}

function workCommentCount(item) {
  return Number(item.comments?.count || item.commentSummary?.total || 0);
}

function workLiked(item) {
  return Number(item.metrics?.liked || item.liked || 0);
}

function workCollected(item) {
  return Number(item.metrics?.collected || item.collected || 0);
}

function workCommented(item) {
  return Number(item.metrics?.commented || item.commented || 0);
}

function workShared(item) {
  return Number(item.metrics?.shared || item.shared || 0);
}

function workDuration(item) {
  const raw = item.duration
    || item.videoDuration
    || item.videoDurationSeconds
    || item.video_duration_seconds
    || item.metrics?.duration
    || item.media?.video_duration_seconds
    || item.media?.duration
    || 0;
  if (typeof raw === 'number') return raw;
  const text = String(raw || '').trim();
  const parts = text.split(':').map((part) => Number(part));
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const num = Number(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);
  if (!value) return '时长待补';
  const minutes = Math.floor(value / 60);
  const remain = Math.round(value % 60);
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

function workFormat(item) {
  const rawType = String(item.noteType || item.xhs_note_type || item.type || '').toLowerCase();
  const text = JSON.stringify({
    title: item.title,
    category: item.category,
    content: item.content,
    summary: item.summary,
    tags: item.tags,
    source: item.source,
    type: item.type,
    noteType: item.noteType
  }).toLowerCase();
  const livePattern = /直播切片|直播回放|直播间|连麦|录播|直播课|直播帮你|这场直播|live replay/;
  if (rawType === 'video') return livePattern.test(text) ? '直播切片' : '视频';
  if (rawType === 'image' || rawType === 'note' || rawType === 'normal') return '图文';
  if (livePattern.test(text)) return '直播切片';
  if (/视频|vlog|口播|短视频|剪辑|字幕|拍摄|reel/.test(text)) return '视频';
  return '图文';
}

function parseWorkDateValue(item) {
  const value = workDate(item);
  const time = value ? Date.parse(value.replace(/\./g, '-')) : 0;
  return Number.isFinite(time) ? time : 0;
}

function selectedWorkViewLabel() {
  const views = {
    all: '全部作品',
    comments: '有评论需求',
    conversion: '转化咨询',
    b2b: 'B端/文旅合作',
    noComments: '无评论样本',
    pending: '待补信息'
  };
  return views[state.workView] || '全部作品';
}

function workMatchesEngagement(item) {
  if (state.workEngagement === '高互动') return ['S', 'A'].includes(item.score) || workInteractions(item) >= 40;
  if (state.workEngagement === '低互动') return workInteractions(item) <= 10;
  if (state.workEngagement === '0互动') return workInteractions(item) === 0;
  return true;
}

function workMatchesView(item) {
  const category = item.category || '';
  const topDemand = item.commentSummary?.topDemand || '';
  const goal = item.businessGoal || '';
  if (state.workView === 'comments') return workCommentCount(item) > 0;
  if (state.workView === 'conversion') return topDemand.includes('转化') || /报名|咨询|参与|价格|怎么/.test(JSON.stringify(item.commentSummary || {}));
  if (state.workView === 'b2b') return /B端|企业|文旅|康养|酒店|合作/.test(`${category} ${goal} ${item.title || ''}`);
  if (state.workView === 'noComments') return workCommentCount(item) === 0;
  if (state.workView === 'pending') return !item.content || workDetailStatus(item).includes('待补') || workDetailStatus(item).includes('失败');
  return true;
}

function workNegativeTags(item) {
  const tags = [];
  const interactions = workInteractions(item);
  const comments = workCommentCount(item);
  const content = `${item.title || ''} ${item.content || ''}`;
  if (comments === 0) tags.push('无评论');
  if (interactions <= 10) tags.push('低互动');
  if (['B', 'C'].includes(item.score)) tags.push(`${item.score}级样本`);
  if (!/评论|私信|报名|预约|领取|收藏|咨询|关注|查看|参与/.test(content)) tags.push('CTA弱');
  if (/氛围|光影|森林在|雨后|年轮|万物|呼唤|遇见|温柔/.test(content) && !/报名|参与|怎么|适合|价格|时间|地点/.test(content)) tags.push('偏氛围');
  return tags.slice(0, 4);
}

function workReverseReview(item) {
  const hints = [];
  if (workCommentCount(item) === 0) hints.push('没有评论，优先检查结尾是否设置了可回答的问题或明确互动动作。');
  if (workInteractions(item) <= 10) hints.push('互动偏低，优先检查标题是否过于抽象，前三行是否没有具体人群和场景。');
  if (workNegativeTags(item).includes('CTA弱')) hints.push('承接动作偏弱，建议补“评论关键词、私信报名、收藏练习、预约方案”等动作。');
  if (workNegativeTags(item).includes('偏氛围')) hints.push('氛围表达较多，建议改成“谁在什么状态下为什么需要看”。');
  if (!hints.length) hints.push('这条暂不属于明显反面样本，可以按常规复盘标题、评论和转化承接。');
  return hints;
}

function sortWorks(items) {
  const list = [...items];
  const byNumber = (reader) => list.sort((a, b) => reader(b) - reader(a) || workInteractions(b) - workInteractions(a));
  if (state.workSort === 'liked_desc') return byNumber(workLiked);
  if (state.workSort === 'collected_desc') return byNumber(workCollected);
  if (state.workSort === 'comments_desc') {
    return list.sort((a, b) => workCommentCount(b) - workCommentCount(a) || workInteractions(b) - workInteractions(a));
  }
  if (state.workSort === 'shared_desc') return byNumber(workShared);
  if (state.workSort === 'duration_desc') {
    return list.sort((a, b) => workDuration(b) - workDuration(a) || parseWorkDateValue(b) - parseWorkDateValue(a) || workInteractions(b) - workInteractions(a));
  }
  if (state.workSort === 'date_desc') {
    return list.sort((a, b) => parseWorkDateValue(b) - parseWorkDateValue(a) || (a.profileOrder || 9999) - (b.profileOrder || 9999));
  }
  if (state.workSort === 'date_asc') {
    return list.sort((a, b) => parseWorkDateValue(a) - parseWorkDateValue(b) || (a.profileOrder || 9999) - (b.profileOrder || 9999));
  }
  if (state.workSort === 'order_asc') {
    return list.sort((a, b) => Number(a.profileOrder || a.index || 9999) - Number(b.profileOrder || b.index || 9999));
  }
  return list.sort((a, b) => workInteractions(b) - workInteractions(a) || workCommentCount(b) - workCommentCount(a));
}

function categoryStats(works) {
  const map = new Map();
  works.forEach((item) => {
    const name = item.category || '待分类';
    const current = map.get(name) || { name, count: 0, interactions: 0, comments: 0, topTitle: '', topInteractions: 0 };
    current.count += 1;
    current.interactions += workInteractions(item);
    current.comments += workCommentCount(item);
    if (workInteractions(item) > current.topInteractions) {
      current.topInteractions = workInteractions(item);
      current.topTitle = item.title || '';
    }
    map.set(name, current);
  });
  return [...map.values()].sort((a, b) => b.interactions - a.interactions);
}

function renderWorkViewTabs(works) {
  const target = $('#workViewTabs');
  if (!target) return;
  const tabs = [
    { id: 'all', label: '全部', count: works.length },
    { id: 'comments', label: '有评论', count: works.filter((item) => workCommentCount(item) > 0).length },
    { id: 'conversion', label: '转化咨询', count: works.filter((item) => (item.commentSummary?.topDemand || '').includes('转化')).length },
    { id: 'b2b', label: 'B端/文旅', count: works.filter((item) => /B端|企业|文旅|康养|酒店|合作/.test(`${item.category || ''} ${item.businessGoal || ''} ${item.title || ''}`)).length },
    { id: 'noComments', label: '无评论', count: works.filter((item) => workCommentCount(item) === 0).length },
    { id: 'pending', label: '待补', count: works.filter((item) => !item.content || workDetailStatus(item).includes('待补') || workDetailStatus(item).includes('失败')).length }
  ];
  target.innerHTML = tabs.map((tab) => `
    <button class="library-filter ${state.workView === tab.id ? 'active' : ''}" data-work-filter="view" data-work-value="${tab.id}" type="button">${tab.label} <em>${tab.count}</em></button>
  `).join('');
}

function renderLibraryFilterButton(group, value, active, count) {
  return `<button class="library-filter ${active ? 'active' : ''}" data-work-filter="${group}" data-work-value="${escapeHtml(value)}" type="button">${escapeHtml(value)} <em>${count}</em></button>`;
}

function renderLibraryFilters(works) {
  const formatTarget = $('#workFormatFilters');
  const categoryTarget = $('#workCategoryFilters');
  const engagementTarget = $('#workEngagementFilters');
  const layoutTarget = $('#workLayoutFilters');
  if (!formatTarget || !categoryTarget || !engagementTarget || !layoutTarget) return;

  const formats = ['全部', '图文', '视频', '直播切片'];
  formatTarget.innerHTML = formats.map((item) => {
    const count = item === '全部' ? works.length : works.filter((work) => workFormat(work) === item).length;
    return renderLibraryFilterButton('format', item, state.workFormat === item, count);
  }).join('');

  const categories = ['全部', ...new Set(works.map((item) => item.category).filter(Boolean))];
  categoryTarget.innerHTML = categories.map((item) => {
    const count = item === '全部' ? works.length : works.filter((work) => work.category === item).length;
    return renderLibraryFilterButton('category', item, state.workCategory === item, count);
  }).join('');

  const engagementFilters = [
    { label: '全部', value: '全部', count: works.length },
    { label: '高互动', value: '高互动', note: 'S/A或40+', count: works.filter((item) => ['S', 'A'].includes(item.score) || workInteractions(item) >= 40).length },
    { label: '低互动', value: '低互动', note: '≤10', count: works.filter((item) => workInteractions(item) <= 10).length },
    { label: '0互动', value: '0互动', count: works.filter((item) => workInteractions(item) === 0).length }
  ];
  engagementTarget.innerHTML = engagementFilters.map((item) => {
    const active = state.workEngagement === item.value;
    return `<button class="library-filter ${active ? 'active' : ''}" data-work-filter="engagement" data-work-value="${item.value}" type="button">${item.label} <em>${item.note ? `${item.note} · ` : ''}${item.count}</em></button>`;
  }).join('');

  const layouts = [
    { id: 'cards', label: '卡片', note: '读正文' },
    { id: 'timeline', label: '时间线', note: '看节奏' },
    { id: 'table', label: '表格', note: '比数据' },
    { id: 'ranking', label: '榜单', note: '找样本' }
  ];
  layoutTarget.innerHTML = layouts.map((item) => {
    const active = state.workLayout === item.id;
    return `<button class="library-filter ${active ? 'active' : ''}" data-work-filter="layout" data-work-value="${item.id}" type="button">${item.label} <em>${item.note}</em></button>`;
  }).join('');
}

function renderCategoryBoard(works) {
  const target = $('#workCategoryBoard');
  if (!target) return;
  const totalInteractions = works.reduce((sum, item) => sum + workInteractions(item), 0) || 1;
  target.innerHTML = categoryStats(works).slice(0, 9).map((item) => {
    const percent = Math.round(item.interactions / totalInteractions * 100);
    const active = state.workCategory === item.name;
    return `
      <button class="category-row ${active ? 'active' : ''}" data-work-category="${item.name}" type="button">
        <span>${item.name}</span>
        <strong>${item.count}条 / ${formatNumber(item.interactions)}</strong>
        <i style="width:${Math.max(6, percent)}%"></i>
      </button>
    `;
  }).join('');
}

function workMetaHtml(item) {
  return `
    <span>${item.category || '待分类'}</span>
    <span>${workFormat(item)}</span>
    <span>${item.commentSummary?.topDemand || '评论待看'}</span>
    <span>赞 ${formatNumber(workLiked(item))}</span>
    <span>藏 ${formatNumber(workCollected(item))}</span>
    <span>评 ${formatNumber(workCommentCount(item))}</span>
    <span>转 ${formatNumber(workShared(item))}</span>
    <span>${workDate(item) || '日期待补'}</span>
    ${workNegativeTags(item).map((tag) => `<span class="negative-tag">${tag}</span>`).join('')}
  `;
}

function workCardHtml(item) {
  return `
    <article class="work-row ${item.id === state.activeWorkId ? 'selected' : ''}" data-work-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.title}">
      <div class="work-rank">${item.index || item.profileOrder || '-'}</div>
      <div>
        <div class="work-row-top">
          <strong>${item.title}</strong>
          <span class="score-pill ${String(item.score || '').toLowerCase()}">${item.score || '未评'}</span>
        </div>
        <p>${contentPreview(item.content || item.summary, 118)}</p>
        <div class="idea-meta">${workMetaHtml(item)}</div>
      </div>
      <button class="work-exp-btn" data-add-exp-from-work="${item.id}" data-exp-title="${escapeHtml(item.title||'')}" type="button" title="记录经验">+ 经验</button>
    </article>
  `;
}

function workTimelineHtml(items) {
  return items.map((item) => `
    <article class="work-timeline-item ${item.id === state.activeWorkId ? 'selected' : ''}" data-work-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.title}">
      <time>${workDate(item) || '日期待补'}</time>
      <div>
        <div class="work-row-top">
          <strong>${item.title}</strong>
          <span class="score-pill ${String(item.score || '').toLowerCase()}">${item.score || '未评'}</span>
        </div>
        <p>${contentPreview(item.content || item.summary, 90)}</p>
        <div class="idea-meta">
          <span>${item.category || '待分类'}</span>
          <span>${workFormat(item)}</span>
          <span>互动 ${formatNumber(workInteractions(item))}</span>
          <span>评论 ${formatNumber(workCommentCount(item))}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function workTableHtml(items) {
  return `
    <div class="work-table" role="table" aria-label="作品数据表格">
      <div class="work-table-row head" role="row">
        <span>序号</span><span>标题</span><span>形式</span><span>分类</span><span>赞</span><span>藏</span><span>评</span><span>转</span><span>互动</span><span>发布时间</span>
      </div>
      ${items.map((item) => `
        <button class="work-table-row ${item.id === state.activeWorkId ? 'selected' : ''}" data-work-id="${item.id}" type="button" role="row" aria-label="查看${item.title}">
          <span>${item.index || item.profileOrder || '-'}</span>
          <strong>${item.title}</strong>
          <span>${workFormat(item)}</span>
          <span>${item.category || '待分类'}</span>
          <span>${formatNumber(workLiked(item))}</span>
          <span>${formatNumber(workCollected(item))}</span>
          <span>${formatNumber(workCommentCount(item))}</span>
          <span>${formatNumber(workShared(item))}</span>
          <span>${formatNumber(workInteractions(item))}</span>
          <span>${workDate(item) || '待补'}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function workRankingHtml(items) {
  return items.map((item, index) => `
    <article class="work-ranking-row ${item.id === state.activeWorkId ? 'selected' : ''}" data-work-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.title}">
      <div class="ranking-number">${index + 1}</div>
      <div>
        <div class="work-row-top">
          <strong>${item.title}</strong>
          <span class="score-pill ${String(item.score || '').toLowerCase()}">${item.score || '未评'}</span>
        </div>
        <p>${item.operationInsight || item.nextTopicDirection || contentPreview(item.content || item.summary, 86)}</p>
        <div class="idea-meta">
          <span>${item.category || '待分类'}</span>
          <span>${workFormat(item)}</span>
          <span>赞 ${formatNumber(workLiked(item))}</span>
          <span>藏 ${formatNumber(workCollected(item))}</span>
          <span>评 ${formatNumber(workCommentCount(item))}</span>
          <span>总互动 ${formatNumber(workInteractions(item))}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function renderWorkList(items) {
  const target = $('#workList');
  if (!target) return;
  target.className = `work-list ${state.workLayout || 'cards'}-mode`;
  if (!items.length) {
    target.innerHTML = '<p class="empty-text">没有匹配作品，可以换一个关键词或筛选条件。</p>';
    return;
  }
  if (state.workLayout === 'timeline') {
    target.innerHTML = workTimelineHtml(items);
    return;
  }
  if (state.workLayout === 'table') {
    target.innerHTML = workTableHtml(items);
    return;
  }
  if (state.workLayout === 'ranking') {
    target.innerHTML = workRankingHtml(items);
    return;
  }
  target.innerHTML = items.map(workCardHtml).join('');
}

function renderWorks() {
  const works = state.xhsWorks || [];
  const target = $('#workList');
  if (!target) return;

  $('#workCount').textContent = works.length || 0;
  renderWorkViewTabs(works);
  renderLibraryFilters(works);

  const categories = ['全部', ...new Set(works.map((item) => item.category).filter(Boolean))];
  const current = $('#workCategoryFilter').value || state.workCategory;
  $('#workCategoryFilter').innerHTML = categories.map((item) => `<option ${item === current ? 'selected' : ''}>${item}</option>`).join('');
  $('#workSortFilter').value = state.workSort;

  const keyword = state.workKeyword.trim().toLowerCase();
  const filtered = sortWorks(works.filter((item) => {
    const text = String(item.searchText || JSON.stringify({
      title: item.title,
      category: item.category,
      audience: item.audience,
      businessGoal: item.businessGoal,
      emotionHook: item.emotionHook,
      content: item.content,
      summary: item.summary,
      tags: item.tags,
      commentSummary: item.commentSummary,
      comments: item.comments,
      nextTopicDirection: item.nextTopicDirection
    }));
    const normalized = text.toLowerCase();
    const matchKeyword = !keyword || normalized.includes(keyword);
    const matchCategory = state.workCategory === '全部' || item.category === state.workCategory;
    const matchFormat = state.workFormat === '全部' || workFormat(item) === state.workFormat;
    return Boolean(normalized) && matchKeyword && matchCategory && matchFormat && workMatchesEngagement(item) && workMatchesView(item);
  }));

  const selected = filtered.find((item) => item.id === state.activeWorkId) || filtered[0] || works[0];
  if (selected) state.activeWorkId = selected.id;

  // 指标栏已移除：所有作品已直接展示在页面上，数字汇总无额外信息量
  $('#workResultCount').textContent = `${selectedWorkViewLabel()}：${filtered.length}条`;
  renderWorkList(filtered);

  if (selected) {
    renderWorkDetail(selected);
    $('.library-console')?.classList.add('with-detail');
  }
}

function renderWorkDetail(item) {
  const detail = $('#workDetail');
  if (!detail) return;
  $('#openWorkLink').href = item.url || '#';
  const content = item.content || item.description || '';
  const tagText = (item.tags || []).join(' ');
  const commentItems = item.comments?.items || [];
  const commentBuckets = Object.entries(item.commentSummary?.demandBuckets || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `<span>${name} ${count}</span>`)
    .join('');
  const commentHtml = commentItems.length
    ? commentItems.slice(0, 30).map((comment) => `
      <article class="comment-item ${comment.isReply ? 'reply' : ''}">
        <div>
          <strong>${comment.author || '匿名用户'}</strong>
          <span>${comment.isReply ? `回复 ${comment.replyTo || '上级评论'}` : '一级评论'} / ${comment.time || '时间待补'}</span>
        </div>
        <p>${comment.text || ''}</p>
      </article>
    `).join('')
    : '<p class="empty-text">暂无公开评论，或当前页面没有返回可见评论。</p>';
  detail.innerHTML = `
    <div class="detail-kicker">#${item.index || item.profileOrder || '-'}｜${item.category || '待分类'}｜${item.score || '未评分'}</div>
    <h3>${item.title}</h3>
    <div class="work-detail-meta">
      <span>发布时间：${workDate(item) || '待补'}</span>
      <span>互动：${formatNumber(workInteractions(item))}</span>
      <span>赞/藏/评/转：${formatNumber(workLiked(item))} / ${formatNumber(workCollected(item))} / ${formatNumber(workCommented(item))} / ${formatNumber(workShared(item))}</span>
      <span>公开评论：${formatNumber(workCommentCount(item))}</span>
      <span>形式：${workFormat(item)}</span>
      <span>平台类型：${item.noteType || item.xhs_note_type || item.type || '待补'}</span>
      <span>数据质量：${workDetailStatus(item)}</span>
      <span>更新时间：${item.dataQuality?.lastCrawledAt ? new Date(item.dataQuality.lastCrawledAt).toLocaleString('zh-CN') : '待补'}</span>
    </div>
    <div class="work-insight-grid">
      <div><span>目标人群</span><strong>${item.audience || '待判断'}</strong></div>
      <div><span>业务目标</span><strong>${item.businessGoal || '待判断'}</strong></div>
      <div><span>情绪抓手</span><strong>${item.emotionHook || '待判断'}</strong></div>
      <div><span>评论需求</span><strong>${item.commentSummary?.topDemand || '暂无明显评论需求'}</strong></div>
    </div>
    <div class="variant-box">
      <strong>运营判断</strong>
      <p>${item.operationInsight || '待补判断'}</p>
      <strong>下一步选题方向</strong>
      <p>${item.nextTopicDirection || '待补方向'}</p>
    </div>
    <div class="variant-box reverse-review">
      <strong>反向复盘</strong>
      <div class="idea-meta">
        ${workNegativeTags(item).map((tag) => `<span class="negative-tag">${tag}</span>`).join('') || '<span>暂无明显负向标签</span>'}
      </div>
      <ol>
        ${workReverseReview(item).map((hint) => `<li>${hint}</li>`).join('')}
      </ol>
    </div>
    <div class="idea-meta comment-buckets">
      ${commentBuckets || '<span>评论需求待积累</span>'}
    </div>
    <div class="work-body">
      <strong>正文</strong>
      <p>${content ? content.replace(/\n/g, '<br>') : '正文待补。可以使用 OpenCLI 或手动复制公开详情页补充。'}</p>
    </div>
    <div class="work-body comments-box">
      <strong>公开评论</strong>
      <div class="comment-list">${commentHtml}</div>
    </div>
    <div class="variant-box">
      <strong>复盘提示</strong>
      <ol>
        <li>先看标题是否有明确人群、场景或情绪入口。</li>
        <li>再看评论是否出现报名、价格、地点、适配疑虑或合作线索。</li>
        <li>最后决定这条内容应该复写、投流、做直播FAQ，还是只作为素材沉淀。</li>
      </ol>
    </div>
    <form class="manual-detail-form" id="manualDetailForm">
      <strong>手动补充详情</strong>
      <input type="hidden" name="id" value="${item.id || ''}">
      <input type="hidden" name="title" value="${(item.title || '').replace(/"/g, '&quot;')}">
      <input type="hidden" name="url" value="${item.url || ''}">
      <label>
        发布时间
        <input name="publishDate" type="text" placeholder="例如 2026-05-18" value="${workDate(item) || ''}">
      </label>
      <label>
        正文
        <textarea name="content" placeholder="从已登录的 Safari 小红书详情页复制正文后粘贴到这里">${content || item.summary || ''}</textarea>
      </label>
      <label>
        话题标签
        <input name="tags" type="text" placeholder="例如 #职场 #个人成长" value="${tagText}">
      </label>
      <button class="primary" type="submit" aria-label="保存手动补充的小红书详情">保存到作品库</button>
    </form>
    <form class="manual-detail-form" id="workMetaForm">
      <strong>手动修正分类/评分/运营判断</strong>
      <p class="section-note" style="margin:0 0 4px;font-size:12px;color:var(--muted)">这些编辑保存在本地覆盖层，不会被下次 xhs:summary 重建冲掉。</p>
      <input type="hidden" name="id" value="${item.id || ''}">
      <div class="form-row">
        <label>
          分类
          <select name="category">
            <option value="">保持原值</option>
            ${['问题解决','教程清单','案例故事','行业观察','幕后流程','问答','产品介绍','品牌内容'].map(c => `<option ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label>
          评分
          <select name="score">
            <option value="">保持原值</option>
            <option value="S" ${item.score === 'S' ? 'selected' : ''}>S 级</option>
            <option value="A" ${item.score === 'A' ? 'selected' : ''}>A 级</option>
            <option value="B" ${item.score === 'B' ? 'selected' : ''}>B 级</option>
            <option value="C" ${item.score === 'C' ? 'selected' : ''}>C 级</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>
          目标人群
          <input name="audience" type="text" placeholder="${item.audience || '待判断'}">
        </label>
        <label>
          业务目标
          <input name="businessGoal" type="text" placeholder="${item.businessGoal || '待判断'}">
        </label>
      </div>
      <label>
        情绪抓手
        <input name="emotionHook" type="text" placeholder="${item.emotionHook || '待判断'}">
      </label>
      <label>
        运营判断
        <textarea name="operationInsight" rows="2" placeholder="${item.operationInsight || '待补判断'}"></textarea>
      </label>
      <label>
        下一步选题方向
        <input name="nextTopicDirection" type="text" placeholder="${item.nextTopicDirection || '待补方向'}">
      </label>
      <button class="primary" type="submit" aria-label="保存手动修正">保存修正</button>
    </form>
    <div class="idea-meta">
      ${(item.tags || []).map((tag) => `<span>${tag}</span>`).join('')}
    </div>
  `;
}

function renderHotLab() {
  $('#hotNavCount').textContent = contentIdeas().length;
  const categories = ['全部', ...taxonomyNames('categories')];
  $('#categoryChips').innerHTML = categories.map((name) => {
    var count = name === '全部' ? contentIdeas().length : contentIdeas().filter(function(i){return i.line===name}).length;
    return '<button class="chip ' + (state.activeCategory === name ? 'active' : '') + '" data-category="' + name + '" type="button">' + name + '<em>' + count + '</em></button>';
  }).join('');

  const topics = [{ name: '全部', count: contentIdeas().length + (state.xhsWorks?.length || 0) }, ...taxonomyItems('topics').map((item) => ({
    ...item,
    count: topicCount(item.name)
  }))];
  $('#topicChips').innerHTML = topics.map((item) => `
    <button class="chip ${state.activeTopic === item.name ? 'active' : ''}" data-topic="${item.name}" type="button">${item.name}<em>${item.count}</em></button>
  `).join('');

  const audiences = ['全部', ...contentAudienceSegments().map((item) => item.name)];
  $('#audienceChips').innerHTML = audiences.map((name) => {
    var count = name === '全部' ? contentIdeas().length : contentIdeas().filter(function(i){ return itemMatchesAudienceByChip(i, name); }).length;
    return '<button class="chip ' + (state.activeAudience === name ? 'active' : '') + '" data-audience="' + name + '" type="button">' + name + '<em>' + count + '</em></button>';
  }).join('');

  const models = ['全部', ...allModelTypes()];
  $('#modelTypeChips').innerHTML = models.map((name) => {
    const count = name === '全部' ? contentIdeas().length : contentIdeas().filter((item) => matchModelForIdea(item) === name).length;
    return `<button class="chip muted ${state.activeModelType === name ? 'active' : ''}" data-model-type="${name}" type="button">${name}<em>${count}</em></button>`;
  }).join('');

  $$('.asset-tab').forEach((item) => item.classList.toggle('active', item.dataset.assetTab === state.activeAssetTab));
  renderActiveLab();
}

const taxonomyLabels = {
  categories: '领域',
  topics: '话题',
  audiences: '受众'
};

function renderSettingsGroupTabs(groups, view) {
  const target = $('#settingsGroupTabs');
  if (!target || !groups.length) return;
  target.innerHTML = groups.map((group) => `
    <button class="settings-group-tab ${state.activeTaxonomyGroup === group.key ? 'active' : ''}" data-settings-group="${group.key}" data-settings-view="${view}" type="button">${escapeHtml(group.label || group.key)}</button>
  `).join('');
  target.style.display = groups.length > 1 ? 'flex' : 'none';
}

function renderTaxonomyManager() {
  const group = state.activeTaxonomyGroup;
  // models 从页面设置读取
  const isPageSetting = group === 'models';
  const pageSettings = state.data?.pageSettings || {};
  const hotPage = pageSettings.hot;
  const modelsGroup = hotPage?.groups?.find((g) => g.key === group);
  const items = isPageSetting
    ? (modelsGroup?.items || []).map((item) => (typeof item === 'string' ? { name: item, words: [] } : item))
    : taxonomyItems(group);
  $('#taxonomyModalTitle').textContent = `管理${taxonomyLabels[group] || '分类'}`;
  $('#taxonomyGroup').value = group;
  $('#taxonomyName').value = '';
  $('#taxonomyWords').value = '';
  $('#taxonomyWordsWrap').hidden = group === 'categories';
  $('#taxonomyList').innerHTML = items.map((item) => `
    <article class="taxonomy-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${group === 'categories' ? '内容领域筛选项' : escapeHtml((item.words || []).join('，') || '未设置匹配词')}</span>
      </div>
      <button type="button" data-delete-taxonomy="${group}" data-taxonomy-name="${escapeHtml(item.name)}" aria-label="删除${escapeHtml(item.name)}">删除</button>
    </article>
  `).join('') || '<p class="empty-text">暂无项目，可以先新增一个。</p>';
}

function openTaxonomyManager(group) {
  state.activeTaxonomyGroup = group;
  renderTaxonomyManager();
  $('#taxonomyModal').hidden = false;
  $('#taxonomyName').focus();
}

function closeTaxonomyManager() {
  $('#taxonomyModal').hidden = true;
}

async function patchTaxonomy(payload) {
  const result = await api('/api/hot-content-taxonomy', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  if (!result.ok) {
    toast(result.error || '分类保存失败');
    return false;
  }
  state.data.hotContentLab.taxonomy = result.taxonomy;
  state.data.hotContentLab.categories = result.taxonomy.categories.map((item) => item.name);
  state.data.hotContentLab.filters = result.taxonomy.topics.map((item) => ({
    name: item.name,
    count: topicCount(item.name)
  }));
  if (result.updatedAt) {
    state.data.meta.updatedAt = result.updatedAt;
    $('#syncTime').textContent = `更新时间 ${state.data.meta.updatedAt}`;
  }
  if (!taxonomyNames('categories').includes(state.activeCategory)) state.activeCategory = '全部';
  if (!taxonomyNames('topics').includes(state.activeTopic)) state.activeTopic = '全部';
  if (!taxonomyNames('audiences').includes(state.activeAudience)) state.activeAudience = '全部';
  renderHotLab();
  renderTaxonomyManager();
  return true;
}

function contentIdeas() {
  return state.data.hotContentLab.ideas || [];
}

function taxonomyItems(group) {
  const taxonomy = state.data.hotContentLab.taxonomy || {};
  return Array.isArray(taxonomy[group]) ? taxonomy[group] : [];
}

function taxonomyNames(group) {
  return taxonomyItems(group).map((item) => item.name || item).filter(Boolean);
}

function topicCount(name) {
  const legacyCount = (state.data.hotContentLab.filters || []).find((item) => item.name === name)?.count;
  if (Number(legacyCount)) return Number(legacyCount);
  const ideas = contentIdeas().filter((item) => ideaMatchesTopic({
    title: item.title,
    line: item.line,
    pain: item.pain,
    hook: item.hook,
    audience: item.audience,
    product: item.product,
    sourceHint: item.sourceHint,
    topicTags: item.topicTags || []
  }, name)).length;
  const works = (state.xhsWorks || []).filter((item) => ideaMatchesTopic({
    title: item.title,
    line: item.category,
    pain: item.content,
    hook: item.emotionHook,
    audience: item.audience,
    product: item.businessGoal,
    sourceHint: item.searchText,
    topicTags: item.topicTags || []
  }, name)).length;
  return ideas + works;
}

// 模型→选题 line 自动匹配规则
const modelLineMap = {
  '痛点共鸣': ['问题解决', '用户故事'],
  '误区清单': ['问题解决', '教程清单'],
  '路径拆解': ['案例故事', '教程清单'],
  '场景方案': ['产品介绍', '案例故事'],
  '客户问题诊断': ['行业观察', '问题解决'],
  '过程幕后': ['幕后流程', '案例故事'],
  '轻量练习': ['教程清单', '问题解决'],
  '节点预热': ['品牌内容', '行业观察']
};

const modelKeywordMap = {
  '痛点共鸣': ['问题', '焦虑', '困难', '为什么', '不想', '担心'],
  '误区清单': ['第一次', '误解', '误区', '不是', '别', '不要', '注意'],
  '路径拆解': ['步骤', '路径', '入门', '成长', '学习', '能力'],
  '场景方案': ['场景', '方案', '活动', '服务', '产品'],
  '客户问题诊断': ['客户', '企业', '团队', '合作', '采购', '需求'],
  '过程幕后': ['复盘', '标准', '流程', '反馈', '检查'],
  '轻量练习': ['练习', '秒', '收藏', '试试', '方法', '技巧'],
  '节点预热': ['发布', '活动', '节点', '数据', '更新']
};

function matchModelForIdea(idea) {
  const line = idea.line || idea.category || '';
  const text = JSON.stringify(idea).toLowerCase();
  let bestModel = null;
  let bestScore = 0;

  Object.entries(modelLineMap).forEach(([model, lines]) => {
    let score = 0;
    // line 直接匹配 +3
    if (lines.includes(line)) score += 3;
    // 关键词匹配 +1
    const keywords = modelKeywordMap[model] || [];
    keywords.forEach((kw) => { if (text.includes(kw.toLowerCase())) score += 1; });
    if (score > bestScore) { bestScore = score; bestModel = model; }
  });

  return bestModel || '痛点共鸣'; // 兜底
}

function allModelTypes() {
  const builtIn = Object.keys(modelLineMap);
  const pageSettings = state.data?.pageSettings || {};
  const hotPage = pageSettings.hot;
  const modelsGroup = hotPage?.groups?.find((g) => g.key === 'models');
  const customModels = (modelsGroup?.items || []).map((item) => item.name || item).filter(Boolean);
  // 合并去重，自定义排前面
  return [...new Set([...customModels, ...builtIn])];
}

function getModelByName(name) {
  return externalViralModels().find((m) => m.type === name);
}

function contentAudienceSegments() {
  return taxonomyItems('audiences');
}

function itemMatchesAudienceByChip(item, chipName) {
  if (chipName === '全部') return true;
  var seg = contentAudienceSegments().find(function(e){return e.name===chipName});
  if (!seg) return true;
  var haystack = JSON.stringify(item).toLowerCase();
  return seg.words.some(function(w){return haystack.includes(w.toLowerCase())});
}

function itemMatchesAudience(item) {
  if (state.activeAudience === '全部') return true;
  const segment = contentAudienceSegments().find((entry) => entry.name === state.activeAudience);
  if (!segment) return true;
  const haystack = JSON.stringify(item).toLowerCase();
  return segment.words.some((word) => haystack.includes(word.toLowerCase()));
}

function ideaMatchesTopic(item, topicName = state.activeTopic) {
  if (topicName === '全部') return true;
  const haystack = JSON.stringify(item).toLowerCase();
  const topic = topicName.toLowerCase();
  const words = taxonomyItems('topics').find((entry) => entry.name === topicName)?.words || [];
  return haystack.includes(topic) || words.some((word) => haystack.includes(String(word).toLowerCase()));
}

function ideaMatchesFilters(item) {
  const keyword = state.ideaKeyword.trim().toLowerCase();
  const text = JSON.stringify(item).toLowerCase();
  const matchCategory = state.activeCategory === '全部' || item.line === state.activeCategory || item.category === state.activeCategory;
  const matchKeyword = !keyword || text.includes(keyword);
  const matchModel = state.activeModelType === '全部' || matchModelForIdea(item) === state.activeModelType;
  return matchCategory && matchKeyword && ideaMatchesTopic(item) && itemMatchesAudience(item) && matchModel;
}

function filteredIdeas() {
  return contentIdeas().filter(ideaMatchesFilters).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

// 作品 category → 标准领域映射
const workCategoryToLine = {
  '图文': '问题解决',
  '视频': '案例故事',
  '直播切片': '问答',
  '教程': '教程清单',
  '案例': '案例故事',
  '观察': '行业观察'
};

function deriveWorkLine(item) {
  return workCategoryToLine[item.category] || item.category || '轻练习/科普';
}

function deriveWorkModel(item) {
  // 把作品包装成类选题结构，复用模型匹配
  return matchModelForIdea({
    title: item.title,
    line: deriveWorkLine(item),
    contentDirection: item.category,
    hook: item.emotionHook || '',
    audience: item.audience || '',
    pain: (item.content || '').slice(0, 60),
    product: item.businessGoal || ''
  });
}

function xhsWorkMatchesLab(item) {
  const keyword = state.ideaKeyword.trim().toLowerCase();
  const text = String(item.searchText || JSON.stringify(item)).toLowerCase();
  const workLine = deriveWorkLine(item);

  const categoryOk = state.activeCategory === '全部' || workLine === state.activeCategory;
  const topicOk = state.activeTopic === '全部' || ideaMatchesTopic({
    title: item.title,
    line: workLine,
    pain: item.content,
    hook: item.emotionHook,
    audience: item.audience,
    product: item.businessGoal,
    sourceHint: item.searchText
  });
  const audienceOk = itemMatchesAudience(item);
  const modelOk = state.activeModelType === '全部' || deriveWorkModel(item) === state.activeModelType;
  const keywordOk = !keyword || text.includes(keyword);
  return categoryOk && topicOk && keywordOk && audienceOk && modelOk;
}

function filteredXhsHotWorks() {
  return (state.xhsWorks || [])
    .filter(xhsWorkMatchesLab)
    .sort((a, b) => workInteractions(b) - workInteractions(a) || workCommentCount(b) - workCommentCount(a))
    .slice(0, 24);
}

function externalViralModels() {
  return state.data.hotContentLab.externalModels || [];
}

function externalModelMatchesFilters(item) {
  const keyword = state.ideaKeyword.trim().toLowerCase();
  const text = JSON.stringify(item).toLowerCase();
  const matchCategory = state.activeCategory === '全部' || item.line === state.activeCategory;
  const matchKeyword = !keyword || text.includes(keyword);
  const matchTopic = state.activeTopic === '全部' || (item.topicTags || []).includes(state.activeTopic) || ideaMatchesTopic(item);
  const matchAudience = itemMatchesAudience(item);
  return matchCategory && matchKeyword && matchTopic && matchAudience;
}

function filteredExternalModels() {
  return externalViralModels().filter(externalModelMatchesFilters).sort((a, b) => b.score - a.score);
}

function assetMatchesFilters(item) {
  const keyword = state.ideaKeyword.trim().toLowerCase();
  const text = JSON.stringify(item).toLowerCase();
  const matchCategory = state.activeCategory === '全部' || text.includes(state.activeCategory.toLowerCase());
  const matchKeyword = !keyword || text.includes(keyword);
  const matchTopic = state.activeTopic === '全部' || ideaMatchesTopic({ title: item.title, line: item.line, pain: item.use, sourceHint: item.next });
  const matchAudience = itemMatchesAudience(item);
  return matchCategory && matchKeyword && matchTopic && matchAudience;
}

function filteredContentAssets() {
  return (state.contentAssets || []).filter(assetMatchesFilters);
}

function setLabHeading(title, meta, detailTitle = '选题拆解') {
  $('#labResultTitle').textContent = title;
  $('#labResultMeta').textContent = meta;
  $('#labDetailTitle').textContent = detailTitle;
}

function renderActiveLab() {
  const placeholders = { ideas: '标题 / 人群 / 痛点 / 产品', account: '标题 / 内容 / 评论', library: '', dashboard: '' };
  const search = $('#ideaSearch');
  if (search) search.placeholder = placeholders[state.activeAssetTab] || '搜索';

  // 图书馆和数据看板不需要选题筛选器
  const hideFilters = state.activeAssetTab === 'library' || state.activeAssetTab === 'dashboard';
  const toolbar = $('.lab-toolbar');
  const midRow = $('#labMidRow');
  if (toolbar) toolbar.style.display = hideFilters ? 'none' : '';
  if (midRow) midRow.style.display = hideFilters ? 'none' : '';

  if (state.activeAssetTab === 'account') {
    renderAccountHighWorks();
    return;
  }
  if (state.activeAssetTab === 'dashboard') {
    renderLabDashboard();
    return;
  }
  if (state.activeAssetTab === 'library') {
    renderBookLibrary();
    return;
  }
  if (state.activeAssetTab === 'competitor') {
    renderCompetitorInLab();
    return;
  }
  renderIdeas();
  renderAssetPreview('本地资产库概览');
}

function renderIdeas() {
  const ideas = filteredIdeas();
  const selected = ideas.find((item) => item.id === state.activeIdeaId) || ideas[0];
  if (selected) state.activeIdeaId = selected.id;

  setLabHeading(`选题工作台：${ideas.length}条`, '', '选题拆解');
  $('#ideaGrid').innerHTML = ideas.map((item) => {
    const model = matchModelForIdea(item);
    const modelData = getModelByName(model);
    return `
    <article class="idea-card ${state.activeIdeaId === item.id ? 'selected' : ''}" data-idea-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.title}选题详情">
      <div class="score-ring">${item.score}</div>
      <span class="model-tag" data-model-tag="${escapeHtml(model)}" title="${escapeHtml(modelData?.hook || '')}">${escapeHtml(model)}</span>
      <div class="idea-kicker">${item.contentDirection || item.line}</div>
      <h3>${item.title}</h3>
      <p>${item.hook}</p>
      <small>${item.pain || ''}</small>
      <div class="idea-brief">
        <span><strong>素材</strong>${item.materialNeeds || '待补素材清单'}</span>
        <span><strong>转化</strong>${item.conversionGoal || item.cta || '待确认转化目标'}</span>
      </div>
      ${item.diffAnchor ? '<div class="idea-diff">' + escapeHtml(item.diffAnchor) + '</div>' : ''}
      <div class="idea-meta">
        <span>${item.line}</span>
        <span>${item.audience}</span>
        <span>${item.product}</span>
        <span>${item.status}</span>
        <span>评分 ${item.score}</span>
      </div>
    </article>
  `; }).join('') || '<p class="empty-text">没有匹配选题，可以换一个关键词或分类。</p>';

  if (selected) {
    renderIdeaDetail(selected);
  } else {
    $('#ideaDetail').textContent = '点击选题查看写法模板和内容拆解。';
  }
}

function titleVariants(item) {
  return [
    `${item.title}`,
    `${item.audience}最容易忽略的一个问题：${item.hook}`,
    `不是${item.product}难做，是你还没抓住这个痛点`,
    `如果你也在想“${item.pain?.slice(0, 18) || item.hook}”，可以先看这条`
  ];
}

function renderIdeaDetail(item) {
  const model = matchModelForIdea(item);
  const modelData = getModelByName(model);
  const modelHtml = modelData ? `
    <div class="model-formula-box">
      <div class="model-formula-head">
        <span class="model-badge">${escapeHtml(modelData.type)}</span>
        <span>写法模板</span>
      </div>
      <p class="model-hook">${escapeHtml(modelData.hook)}</p>
      <div class="model-structure">
        <strong>内容结构</strong>
        <p>${escapeHtml(modelData.structure)}</p>
      </div>
      <div class="variant-box">
        <strong>标题模型</strong>
        <ol>
          ${modelData.titleModels.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
        </ol>
      </div>
      <div class="model-adapt">
        <span>🔧 ${escapeHtml(modelData.adapt)}</span>
      </div>
      <div class="model-risk">
        <span>⚠️ ${escapeHtml(modelData.risk)}</span>
      </div>
    </div>
  ` : '';

  $('#ideaDetail').innerHTML = `
    ${modelHtml}
    <div class="detail-kicker" style="margin-top:14px">${item.id}${item.sourceRecordId ? `｜${item.sourceRecordId}` : ''}｜${item.line}｜评分 ${item.score}</div>
    <h3>${escapeHtml(item.title)}</h3>
    <div class="detail-grid">
      <p><strong>内容方向：</strong>${escapeHtml(item.contentDirection || item.line)}</p>
      <p><strong>目标人群：</strong>${escapeHtml(item.audience || '待确认')}</p>
      <p><strong>平台：</strong>${escapeHtml(item.platform || '小红书/视频号')}</p>
      <p><strong>排期：</strong>${escapeHtml(item.publishPlan || '待排期')}</p>
    </div>
    <p><strong>情绪钩子：</strong>${escapeHtml(item.hook)}</p>
    <p><strong>真实痛点：</strong>${escapeHtml(item.pain || '待补')}</p>
    <p><strong>情绪节奏：</strong>${escapeHtml(item.emotion || '待补')}</p>
    <p><strong>素材需求：</strong>${escapeHtml(item.materialNeeds || '待补素材清单')}</p>
    <p><strong>转化目标：</strong>${escapeHtml(item.conversionGoal || item.cta || '待确认转化目标')}</p>
    <p><strong>业务承接：</strong>${escapeHtml(item.product || '')} / ${escapeHtml(item.cta || '')}</p>
    ${item.diffAnchor ? '<div class="variant-box" style="background:#f0f5ee;border-color:#c5d8b5"><strong>差异锚点</strong><p>' + escapeHtml(item.diffAnchor) + '</p></div>' : ''}
    <p><strong>授权状态：</strong>${escapeHtml(item.authorization || '待确认')}</p>
    <p><strong>下一步动作：</strong>${escapeHtml(item.nextAction || '先补素材和转化入口，再写脚本。')}</p>
    <p><strong>来源提示：</strong>${escapeHtml(item.sourceHint || state.data.hotContentLab.source)}</p>
    <form class="manual-detail-form" id="ideaEditForm" style="margin-top:14px">
      <strong>编辑选题</strong>
      <input type="hidden" name="id" value="${escapeHtml(item.id)}">
      <label>标题<input name="title" type="text" value="${escapeHtml(item.title)}"></label>
      <div class="form-row">
        <label>领域<select name="line">${['问题解决','教程清单','案例故事','行业观察','幕后流程','问答','产品介绍','品牌内容'].map(l => `<option ${item.line===l?'selected':''}>${l}</option>`).join('')}</select></label>
        <label>评分<select name="score">${['','95','92','90','89','88','87','86','84','82'].map(s => `<option value="${s}" ${String(item.score)===s?'selected':''}>${s||'不变'}</option>`).join('')}</select></label>
      </div>
      <label>目标人群<input name="audience" type="text" value="${escapeHtml(item.audience || '')}" placeholder="深圳白领/女性用户"></label>
      <label>情绪钩子<input name="hook" type="text" value="${escapeHtml(item.hook || '')}"></label>
      <label>真实痛点<input name="pain" type="text" value="${escapeHtml(item.pain || '')}"></label>
      <label>素材需求<input name="materialNeeds" type="text" value="${escapeHtml(item.materialNeeds || '')}"></label>
      <label>转化目标<input name="conversionGoal" type="text" value="${escapeHtml(item.conversionGoal || item.cta || '')}"></label>
      <label>差异锚点<input name="diffAnchor" type="text" value="${escapeHtml(item.diffAnchor || '')}" placeholder="我们vs普通方案的核心差异"></label>
      <label>下一步动作<input name="nextAction" type="text" value="${escapeHtml(item.nextAction || '')}"></label>
      <button class="primary" type="submit">保存修改</button>
    </form>
  `;
}

function renderExternalModels() {
  const models = filteredExternalModels();
  const selected = models.find((item) => item.id === state.activeLabItemId) || models[0];
  if (selected) state.activeLabItemId = selected.id;
  setLabHeading(`外部爆款模型：${models.length}类`, '这里沉淀网上常见高传播内容模型；后续可继续补具体外部链接和对标账号。', '模型拆解');
  $('#ideaGrid').innerHTML = models.map((item) => `
    <article class="idea-card ${state.activeLabItemId === item.id ? 'selected' : ''}" data-external-model-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.type}模型">
      <div class="score-ring">${item.score}</div>
      <h3>${item.type}</h3>
      <p>${item.title}</p>
      <small>${item.hook}</small>
      <div class="idea-meta">
        <span>${item.line}</span>
        <span>${item.audience}</span>
        <span>${item.topicTags.join(' / ')}</span>
      </div>
    </article>
  `).join('') || '<p class="empty-text">当前筛选下没有外部模型。可以清空关键词或切回全部话题。</p>';
  if (selected) renderExternalModelDetail(selected);
}

function renderExternalModelDetail(item) {
  $('#ideaDetail').innerHTML = `
    <div class="detail-kicker">${item.id}｜${item.type}｜评分 ${item.score}</div>
    <h3>${item.title}</h3>
    <p><strong>适合人群：</strong>${item.audience}</p>
    <p><strong>爆点逻辑：</strong>${item.hook}</p>
    <p><strong>内容结构：</strong>${item.structure}</p>
    <p><strong>适配示例品牌：</strong>${item.adapt}</p>
    <p><strong>表达边界：</strong>${item.risk}</p>
    <div class="variant-box">
      <strong>标题模型</strong>
      <ol>
        ${item.titleModels.map((title) => `<li>${title}</li>`).join('')}
      </ol>
    </div>
    <div class="variant-box">
      <strong>面谈表达</strong>
      <p>这类模型不是直接照搬，而是说明用户更容易被具体痛点、明确场景、低门槛动作和清晰承接打动。使用时应替换为自己的业务素材并核对事实。</p>
    </div>
  `;
}

function renderAccountHighWorks() {
  const works = filteredXhsHotWorks();
  const selected = works.find((item) => item.id === state.activeLabItemId) || works[0];
  if (selected) state.activeLabItemId = selected.id;
  setLabHeading(`本账号高互动：${works.length}条`, '', '账号内样本');
  $('#ideaGrid').innerHTML = works.map((item) => {
    const workLine = deriveWorkLine(item);
    const workModel = deriveWorkModel(item);
    return `
    <article class="idea-card ${state.activeLabItemId === item.id ? 'selected' : ''}" data-lab-work-id="${item.id}" tabindex="0" role="button" aria-label="查看${item.title}账号内样本">
      <div class="score-ring">${item.score || '样'}</div>
      <span class="model-tag">${escapeHtml(workModel)}</span>
      <div class="idea-kicker">${escapeHtml(workLine)}</div>
      <h3>${item.title}</h3>
      <p>${item.operationInsight || item.emotionHook || '待补运营判断'}</p>
      <small>${contentPreview(item.content, 96)}</small>
      <div class="idea-meta">
        <span>${item.category || '待分类'}</span>
        <span>互动 ${formatNumber(workInteractions(item))}</span>
        <span>评论 ${formatNumber(workCommentCount(item))}</span>
        <span>${item.commentSummary?.topDemand || '评论待看'}</span>
      </div>
    </article>
  `; }).join('') || '<p class="empty-text">当前筛选下没有本账号高互动样本。可以清空关键词或切回全部话题。</p>';
  if (selected) renderAccountWorkDetail(selected);
}

function renderAccountWorkDetail(item) {
  const workLine = deriveWorkLine(item);
  const workModel = deriveWorkModel(item);
  const modelData = getModelByName(workModel);
  const modelHtml = modelData ? `
    <div class="model-formula-box" style="margin-bottom:12px">
      <div class="model-formula-head">
        <span class="model-badge">${escapeHtml(workModel)}</span>
        <span>推荐写法模板</span>
      </div>
      <div class="model-structure">
        <strong>内容结构</strong>
        <p>${escapeHtml(modelData.structure)}</p>
      </div>
      <div class="model-adapt"><span>🔧 ${escapeHtml(modelData.adapt)}</span></div>
    </div>
  ` : '';

  $('#ideaDetail').innerHTML = `
    ${modelHtml}
    <div class="detail-kicker">本账号样本｜${escapeHtml(workLine)}｜${escapeHtml(item.category || '待分类')}｜互动 ${formatNumber(workInteractions(item))}</div>
    <h3>${escapeHtml(item.title)}</h3>
    <p><strong>为什么值得拆：</strong>${escapeHtml(item.operationInsight || '互动或评论表现较好，适合作为复写参考。')}</p>
    <p><strong>目标人群：</strong>${escapeHtml(item.audience || '待判断')}</p>
    <p><strong>情绪抓手：</strong>${escapeHtml(item.emotionHook || '待判断')}</p>
    <p><strong>评论需求：</strong>${escapeHtml(item.commentSummary?.topDemand || '暂无明显评论需求')}</p>
    <p><strong>下一步方向：</strong>${escapeHtml(item.nextTopicDirection || '待补方向')}</p>
    <div class="variant-box">
      <strong>账号内复盘结论</strong>
      <ol>
        <li>这不是全平台爆款，只代表在示例账号里相对有效。</li>
        <li>优先复盘标题、封面、评论区需求和是否能承接报名/咨询。</li>
        <li>如果要放大，需要结合外部爆款模型重新改写。</li>
      </ol>
    </div>
    <div class="work-body">
      <strong>原文摘要</strong>
      <p>${contentPreview(item.content, 420)}</p>
    </div>
  `;
}

function renderColumnDetailPanel() {
  const target = $('#labColumnDetail');
  if (!target) return;
  if (state.activeCategory === '全部') {
    target.innerHTML = '';
    $('#labMidRow')?.classList.remove('with-column');
    return;
  }
  $('#labMidRow')?.classList.add('with-column');
  const line = state.activeCategory;
  target.innerHTML = `
    <div class="detail-kicker" style="margin-bottom:4px">${escapeHtml(line)}</div>
    <p style="color:#4e594b;line-height:1.5;font-size:12px;margin:0 0 6px">${escapeHtml(columnDescription(line))}</p>
    <div style="padding:6px 8px;border-radius:8px;background:#f3f6ee;font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:4px">
      ${escapeHtml(columnCadence(line))}
    </div>
    <div style="padding:6px 8px;border-radius:8px;background:rgba(201,144,47,0.08);font-size:11px;color:#7a5c1e;line-height:1.5">
      <strong>目标</strong> ${escapeHtml(columnGoal(line))}
    </div>
  `;
}

function columnDescription(name) {
  const map = {
    '问题解决': '从用户正在经历的问题切入，给出清晰、可执行的解决路径。',
    '教程清单': '将复杂方法拆成步骤、检查项和可复用模板。',
    '案例故事': '用真实或已授权案例展示过程、结果和可复制经验。',
    '行业观察': '记录行业变化、用户需求和可验证的判断。',
    '幕后流程': '展示项目、内容或产品背后的流程、协作和质量检查。',
    '问答': '集中处理评论、私信和客户沟通中反复出现的问题。',
    '产品介绍': '说明产品适用场景、价值、边界和使用方法。',
    '品牌内容': '稳定表达品牌价值、事实依据和长期方向。'
  };
  return map[name] || '待补栏目说明。';
}

function columnCadence(name) {
  const map = {
    '问题解决': '按用户高频问题排期，优先验证具体场景和转化动作。',
    '教程清单': '适合稳定更新，确保每条都有明确步骤和边界。',
    '案例故事': '在取得授权并核对数据后发布。',
    '行业观察': '有新事实或数据时更新，避免空泛判断。',
    '幕后流程': '项目结束后及时记录，保留版本和证据。',
    '问答': '按评论和私信频次整理，定期合并重复问题。',
    '产品介绍': '产品有明确版本或功能变化时更新。',
    '品牌内容': '作为长期栏目，保持口径一致。'
  };
  return map[name] || '按业务节奏排期。';
}

function columnGoal(name) {
  const map = {
    '问题解决': '咨询或转化',
    '教程清单': '收藏和复用',
    '案例故事': '信任和线索',
    '行业观察': '建立认知',
    '幕后流程': '证明交付能力',
    '问答': '降低决策成本',
    '产品介绍': '理解和试用',
    '品牌内容': '长期认知'
  };
  return map[name] || '待定目标';
}

function mappedWorksForLine(name) {
  return (state.xhsWorks || []).filter((item) => deriveWorkLine(item) === name);
}

function renderCreatorBoard() {
  const lines = taxonomyNames('categories').map((name) => ({
    name,
    ideaCount: contentIdeas().filter((item) => item.line === name).length,
    sampleCount: mappedWorksForLine(name).length
  }));
  setLabHeading('账号栏目管理', '把账号拆成固定栏目，避免每天临时想标题。', '栏目说明');
  $('#ideaGrid').innerHTML = lines.map((line) => `
    <article class="idea-card lab-column-card" data-lab-column="${line.name}" tabindex="0" role="button">
      <div class="score-ring">${line.ideaCount}</div>
      <h3>${line.name}</h3>
      <p>${columnDescription(line.name)}</p>
      <small>${columnCadence(line.name)}</small>
      <div class="idea-meta">
        <span>候选选题 ${line.ideaCount}</span>
        <span>样本 ${line.sampleCount}</span>
        <span>${columnGoal(line.name)}</span>
      </div>
    </article>
  `).join('');
  renderColumnDetail(lines[0]?.name || 'C端体验');
}

function renderColumnDetail(name) {
  const examples = contentIdeas().filter((item) => item.line === name).slice(0, 3);
  $('#ideaDetail').innerHTML = `
    <div class="detail-kicker">栏目｜${name}</div>
    <h3>${name}</h3>
    <p><strong>定位：</strong>${columnDescription(name)}</p>
    <p><strong>频率：</strong>${columnCadence(name)}</p>
    <p><strong>业务目标：</strong>${columnGoal(name)}</p>
    <div class="variant-box">
      <strong>当前可排选题</strong>
      <ol>
        ${examples.map((item) => `<li>${item.title}｜${item.cta}</li>`).join('') || '<li>当前筛选下暂无候选选题。</li>'}
      </ol>
    </div>
  `;
}

function renderBookLibrary() {
  const books = state.books || [];
  const cats = ['全部', ...new Set(books.map(function(b){return b.category}).filter(Boolean))];
  setLabHeading('图书馆：' + books.length + '本', '', '');

  // Filter chips - left aligned in result title area
  var chipHtml = '<div class="chips compact-chips" style="justify-content:flex-start">';
  cats.forEach(function(c){
    var count = c === '全部' ? books.length : books.filter(function(b){return b.category===c}).length;
    chipHtml += '<button class="chip muted ' + (state.bookCategory === c ? 'active' : '') + '" data-book-category="' + c + '" type="button">' + c + '<em>' + count + '</em></button>';
  });
  chipHtml += '</div>';
  $('#labResultTitle').innerHTML = '图书馆：' + books.length + '本';
  $('#labResultMeta').innerHTML = chipHtml;

  var filtered = state.bookCategory === '全部' ? books : books.filter(function(b){return b.category===state.bookCategory});

  // Book list (left side, uses idea-grid style)
  var gridHtml = '';
  filtered.forEach(function(b){
    var stars = '';
    for(var i=1;i<=5;i++) stars += i <= Math.round(b.rating/2) ? '★' : '☆';
    gridHtml += '<article class="book-card" data-book-id="' + b.id + '" tabindex="0">' +
      '<div class="book-cover" style="background:' + (['#d4a574','#8b9d83','#7b8fa1','#a08b7a','#6b7b8d','#9ab87a','#c4956a','#7a9e7e'][books.indexOf(b)%8]) + '">' +
        '<span>' + escapeHtml(b.title.slice(0,6)) + '</span>' +
      '</div>' +
      '<div class="book-info">' +
        '<h3>' + escapeHtml(b.title) + '</h3>' +
        (b.enTitle ? '<p class="book-en-title">' + escapeHtml(b.enTitle) + '</p>' : '') +
        '<p class="book-author">' + escapeHtml(b.author) + ' · ' + escapeHtml(b.publishYear||'') + '</p>' +
        '<div class="book-rating"><span class="stars">' + stars + '</span><strong>' + b.rating + '</strong></div>' +
        '<div class="book-tags">' + (b.tags||[]).map(function(t){return '<span>' + escapeHtml(t) + '</span>'}).join('') + '</div>' +
        (b.oneLiner ? '<p class="book-oneliner">' + escapeHtml(b.oneLiner) + '</p>' : '') +
        '<div class="book-card-actions" style="display:flex;gap:6px;margin-top:6px">' +
          '<button class="work-exp-btn" data-add-exp-from-work="book" data-exp-title="' + escapeHtml(b.title + ' - ' + b.author) + '" type="button" style="position:static;opacity:1;font-size:11px">+ 经验</button>' +
          '<button class="work-exp-btn" data-view-exp-book="' + escapeHtml(b.title) + '" type="button" style="position:static;opacity:1;font-size:11px">查看</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  });
  $('#ideaGrid').innerHTML = gridHtml || '<p class="empty-text">暂无书籍</p>';
  $('#ideaGrid').className = 'idea-grid book-grid-list';

  // Detail panel (right side) - show first book or selected
  var sel = filtered.find(function(b){return b.id === state.activeLabItemId}) || filtered[0];
  if (sel) {
    state.activeLabItemId = sel.id;
    var stars = ''; for(var i=1;i<=5;i++) stars += i <= Math.round(sel.rating/2) ? '★' : '☆';
    $('#ideaDetail').innerHTML =
      '<div class="detail-kicker">' + escapeHtml(sel.category) + ' · ' + escapeHtml(sel.author) + '</div>' +
      '<h3>' + escapeHtml(sel.title) + '</h3>' +
      (sel.enTitle ? '<p style="color:var(--muted);font-size:13px;font-style:italic;margin:0 0 8px">' + escapeHtml(sel.enTitle) + '</p>' : '') +
      '<div class="book-rating" style="margin:8px 0"><span class="stars">' + stars + '</span><strong style="font-size:18px">' + sel.rating + '</strong></div>' +
      '<p style="color:#4e594b;line-height:1.7">' + escapeHtml(sel.summary||'') + '</p>' +
      '<div class="book-tags" style="margin:8px 0">' + (sel.tags||[]).map(function(t){return '<span>' + escapeHtml(t) + '</span>'}).join('') + '</div>' +
      (sel.oneLiner ? '<p style="color:var(--amber);font-size:13px;font-weight:600;line-height:1.6;margin:0 0 8px">' + escapeHtml(sel.oneLiner) + '</p>' : '') +
      (sel.review ? '<div class="variant-box"><strong>书评</strong><p>' + escapeHtml(sel.review) + '</p></div>' : '') +
      '<div class="variant-box"><strong>为什么值得读</strong><p>' + escapeHtml(sel.whyRead||'') + '</p></div>';
  }
}

function renderAssetDetail(item) {
  $('#ideaDetail').innerHTML = `
    <div class="detail-kicker">素材｜${item.source}</div>
    <h3>${item.title}</h3>
    <p><strong>类型：</strong>${item.type || '待分类'}</p>
    <p><strong>内容线：</strong>${item.line || '待归类'}</p>
    <p><strong>用途：</strong>${item.use || '待补'}</p>
    <p><strong>下一步：</strong>${item.next || '待补'}</p>
    <div class="variant-box">
      <strong>使用建议</strong>
      <ol>
        <li>如果来自作品库，先看是否能复写标题和评论承接。</li>
        <li>如果来自规划文档，优先补目标用户、CTA和发布场景。</li>
        <li>如果来自公众号，改写成小红书时要前置用户问题。</li>
      </ol>
    </div>
  `;
}

function renderLabDashboard() {
  const ideas = contentIdeas();
  const rows = taxonomyNames('categories').map((name) => {
    const categoryIdeas = ideas.filter((item) => item.line === name);
    const mappedWorks = mappedWorksForLine(name);
    const interactions = mappedWorks.reduce((sum, item) => sum + workInteractions(item), 0);
    return {
      name,
      ideas: categoryIdeas.length,
      works: mappedWorks.length,
      interactions,
      score: categoryIdeas.length ? Math.round(categoryIdeas.reduce((sum, item) => sum + Number(item.score || 0), 0) / categoryIdeas.length) : 0
    };
  });
  setLabHeading('数据看板', '', '看板判断');
  $('#ideaGrid').innerHTML = `
    <div class="lab-dashboard-grid">
      ${rows.map((row) => `
        <article class="dashboard-line-card">
          <span class="dash-line-name">${row.name}</span>
          <div class="dash-line-numbers">
            <div class="dash-num"><strong>${row.ideas}</strong><small>待发选题</small></div>
            <div class="dash-num"><strong>${row.works}</strong><small>已发作品</small></div>
            <div class="dash-num"><strong>${row.score || '-'}</strong><small>选题均分</small></div>
          </div>
          ${row.works ? `<div class="dash-bar"><i style="width:${Math.min(100, Math.max(8, row.interactions / 20))}%"></i><span>互动 ${formatNumber(row.interactions)}</span></div>` : '<div class="dash-bar empty">暂无已发布作品</div>'}
        </article>
      `).join('')}
    </div>
  `;
  const hasWorks = rows.filter((r) => r.works > 0).sort((a, b) => b.interactions - a.interactions);
  $('#ideaDetail').innerHTML = `
    <div class="detail-kicker">看板解读</div>
    <h3>${hasWorks[0]?.name || '尚未设置领域'} 当前有最多已发作品</h3>
    <p>待发选题 = 选题池中属于该领域的选题数（还没发）</p>
    <p>已发作品 = 当前账号里已发布的作品数</p>
    <p>选题均分 = 该领域所有选题的平均评分（满分100）</p>
    <div class="variant-box">
      <strong>本周建议</strong>
      <ol>
        <li>优先补齐有明确用户问题和下一步动作的内容。</li>
        <li>低互动作品也要保留，用于反向复盘。</li>
        <li>所有案例、数据和人物信息发布前先核对授权。</li>
      </ol>
    </div>
  `;
}

function renderAssetPreview(title = '本地资产库概览') {
  $('#assetSectionTitle').textContent = title;
  renderContentAssets();
}

function renderFollowForm() {
  $('#customerType').innerHTML = state.data.customerFollowUp.segments.map((item) => `
    <option>${item.segment}</option>
  `).join('');
}

function renderSkills() {
  $('#skillMap').innerHTML = state.data.skills.map((item) => `
    <article class="skill-card">
      <span class="status">${item.status}</span>
      <h3>${item.name}</h3>
      <p><strong>输入：</strong>${item.input}</p>
      <p><strong>输出：</strong>${item.output}</p>
      <p><strong>检查：</strong>是否能产出明确字段、下一步动作和可复用模板。</p>
      <div class="idea-meta"><span>${item.category}</span><span>${item.owner}</span></div>
    </article>
  `).join('');
}

function renderNotes() {
  $('#noteCount').textContent = state.notes.length;
  const preview = state.notes.slice(0, 4).map(noteCard).join('');
  const previewTarget = $('#notePreview');
  if (previewTarget) previewTarget.innerHTML = preview;
  $('#notesList').innerHTML = state.notes.map(noteCard).join('');
}

function noteCard(note) {
  return `
    <article class="note-card">
      <strong>${note.title}</strong>
      <span>${note.summary || note.path}</span>
    </article>
  `;
}

function renderScripts() {
  var el = $('#scriptList'); if (!el) return;
  el.innerHTML = state.data.sync.scripts.map((script) => `
    <article class="script-card">
      <div>
        <strong>${script.name}</strong>
        <span>风险：${script.risk}</span>
      </div>
      <button class="small-btn" data-script="${script.name}">运行</button>
    </article>
  `).join('');
}

let followFilter = '全部';

function renderFollowDrafts() {
  const target = $('#followList');
  if (!target) return;
  const drafts = state.followDrafts || [];
  $('#followNavCount').textContent = drafts.length || 0;

  // Render type filters
  const types = ['全部', '个人客户', '企业客户'];
  const typeCounts = { '全部': drafts.length, '个人客户': drafts.filter(function(d){return /个人|普通|课程|活动/.test(d.customerType||'')}).length, '企业客户': drafts.filter(function(d){return /企业|伙伴|机构/.test(d.customerType||'')}).length };
  const filterTarget = $('#followTypeFilters');
  if (filterTarget) {
    filterTarget.innerHTML = types.map(function(t){
      return '<button class=\”task-filter ' + (followFilter === t ? 'active' : '') + '\” data-follow-filter=\”' + t + '\” type=\”button\”>' + t + ' <em>' + (typeCounts[t]||0) + '</em></button>';
    }).join('');
  }

  const keyword = ($('#followSearch')?.value || '').toLowerCase();
  const filtered = drafts.filter(function(d){
    const matchType = followFilter === '全部' || (followFilter === '个人客户' && /个人|普通|课程|活动/.test(d.customerType||'')) || (followFilter === '企业客户' && /企业|伙伴|机构/.test(d.customerType||''));
    const matchKeyword = !keyword || JSON.stringify(d).toLowerCase().includes(keyword);
    return matchType && matchKeyword;
  });

  if (!filtered.length) {
    target.innerHTML = '<p class=”empty-text”>暂无跟进草稿。</p>';
    return;
  }

  target.innerHTML = filtered.map(function(item){
    var isB = /企业|伙伴|机构/.test(item.customerType||'');
    return `
    <article class=”follow-card ${isB ? 'b-end' : 'c-end'}”>
      <div class=”follow-card-head”>
        <span class=”follow-type-badge”>${escapeHtml(item.customerType || '')}</span>
        <span class=”follow-stage”>${escapeHtml(item.stage || '')}</span>
        <small>${escapeHtml(item.source || '')} · ${escapeHtml(item.id || '')}</small>
      </div>
      <p class=”follow-question”>${escapeHtml(item.question || '未填写')}</p>
      <div class=”follow-message”>${escapeHtml((item.message || '').slice(0, 200))}</div>
      <div class=”follow-card-foot”>
        <span>${escapeHtml(item.nextAction || '')}</span>
        <button class=”small-btn secondary sync-follow-btn” data-sync-follow-id=”${escapeHtml(item.id)}” type=”button”>同步到飞书</button>
      </div>
    </article>
  `; }).join('');
}

// Follow filter click
document.body.addEventListener('click', function(event){
  var btn = event.target.closest('[data-follow-filter]');
  if (btn) { followFilter = btn.dataset.followFilter; renderFollowDrafts(); }
});

function renderSettings() {
  $('#systemStatus').innerHTML = state.data.systemStatus.map((item) => `
    <article class="status-card">
      <span>${item.role}</span>
      <strong>${item.system}</strong>
      <p>${item.status}</p>
      <small>${item.do}</small>
    </article>
  `).join('');

  $('#sourceCards').innerHTML = state.data.sourceCards.map((item) => `
    <article class="source-card">
      <div>
        <strong>${item.name}</strong>
        <span>${item.status} / ${item.owner}</span>
      </div>
      <p>${item.use}</p>
      <small>注意：${item.risk}</small>
    </article>
  `).join('');
}

function renderContentAssets() {
  const target = $('#assetList');
  if (!target) return;

  const assets = filteredContentAssets();
  if (!assets.length) {
    target.innerHTML = '<p class="empty-text">暂未读取到本地作品资产。检查 `05-数据与作品库` 目录。</p>';
    return;
  }

  target.innerHTML = assets.slice(0, 14).map((item) => `
    <article class="asset-card">
      <span>${item.source} / ${item.type}</span>
      <strong>${item.title}</strong>
      <p>${item.line}｜${item.use}</p>
      <small>${item.next}</small>
    </article>
  `).join('');
}

function experienceBaseItems() {
  return experienceItems().filter((item) => item.library === state.experienceLibrary);
}

function experienceFilterText(item) {
  return `${item.title} ${item.body} ${item.type} ${item.category} ${item.topic} ${item.level} ${item.caseId}`.toLowerCase();
}

function filteredExperiences() {
  const keyword = state.experienceKeyword.trim().toLowerCase();
  const filtered = experienceBaseItems().filter((item) => {
    const matchKeyword = !keyword || experienceFilterText(item).includes(keyword);
    const matchType = state.experienceType === '全部' || item.type === state.experienceType;
    const matchCategory = state.experienceCategory === '全部' || item.category === state.experienceCategory;
    const matchTopic = state.experienceTopic === '全部' || item.topic === state.experienceTopic;
    const matchLevel = state.experienceLevel === '全部' || item.level === state.experienceLevel;
    const matchPending = !state.experiencePendingOnly || item.pending;
    const matchCap = state.activeExpCap === '全部' || (item.capability||[]).includes(state.activeExpCap);
    return matchKeyword && matchType && matchCategory && matchTopic && matchLevel && matchPending && matchCap;
  });

  return [...filtered].sort((a, b) => {
    if (state.experienceSort === 'date_desc') return String(b.date).localeCompare(String(a.date));
    if (state.experienceSort === 'level_core') {
      const score = (item) => item.level === '核心原则' ? 0 : item.level === '普通经验' ? 1 : 2;
      return score(a) - score(b) || String(b.date).localeCompare(String(a.date));
    }
    if (state.experienceSort === 'type_pos') {
      const score = (item) => item.type === '加分行为' ? 0 : item.type === '中性观察' ? 1 : 2;
      return score(a) - score(b) || String(b.date).localeCompare(String(a.date));
    }
    if (state.experienceSort === 'type_neg') {
      const score = (item) => item.type === '减分行为' ? 0 : item.type === '中性观察' ? 1 : 2;
      return score(a) - score(b) || String(b.date).localeCompare(String(a.date));
    }
    return a.id.localeCompare(b.id);
  });
}

function renderExperienceFilter(targetId, key, values) {
  const current = state[key];
  const base = experienceBaseItems();
  $(`#${targetId}`).innerHTML = values.map((value) => {
    const count = value === '全部' ? base.length : base.filter((item) => item[key.replace('experience', '').toLowerCase()] === value).length;
    return `<button class="experience-filter ${current === value ? 'active' : ''}" data-exp-filter="${key}" data-exp-value="${escapeHtml(value)}" type="button">${escapeHtml(value)} <em>${count}</em></button>`;
  }).join('');
}

function experienceTypeClass(type = '') {
  if (type === '加分行为') return 'positive';
  if (type === '减分行为') return 'negative';
  return 'neutral';
}

function experienceLevelClass(level = '') {
  return level === '核心原则' ? 'core' : 'normal';
}

function resetExperienceFilters() {
  state.experienceType = '全部';
  state.experienceCategory = '全部';
  state.experienceTopic = '全部';
  state.experienceLevel = '全部';
  state.experiencePendingOnly = false;
}

function experienceCard(item) {
  const pendingMark = item.pending ? '<span class="exp-tag pending">待完善</span>' : '';
  return `
    <article class="experience-card ${experienceTypeClass(item.type)}" data-exp-id="${escapeHtml(item.id)}" tabindex="0">
      <div class="experience-card-tags">
        <span class="exp-tag ${experienceTypeClass(item.type)}">${escapeHtml(item.type)}</span>
        <span class="exp-tag muted">${escapeHtml(item.category)}</span>
        <span class="exp-tag ${experienceLevelClass(item.level)}">${escapeHtml(item.level)}</span>
        ${(item.capability||[]).map(function(c){return '<span class="exp-tag cap" data-exp-cap="'+escapeHtml(c)+'" title="点击筛选此项能力">'+escapeHtml(c)+'</span>'}).join('')}
        ${pendingMark}
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <div class="experience-case">📎 ${escapeHtml(item.caseId)}</div>
      <div class="experience-card-foot">
        <span>🌐 ${escapeHtml(item.topic)}</span>
        <time>◴ ${escapeHtml(item.date)}</time>
      </div>
    </article>
  `;
}

function experienceTable(items) {
  return `
    <div class="experience-table">
      <div class="experience-table-head">
        <span>类型</span><span>经验</span><span>分类</span><span>CASE</span><span>日期</span>
      </div>
      ${items.map((item) => `
        <div class="experience-table-row">
          <span class="exp-tag ${experienceTypeClass(item.type)}">${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.caseId)}</span>
          <time>${escapeHtml(item.date)}</time>
        </div>
      `).join('')}
    </div>
  `;
}

function renderExperiences() {
  const base = experienceBaseItems();
  const items = filteredExperiences();
  const types = ['全部', ...new Set(base.map((item) => item.type))];
  const categories = ['全部', ...new Set(base.map((item) => item.category))];
  const topics = ['全部', ...new Set(base.map((item) => item.topic))];
  const levels = ['全部', ...new Set(base.map((item) => item.level))];
  const pending = base.filter((item) => item.pending).length;

  const allExp = experienceItems();
  $('#experienceCount').textContent = allExp.length;
  $('#expLibraryCount').textContent = allExp.filter((item) => item.library === 'library').length;
  $('#expContentCount').textContent = allExp.filter((item) => item.library === 'content').length;
  $('#expPendingCount').textContent = pending;
  $('#experienceResultCount').textContent = `共筛出 ${items.length} 条`;
  $('#experienceSearch').value = state.experienceKeyword;
  $('#experienceSort').value = state.experienceSort;

  $$('.experience-tab').forEach((item) => item.classList.toggle('active', item.dataset.expLibrary === state.experienceLibrary));
  $$('.experience-view[data-exp-view]').forEach((item) => item.classList.toggle('active', item.dataset.expView === state.experienceView));
  $('[data-exp-pending]')?.classList.toggle('active', state.experiencePendingOnly);

  renderExperienceFilter('expTypeFilters', 'experienceType', types);
  renderExperienceFilter('expCategoryFilters', 'experienceCategory', categories);
  renderExperienceFilter('expTopicFilters', 'experienceTopic', topics);
  renderExperienceFilter('expLevelFilters', 'experienceLevel', levels);

  // 能力分类筛选
  var capDefs={ '洞察能力':'从会议、数据、用户反馈中抓取关键信号', '总结能力':'把零散信息消化成结构化理解和可复用方法', '表达能力':'准确简洁地传递想法让对方听懂并行动' };
  var caps=['全部','洞察能力','总结能力','表达能力'];
  var capCounts={}; caps.forEach(function(c){ capCounts[c]=c==='全部'?base.length:base.filter(function(i){return(i.capability||[]).includes(c)}).length; });
  var capEl=$('#expCapFilters');
  if(capEl) capEl.innerHTML=caps.map(function(c){
    return '<button class="experience-filter '+(state.activeExpCap===c?'active':'')+'" data-exp-filter="expCap" data-exp-value="'+c+'" type="button" title="'+(capDefs[c]||'')+'">'+c+' <em>'+capCounts[c]+'</em></button>';
  }).join('');
  // Tooltip
  var tipEl=$('#expCapTooltip');
  if(tipEl && state.expCapTooltip) tipEl.innerHTML='<span>'+state.expCapTooltip+'</span>'; else if(tipEl) tipEl.innerHTML='';

  const target = $('#experienceGrid');
  target.classList.toggle('table-mode', state.experienceView === 'table');
  if (!items.length) {
    target.innerHTML = '<p class="empty-text">当前筛选下没有经验。可以清空搜索或切回全部。</p>';
    return;
  }

  target.innerHTML = state.experienceView === 'table'
    ? experienceTable(items)
    : items.map(experienceCard).join('');

  // Show selected experience detail
  var sel = items.find(function(e){return e.id===state.activeExpId}) || items[0];
  if (sel && $('#experienceDetail')) {
    // Find linked XHS works from caseId
    var linkedWorks=[];
    var caseText=sel.caseId||'';
    var works=state.xhsWorks||[];
    var idMatches=(caseText.match(/#([a-z0-9]{6,})/gi)||[]).map(function(m){return m.replace('#','').toLowerCase()});
    var keywords=caseText.replace(/#[a-z0-9]+/gi,'').split(/[,，、\s]+/).filter(function(w){return w.length>=2}).map(function(w){return w.toLowerCase()});
    works.forEach(function(w){
      var haystack=((w.url||'')+(w.id||'')+(w.title||'')+(w.category||'')+(w.content||'')).toLowerCase();
      var score=0;
      idMatches.forEach(function(m){ if(haystack.includes(m)) score+=3; });
      keywords.forEach(function(k){ if(haystack.includes(k)) score+=1; });
      if(score>0) linkedWorks.push({work:w, score:score});
    });
    // Sort by relevance, dedup, limit
    linkedWorks.sort(function(a,b){return b.score-a.score});
    var seen={}; linkedWorks=linkedWorks.filter(function(e){var k=e.work.id||e.work.url;if(seen[k])return false;seen[k]=true;return true}).slice(0,10).map(function(e){return e.work});

    var workBtns=linkedWorks.length ? '<div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px">'+linkedWorks.map(function(w){
      return '<button class="small-btn secondary" data-preview-work="'+w.id+'" type="button" style="font-size:11px">📱 '+escapeHtml((w.title||'').slice(0,20))+'</button>';
    }).join('')+'</div>' : '';
    $('#experienceDetail').innerHTML =
      '<div class="detail-kicker">'+escapeHtml(sel.type)+' · '+escapeHtml(sel.category)+' · '+escapeHtml(sel.level)+'</div>'+
      '<h3>'+escapeHtml(sel.title)+'</h3>'+
      '<div class="experience-case" style="margin:8px 0">📎 '+escapeHtml(sel.caseId)+' · '+escapeHtml(sel.date)+'</div>'+
      workBtns+
      '<div id="expWorkPreview" style="display:none;margin:8px 0;padding:12px;border:1px solid var(--line);border-radius:12px;background:#f8faf4;max-height:300px;overflow:auto"></div>'+
      '<div style="color:#4e594b;line-height:1.8;white-space:pre-wrap">'+escapeHtml(sel.body)+'</div>'+
      '<div class="idea-meta" style="margin-top:10px"><span>'+escapeHtml(sel.topic)+'</span></div>';
  }
}

function formatChinaDateTime(value = '') {
  if (!value) return '尚未生成';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function minutesRiskClass(level = '') {
  if (level === '高') return 'high';
  if (level === '中') return 'medium';
  return 'low';
}

function renderMinutesMetrics(digest) {
  const aggregates = digest.aggregates || {};
  const metrics = [
    ['会议数', aggregates.totalMeetings || 0],
    ['今日会议', aggregates.todayCount || 0],
    ['待办草稿', aggregates.pendingTodos || 0],
    ['SOP候选', aggregates.sopCandidates || 0],
    ['中高风险', Number(aggregates.highRisks || 0) + Number(aggregates.mediumRisks || 0)]
  ];

  $('#minutesMetrics').innerHTML = metrics.map(([label, value]) => `
    <div class="minutes-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderLarkMinutesDigest() {
  const digest = state.larkMinutesDigest || {};
  const status = digest.status || {};
  const period = digest.period || {};
  const aggregates = digest.aggregates || {};
  const meetings = digest.meetings || [];
  const summary = digest.summary || [];
  const todos = digest.todos || [];
  const sops = digest.sopCandidates || digest.sop_candidates || [];
  const risks = digest.risks || [];
  const nextActions = digest.nextActions || digest.next_actions || [];

  $('#minutesNavCount').textContent = aggregates.pendingTodos || meetings.length || 0;
  $('#minutesStatusLabel').textContent = status.label || (digest.mode === 'mock' ? '示例数据' : '本地草稿');
  $('#minutesStatusMessage').textContent = status.message || '本地读取成功。';
  $('#minutesPeriod').textContent = period.range || period.today || '待生成';
  $('#minutesGeneratedAt').textContent = `${digest.mode || 'local'} / ${formatChinaDateTime(digest.generatedAt)}`;
  renderMinutesMetrics(digest);

  $('#minutesSummary').innerHTML = summary.length
    ? `<ol>${summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
    : '<p class="empty-text">还没有周报草稿。可以先生成示例草稿查看效果。</p>';

  $('#minutesMeetings').innerHTML = meetings.length
    ? meetings.map((meeting) => `
      <article class="minutes-meeting-card">
        <div class="minutes-meeting-head">
          <div>
            <strong>${escapeHtml(meeting.title || '未命名会议')}</strong>
            <span>${escapeHtml(meeting.date || '日期待补')} ${escapeHtml(meeting.time || '')} / ${escapeHtml(meeting.organizer || '组织者待补')}</span>
          </div>
          <em>${escapeHtml(meeting.minute_token || meeting.minuteToken || meeting.note_id || meeting.noteId || '本地')}</em>
        </div>
        <p>${escapeHtml(meeting.summary || '暂无摘要')}</p>
        <div class="minutes-chip-row">
          ${(meeting.keywords || []).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}
        </div>
        <div class="minutes-chapters">
          ${(meeting.chapters || []).map((chapter) => `
            <div>
              <strong>${escapeHtml(chapter.title || '章节')}</strong>
              <span>${escapeHtml(chapter.summary || '')}</span>
            </div>
          `).join('')}
        </div>
      </article>
    `).join('')
    : '<p class="empty-text">还没有来源会议。</p>';

  $('#minutesTodos').innerHTML = todos.length
    ? todos.map((todo, index) => `
      <article class="minutes-action-card">
        <span class="minutes-index">${index + 1}</span>
        <div>
          <strong>${escapeHtml(todo.content || '待办内容待补')}</strong>
          <p>${escapeHtml(todo.sourceMeeting || todo.source_meeting || '来源会议待补')}</p>
          <div class="minutes-chip-row">
            <span>${escapeHtml(todo.assignee || '负责人待定')}</span>
            <span>${escapeHtml(todo.status || '未完成')}</span>
            <span>${escapeHtml(todo.suggestedTarget || '人工判断')}</span>
          </div>
          <button class="small-btn secondary convert-to-task" data-convert-source="minutes" data-convert-title="${escapeHtml(todo.content || '会议待办')}" data-convert-collection="中台建设" data-convert-assignee="${escapeHtml(todo.assignee || '')}" data-convert-next="${escapeHtml(todo.suggestedTarget || '确认后推进')}" type="button" style="margin-top:8px">转任务</button>
        </div>
      </article>
    `).join('')
    : '<p class="empty-text">没有待办草稿。</p>';

  $('#minutesSops').innerHTML = sops.length
    ? sops.map((item) => `
      <article class="minutes-sop-card">
        <div class="minutes-sop-head">
          <strong>${escapeHtml(item.title || 'SOP候选')}</strong>
          <span>${escapeHtml(item.confidence || '待判断')}</span>
        </div>
        <p>${escapeHtml(item.nextAction || item.next_action || '下一步待补')}</p>
        <div class="minutes-signal-list">
          ${(item.signals || []).map((signal) => `<span>${escapeHtml(signal)}</span>`).join('')}
        </div>
      </article>
    `).join('')
    : '<p class="empty-text">没有 SOP 候选。</p>';

  $('#minutesRisks').innerHTML = risks.length
    ? risks.map((risk) => `
      <article class="minutes-risk-card ${minutesRiskClass(risk.level)}">
        <div class="minutes-risk-head">
          <strong>${escapeHtml(risk.description || '风险待补')}</strong>
          <span>${escapeHtml(risk.level || '低')}</span>
        </div>
        <p>${escapeHtml(risk.sourceMeeting || risk.source_meeting || '来源会议待补')}</p>
        <small>${escapeHtml(risk.sourceText || risk.source_text || '原始发言待补')}</small>
      </article>
    `).join('')
    : '<p class="empty-text">没有风险信号。</p>';

  var nextEl = $('#minutesNextActions');
  if (nextEl) nextEl.innerHTML = nextActions.length
    ? nextActions.map((item) => `
      <div class="minutes-next-item">
        <span></span>
        <strong>${escapeHtml(item)}</strong>
      </div>
    `).join('')
    : '<p class="empty-text">暂无下一步动作。</p>';
}

function minutesDigestText() {
  const digest = state.larkMinutesDigest || {};
  const period = digest.period || {};
  const meetings = digest.meetings || [];
  const summary = digest.summary || [];
  const todos = digest.todos || [];
  const sops = digest.sopCandidates || digest.sop_candidates || [];
  const risks = digest.risks || [];
  const nextActions = digest.nextActions || digest.next_actions || [];

  return `飞书妙记本地周报草稿
周期：${period.range || period.today || '待生成'}
生成时间：${formatChinaDateTime(digest.generatedAt)}
模式：${digest.mode || 'local'}（v1 不自动写飞书）

一、本周会议摘要
${summary.map((item, index) => `${index + 1}. ${item}`).join('\n') || '暂无'}

二、来源会议
${meetings.map((item, index) => `${index + 1}. ${item.date || ''} ${item.title || '未命名会议'}：${item.summary || '暂无摘要'}`).join('\n') || '暂无'}

三、待办草稿
${todos.map((item, index) => `${index + 1}. ${item.content || '待补'} / ${item.assignee || '负责人待定'} / 来源：${item.sourceMeeting || item.source_meeting || '待补'}`).join('\n') || '暂无'}

四、SOP 候选
${sops.map((item, index) => `${index + 1}. ${item.title || 'SOP候选'} / 置信度：${item.confidence || '待判断'} / 下一步：${item.nextAction || item.next_action || '待补'}`).join('\n') || '暂无'}

五、风险信号
${risks.map((item, index) => `${index + 1}. [${item.level || '低'}] ${item.description || '待补'} / 来源：${item.sourceMeeting || item.source_meeting || '待补'}`).join('\n') || '暂无'}

六、下一步
${nextActions.map((item, index) => `${index + 1}. ${item}`).join('\n') || '暂无'}`;
}

function applySearch() {
  const keyword = $('#globalSearch')?.value.trim().toLowerCase() || '';
  if (!keyword) {
    renderActiveLab();
    state.workKeyword = '';
    if ($('#workSearch')) $('#workSearch').value = '';
    renderWorks();
    renderTasks();
    renderSkills();
    renderNotes();
    return;
  }

  const ideaHtml = state.data.hotContentLab.ideas
    .filter((item) => JSON.stringify(item).toLowerCase().includes(keyword))
    .map((item) => `
      <article class="idea-card"><h3>${item.title}</h3><p>${item.hook}</p><div class="idea-meta"><span>${item.line}</span><span>${item.status}</span></div></article>
    `).join('');
  $('#ideaGrid').innerHTML = ideaHtml || '<p>没有匹配选题。</p>';
  state.workKeyword = keyword;
  if ($('#workSearch')) $('#workSearch').value = keyword;
  renderWorks();
}

function applyIdeaSearch() {
  state.ideaKeyword = $('#ideaSearch').value;
  state.activeIdeaId = null;
  state.activeLabItemId = null;
  renderActiveLab();
}

function applyWorkFilters() {
  state.workKeyword = $('#workSearch').value;
  state.workCategory = $('#workCategoryFilter').value || '全部';
  state.workSort = $('#workSortFilter').value || 'interactions_desc';
  renderWorks();
}

async function copyText(text, message) {
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (error) {
      copied = false;
    }
  }
  if (!copied) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-999px';
    document.body.appendChild(textarea);
    textarea.select();
    copied = document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  toast(copied ? message : `${message}，如未成功请手动复制`);
}

function growthReportText() {
  const data = state.data.dailyGrowth;
  const platforms = data.platforms.map((p) => `${p.name}：${formatNumber(p.followers)}（日 +${formatNumber(p.dailyIncrease)}，周 +${formatNumber(p.weeklyIncrease)}）`).join('\n');
  return `${data.date} 全平台增长日报
总粉丝：${formatNumber(data.totalFollowers)}
今日新增：+${formatNumber(data.dailyIncrease)}
本周新增：+${formatNumber(data.weeklyIncrease)}

${platforms}

判断：
${data.insights.map((item) => `- ${item}`).join('\n')}`;
}

function ideaBriefText() {
  return state.data.hotContentLab.ideas.map((item) => (
    `${item.id}｜${item.title}
内容线：${item.line}
标题钩子：${item.hook}
目标人群：${item.audience}
CTA：${item.cta}
状态：${item.status}`
  )).join('\n\n');
}

function parseGrowthText(text) {
  const platformNames = ['小红书', '视频号', '公众号', 'B站', '抖音', '小宇宙', '微博'];
  const platform = platformNames.find((name) => text.includes(name)) || '其他平台';
  const numbers = [...text.matchAll(/[-+]?\d+(?:\.\d+)?\s*(?:万|w|W)?/g)].map((match) => match[0].replace(/\s/g, ''));
  const toNumber = (raw) => {
    if (!raw) return 0;
    const hasWan = /万|w|W/.test(raw);
    const value = Number(raw.replace(/[^\d.-]/g, ''));
    return hasWan ? Math.round(value * 10000) : value;
  };

  const followersMatch = text.match(/(?:粉丝|总粉丝|当前粉丝)[^\d-+]*([-+]?\d+(?:\.\d+)?\s*(?:万|w|W)?)/i);
  const dailyMatch = text.match(/(?:日增|日\s*\+|新增|今日新增)[^\d-+]*([-+]?\d+(?:\.\d+)?\s*(?:万|w|W)?)/i);
  const interactionMatch = text.match(/(?:互动|点赞|收藏|评论)[^\d-+]*([-+]?\d+(?:\.\d+)?\s*(?:万|w|W)?)/i);
  const leadMatch = text.match(/(?:线索|私信|报名|咨询)[^\d-+]*([-+]?\d+(?:\.\d+)?\s*(?:万|w|W)?)/i);

  return {
    platform,
    followers: toNumber(followersMatch?.[1] || numbers[0]),
    dailyIncrease: toNumber(dailyMatch?.[1] || numbers[1]),
    interactions: toNumber(interactionMatch?.[1] || numbers[2]),
    leads: toNumber(leadMatch?.[1] || numbers[3])
  };
}

function fillGrowthForm(parsed) {
  const form = $('#growthForm');
  form.platform.value = parsed.platform;
  form.followers.value = parsed.followers || '';
  form.dailyIncrease.value = parsed.dailyIncrease || '';
  form.interactions.value = parsed.interactions || '';
  form.leads.value = parsed.leads || '';
  if (!form.note.value) {
    form.note.value = '由粘贴文本解析，提交前需人工核对。';
  }
}

function followResultText(result) {
  return `${result.message}

飞书字段建议：
${Object.entries(result.fields).map(([key, value]) => `${key}：${value}`).join('\n')}

说明：${result.note}`;
}

function bindEvents() {
  $('#nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) setView(button.dataset.view);
  });

  document.body.addEventListener('click', async (event) => {
    const jump = event.target.closest('[data-view-jump]');
    if (jump) setView(jump.dataset.viewJump);

    const taskStatus = event.target.closest('[data-task-status]');
    if (taskStatus) {
      state.taskStatus = taskStatus.dataset.taskStatus;
      renderTasks();
    }

    const taskSystem = event.target.closest('[data-task-system]');
    if (taskSystem) {
      state.taskSystem = taskSystem.dataset.taskSystem;
      renderTasks();
    }

    const taskCollection = event.target.closest('[data-task-collection]');
    if (taskCollection) {
      state.taskCollection = taskCollection.dataset.taskCollection;
      renderTasks();
    }

    const taskMode = event.target.closest('[data-task-mode]');
    if (taskMode) {
      state.taskMode = taskMode.dataset.taskMode;
      renderTasks();
    }

    const taskDomain = event.target.closest('[data-task-domain]');
    if (taskDomain) {
      state.taskDomain = taskDomain.dataset.taskDomain;
      renderTasks();
    }

    const taskPriority = event.target.closest('[data-task-priority]');
    if (taskPriority) {
      state.taskPriority = taskPriority.dataset.taskPriority;
      renderTasks();
    }

    const taskSort = event.target.closest('[data-task-sort]');
    if (taskSort) {
      state.taskSort = taskSort.dataset.taskSort;
      renderTasks();
    }

    const taskView = event.target.closest('[data-task-view]');
    if (taskView) {
      state.taskView = taskView.dataset.taskView;
      renderTasks();
    }

    // 新建任务按钮
    if (event.target.id === 'addTaskBtn') {
      const form = $('#taskEditForm');
      form.querySelector('[name="id"]').value = '';
      form.querySelector('[name="title"]').value = '';
      form.querySelector('[name="collection"]').value = '内容运营';
      form.querySelector('[name="priority"]').value = 'P1';
      form.querySelector('[name="status"]').value = '待开始';
      form.querySelector('[name="assignee"]').value = '运营负责人';
      form.querySelector('[name="collaborator"]').value = '';
      form.querySelector('[name="dueDate"]').value = '';
      form.querySelector('[name="nextAction"]').value = '';
      form.querySelector('[name="evidence"]').value = '';
      buildStepsEditor([{label:'补齐任务边界和下一步动作',done:false},{label:'补齐交付物或验收证据',done:false},{label:'复盘结果并决定下一步',done:false}]);
      $('#taskEditModalKicker').textContent = '新建任务';
      $('#taskEditModalTitle').textContent = '新建任务';
      $('#taskArchiveBtn').style.display = 'none';
      $('#taskDeleteBtn').style.display = 'none';
      $('#taskEditModal').hidden = false;
      form.querySelector('[name="title"]').focus();
      return;
    }

    // 任务编辑弹窗保存按钮
    if (event.target.id === 'taskEditSaveBtn') {
      event.preventDefault();
      const form = $('#taskEditForm');
      const id = form.querySelector('[name="id"]').value;
      const getVal = (name) => form.querySelector('[name="' + name + '"]')?.value || '';
      const payload = {};
      ['title','collection','priority','status','assignee','collaborator','dueDate','nextAction','evidence'].forEach((k) => {
        const v = getVal(k);
        if (v) payload[k] = v;
      });
      payload.steps = collectStepsFromEditor();

      if (id) {
        // 编辑已有任务
        const result = await api('/api/task/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(payload) });
        if (result.ok) {
          const tasks = state.data.tasks;
          const idx = tasks.findIndex((t) => t.id === id);
          if (idx !== -1) tasks[idx] = result.task;
          if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
          $('#taskEditModal').hidden = true;
          state.activeTaskId = id;
          renderTasks();
          toast('任务已更新');
        } else { toast(result.error || '保存失败'); }
      } else {
        // 新建任务
        const result = await api('/api/task', {
          method: 'POST',
          body: JSON.stringify({ ...payload, title: getVal('title'), owner: '运营负责人', system: '飞书' })
        });
        if (result.ok) {
          state.data.tasks.unshift(result.task);
          if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
          $('#taskEditModal').hidden = true;
          renderTasks();
          toast('任务已创建');
        } else { toast(result.error || '创建失败'); }
      }
      return;
    }

    // 归档按钮
    if (event.target.id === 'taskArchiveBtn') {
      const id = $('#taskEditForm').querySelector('[name="id"]').value;
      if (!id) return;
      const result = await api('/api/task/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status: '已归档' }) });
      if (result.ok) {
        const idx = state.data.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) state.data.tasks[idx] = result.task;
        $('#taskEditModal').hidden = true;
        state.activeTaskId = null;
        renderTasks();
        toast('已归档');
      } else { toast(result.error || '归档失败'); }
      return;
    }

    // 删除按钮
    if (event.target.id === 'taskDeleteBtn') {
      const id = $('#taskEditForm').querySelector('[name="id"]').value;
      if (!id) return;
      if (!confirm('确定删除这条任务？')) return;
      const result = await api('/api/task/' + encodeURIComponent(id), { method: 'DELETE' });
      if (result.ok) {
        state.data.tasks = state.data.tasks.filter((t) => t.id !== id);
        if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
        $('#taskEditModal').hidden = true;
        state.activeTaskId = null;
        renderTasks();
        toast('已删除');
      } else { toast(result.error || '删除失败'); }
      return;
    }

    // 任务编辑弹窗保存按钮（旧submit handler 已移除）
    if (event.target.id === 'taskEditSaveBtn_old') {
      event.preventDefault();
      const form = $('#taskEditForm');
      const id = form.querySelector('[name="id"]').value;
      if (!id) { toast('缺少任务ID'); return; }
      const getVal = (name) => form.querySelector('[name="' + name + '"]')?.value || '';
      const payload = {};
      ['title','collection','priority','status','assignee','collaborator','dueDate','nextAction','evidence'].forEach((k) => {
        const v = getVal(k);
        if (v) payload[k] = v;
      });
      payload.steps = collectStepsFromEditor();
      const result = await api('/api/task/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (result.ok) {
        const tasks = state.data.tasks;
        const idx = tasks.findIndex((t) => t.id === id);
        if (idx !== -1) tasks[idx] = result.task;
        if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
        $('#taskEditModal').hidden = true;
        state.activeTaskId = id;
        renderTasks();
        toast('任务已更新');
      } else {
        toast(result.error || '保存失败');
      }
      return;
    }

    const taskEdit = event.target.closest('[data-edit-task-id]');
    if (taskEdit) {
      event.stopPropagation();
      const task = (state.data.tasks || []).map(normalizeTask).find((t) => t.id === taskEdit.dataset.editTaskId);
      if (task) {
        const form = $('#taskEditForm');
        form.querySelector('[name="id"]').value = task.id;
        form.querySelector('[name="title"]').value = task.title || '';
        form.querySelector('[name="collection"]').value = task.collection || '其他任务';
        form.querySelector('[name="priority"]').value = task.priority || 'P1';
        form.querySelector('[name="status"]').value = task.status || task.boardStatus || '待开始';
        form.querySelector('[name="assignee"]').value = task.assignee || task.owner || '运营负责人';
        form.querySelector('[name="collaborator"]').value = task.collaborator || '';
        form.querySelector('[name="dueDate"]').value = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate||'') ? task.dueDate : '';
        form.querySelector('[name="nextAction"]').value = task.nextAction || '';
        form.querySelector('[name="evidence"]').value = task.evidence || '';
        // Build steps editor
        buildStepsEditor(taskChecklistItems(task));
        $('#taskEditModalKicker').textContent = task.id;
        $('#taskEditModalTitle').textContent = '编辑任务';
        $('#taskArchiveBtn').style.display = task.boardStatus === '已完成' ? '' : 'none';
        $('#taskDeleteBtn').style.display = '';
        $('#taskEditModal').hidden = false;
        form.querySelector('[name="title"]').focus();
      }
      return;
    }

    // Add step button in task edit modal
    const addStepBtn = event.target.closest('#addStepBtn');
    if (addStepBtn) {
      const container = $('#stepsEditor');
      const row = document.createElement('div');
      row.className = 'step-edit-row';
      row.innerHTML = '<input type="checkbox" class="step-check"><input type="text" class="step-input" placeholder="新步骤" value=""><button class="icon-btn step-delete-btn" type="button">×</button>';
      container.appendChild(row);
      row.querySelector('.step-input').focus();
      return;
    }

    // Delete step button
    const delStepBtn = event.target.closest('.step-delete-btn');
    if (delStepBtn) {
      delStepBtn.closest('.step-edit-row').remove();
      return;
    }

    const closeTaskEdit = event.target.closest('[data-close-task-edit]');
    if (closeTaskEdit || event.target.id === 'taskEditModal') {
      $('#taskEditModal').hidden = true;
      return;
    }

    const taskArchive = event.target.closest('[data-archive-task-id]');
    if (taskArchive) {
      event.stopPropagation();
      const result = await api('/api/task/' + encodeURIComponent(taskArchive.dataset.archiveTaskId), { method: 'PATCH', body: JSON.stringify({ status: '已归档' }) });
      if (result.ok) {
        const idx = state.data.tasks.findIndex((t) => t.id === taskArchive.dataset.archiveTaskId);
        if (idx !== -1) state.data.tasks[idx] = result.task;
        if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
        state.activeTaskId = null;
        renderTasks();
        toast('已归档');
      } else { toast(result.error || '归档失败'); }
      return;
    }

    const taskSync = event.target.closest('[data-sync-task-id]');
    if (taskSync) {
      event.stopPropagation();
      const taskId = taskSync.dataset.syncTaskId;
      toast('正在同步到飞书...');
      const result = await api('/api/sync-task-to-feishu', {
        method: 'POST',
        body: JSON.stringify({ id: taskId })
      });
      toast(result.ok ? '已同步到飞书任务管理' : (result.error || '飞书同步失败'));
      return;
    }

    const taskCopy = event.target.closest('[data-copy-task-id]');
    if (taskCopy) {
      event.stopPropagation();
      const task = (state.data.tasks || []).map(normalizeTask).find((item) => item.id === taskCopy.dataset.copyTaskId);
      if (task) await copyText(taskCopyText(task), '任务下一步已复制');
      return;
    }

    const taskAssign = event.target.closest('[data-assign-task-id]');
    if (taskAssign) {
      event.stopPropagation();
      const task = (state.data.tasks || []).map(normalizeTask).find((item) => item.id === taskAssign.dataset.assignTaskId);
      if (task) await copyText(taskAssignText(task), `已生成给 ${suggestedAgentForTask(task)} 的派工指令`);
      return;
    }

    const taskToggle = event.target.closest('[data-task-toggle-id]');
    if (taskToggle) {
      event.stopPropagation();
      await toggleTaskDone(taskToggle.dataset.taskToggleId);
      return;
    }

    const taskStep = event.target.closest('[data-task-step-id]');
    if (taskStep) {
      event.stopPropagation();
      await toggleTaskStep(taskStep.dataset.taskStepId, taskStep.dataset.taskStepIndex);
      return;
    }

    const closeTaskDetail = event.target.closest('[data-close-task-detail]');
    if (closeTaskDetail) {
      state.activeTaskId = null;
      $('#taskMidRow')?.classList.remove('with-detail');
      return;
    }

    const taskCard = event.target.closest('[data-task-id]');
    if (taskCard) {
      // 不拦截复选框和按钮的点击
      if (event.target.closest('[data-task-toggle-id], [data-task-step-id], [data-copy-task-id], [data-assign-task-id], [data-sync-task-id]')) return;
      const task = (state.data.tasks || []).map(normalizeTask).find((item) => item.id === taskCard.dataset.taskId);
      if (task) {
        state.activeTaskId = task.id;
        renderTasks();
      }
    }

    const category = event.target.closest('[data-category]');
    if (category) {
      state.activeCategory = category.dataset.category;
      state.activeIdeaId = null;
      state.activeLabItemId = null;
      renderHotLab();
      renderColumnDetailPanel();
    }

    const topic = event.target.closest('[data-topic]');
    if (topic) {
      state.activeTopic = topic.dataset.topic;
      state.activeIdeaId = null;
      state.activeLabItemId = null;
      renderHotLab();
    }

    const audience = event.target.closest('[data-audience]');
    if (audience) {
      state.activeAudience = audience.dataset.audience;
      state.activeIdeaId = null;
      state.activeLabItemId = null;
      renderHotLab();
    }

    const modelType = event.target.closest('[data-model-type]');
    if (modelType) {
      state.activeModelType = modelType.dataset.modelType;
      state.activeIdeaId = null;
      state.activeLabItemId = null;
      renderHotLab();
      // 模型筛选时右侧显示模型解析
      if (state.activeModelType !== '全部') {
        var md = getModelByName(state.activeModelType);
        if (md) {
          $('#labColumnDetail').style.display = 'block';
          $('#labMidRow').classList.add('with-column');
          $('#labColumnDetail').innerHTML =
            '<div class="detail-kicker" style="margin-bottom:4px">模型：' + escapeHtml(md.type) + '</div>' +
            '<p style="color:#4e594b;line-height:1.5;font-size:12px;margin:0 0 6px"><strong>结构</strong> ' + escapeHtml(md.structure) + '</p>' +
            '<p style="color:var(--muted);font-size:11px;line-height:1.5;margin:0 0 4px"><strong>爆点</strong> ' + escapeHtml(md.hook) + '</p>' +
            '<div style="padding:6px 8px;border-radius:8px;background:#f0f5e8;font-size:11px;color:#4a5e3a;line-height:1.5;margin-bottom:4px">🔧 ' + escapeHtml(md.adapt) + '</div>' +
            '<div style="padding:6px 8px;border-radius:8px;background:#fef3e4;font-size:11px;color:#7a5c1e;line-height:1.5">⚠️ ' + escapeHtml(md.risk) + '</div>';
        }
      } else {
        $('#labMidRow').classList.remove('with-column');
      }
    }

    const manageTaxonomy = event.target.closest('[data-manage-taxonomy]');
    if (manageTaxonomy) {
      openTaxonomyManager(manageTaxonomy.dataset.manageTaxonomy);
      return;
    }

    const settingsGroupTab = event.target.closest('[data-settings-group]');
    if (settingsGroupTab) {
      const groupKey = settingsGroupTab.dataset.settingsGroup;
      const view = settingsGroupTab.dataset.settingsView;
      state.activeTaxonomyGroup = groupKey;
      $('#taxonomyGroup').value = groupKey;
      $('#taxonomyView').value = view;
      const pageSettings = state.data?.pageSettings || {};
      const page = pageSettings[view];
      renderSettingsGroupTabs(page?.groups || [], view);
      renderTaxonomyManager();
      return;
    }

    const closeTaxonomy = event.target.closest('[data-close-taxonomy]');
    if (closeTaxonomy || event.target.id === 'taxonomyModal') {
      closeTaxonomyManager();
      return;
    }

    const deleteTaxonomy = event.target.closest('[data-delete-taxonomy]');
    if (deleteTaxonomy) {
      const group = deleteTaxonomy.dataset.deleteTaxonomy;
      const name = deleteTaxonomy.dataset.taxonomyName;

      if (group === 'models') {
        const view = $('#taxonomyView').value || 'hot';
        const result = await api('/api/page-setting', {
          method: 'PATCH',
          body: JSON.stringify({ view, group, action: 'delete', name, words: '', note: '' })
        });
        if (result.ok) {
          state.data.pageSettings = result.pageSettings;
          if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
          renderHotLab();
          renderTaxonomyManager();
          toast('模型已删除');
        } else {
          toast(result.error || '删除失败');
        }
        return;
      }

      const ok = await patchTaxonomy({
        group,
        action: 'delete',
        name
      });
      if (ok) toast('分类项已删除');
      return;
    }

    const idea = event.target.closest('[data-idea-id]');
    if (idea) {
      state.activeIdeaId = idea.dataset.ideaId;
      renderIdeas();
    }

    const labWork = event.target.closest('[data-lab-work-id]');
    if (labWork) {
      state.activeLabItemId = labWork.dataset.labWorkId;
      renderAccountHighWorks();
    }

    const externalModel = event.target.closest('[data-external-model-id]');
    if (externalModel) {
      state.activeLabItemId = externalModel.dataset.externalModelId;
      renderExternalModels();
    }

    const labColumn = event.target.closest('[data-lab-column]');
    if (labColumn) {
      renderColumnDetail(labColumn.dataset.labColumn);
    }

    const labAsset = event.target.closest('[data-lab-asset-title]');
    if (labAsset) {
      state.activeLabItemId = labAsset.dataset.labAssetTitle;
      renderAssetLibraryBoard();
    }

    const work = event.target.closest('[data-work-id]');
    if (work) {
      state.activeWorkId = work.dataset.workId;
      renderWorks();
    }

    const workFilter = event.target.closest('[data-work-filter]');
    if (workFilter) {
      const value = workFilter.dataset.workValue;
      if (workFilter.dataset.workFilter === 'view') state.workView = value;
      if (workFilter.dataset.workFilter === 'format') state.workFormat = value;
      if (workFilter.dataset.workFilter === 'engagement') state.workEngagement = value;
      if (workFilter.dataset.workFilter === 'layout') state.workLayout = value;
      if (workFilter.dataset.workFilter === 'category') {
        state.workCategory = value;
        $('#workCategoryFilter').value = value;
      }
      state.activeWorkId = null;
      renderWorks();
    }

    // 查看书籍相关经验
    const viewExpBook = event.target.closest('[data-view-exp-book]');
    if (viewExpBook) {
      event.stopPropagation();
      state.experienceKeyword = viewExpBook.dataset.viewExpBook;
      $('#experienceSearch').value = state.experienceKeyword;
      setView('experience');
      renderExperiences();
      return;
    }

    const bookCard = event.target.closest('[data-book-id]');
    if (bookCard) {
      state.activeLabItemId = bookCard.dataset.bookId;
      renderBookLibrary();
    }

    const bookCat = event.target.closest('[data-book-category]');
    if (bookCat) {
      state.bookCategory = bookCat.dataset.bookCategory;
      renderBookLibrary();
    }

    const assetTab = event.target.closest('[data-asset-tab]');
    if (assetTab) {
      state.activeAssetTab = assetTab.dataset.assetTab;
      state.activeIdeaId = null;
      state.activeLabItemId = null;
      state.ideaKeyword = '';
      if ($('#ideaSearch')) $('#ideaSearch').value = '';
      $$('.asset-tab').forEach((item) => item.classList.toggle('active', item.dataset.assetTab === state.activeAssetTab));
      renderActiveLab();
    }

    const expLibrary = event.target.closest('[data-exp-library]');
    if (expLibrary) {
      state.experienceLibrary = expLibrary.dataset.expLibrary;
      resetExperienceFilters();
      renderExperiences();
    }

    // 能力标签点击
    const expCapTag = event.target.closest('[data-exp-cap]');
    if (expCapTag) {
      event.stopPropagation();
      var c=expCapTag.dataset.expCap;
      var defs={'洞察能力':'从会议、数据、用户反馈中抓取关键信号，发现别人没注意到的问题和机会','总结能力':'把零散的信息消化成结构化的理解、可复用的方法和自己的判断','表达能力':'准确、简洁地把想法传递出去，让对方听懂并采取行动'};
      state.expCapTooltip='<strong>'+c+'</strong>：'+(defs[c]||'');
      state.activeExpCap=c;
      renderExperiences();
      return;
    }

    const expFilter = event.target.closest('[data-exp-filter]');
    if (expFilter) {
      const key = expFilter.dataset.expFilter;
      const value = expFilter.dataset.expValue;
      if (key==='expCap'){ state.activeExpCap=value; state.expCapTooltip=value!=='全部'?('<strong>'+value+'</strong>：'+({'洞察能力':'从会议、数据、用户反馈中抓取关键信号','总结能力':'把零散信息消化成结构化理解和可复用方法','表达能力':'准确简洁地传递想法让对方听懂并行动'}[value]||'')):''; }
      else if (state[key] !== undefined) state[key] = value;
      renderExperiences();
    }

    const expView = event.target.closest('[data-exp-view]');
    if (expView) {
      state.experienceView = expView.dataset.expView;
      renderExperiences();
    }

    const expPending = event.target.closest('[data-exp-pending]');
    if (expPending) {
      state.experiencePendingOnly = !state.experiencePendingOnly;
      renderExperiences();
    }

    const editCompetitor = event.target.closest('[data-edit-competitor]');
    if (editCompetitor) {
      const account = (state.competitorAccounts || []).find((a) => a.id === editCompetitor.dataset.editCompetitor);
      if (account) {
        const form = $('#competitorForm');
        form.querySelector('[name="id"]').value = account.id;
        form.querySelector('[name="name"]').value = account.name || '';
        form.querySelector('[name="platform"]').value = account.platform || '小红书';
        form.querySelector('[name="followers"]').value = account.followers || '';
        form.querySelector('[name="contentDirection"]').value = account.contentDirection || '';
        form.querySelector('[name="postFrequency"]').value = account.postFrequency || '';
        form.querySelector('[name="url"]').value = account.url || '';
        form.querySelector('[name="strengths"]').value = (account.strengths || []).join('\n');
        form.querySelector('[name="weaknesses"]').value = (account.weaknesses || []).join('\n');
        form.querySelector('[name="ourOpportunity"]').value = account.ourOpportunity || '';
        form.querySelector('[name="notes"]').value = account.notes || '';
        $('#competitorModalTitle').textContent = '编辑对标账号';
        $('#competitorModal').hidden = false;
      }
    }

    const closeCompetitor = event.target.closest('[data-close-competitor]');
    if (closeCompetitor || (event.target.id === 'competitorModal' && !event.target.closest('.taxonomy-modal'))) {
      $('#competitorModal').hidden = true;
    }

    // 从作品库添加经验
    const addExpFromWork = event.target.closest('[data-add-exp-from-work]');
    if (addExpFromWork) {
      event.stopPropagation();
      const form = $('#experienceForm');
      form.querySelector('[name="title"]').value = '';
      form.querySelector('[name="body"]').value = '';
      const src = addExpFromWork.dataset.addExpFromWork;
      const prefix = src === 'COMP' ? '对标 ' : src === 'book' ? '书籍 ' : '作品 ';
      form.querySelector('[name="caseId"]').value = prefix + addExpFromWork.dataset.expTitle;
      form.querySelector('[name="library"]').value = src === 'content' ? 'content' : 'library';
      form.querySelector('[name="library"]').value = 'content';
      $('#experienceModal').hidden = false;
      form.querySelector('[name="title"]').focus();
      return;
    }

    // 预览经验关联的帖子（侧边展示，不跳转）
    const previewBtn = event.target.closest('[data-preview-work]');
    if (previewBtn) {
      event.stopPropagation();
      var wid=previewBtn.dataset.previewWork;
      var pw=(state.xhsWorks||[]).find(function(w){return w.id===wid});
      if(pw){
        var preview=$('#expWorkPreview');
        if(preview){
          preview.style.display='block';
          preview.innerHTML='<strong>'+escapeHtml(pw.title||'')+'</strong>'+
            '<div class="idea-meta" style="margin:6px 0">'+workMetaHtml(pw)+'</div>'+
            '<div style="margin-top:8px;color:#4e594b;line-height:1.7;max-height:200px;overflow:auto">'+(pw.content||pw.description||'正文待补').replace(/\n/g,'<br>')+'</div>';
        }
      }
      return;
    }

    // 经验卡片点击查看详情
    const expCard = event.target.closest('[data-exp-id]');
    if (expCard) {
      state.activeExpId = expCard.dataset.expId;
      renderExperiences();
      return;
    }

    const addExpBtn = event.target.closest('#addExperienceBtn');
    if (addExpBtn) {
      $('#experienceModal').hidden = false;
      $('#experienceForm').reset();
      $('#experienceForm').querySelector('[name="library"]').value = state.experienceLibrary;
      $('#experienceForm').querySelector('[name="title"]').focus();
    }

    const closeExpBtn = event.target.closest('[data-close-experience]');
    if (closeExpBtn || (event.target.id === 'experienceModal' && !event.target.closest('.taxonomy-modal'))) {
      $('#experienceModal').hidden = true;
    }

    const scriptBtn = event.target.closest('[data-script]');
    if (scriptBtn) {
      var logEl = $('#syncLog'); if (logEl) logEl.textContent = '运行中...';
      const result = await api('/api/run-script', {
        method: 'POST',
        body: JSON.stringify({ name: scriptBtn.dataset.script })
      });
      if (logEl) logEl.textContent = JSON.stringify(result, null, 2);
      toast(result.ok ? '脚本运行完成' : (result.error || '脚本未启用'));
    }
  });

  document.body.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!$('#taskEditModal').hidden) {
        $('#taskEditModal').hidden = true;
        return;
      }
      if (!$('#competitorModal').hidden) {
        $('#competitorModal').hidden = true;
        return;
      }
      if (!$('#experienceModal').hidden) {
        $('#experienceModal').hidden = true;
        return;
      }
      if (!$('#taxonomyModal').hidden) {
        closeTaxonomyManager();
        return;
      }
    }

    const idea = event.target.closest?.('[data-idea-id]');
    if (idea && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.activeIdeaId = idea.dataset.ideaId;
      renderIdeas();
    }

    const labWork = event.target.closest?.('[data-lab-work-id]');
    if (labWork && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.activeLabItemId = labWork.dataset.labWorkId;
      renderAccountHighWorks();
    }

    const externalModel = event.target.closest?.('[data-external-model-id]');
    if (externalModel && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.activeLabItemId = externalModel.dataset.externalModelId;
      renderExternalModels();
    }

    const labColumn = event.target.closest?.('[data-lab-column]');
    if (labColumn && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      renderColumnDetail(labColumn.dataset.labColumn);
    }

    const labAsset = event.target.closest?.('[data-lab-asset-title]');
    if (labAsset && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.activeLabItemId = labAsset.dataset.labAssetTitle;
      renderAssetLibraryBoard();
    }

    const work = event.target.closest?.('[data-work-id]');
    if (work && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      state.activeWorkId = work.dataset.workId;
      renderWorks();
    }

    const taskCard = event.target.closest?.('[data-task-id]');
    if (taskCard && (event.key === 'Enter' || event.key === ' ')) {
      if (event.target.closest?.('[data-copy-task-id], [data-assign-task-id], [data-task-toggle-id], [data-task-step-id]')) return;
      event.preventDefault();
      taskCard.click();
    }
  });

  document.body.addEventListener('submit', async (event) => {
    if (event.target.id === 'taxonomyForm') {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const name = String(payload.name || '').trim();
      if (!name) {
        toast('先填写名称');
        return;
      }
      const group = payload.group;
      const view = payload.view || 'hot';

      // models 组走页面设置 API
      if (group === 'models') {
        const result = await api('/api/page-setting', {
          method: 'PATCH',
          body: JSON.stringify({ view, group, action: 'add', name, words: payload.words, note: '' })
        });
        if (result.ok) {
          state.data.pageSettings = result.pageSettings;
          if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
          renderHotLab();
          renderTaxonomyManager();
          toast('模型已保存');
        } else {
          toast(result.error || '保存失败');
        }
        return;
      }

      const ok = await patchTaxonomy({
        group,
        action: 'add',
        name,
        words: payload.words
      });
      if (ok) toast('分类项已保存');
      return;
    }

    if (event.target.id === 'ideaEditForm') {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(event.target).entries());
      const id = raw.id;
      const payload = {};
      Object.keys(raw).forEach((key) => {
        if (key !== 'id' && raw[key] !== '') payload[key] = raw[key];
      });
      if (!Object.keys(payload).length) { toast('没有修改'); return; }
      const result = await api('/api/idea/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (result.ok) {
        // Update in-place
        const ideas = state.data.hotContentLab.ideas;
        const idx = ideas.findIndex((i) => i.id === id);
        if (idx !== -1) ideas[idx] = result.idea;
        if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
        renderIdeas();
        toast('选题已更新');
      } else {
        toast(result.error || '保存失败');
      }
      return;
    }

    if (event.target.id === 'competitorForm') {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(event.target).entries());
      const name = String(raw.name || '').trim();
      if (!name) { toast('先填写账号名称'); return; }

      const payload = {
        name,
        platform: raw.platform || '小红书',
        url: raw.url || '',
        followers: raw.followers || '',
        contentDirection: raw.contentDirection || '',
        postFrequency: raw.postFrequency || '',
        strengths: raw.strengths || '',
        weaknesses: raw.weaknesses || '',
        ourOpportunity: raw.ourOpportunity || '',
        notes: raw.notes || ''
      };

      const accountId = raw.id;
      if (accountId) {
        // 编辑已有
        const result = await api(`/api/competitor-account/${encodeURIComponent(accountId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        if (result.ok) {
          const idx = state.competitorAccounts.findIndex((a) => a.id === accountId);
          if (idx !== -1) state.competitorAccounts[idx] = result.account;
          toast('已更新');
        } else {
          toast(result.error || '更新失败'); return;
        }
      } else {
        // 新增
        const result = await api('/api/competitor-account', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (result.ok) {
          state.competitorAccounts.unshift(result.account);
          toast('已添加');
        } else {
          toast(result.error || '添加失败'); return;
        }
      }

      $('#competitorModal').hidden = true;
      event.target.reset();
      renderCompetitorAccounts();
      return;
    }

    if (event.target.id === 'experienceForm') {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const title = String(payload.title || '').trim();
      const body = String(payload.body || '').trim();
      if (!title) {
        toast('先填写经验标题');
        return;
      }
      if (body.length < 10) {
        toast('经验内容至少10个字');
        return;
      }
      const result = await api('/api/experience', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!result.ok) {
        toast(result.error || '保存失败');
        return;
      }
      state.experiences.unshift(result.item);
      $('#experienceModal').hidden = true;
      event.target.reset();
      renderExperiences();
      toast(`已保存经验 ${result.item.id}`);
      return;
    }

    if (event.target.id === 'taskEditForm') {
      event.preventDefault();
      return;
    }

    if (event.target.id === 'taskCaptureForm') {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const title = String(payload.title || '').trim();
      if (!title) {
        toast('先写任务标题');
        return;
      }
      const result = await api('/api/task', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          title,
          owner: '运营负责人',
          system: '飞书',
          assignee: payload.assignee || '运营负责人',
          collaborator: payload.collaborator || ''
        })
      });
      if (!result.ok) {
        toast(result.error || '任务保存失败');
        return;
      }
      state.data.tasks.unshift(result.task);
      if (result.updatedAt) {
        state.data.meta.updatedAt = result.updatedAt;
        $('#syncTime').textContent = `更新时间 ${state.data.meta.updatedAt}`;
      }
      event.target.reset();
      renderTasks();
      toast('已保存到任务计划');
      return;
    }

    if (event.target.id === 'workMetaForm') {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(event.target).entries());
      const payload = { id: raw.id };
      // Only include non-empty values
      Object.keys(raw).forEach((key) => {
        if (key !== 'id' && raw[key] !== '') payload[key] = raw[key];
      });
      if (Object.keys(payload).length <= 1) {
        toast('没有要保存的修改');
        return;
      }
      const result = await api(`/api/xhs-work/${encodeURIComponent(payload.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      toast(result.ok ? '修正已保存，刷新作品库查看' : result.error || '保存失败');
      if (result.ok) await loadXhsWorks();
      return;
    }

    if (event.target.id !== 'manualDetailForm') return;
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const result = await api('/api/xhs-work-detail', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    toast(result.ok ? '作品详情已保存' : result.error || '保存失败');
    if (result.ok) await loadXhsWorks();
  });

  $('#globalSearch')?.addEventListener('input', applySearch);
  $('#taskSearch').addEventListener('input', (event) => {
    state.taskKeyword = event.target.value;
    renderTasks();
  });
  $('#ideaSearch').addEventListener('input', applyIdeaSearch);
  $('#workSearch').addEventListener('input', applyWorkFilters);
  $('#workCategoryFilter').addEventListener('change', applyWorkFilters);
  $('#workStatusFilter')?.addEventListener('change', applyWorkFilters);
  $('#workSortFilter').addEventListener('change', applyWorkFilters);

  $('#experienceSearch').addEventListener('input', (event) => {
    state.experienceKeyword = event.target.value;
    renderExperiences();
  });
  $('#experienceSort').addEventListener('change', (event) => {
    state.experienceSort = event.target.value;
    renderExperiences();
  });

  $('#copyGrowthBtn').addEventListener('click', () => copyText(growthReportText(), '增长日报已复制'));
  $('#copyIdeaBtn').addEventListener('click', () => copyText(ideaBriefText(), '选题简报已复制'));
  // 管理本页已移除，各筛选器用 + 按钮直接管理
  // copyFollowBtn 已移除，跟进草稿复制在弹窗内操作
  $('#refreshGrowthHistoryBtn').addEventListener('click', loadGrowthEntries);
  $('#refreshCrawlBtn').addEventListener('click', loadCrawlSummary);
  $('#runSummaryBtn').addEventListener('click', async () => {
    $('#crawlSummary').innerHTML = '<p class="empty-text">正在生成采集汇总...</p>';
    const result = await api('/api/run-safe-command', {
      method: 'POST',
      body: JSON.stringify({ name: '生成采集汇总' })
    });
    toast(result.ok ? '采集汇总已生成' : '采集汇总失败，查看同步日志');
    await loadCrawlSummary();
  });
  // refreshFollowBtn 已移除，跟进列表通过 loadFollowDrafts 自动刷新
  $('#refreshAssetsBtn').addEventListener('click', loadContentAssets);
  $('#refreshWorksBtn').addEventListener('click', loadXhsWorks);
  $('#refreshMinutesBtn').addEventListener('click', loadLarkMinutesDigest);
  $('#copyMinutesDigestBtn').addEventListener('click', () => copyText(minutesDigestText(), '飞书妙记周报草稿已复制'));
  $('#generateMinutesMockBtn').addEventListener('click', async () => {
    $('#minutesSummary').innerHTML = '<p class="empty-text">正在生成本地示例草稿...</p>';
    const result = await api('/api/run-safe-command', {
      method: 'POST',
      body: JSON.stringify({ name: '生成飞书妙记示例草稿' })
    });
    toast(result.ok ? '飞书妙记示例草稿已生成' : result.error || '生成失败，查看同步日志');
    await loadLarkMinutesDigest();
  });
  $('#closeWorkDetail').addEventListener('click', () => {
    state.activeWorkId = null;
    $('.library-console')?.classList.remove('with-detail');
    $('#workDetail').innerHTML = '点击左侧作品查看正文、发布时间、数据口径和分析提示。';
  });
  // 一键转任务
  document.body.addEventListener('click', async (event) => {
    const convertBtn = event.target.closest('.convert-to-task');
    if (!convertBtn) return;
    const title = convertBtn.dataset.convertTitle || '新任务';
    const collection = convertBtn.dataset.convertCollection || '其他任务';
    const assignee = convertBtn.dataset.convertAssignee || '运营负责人';
    const nextAction = convertBtn.dataset.convertNext || '待补下一步动作';

    const result = await api('/api/task', {
      method: 'POST',
      body: JSON.stringify({
        title,
        collection,
        system: '本地',
        owner: '运营负责人',
        assignee,
        collaborator: '',
        priority: 'P1',
        status: '待开始',
        dueDate: '',
        nextAction,
        evidence: '从' + (convertBtn.dataset.convertSource === 'growth' ? '增长日报' : convertBtn.dataset.convertSource === 'minutes' ? '飞书妙记' : '复盘') + '自动生成'
      })
    });
    if (result.ok) {
      state.data.tasks.unshift(result.task);
      if (result.updatedAt) { state.data.meta.updatedAt = result.updatedAt; $('#syncTime').textContent = '更新时间 ' + state.data.meta.updatedAt; }
      renderTasks();
      toast('已转为任务：' + result.task.id);
    } else {
      toast(result.error || '创建失败');
    }
  });

  $('#syncAllTasksBtn').addEventListener('click', async () => {
    const tasks = state.data.tasks || [];
    if (!tasks.length) { toast('没有任务可同步'); return; }
    toast('正在同步 ' + tasks.length + ' 条任务...');
    let ok = 0, fail = 0;
    for (const task of tasks) {
      const result = await api('/api/sync-task-to-feishu', { method: 'POST', body: JSON.stringify({ id: task.id }) });
      if (result.ok) ok++; else fail++;
    }
    toast('同步完成：' + ok + ' 成功 / ' + fail + ' 失败');
  });

  $('#sidebarCollapseBtn').addEventListener('click', () => {
    const shell = $('.app-shell');
    const collapsed = shell.classList.toggle('collapsed');
    const btn = $('#sidebarCollapseBtn');
    btn.textContent = collapsed ? '▶' : '◀';
    btn.title = collapsed ? '展开侧边栏' : '折叠侧边栏';
  });
  const addFollowBtn = $('#addFollowBtn');
  if (addFollowBtn) addFollowBtn.addEventListener('click', function(){
    const form = $('#followForm');
    if (!form) return;
    form.reset();
    const resultEl = $('#followResult');
    if (resultEl) { resultEl.style.display = 'none'; resultEl.textContent = ''; }
    const saveBtn = $('#saveFollowBtn');
    if (saveBtn) saveBtn.style.display = 'none';
    $('#followModal').hidden = false;
    form.querySelector('[name="question"]')?.focus();
  });
  const closeFollowBtn = $('[data-close-follow]');
  if (closeFollowBtn) closeFollowBtn.addEventListener('click', function(){
    $('#followModal').hidden = true;
  });

  // 客户跟进搜索
  $('#followSearch')?.addEventListener('input', function(){ renderFollowDrafts(); });

  var addCompBtn=$('#addCompetitorBtn'); if(addCompBtn) addCompBtn.addEventListener('click', () => {
    $('#competitorForm').reset();
    $('#competitorForm').querySelector('[name="id"]').value = '';
    $('#competitorModalTitle').textContent = '添加对标账号';
    $('#competitorModal').hidden = false;
    $('#competitorForm').querySelector('[name="name"]').focus();
  });
  // 资方管理：新增
  function openInvestorForm() {
    $('#investorForm').reset();
    $('#investorForm').querySelector('[name="id"]').value = '';
    $('#investorModalTitle').textContent = '新增资方';
    $('#investorModal').hidden = false;
    $('#investorForm').querySelector('[name="name"]').focus();
  }
  var addInvBtn = $('#addInvestorBtn'); if (addInvBtn) addInvBtn.addEventListener('click', openInvestorForm);
  var addInvTop = $('#addInvestorTopBtn'); if (addInvTop) addInvTop.addEventListener('click', openInvestorForm);
  // 资方管理：关闭弹窗
  var closeInvBtn = $('[data-close-investor]'); if (closeInvBtn) closeInvBtn.addEventListener('click', () => {
    $('#investorModal').hidden = true;
  });
  // 资方管理：提交表单
  $('#investorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id;
    var isNew = !id;
    var endpoint = isNew ? '/api/investor' : '/api/investor/' + encodeURIComponent(id);
    var method = isNew ? 'POST' : 'PATCH';
    var result = await api(endpoint, { method: method, body: JSON.stringify(payload) });
    if (result.ok) {
      $('#investorModal').hidden = true;
      toast(isNew ? '已添加资方' : '已更新资方');
      await loadInvestors();
    } else {
      toast(result.error || '保存失败');
    }
  });
  // 资方管理：搜索（顶部搜索框）
  $('#investorTopSearch')?.addEventListener('input', function() { renderInvestors(); });
  // 资方管理：阶段筛选
  $('#investorStageFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-inv-filter]');
    if (!btn) return;
    state.investorFilter = btn.dataset.invFilter;
    renderInvestors();
  });
  // 资方管理：分类筛选
  $('#investorTypeFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-inv-type]');
    if (!btn) return;
    state.investorTypeFilter = btn.dataset.invType;
    renderInvestors();
  });
  // 资方管理：路演筛选（与谈判互斥）
  $('#investorRoadshowFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-inv-roadshow]');
    if (!btn) return;
    state.investorRoadshowFilter = btn.dataset.invRoadshow;
    state.investorCoopFilter = '全部';
    renderInvestors();
  });
  // 资方管理：谈判筛选（与路演互斥）
  $('#investorCoopFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-inv-coop]');
    if (!btn) return;
    state.investorCoopFilter = btn.dataset.invCoop;
    state.investorRoadshowFilter = '全部';
    renderInvestors();
  });
  // 资方管理：删除（事件委托）
  $('#investorList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-investor]');
    if (!delBtn) return;
    var id = delBtn.dataset.deleteInvestor;
    if (!confirm('确定删除资方 ' + id + '？')) return;
    var result = await api('/api/investor/' + encodeURIComponent(id), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadInvestors(); }
    else { toast(result.error || '删除失败'); }
  });
  // 日程管理：新增
  var addSchBtn = $('#addScheduleBtn'); if (addSchBtn) addSchBtn.addEventListener('click', () => {
    $('#scheduleForm').reset();
    $('#scheduleForm').querySelector('[name="id"]').value = '';
    $('#scheduleModalTitle').textContent = '新增日程';
    $('#scheduleModal').hidden = false;
  });
  // 日程管理：关闭弹窗
  var closeSchBtn = $('[data-close-schedule]'); if (closeSchBtn) closeSchBtn.addEventListener('click', () => {
    $('#scheduleModal').hidden = true;
  });
  // 日程管理：提交表单
  $('#scheduleForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id;
    var isNew = !id;
    var endpoint = isNew ? '/api/schedule' : '/api/schedule/' + encodeURIComponent(id);
    var method = isNew ? 'POST' : 'PATCH';
    var result = await api(endpoint, { method: method, body: JSON.stringify(payload) });
    if (result.ok) {
      $('#scheduleModal').hidden = true;
      toast(isNew ? '已添加日程' : '已更新日程');
      await loadSchedules();
    } else {
      toast(result.error || '保存失败');
    }
  });
  // 日程管理：删除（事件委托）
  $('#scheduleList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-schedule]');
    if (!delBtn) return;
    var id = delBtn.dataset.deleteSchedule;
    if (!confirm('确定删除日程 ' + id + '？')) return;
    var result = await api('/api/schedule/' + encodeURIComponent(id), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadSchedules(); }
    else { toast(result.error || '删除失败'); }
  });

  // 人脉推荐：新增
  $('#addReferralBtn')?.addEventListener('click', () => {
    $('#referralForm').reset();
    $('#referralForm').querySelector('[name="id"]').value = '';
    $('#referralModalTitle').textContent = '新增人脉';
    $('#referralModal').hidden = false;
  });
  $('[data-close-referral]')?.addEventListener('click', () => { $('#referralModal').hidden = true; });
  $('#referralForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id;
    var isNew = !id;
    var endpoint = isNew ? '/api/referral' : '/api/referral/' + encodeURIComponent(id);
    var method = isNew ? 'POST' : 'PATCH';
    var result = await api(endpoint, { method: method, body: JSON.stringify(payload) });
    if (result.ok) { $('#referralModal').hidden = true; toast(isNew ? '已添加人脉' : '已更新'); await loadReferrals(); }
    else { toast(result.error || '保存失败'); }
  });
  $('#referralSearch')?.addEventListener('input', function() { renderReferrals(); });
  $('#referralOrgFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-referral-filter]');
    if (!btn) return;
    state.referralFilter = btn.dataset.referralFilter;
    renderReferrals();
  });
  $('#referralList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-referral]');
    if (!delBtn) return;
    var id = delBtn.dataset.deleteReferral;
    if (!confirm('确定删除人脉 ' + id + '？')) return;
    var result = await api('/api/referral/' + encodeURIComponent(id), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadReferrals(); }
    else { toast(result.error || '删除失败'); }
  });

  // P4 会议纪要事件
  function openMeetingNoteForm() {
    $('#meetingNoteForm').reset();
    $('#meetingNoteForm').querySelector('[name="id"]').value = '';
    $('#meetingNoteModalTitle').textContent = '新增会议纪要';
    $('#meetingNoteModal').hidden = false;
  }
  $('#addMeetingNoteTopBtn')?.addEventListener('click', openMeetingNoteForm);
  $('[data-close-meeting-note]')?.addEventListener('click', () => { $('#meetingNoteModal').hidden = true; });
  $('#meetingNoteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id; var isNew = !id;
    var endpoint = isNew ? '/api/meeting-note' : '/api/meeting-note/' + encodeURIComponent(id);
    var result = await api(endpoint, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(payload) });
    if (result.ok) { $('#meetingNoteModal').hidden = true; toast(isNew ? '已添加纪要' : '已更新'); await loadMeetingNotes(); }
    else { toast(result.error || '保存失败'); }
  });
  $('#mnTypeFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-mn-filter]');
    if (!btn) return;
    state.meetingNoteFilter = btn.dataset.mnFilter;
    renderMeetingNotes();
  });
  $$('[data-mn-view]').forEach(function(btn) {
    btn.addEventListener('click', function() { state.meetingNoteView = btn.dataset.mnView; renderMeetingNotes(); });
  });
  $('#meetingNoteList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-meeting-note]');
    if (!delBtn) return;
    if (!confirm('确定删除纪要？')) return;
    var result = await api('/api/meeting-note/' + encodeURIComponent(delBtn.dataset.deleteMeetingNote), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadMeetingNotes(); }
    else { toast(result.error || '删除失败'); }
  });

  // P2 业务数据事件
  function openMetricForm() {
    $('#metricForm').reset();
    $('#metricForm').querySelector('[name="id"]').value = '';
    $('#metricModalTitle').textContent = '新增数据';
    $('#metricModal').hidden = false;
  }
  $('#addMetricTopBtn')?.addEventListener('click', openMetricForm);
  $('[data-close-metric]')?.addEventListener('click', () => { $('#metricModal').hidden = true; });
  $('#metricForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id; var isNew = !id;
    var endpoint = isNew ? '/api/metric' : '/api/metric/' + encodeURIComponent(id);
    var result = await api(endpoint, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(payload) });
    if (result.ok) { $('#metricModal').hidden = true; toast(isNew ? '已添加数据' : '已更新'); await loadMetrics(); }
    else { toast(result.error || '保存失败'); }
  });
  $('#metricCategoryFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-metric-filter]');
    if (!btn) return;
    state.metricFilter = btn.dataset.metricFilter;
    renderMetrics();
  });
  $$('[data-metric-view]').forEach(function(btn) {
    btn.addEventListener('click', function() { state.metricView = btn.dataset.metricView; renderMetrics(); });
  });
  $('#metricList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-metric]');
    if (!delBtn) return;
    if (!confirm('确定删除数据？')) return;
    var result = await api('/api/metric/' + encodeURIComponent(delBtn.dataset.deleteMetric), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadMetrics(); }
    else { toast(result.error || '删除失败'); }
  });

  // 资方视图切换
  $$('[data-inv-view]').forEach(function(btn){
    btn.addEventListener('click', function(){
      state.investorView = btn.dataset.invView;
      renderInvestors();
    });
  });

  // 归档资方切换
  $('#toggleArchivedBtn')?.addEventListener('click', () => {
    state.showArchivedInvestors = !state.showArchivedInvestors;
    renderInvestors();
  });

  // 侧边栏分组折叠
  try {
    var navLabels = document.querySelectorAll('.nav-section-label');
    for (var i = 0; i < navLabels.length; i++) {
      (function(label) {
        label.style.cursor = 'pointer';
        label.style.userSelect = 'none';
        label.addEventListener('click', function() {
          var collapsed = !label.classList.contains('collapsed');
          if (collapsed) { label.classList.add('collapsed'); }
          else { label.classList.remove('collapsed'); }
          var next = label.nextElementSibling;
          while (next && !next.classList.contains('nav-section-label')) {
            next.style.display = collapsed ? 'none' : '';
            next = next.nextElementSibling;
          }
        });
      })(navLabels[i]);
    }
  } catch(e) { console.error('nav collapse error:', e); }

  // 飞书文档：新增
  var addFeishuDocBtn = $('#addFeishuDocBtn'); if (addFeishuDocBtn) addFeishuDocBtn.addEventListener('click', () => {
    $('#feishuDocForm').reset();
    $('#feishuDocForm').querySelector('[name="id"]').value = '';
    $('#feishuDocModalTitle').textContent = '新增文档';
    $('#feishuDocModal').hidden = false;
    $('#feishuDocForm').querySelector('[name="title"]').focus();
  });
  // 飞书文档：关闭弹窗
  var closeFeishuDocBtn = $('[data-close-feishu-doc]'); if (closeFeishuDocBtn) closeFeishuDocBtn.addEventListener('click', () => {
    $('#feishuDocModal').hidden = true;
  });
  // 飞书文档：提交表单
  $('#feishuDocForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    var payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    var id = payload.id;
    var isNew = !id;
    var endpoint = isNew ? '/api/feishu-doc' : '/api/feishu-doc/' + encodeURIComponent(id);
    var method = isNew ? 'POST' : 'PATCH';
    var result = await api(endpoint, { method: method, body: JSON.stringify(payload) });
    if (result.ok) {
      $('#feishuDocModal').hidden = true;
      toast(isNew ? '已添加文档' : '已更新文档');
      await loadFeishuDocs();
    } else {
      toast(result.error || '保存失败');
    }
  });
  // 飞书文档：搜索
  $('#feishuDocSearch')?.addEventListener('input', function() { renderFeishuDocs(); });
  // 飞书文档：分类筛选
  $('#feishuDocCategoryFilters')?.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-feishu-filter]');
    if (!btn) return;
    state.feishuDocFilter = btn.dataset.feishuFilter;
    renderFeishuDocs();
  });
  // 飞书文档：删除（事件委托）
  $('#feishuDocList')?.addEventListener('click', async function(e) {
    var delBtn = e.target.closest('[data-delete-feishu-doc]');
    if (!delBtn) return;
    var id = delBtn.dataset.deleteFeishuDoc;
    if (!confirm('确定删除文档 ' + id + '？')) return;
    var result = await api('/api/feishu-doc/' + encodeURIComponent(id), { method: 'DELETE' });
    if (result.ok) { toast('已删除'); await loadFeishuDocs(); }
    else { toast(result.error || '删除失败'); }
  });

  $('#clearGrowthBtn').addEventListener('click', () => {
    $('#growthPaste').value = '';
    toast('粘贴区已清空');
  });

  $('#parseGrowthBtn').addEventListener('click', () => {
    const text = $('#growthPaste').value.trim();
    if (!text) {
      toast('先粘贴一段平台数据');
      return;
    }
    fillGrowthForm(parseGrowthText(text));
    toast('已解析到表单，请人工核对后保存');
  });

  $('#followForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await api('/api/followup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.currentFollow = { ...result, stage: payload.stage };
    $('#followResult').style.display = 'block';
    $('#followResult').textContent = followResultText(result);
    $('#saveFollowBtn').style.display = '';
  });

  const saveFollowBtn = $('#saveFollowBtn');
  if (saveFollowBtn) saveFollowBtn.addEventListener('click', async () => {
    if (!state.currentFollow) { toast('先生成跟进草稿'); return; }
    const result = await api('/api/followup-draft', {
      method: 'POST',
      body: JSON.stringify({
        customerType: state.currentFollow.customerType, source: state.currentFollow.source,
        stage: state.currentFollow.stage, question: state.currentFollow.question,
        message: state.currentFollow.message, nextAction: state.currentFollow.fields?.下一步动作,
        feishuFields: state.currentFollow.fields
      })
    });
    toast('已保存 ' + result.draft.id);
    $('#followModal').hidden = true;
    await loadFollowDrafts();
  });

  $('#growthForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await api('/api/growth-entry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    toast(`已保存 ${result.entry.platform} 日报记录`);
    event.currentTarget.reset();
    await loadGrowthEntries();
  });

}

async function loadNotes() {
  const result = await api('/api/obsidian');
  state.notes = result.notes;
  renderNotes();
}

async function loadGrowthEntries() {
  const result = await api('/api/growth-entries');
  state.growthEntries = result.entries;
  renderGrowthHistory();
}

async function loadCrawlSummary() {
  const [crawlSummary, xhsLibrarySummary] = await Promise.all([
    api('/api/crawl-summary'),
    api('/api/xhs-library-summary')
  ]);
  state.crawlSummary = crawlSummary;
  state.xhsLibrarySummary = xhsLibrarySummary;
  renderCrawlSummary();
}

async function loadXhsWorks() {
  const result = await api('/api/xhs-works');
  state.xhsWorks = result.items || [];
  renderWorks();
}

async function loadFollowDrafts() {
  const result = await api('/api/followups');
  state.followDrafts = result.drafts;
  renderFollowDrafts();
}

async function loadContentAssets() {
  const result = await api('/api/content-assets');
  state.contentAssets = result.assets;
  renderContentAssets();
}

async function loadLarkMinutesDigest() {
  const result = await api('/api/lark-minutes-digest');
  state.larkMinutesDigest = result;
  renderLarkMinutesDigest();
}

async function loadInvestors() {
  var result=await api("/api/investors");
  state.investors=result.investors||[];
  renderInvestors();
}
function renderInvestors(){
  var invs=state.investors||[];
  $("#investorNavCount").textContent=invs.length;
  var activeInvs = invs.filter(function(i){ return i.stage !== "已投资" && i.stage !== "放弃"; });
  var archivedInvs = invs.filter(function(i){ return i.stage === "已投资" || i.stage === "放弃"; });
  var toggleBtn = $("#toggleArchivedBtn");
  if (toggleBtn) {
    toggleBtn.textContent = state.showArchivedInvestors ? "📋 返回活跃 Pipeline (" + activeInvs.length + ")" : "📁 已归档资方 (" + archivedInvs.length + ")";
    toggleBtn.style.display = archivedInvs.length ? "" : "none";
  }
  // Sort: active stages by pipeline order
  var stageOrder = ["初次接触","已接触","路演已安排","路演完成","尽调中","条款谈判"];
  var sorted = invs.slice().sort(function(a, b) {
    var aClosed = a.stage === "已投资" || a.stage === "放弃";
    var bClosed = b.stage === "已投资" || b.stage === "放弃";
    if (aClosed && !bClosed) return 1;
    if (!aClosed && bClosed) return -1;
    if (!aClosed && !bClosed) {
      var aIdx = stageOrder.indexOf(a.stage || "");
      var bIdx = stageOrder.indexOf(b.stage || "");
      if (aIdx === -1) aIdx = 99; if (bIdx === -1) bIdx = 99;
      if (aIdx !== bIdx) return aIdx - bIdx;
    }
    return (b.lastContact || "").localeCompare(a.lastContact || "");
  });
  var stages=["全部","初次接触","已接触","路演已安排","路演完成","尽调中","条款谈判","已投资","放弃"];
  var fEl=$("#investorStageFilters");
  if(fEl) fEl.innerHTML=stages.map(function(s){
    var c=s==="全部"?invs.length:invs.filter(function(i){return i.stage===s}).length;
    return "<button class=\"task-filter "+(state.investorFilter===s?"active":"")+"\" data-inv-filter=\""+s+"\" type=\"button\">"+s+" <em>"+c+"</em></button>";
  }).join("");
  // 分类筛选
  var types=["全部"];
  invs.forEach(function(i){ if(i.type && types.indexOf(i.type)===-1) types.push(i.type); });
  var tEl=$("#investorTypeFilters");
  if(tEl) tEl.innerHTML=types.map(function(t){
    var c=t==="全部"?invs.length:invs.filter(function(i){return i.type===t}).length;
    return "<button class=\"task-filter "+(state.investorTypeFilter===t?"active":"")+"\" data-inv-type=\""+t+"\" type=\"button\">"+(t||"未分类")+" <em>"+c+"</em></button>";
  }).join("");
  // 路演筛选
  var roadshowOpts=["全部","已安排","已完成","未安排"];
  var rEl=$("#investorRoadshowFilters");
  if(rEl) rEl.innerHTML=roadshowOpts.map(function(r){
    var c=r==="全部"?invs.length:invs.filter(function(i){return i.roadshowScheduled===r}).length;
    return "<button class=\"task-filter "+(state.investorRoadshowFilter===r?"active":"")+"\" data-inv-roadshow=\""+r+"\" type=\"button\">"+r+" <em>"+c+"</em></button>";
  }).join("");
  // 谈判筛选
  var coopOpts=["全部","初次接触","已接触","尽调中","条款谈判","已合作","放弃"];
  var cEl=$("#investorCoopFilters");
  if(cEl) cEl.innerHTML=coopOpts.map(function(o){
    var c;
    if(o==="全部") c=invs.length;
    else if(o==="已合作") c=invs.filter(function(i){return i.stage==="已投资"}).length;
    else c=invs.filter(function(i){return i.stage===o}).length;
    return "<button class=\"task-filter "+(state.investorCoopFilter===o?"active":"")+"\" data-inv-coop=\""+o+"\" type=\"button\">"+o+" <em>"+c+"</em></button>";
  }).join("");
  var kw=($("#investorTopSearch")?.value||"").toLowerCase();
  var filtered=sorted.filter(function(i){
    var coopMatch = true;
    if (state.investorCoopFilter !== "全部") {
      if (state.investorCoopFilter === "已合作") coopMatch = i.stage === "已投资";
      else coopMatch = i.stage === state.investorCoopFilter;
    }
    return (state.investorTypeFilter==="全部"||i.type===state.investorTypeFilter)
      && (state.investorRoadshowFilter==="全部"||i.roadshowScheduled===state.investorRoadshowFilter)
      && coopMatch
      && (!kw||JSON.stringify(i).toLowerCase().includes(kw));
  });
  if (state.showArchivedInvestors) {
    filtered = filtered.filter(function(i){ return i.stage === "已投资" || i.stage === "放弃"; });
  } else {
    filtered = filtered.filter(function(i){ return i.stage !== "已投资" && i.stage !== "放弃"; });
  }
  var t=$("#investorList");
  if(!t)return;
  if(!filtered.length){t.innerHTML="<p class=\"empty-text\">"+(state.showArchivedInvestors?"暂无已归档资方":"暂无活跃资方，点击「+ 新增资方」添加")+"</p>";return}
  var intentColors = {强:"#2e7d32",中:"#e65100",弱:"#c62828",待评估:"#666",暂无意向:"#999"};
  var intentBg = {强:"#e8f5e9",中:"#fff3e0",弱:"#fce4ec",待评估:"#f5f5f5",暂无意向:"#f5f5f5"};
  var stageColors = {
    "初次接触": {bg:"#e3f2fd",fg:"#1565c0"},
    "已接触": {bg:"#e8f5e9",fg:"#2e7d32"},
    "路演已安排": {bg:"#fff3e0",fg:"#e65100"},
    "路演完成": {bg:"#fce4ec",fg:"#c62828"},
    "尽调中": {bg:"#f3e5f5",fg:"#7b1fa2"},
    "条款谈判": {bg:"#fff8e1",fg:"#f57f17"},
    "已投资": {bg:"#e8f5e9",fg:"#2e7d32"},
    "放弃": {bg:"#f5f5f5",fg:"#999"}
  };
  var isListView = state.investorView === 'list';
  // Update view toggle buttons
  $$('[data-inv-view]').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.invView === state.investorView);
  });
  if (isListView) {
    t.className = '';
    t.innerHTML = "<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\"><thead><tr style=\"border-bottom:2px solid var(--line);text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase\">"+
      "<th style=\"padding:8px 6px\">名称</th><th style=\"padding:8px 6px\">类型</th><th style=\"padding:8px 6px\">阶段</th><th style=\"padding:8px 6px\">日期</th><th style=\"padding:8px 6px\">路演</th><th style=\"padding:8px 6px\">复盘</th><th style=\"padding:8px 6px\">意向</th><th style=\"padding:8px 6px\">对接人</th><th style=\"padding:8px 6px\">操作</th></tr></thead><tbody>"+
      filtered.map(function(i){
        var isClosed = i.stage === "已投资" || i.stage === "放弃";
        var dateStr = i.roadshowDate || i.lastContact || "";
        return "<tr style=\"border-bottom:1px solid var(--line);opacity:"+(i.stage==="放弃"?0.5:1)+"\">"+
          "<td style=\"padding:8px 6px\"><strong>"+escapeHtml(i.name)+"</strong>"+(i.round?"<br><small>💼 "+escapeHtml(i.round)+(i.amount?" "+escapeHtml(i.amount):"")+"</small>":"")+"</td>"+
          "<td style=\"padding:8px 6px;color:var(--muted)\">"+escapeHtml(i.type||"—")+"</td>"+
          "<td style=\"padding:8px 6px\"><span style=\"font-size:11px;padding:2px 6px;border-radius:3px;background:"+((stageColors[i.stage]||{}).bg||"#e4eaf7")+";color:"+((stageColors[i.stage]||{}).fg||"#3a4f7d")+"\">"+escapeHtml(i.stage||"")+"</span></td>"+
          "<td style=\"padding:8px 6px;white-space:nowrap;font-size:12px\">"+escapeHtml(dateStr)+"</td>"+
          "<td style=\"padding:8px 6px;font-size:12px\">"+escapeHtml(i.roadshowScheduled||"—")+"</td>"+
          "<td style=\"padding:8px 6px;font-size:13px\">"+(i.hasReview==="已整理"?"✅":"⬜")+(i.reviewUrl?" <a href=\""+escapeHtml(i.reviewUrl)+"\" target=\"_blank\" style=\"font-size:11px\" onclick=\"event.stopPropagation()\">打开</a>":"")+"</td>"+
          "<td style=\"padding:8px 6px\"><span style=\"font-size:11px;padding:1px 5px;border-radius:3px;background:"+(intentBg[i.intent]||"#f5f5f5")+";color:"+(intentColors[i.intent]||"#666")+"\">"+escapeHtml(i.intent||"—")+"</span></td>"+
          "<td style=\"padding:8px 6px;font-size:12px\">"+escapeHtml(i.liaison||"—")+"</td>"+
          "<td style=\"padding:8px 6px\"><button class=\"icon-btn\" data-delete-investor=\""+escapeHtml(i.id)+"\" style=\"color:var(--danger);font-size:14px\" title=\"删除\">×</button></td>"+
        "</tr>";
      }).join("")+"</tbody></table></div>";
  } else {
    t.className = 'investor-grid';
    t.innerHTML = filtered.map(function(i){
      var isClosed = i.stage === "已投资" || i.stage === "放弃";
      var dateStr = i.roadshowDate || i.lastContact || "";
      // Parse date for display
      var dateDisplay = "";
      if (dateStr) {
        var parts = dateStr.split("-");
        if (parts.length === 3) dateDisplay = "<span class=\"inv-date-month\">"+parseInt(parts[1])+"月</span><span class=\"inv-date-day\">"+parseInt(parts[2])+"日</span>";
        else dateDisplay = "<span class=\"inv-date-text\">"+escapeHtml(dateStr)+"</span>";
      }
      return "<article class=\"inv-card\" style=\"opacity:"+(i.stage==="放弃"?0.5:1)+"\">"+
        "<div class=\"inv-card-top\">"+
          "<span class=\"inv-stage\" style=\"background:"+((stageColors[i.stage]||{}).bg||"#e4eaf7")+";color:"+((stageColors[i.stage]||{}).fg||"#3a4f7d")+"\">"+escapeHtml(i.stage||"")+"</span>"+
          (i.type?"<span class=\"inv-type\">"+escapeHtml(i.type)+"</span>":"")+
          "<button class=\"icon-btn\" data-delete-investor=\""+escapeHtml(i.id)+"\" style=\"margin-left:auto;color:var(--danger);font-size:14px\" title=\"删除\">×</button>"+
        "</div>"+
        "<div class=\"inv-card-body\">"+
          "<div class=\"inv-card-info\">"+
            "<strong class=\"inv-name\">"+escapeHtml(i.name)+"</strong>"+
            "<div class=\"inv-meta\">"+
              (i.round?"<span>💼 "+escapeHtml(i.round)+(i.amount?" "+escapeHtml(i.amount):"")+"</span>":"")+
              (i.focus?"<span>🎯 "+escapeHtml(i.focus)+"</span>":"")+
            "</div>"+
            "<div class=\"inv-meta2\">"+
              (i.liaison?"<span>👤 "+escapeHtml(i.liaison)+"</span>":"")+
              (i.contact?"<span>📞 "+escapeHtml(i.contact)+"</span>":"")+
            "</div>"+
            (i.fundSize||i.investStage?"<div class=\"inv-meta2\">"+
              (i.fundSize?"<span>💰 规模:"+escapeHtml(i.fundSize)+"</span>":"")+
              (i.investStage?"<span>🎯 阶段偏好:"+escapeHtml(i.investStage)+"</span>":"")+
            "</div>":"")+
            "<div class=\"inv-status\">"+
              "<span>"+(i.roadshowScheduled==="已完成"?"✅":"⬜")+" 路演:"+escapeHtml(i.roadshowScheduled||"—")+"</span>"+
              "<span>"+(i.hasReview==="已整理"?"📝":"⬜")+" 复盘:"+escapeHtml(i.hasReview||"—")+"</span>"+
            "</div>"+
            (i.reviewUrl?"<a class=\"inv-link\" href=\""+escapeHtml(i.reviewUrl)+"\" target=\"_blank\" rel=\"noopener\" onclick=\"event.stopPropagation()\">📎 飞书复盘 →</a>":"")+
            (i.notes?"<div class=\"inv-notes\">"+escapeHtml(i.notes)+"</div>":"")+
          "</div>"+
          (dateDisplay ? "<div class=\"inv-card-date\">"+dateDisplay+"</div>" : "")+
        "</div>"+
        "<div class=\"inv-card-foot\">"+
          "<span style=\"font-size:11px;padding:1px 6px;border-radius:3px;background:"+(intentBg[i.intent]||"#f5f5f5")+";color:"+(intentColors[i.intent]||"#666")+"\">"+escapeHtml(i.intent||"待评估")+"</span>"+
          (i.nextStep?"<span style=\"font-size:11px;color:var(--muted)\">"+escapeHtml(i.nextStep)+"</span>":"")+
        "</div>"+
      "</article>";
    }).join("");
  }
}

async function loadSchedules() {
  var result = await api("/api/schedules");
  state.schedules = result.schedules || [];
  renderSchedules();
}
function renderSchedules() {
  var schs = state.schedules || [];
  var t = $("#scheduleList");
  if (!t) return;
  if (!schs.length) { t.innerHTML = "<p class=\"empty-text\">暂无日程安排。</p>"; return; }
  schs.sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); });
  var now = new Date().toISOString().slice(0, 10);
  t.innerHTML = schs.map(function(s) {
    var isPast = s.date < now;
    var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var d = new Date(s.date + "T00:00:00");
    var dayLabel = isNaN(d.getTime()) ? "" : days[d.getDay()];
    return "<article class=\"follow-card\" style=\"border-left:4px solid " + (isPast ? "var(--muted)" : "var(--forest)") + ";opacity:" + (isPast ? "0.6" : "1") + "\">" +
      "<div class=\"follow-card-head\"><span class=\"follow-type-badge\" style=\"background:#e8f5e9;color:#2e7d32\">" + escapeHtml(dayLabel) + "</span><span class=\"follow-stage\">" + escapeHtml(s.date) + "</span><small>" + escapeHtml(s.id) + "</small><button class=\"icon-btn\" data-delete-schedule=\"" + escapeHtml(s.id) + "\" style=\"margin-left:auto;color:var(--danger);font-size:16px\" title=\"删除日程\">×</button></div>" +
      "<strong style=\"font-size:15px\">" + escapeHtml(s.title) + "</strong>" +
      "<div class=\"idea-meta\" style=\"margin:4px 0\">" +
        (s.time ? "<span>⏰ " + escapeHtml(s.time) + "</span>" : "") +
        (s.platform ? "<span>" + escapeHtml(s.platform) + "</span>" : "") +
        (s.location ? "<span>" + escapeHtml(s.location) + "</span>" : "") +
      "</div>" +
      (s.meetingNumber ? "<div style=\"font-size:13px;margin:4px 0;color:var(--accent)\">会议号: " + escapeHtml(s.meetingNumber) + "</div>" : "") +
      (s.notes ? "<div class=\"follow-message\">" + escapeHtml(s.notes) + "</div>" : "") +
    "</article>";
  }).join("");
}

// ===== P4 会议纪要 =====
async function loadMeetingNotes() {
  var result = await api("/api/meeting-notes");
  state.meetingNotes = result.notes || [];
  renderMeetingNotes();
}
function renderMeetingNotes() {
  var notes = state.meetingNotes || [];
  $("#meetingNotesNavCount").textContent = notes.length;
  var types = ["全部"];
  notes.forEach(function(n) { if (n.meetingType && types.indexOf(n.meetingType) === -1) types.push(n.meetingType); });
  var fEl = $("#mnTypeFilters");
  if (fEl) fEl.innerHTML = types.map(function(t) {
    var c = t === "全部" ? notes.length : notes.filter(function(n) { return n.meetingType === t; }).length;
    return "<button class=\"task-filter " + (state.meetingNoteFilter === t ? "active" : "") + "\" data-mn-filter=\"" + t + "\" type=\"button\">" + t + " <em>" + c + "</em></button>";
  }).join("");
  var filtered = notes.slice().sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
  if (state.meetingNoteFilter !== "全部") filtered = filtered.filter(function(n) { return n.meetingType === state.meetingNoteFilter; });
  var t = $("#meetingNoteList");
  if (!t) return;
  if (!filtered.length) { t.innerHTML = "<p class=\"empty-text\">暂无会议纪要。点击顶部「+ 新增纪要」添加。</p>"; return; }
  $$('[data-mn-view]').forEach(function(btn) { btn.classList.toggle('active', btn.dataset.mnView === state.meetingNoteView); });
  if (state.meetingNoteView === 'list') {
    t.className = '';
    t.innerHTML = "<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\"><thead><tr style=\"border-bottom:2px solid var(--line);text-align:left;color:var(--muted);font-size:11px\">"+
      "<th style=\"padding:8px 6px\">日期</th><th style=\"padding:8px 6px\">资方</th><th style=\"padding:8px 6px\">类型</th><th style=\"padding:8px 6px\">提问</th><th style=\"padding:8px 6px\">反对意见</th><th style=\"padding:8px 6px\">后续</th><th style=\"padding:8px 6px\">操作</th></tr></thead><tbody>"+
      filtered.map(function(n) {
        return "<tr style=\"border-bottom:1px solid var(--line)\">"+
          "<td style=\"padding:8px 6px;white-space:nowrap\">"+escapeHtml(n.date)+"</td>"+
          "<td style=\"padding:8px 6px\">"+escapeHtml(n.relatedInvestor||"—")+"</td>"+
          "<td style=\"padding:8px 6px\">"+escapeHtml(n.meetingType)+"</td>"+
          "<td style=\"padding:8px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">"+escapeHtml((n.questions||"").slice(0,80))+"</td>"+
          "<td style=\"padding:8px 6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">"+escapeHtml((n.objections||"").slice(0,60))+"</td>"+
          "<td style=\"padding:8px 6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">"+escapeHtml((n.followUp||"").slice(0,60))+"</td>"+
          (n.feishuUrl?"<td style=\"padding:8px 6px\"><a href=\""+escapeHtml(n.feishuUrl)+"\" target=\"_blank\" style=\"font-size:11px\">打开</a> <button class=\"icon-btn\" data-delete-meeting-note=\""+escapeHtml(n.id)+"\" style=\"color:var(--danger);font-size:14px\">×</button></td>":"<td style=\"padding:8px 6px\"><button class=\"icon-btn\" data-delete-meeting-note=\""+escapeHtml(n.id)+"\" style=\"color:var(--danger);font-size:14px\">×</button></td>")+
        "</tr>";
      }).join("")+"</tbody></table></div>";
  } else {
    t.className = 'investor-grid';
    t.innerHTML = filtered.map(function(n) {
      return "<article class=\"inv-card\">"+
        "<div class=\"inv-card-top\"><span class=\"inv-stage\" style=\"background:#e3f2fd;color:#1565c0\">"+escapeHtml(n.meetingType)+"</span><span class=\"inv-type\">"+escapeHtml(n.relatedInvestor||"")+"</span><button class=\"icon-btn\" data-delete-meeting-note=\""+escapeHtml(n.id)+"\" style=\"margin-left:auto;color:var(--danger);font-size:14px\">×</button></div>"+
        "<div class=\"inv-card-body\"><div class=\"inv-card-info\">"+
          "<strong class=\"inv-name\">"+escapeHtml(n.date)+"</strong>"+
          (n.questions?"<div class=\"inv-notes\"><strong>提问:</strong> "+escapeHtml(n.questions.slice(0,150))+"</div>":"")+
          (n.answers?"<div class=\"inv-notes\"><strong>回答:</strong> "+escapeHtml(n.answers.slice(0,150))+"</div>":"")+
          (n.objections?"<div class=\"inv-notes\"><strong>疑虑:</strong> "+escapeHtml(n.objections.slice(0,100))+"</div>":"")+
          (n.followUp?"<div style=\"font-size:12px;margin-top:4px\"><strong>后续:</strong> "+escapeHtml(n.followUp)+"</div>":"")+
          (n.feishuUrl?"<a class=\"inv-link\" href=\""+escapeHtml(n.feishuUrl)+"\" target=\"_blank\">📎 飞书纪要 →</a>":"")+
        "</div>"+
        "<div class=\"inv-card-date\"><span class=\"inv-date-text\">"+escapeHtml(n.id)+"</span></div>"+
        "</div>"+
      "</article>";
    }).join("");
  }
}

// ===== P2 业务数据台账 =====
async function loadMetrics() {
  var result = await api("/api/metrics");
  state.metrics = result.metrics || [];
  renderMetrics();
}
function renderMetrics() {
  var ms = state.metrics || [];
  $("#metricsNavCount").textContent = ms.length;
  var cats = ["全部"];
  ms.forEach(function(m) { if (m.category && cats.indexOf(m.category) === -1) cats.push(m.category); });
  var fEl = $("#metricCategoryFilters");
  if (fEl) fEl.innerHTML = cats.map(function(c) {
    var count = c === "全部" ? ms.length : ms.filter(function(m) { return m.category === c; }).length;
    return "<button class=\"task-filter " + (state.metricFilter === c ? "active" : "") + "\" data-metric-filter=\"" + c + "\" type=\"button\">" + c + " <em>" + count + "</em></button>";
  }).join("");
  var filtered = ms.slice().sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
  if (state.metricFilter !== "全部") filtered = filtered.filter(function(m) { return m.category === state.metricFilter; });
  var t = $("#metricList");
  if (!t) return;
  if (!filtered.length) { t.innerHTML = "<p class=\"empty-text\">暂无业务数据。点击顶部「+ 新增数据」添加。</p>"; return; }
  $$('[data-metric-view]').forEach(function(btn) { btn.classList.toggle('active', btn.dataset.metricView === state.metricView); });
  if (state.metricView === 'list') {
    t.className = '';
    t.innerHTML = "<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\"><thead><tr style=\"border-bottom:2px solid var(--line);text-align:left;color:var(--muted);font-size:11px\">"+
      "<th style=\"padding:8px 6px\">指标</th><th style=\"padding:8px 6px\">分类</th><th style=\"padding:8px 6px\">数值</th><th style=\"padding:8px 6px\">周期</th><th style=\"padding:8px 6px\">日期</th><th style=\"padding:8px 6px\">备注</th><th style=\"padding:8px 6px\">操作</th></tr></thead><tbody>"+
      filtered.map(function(m) {
        return "<tr style=\"border-bottom:1px solid var(--line)\">"+
          "<td style=\"padding:8px 6px\"><strong>"+escapeHtml(m.name)+"</strong></td>"+
          "<td style=\"padding:8px 6px\">"+escapeHtml(m.category)+"</td>"+
          "<td style=\"padding:8px 6px\"><strong>"+escapeHtml(m.value)+(m.unit?escapeHtml(m.unit):"")+"</strong></td>"+
          "<td style=\"padding:8px 6px\">"+escapeHtml(m.period||"—")+"</td>"+
          "<td style=\"padding:8px 6px;white-space:nowrap\">"+escapeHtml(m.date)+"</td>"+
          "<td style=\"padding:8px 6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">"+escapeHtml((m.notes||"").slice(0,80))+"</td>"+
          "<td style=\"padding:8px 6px\"><button class=\"icon-btn\" data-delete-metric=\""+escapeHtml(m.id)+"\" style=\"color:var(--danger);font-size:14px\">×</button></td>"+
        "</tr>";
      }).join("")+"</tbody></table></div>";
  } else {
    t.className = 'investor-grid';
    t.innerHTML = filtered.map(function(m) {
      var catColors = {收入:"#e8f5e9",用户:"#e3f2fd",运营:"#fff3e0",融资:"#fce4ec",其他:"#f5f5f5"};
      var catColor = {收入:"#2e7d32",用户:"#1565c0",运营:"#e65100",融资:"#c62828",其他:"#666"};
      return "<article class=\"inv-card\">"+
        "<div class=\"inv-card-top\"><span class=\"inv-stage\" style=\"background:"+(catColors[m.category]||"#f5f5f5")+";color:"+(catColor[m.category]||"#666")+"\">"+escapeHtml(m.category)+"</span><span class=\"inv-type\">"+escapeHtml(m.period||"")+"</span><button class=\"icon-btn\" data-delete-metric=\""+escapeHtml(m.id)+"\" style=\"margin-left:auto;color:var(--danger);font-size:14px\">×</button></div>"+
        "<div class=\"inv-card-body\"><div class=\"inv-card-info\">"+
          "<strong class=\"inv-name\">"+escapeHtml(m.name)+"</strong>"+
          (m.value?"<div style=\"font-size:20px;font-weight:700;margin:4px 0\">"+escapeHtml(m.value)+(m.unit?"<span style=\"font-size:13px;font-weight:400;color:var(--muted)\"> "+escapeHtml(m.unit)+"</span>":"")+"</div>":"")+
          (m.notes?"<div class=\"inv-notes\">"+escapeHtml(m.notes)+"</div>":"")+
        "</div>"+
        "<div class=\"inv-card-date\"><span class=\"inv-date-text\">"+escapeHtml(m.date)+"</span></div>"+
        "</div>"+
      "</article>";
    }).join("");
  }
}

async function loadReferrals() {
  var result = await api("/api/referrals");
  state.referrals = result.referrals || [];
  renderReferrals();
}
function renderReferrals() {
  var refs = state.referrals || [];
  $("#referralNavCount").textContent = refs.length;
  var orgs = ["全部"];
  refs.forEach(function(r) { if (r.organization && orgs.indexOf(r.organization) === -1) orgs.push(r.organization); });
  var fEl = $("#referralOrgFilters");
  if (fEl) fEl.innerHTML = orgs.map(function(o) {
    var c = o === "全部" ? refs.length : refs.filter(function(r) { return r.organization === o; }).length;
    return "<button class=\"task-filter " + (state.referralFilter === o ? "active" : "") + "\" data-referral-filter=\"" + o + "\" type=\"button\">" + o + " <em>" + c + "</em></button>";
  }).join("");
  var kw = ($("#referralSearch")?.value || "").toLowerCase();
  var filtered = refs.filter(function(r) {
    return (state.referralFilter === "全部" || r.organization === state.referralFilter) && (!kw || JSON.stringify(r).toLowerCase().includes(kw));
  });
  var t = $("#referralList");
  if (!t) return;
  if (!filtered.length) { t.innerHTML = "<p class=\"empty-text\">暂无推荐人脉。点击「+ 新增人脉」添加。</p>"; return; }
  t.innerHTML = filtered.map(function(r) {
    return "<article class=\"follow-card\" style=\"border-left:4px solid var(--accent)\">" +
      "<div class=\"follow-card-head\"><span class=\"follow-type-badge\" style=\"background:#fff8e1;color:#e65100\">" + escapeHtml(r.organization || "未填单位") + "</span><small>" + escapeHtml(r.id) + "</small><button class=\"icon-btn\" data-delete-referral=\"" + escapeHtml(r.id) + "\" style=\"margin-left:auto;color:var(--danger);font-size:16px\" title=\"删除\">×</button></div>" +
      "<strong style=\"font-size:15px\">" + escapeHtml(r.name) + "</strong>" +
      "<div class=\"idea-meta\" style=\"margin:4px 0\">" +
        (r.position ? "<span>💼 " + escapeHtml(r.position) + "</span>" : "") +
        (r.contact ? "<span>📞 " + escapeHtml(r.contact) + "</span>" : "") +
      "</div>" +
      (r.investorsReferred ? "<div style=\"font-size:13px;margin:4px 0\"><span style=\"color:var(--muted)\">推荐资方：</span><strong>" + escapeHtml(r.investorsReferred) + "</strong></div>" : "") +
      (r.notes ? "<div class=\"follow-message\">" + escapeHtml(r.notes) + "</div>" : "") +
      "<div class=\"follow-card-foot\">" +
        "<span></span>" +
        "<span style=\"color:var(--muted);font-size:11px\">" + (r.lastContact ? "最后联系: " + escapeHtml(r.lastContact) : "") + "</span>" +
      "</div>" +
    "</article>";
  }).join("");
}

var wikiTocDocs = [];
async function loadFeishuDocs() {
  var result = await api("/api/feishu-docs");
  state.feishuDocs = result.docs || [];
  // 同时加载wiki目录
  try { var toc = await api("/api/wiki-toc"); wikiTocDocs = toc.ok ? toc.docs.filter(function(d){return !d.isHomepage}) : []; } catch(e) { wikiTocDocs = []; }
  renderFeishuDocs();
}
function renderFeishuDocs() {
  var docs = state.feishuDocs || [];
  var totalCount = docs.length + wikiTocDocs.length;
  $("#feishuDocsNavCount").textContent = totalCount;
  var categories = ["全部"];
  docs.forEach(function(d) { if (d.category && categories.indexOf(d.category) === -1) categories.push(d.category); });
  var fEl = $("#feishuDocCategoryFilters");
  if (fEl) fEl.innerHTML = categories.map(function(c) {
    var count = c === "全部" ? docs.length : docs.filter(function(d) { return d.category === c; }).length;
    return "<button class=\"task-filter " + (state.feishuDocFilter === c ? "active" : "") + "\" data-feishu-filter=\"" + c + "\" type=\"button\">" + c + " <em>" + count + "</em></button>";
  }).join("");
  var kw = ($("#feishuDocSearch")?.value || "").toLowerCase();
  var filtered = docs.filter(function(d) {
    return (state.feishuDocFilter === "全部" || d.category === state.feishuDocFilter) && (!kw || JSON.stringify(d).toLowerCase().includes(kw));
  });
  var t = $("#feishuDocList");
  if (!t) return;

  // Wiki目录卡片（置顶）
  var wikiHtml = "";
  if (wikiTocDocs.length) {
    wikiHtml = "<div class=\"panel\" style=\"margin-bottom:12px;padding:16px;border-left:4px solid var(--forest);background:linear-gradient(135deg,#f6f9f1 0%,#eef3e6 100%)\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px\">" +
        "<strong style=\"font-size:15px;color:var(--forest)\">📋 路演及合作谈判复盘库</strong>" +
        "<span style=\"font-size:11px;color:var(--muted)\">自动同步 · " + wikiTocDocs.length + " 份复盘</span>" +
      "</div>" +
      wikiTocDocs.map(function(d, i) {
        return "<a href=\"" + escapeHtml(d.url) + "\" target=\"_blank\" rel=\"noopener\" style=\"display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;text-decoration:none;color:var(--ink);font-size:14px;transition:background .15s\" onmouseover=\"this.style.background=\\\"rgba(47,81,48,0.06)\\\"\" onmouseout=\"this.style.background=\\\"transparent\\\"\">" +
          "<span style=\"color:var(--forest);font-weight:700\">" + (i+1) + ".</span>" +
          "<span>" + escapeHtml(d.title) + "</span>" +
          "<span style=\"margin-left:auto;font-size:11px;color:var(--forest-2)\">📄 打开</span>" +
        "</a>";
      }).join("") +
      "<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid #dce4d2;display:flex;gap:8px\">" +
        "<button class=\"small-btn secondary\" onclick=\"location.reload()\" style=\"font-size:11px\">🔄 刷新目录</button>" +
        "<span style=\"font-size:11px;color:var(--muted);line-height:2\">运行 <code>npm run wiki:toc</code> 更新</span>" +
      "</div>" +
    "</div>";
  }

  if (!filtered.length && !wikiTocDocs.length) { t.innerHTML = "<p class=\"empty-text\">暂无飞书文档。</p>"; return; }
  t.innerHTML = wikiHtml + filtered.map(function(d) {
    var statusColors = {草稿:"#fff3e0",内部审阅:"#e3f2fd",已发送:"#e8f5e9",已过时:"#f5f5f5"};
    var statusFg = {草稿:"#e65100",内部审阅:"#1565c0",已发送:"#2e7d32",已过时:"#999"};
    return "<article class=\"follow-card\" style=\"border-left:4px solid var(--accent)\">" +
      "<div class=\"follow-card-head\"><span class=\"follow-type-badge\" style=\"background:"+(statusColors[d.docStatus]||"#f5f5f5")+";color:"+(statusFg[d.docStatus]||"#666")+"\">" + escapeHtml(d.docStatus||"草稿") + "</span>"+
      (d.docType?"<span class=\"follow-stage\">"+escapeHtml(d.docType)+"</span>":"")+
      (d.version?"<span style=\"font-size:11px;color:var(--muted)\">"+escapeHtml(d.version)+"</span>":"")+
      "<small>" + escapeHtml(d.id) + "</small><button class=\"icon-btn\" data-delete-feishu-doc=\"" + escapeHtml(d.id) + "\" style=\"margin-left:auto;color:var(--danger);font-size:16px\" title=\"删除文档\">×</button></div>" +
      "<strong style=\"font-size:15px\">" + escapeHtml(d.title) + "</strong>" +
      (d.relatedInvestor?"<div style=\"font-size:12px;color:var(--muted);margin:2px 0\">关联资方: "+escapeHtml(d.relatedInvestor)+"</div>":"")+
      (d.notes ? "<div class=\"follow-message\">" + escapeHtml(d.notes) + "</div>" : "") +
      "<div class=\"follow-card-foot\">" +
        "<a href=\"" + escapeHtml(d.url) + "\" target=\"_blank\" rel=\"noopener\" class=\"primary\" style=\"display:inline-block;padding:4px 12px;border-radius:6px;text-decoration:none;font-size:13px\" onclick=\"event.stopPropagation()\">📄 打开飞书</a>" +
        "<span style=\"color:var(--muted);font-size:11px\">" + escapeHtml(d.createdAt || "") + "</span>" +
      "</div>" +
    "</article>";
  }).join("");
}

async function loadBooks() {
  const result = await api('/api/books');
  state.books = result.books || [];
  if (state.activeAssetTab === 'library') renderBookLibrary();
}

async function loadCompetitorAccounts() {
  const result = await api('/api/competitor-accounts');
  state.competitorAccounts = result.accounts || [];
  renderCompetitorAccounts();
}

function renderCompetitorInLab() {
  const accounts = state.competitorAccounts || [];
  setLabHeading('对标账号：' + accounts.length + '个', '', '');
  if (!accounts.length) {
    $('#ideaGrid').innerHTML = '<p class="empty-text">还没有对标账号</p>';
    $('#ideaDetail').innerHTML = '';
    return;
  }
  var html = '';
  accounts.forEach(function(a){
    html += '<article class="competitor-card" style="cursor:pointer" data-competitor-id="' + a.id + '">' +
      '<div class="competitor-card-head"><div>' +
      '<span class="competitor-platform">' + escapeHtml(a.platform) + '</span>' +
      '<h3>' + (a.url ? '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none">' + escapeHtml(a.name) + ' ↗</a>' : escapeHtml(a.name)) + '</h3>' +
      '<div class="competitor-meta">' +
        (a.followers ? '<span>' + escapeHtml(a.followers) + '</span>' : '') +
        (a.contentDirection ? '<span>' + escapeHtml(a.contentDirection) + '</span>' : '') +
      '</div></div></div>' +
      (a.strengths && a.strengths.length ? '<div class="competitor-section"><strong>可学习点</strong><ul>' + a.strengths.map(function(s){return '<li>' + escapeHtml(s) + '</li>'}).join('') + '</ul></div>' : '') +
      (a.ourOpportunity ? '<div class="competitor-section opportunity"><strong>我们的差异机会</strong><p>' + escapeHtml(a.ourOpportunity) + '</p></div>' : '') +
      '<button class="work-exp-btn" data-add-exp-from-work="COMP" data-exp-title="' + escapeHtml(a.name||'') + '" type="button" style="position:static;opacity:1;margin-top:8px;font-size:11px">+ 经验</button>' +
    '</article>';
  });
  $('#ideaGrid').innerHTML = html || '<p class="empty-text">暂无对标账号</p>';
  $('#ideaGrid').className = 'idea-grid';
  // Show first in detail
  var sel = accounts[0];
  if (sel) {
    $('#ideaDetail').innerHTML = '<div class="detail-kicker">' + escapeHtml(sel.platform) + ' · ' + escapeHtml(sel.contentDirection||'') + '</div>' +
      '<h3>' + (sel.url ? '<a href="' + escapeHtml(sel.url) + '" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none">' + escapeHtml(sel.name) + ' ↗</a>' : escapeHtml(sel.name)) + '</h3>' +
      (sel.strengths && sel.strengths.length ? '<div class="variant-box"><strong>可学习点</strong><ol>' + sel.strengths.map(function(s){return '<li>' + escapeHtml(s) + '</li>'}).join('') + '</ol></div>' : '') +
      (sel.weaknesses && sel.weaknesses.length ? '<div class="competitor-section weak"><strong>不足之处</strong><ul>' + sel.weaknesses.map(function(w){return '<li>' + escapeHtml(w) + '</li>'}).join('') + '</ul></div>' : '') +
      (sel.ourOpportunity ? '<div class="variant-box"><strong>差异机会</strong><p>' + escapeHtml(sel.ourOpportunity) + '</p></div>' : '') +
      (sel.notes ? '<p style="color:var(--muted);font-size:12px;line-height:1.6;margin-top:8px;white-space:pre-wrap">' + escapeHtml(sel.notes) + '</p>' : '');
  }
}

function renderCompetitorAccounts() {
  const target = $('#competitorGrid');
  if (!target) return;
  const accounts = state.competitorAccounts || [];
  $('#competitorNavCount').textContent = accounts.length;

  if (!target) return;
  if (!accounts.length) {
    target.innerHTML = '<p class="empty-text">还没有对标账号。点击右上角"添加对标账号"开始，或使用灵造搜索竞品账号信息后手动录入。</p>';
    return;
  }

  target.innerHTML = accounts.map((a) => `
    <article class="competitor-card">
      <div class="competitor-card-head">
        <div>
          <span class="competitor-platform">${escapeHtml(a.platform)}</span>
          <h3>${escapeHtml(a.name)}</h3>
          <div class="competitor-meta">
            ${a.followers ? `<span>${escapeHtml(a.followers)}</span>` : ''}
            ${a.contentDirection ? `<span>${escapeHtml(a.contentDirection)}</span>` : ''}
            ${a.postFrequency ? `<span>${escapeHtml(a.postFrequency)}</span>` : ''}
          </div>
        </div>
        <div class="competitor-card-actions">
          ${a.url ? `<a class="small-btn secondary" href="${escapeHtml(a.url)}" target="_blank" rel="noreferrer">打开主页</a>` : ''}
          <button class="small-btn secondary" data-edit-competitor="${escapeHtml(a.id)}" type="button">编辑</button>
        </div>
      </div>
      ${a.strengths?.length ? `
        <div class="competitor-section">
          <strong>可学习点</strong>
          <ul>${a.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${a.weaknesses?.length ? `
        <div class="competitor-section weak">
          <strong>不足之处</strong>
          <ul>${a.weaknesses.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${a.ourOpportunity ? `
        <div class="competitor-section opportunity">
          <strong>我们的差异机会</strong>
          <p>${escapeHtml(a.ourOpportunity)}</p>
        </div>
      ` : ''}
      ${a.notes ? `<p class="competitor-notes">${escapeHtml(a.notes)}</p>` : ''}
      <time>更新于 ${escapeHtml(a.lastUpdated || '')}</time>
      <button class="work-exp-btn" data-add-exp-from-work="COMP" data-exp-title="${escapeHtml(a.name||'')}" type="button" style="position:static;opacity:1;margin-top:10px">+ 经验</button>
    </article>
  `).join('');
}

async function loadExperiences() {
  const result = await api('/api/experiences');
  state.experiences = result.items || [];
  renderExperiences();
}

async function init() {
  state.data = await api('/api/dashboard');
  $('#syncTime').textContent = `更新时间 ${state.data.meta.updatedAt}`;
  renderTasks();
  renderGrowth();
  renderHotLab();
  renderFollowForm();
  renderSkills();
  renderScripts();
  renderSettings();
  await loadExperiences();
  renderLarkMinutesDigest();
  await loadCompetitorAccounts();
  await loadBooks();
  await loadInvestors();
  await loadSchedules();
  await loadFeishuDocs();
  await loadReferrals();
  await loadMeetingNotes();
  await loadMetrics();
  await loadGrowthEntries();
  await loadCrawlSummary();
  await loadXhsWorks();
  await loadFollowDrafts();
  await loadContentAssets();
  await loadLarkMinutesDigest();
  // 侧边栏数字对接
  $('#skillsNavCount').textContent = (state.data.skills || []).length;
  var syncNav = $('#syncNavCount'); if (syncNav) syncNav.textContent = (state.data.sync?.scripts || []).length;
  $('#settingsNavCount').textContent = (state.data.systemStatus || []).length;

  // 暗色模式
  const darkToggle = $('#darkModeToggle');
  if (darkToggle) {
    darkToggle.checked = localStorage.getItem('darkMode') === 'true';
    if (darkToggle.checked) document.body.classList.add('dark');
    darkToggle.addEventListener('change', function(){
      document.body.classList.toggle('dark', this.checked);
      localStorage.setItem('darkMode', this.checked);
    });
  }

  bindEvents();

  // 回到顶部按钮
  const backBtn = $('#backToTop');
  window.addEventListener('scroll', () => {
    if (!backBtn) return;
    backBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

init().catch(function(error){
  console.error(error);
});
