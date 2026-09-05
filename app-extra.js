/* ===== app-extra.js =====
   增强（自包含，不编辑主脚本的大段代码）：
   1) 取代“+ 添加时间块” -> 支持【自定义（与项目无关）】空项目记录
   2) 每张任务卡自动补「编辑/删除」
   3) 时间块“开始计时——停止并保存”
   4) 兜底：编辑既有【空项目】时间块时仍保留“自定义”属性
*/
(function () {
  "use strict";

  /* 通用 */
  function wall(d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function pName(p) { return p ? p.name : "未分组"; }

  /* ---------- 1) 添加/编辑自定义时间块（project_id 可空） ---------- */
  function projectOptions(selPid) {
    var o = '<option value="">(自定义/与项目无关)</option>';
    (proj || []).forEach(function (p) {
      var s = (selPid && String(selPid) === String(p.id)) ? " selected" : "";
      o += '<option value="' + p.id + '"' + s + ">" + esc(p.name) + "</option>";
    });
    return o;
  }
  function blockMo(row) {
    var pid = row ? row.pid : null;
    return '<p class="text-xs text-gray-400 mb-2">选“自定义”可记与项目无关的日程。</p>' +
      '<label class="block text-sm mb-1">记录对象</label><select id="tmP" class="w-full h-10 rounded border border-slate-200 px-2 text-sm bg-white">' + projectOptions(pid) + "</select>" +
      '<label class="block text-sm mt-3 mb-1">开始时间</label><input id="tmS" type="time" class="w-full h-10 rounded border border-slate-200 px-2 text-sm" value="' + (row ? row.s : "09:00") + '"/>' +
      '<label class="block text-sm mt-3 mb-1">结束时间</label><input id="tmE" type="time" class="w-full h-10 rounded border border-slate-200 px-2 text-sm" value="' + (row ? row.e : "10:00") + '"/>' +
      '<label class="block text-sm mt-3 mb-1">内容 / 备注</label><input id="tmA" class="w-full h-10 rounded border border-slate-200 px-2 text-sm" value="' + (row ? esc(row.a) : "") + '" placeholder="自定义时请填写；选项目可留空"/>';
  }
  function blockCollect() {
    var pid = gid("tmP").value || null;
    var s = gid("tmS").value, e = gid("tmE").value;
    var a = (gid("tmA").value || "").trim();
    if (!s || !e) return { err: "请填写开始和结束时间" };
    var sm = Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)), em = Number(e.slice(0, 2)) * 60 + Number(e.slice(3, 5));
    if (em <= sm) return { err: "结束时间须晚于开始时间" };
    if (!a && !pid) return { err: "自定义记录请填写内容/备注" };
    if (!a && pid) { var p = proj.find(function (x) { return x.id === pid; }); if (p) a = p.name; }
    return { pid: pid, s: s, e: e, a: a, dur: em - sm };
  }
  function createByForm() {
    openM("添加时间块", blockMo(null), async function () {
      var v = blockCollect();
      if (v.err) { toast(v.err); return false; }
      var r = await sb.from("time_logs").insert({ user_id: user.id, date: fdate(vd), project_id: v.pid, start_time: v.s, end_time: v.e, activity: v.a, duration_minutes: v.dur });
      if (r.error) { toast("保存失败：" + r.error.message); return false; }
      await loadDay(); return true;
    }, "添加");
  }
  function editByForm(row) {
    openM("编辑时间块", blockMo({ pid: row.pid, s: clk(row.start_time), e: clk(row.end_time), a: row.activity || "" }), async function () {
      var v = blockCollect();
      if (v.err) { toast(v.err); return false; }
      var r = await sb.from("time_logs").update({ project_id: v.pid, start_time: v.s, end_time: v.e, activity: v.a, duration_minutes: v.dur }).eq("id", row.id);
      if (r.error) { toast("保存失败：" + r.error.message); return false; }
      await loadDay(); return true;
    }, "保存");
  }

  /* ---------- 2) 任务卡 编辑/删除 ---------- */
  function findTask(id) { return (tasks || []).find(function (t) { return String(t.id) === String(id); }); }
  function delTaskUI(id) {
    if (!confirm("确定删除该任务？")) return;
    sb.from("tasks").delete().eq("id", id).then(function (r) {
      if (r.error) toast("删除失败：" + r.error.message); else loadme();
    });
  }
  function editTaskUI(id) {
    var t = findTask(id); if (!t) { toast("未找到该任务"); return; }
    var pid = t.project_id ? String(t.project_id) : "";
    var opts = proj.map(function (p) { return '<option value="' + p.id + '"' + (String(p.id) === pid ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("");
    var stl = { todo: "待办", doing: "进行中", done: "已完成" };
    var st = ["todo", "doing", "done"].map(function (k) { return '<option value="' + k + '"' + (t.status === k ? " selected" : "") + ">" + stl[k] + "</option>"; }).join("");
    var html =
      '<label class="block text-sm mb-1">标题</label><input id="tT" class="w-full h-10 rounded border border-slate-200 px-3 text-sm" value="' + esc(t.title) + '"/>' +
      '<div class="grid grid-cols-2 gap-2 mt-3"><div><label class="block text-sm mb-1">项目</label><select id="tP" class="w-full h-10 rounded border border-slate-200 px-2 text-sm bg-white"><option value="">(自定义/并组)</option>' + opts + "</select></div>" +
      '<div><label class="block text-sm mb-1">状态</label><select id="tS" class="w-full h-10 rounded border border-slate-200 px-2 text-sm bg-white">' + st + "</select></div></div>" +
      '<div class="grid grid-cols-2 gap-2 mt-3"><div><label class="block text-sm mb-1">优先级</label><select id="tR" class="w-full h-10 rounded border border-slate-200 px-2 text-sm bg-white"><option>P0</option><option>P1</option><option>P2</option></select></div>' +
      '<div><label class="block text-sm mb-1">截止日期</label><input id="tD" type="date" class="w-full h-10 rounded border border-slate-200 px-2 text-sm" value="' + (t.due_date || "") + '"/></div></div>';
    openM("编辑任务", html, async function () {
      var tt = gid("tT").value.trim(); if (!tt) return false;
      var up = { title: tt, project_id: (gid("tP").value || null), status: gid("tS").value, priority: gid("tR").value || t.priority || "P1", due_date: gid("tD").value || null };
      var r = await sb.from("tasks").update(up).eq("id", id);
      if (r.error) { toast("保存失败：" + r.error.message); return false; }
      await loadme(); return true;
    }, "保存");
    setTimeout(function () {
      document.querySelectorAll("#tR").forEach(function (s) { s.value = t.priority || "P1"; });
      document.querySelectorAll("#tP").forEach(function (s) { s.value = pid; });
    }, 0);
  }
  function ensureTaskOps() {
    document.querySelectorAll("#mcols article.task[data-id]").forEach(function (art) {
      if (art.querySelector("[data-opsline]")) return;
      var id = art.getAttribute("data-id");
      if (!findTask(id)) return;
      var row = document.createElement("div");
      row.setAttribute("data-opsline", "1");
      row.className = "mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-3 text-xs";
      row.innerHTML = '<button type="button" class="es text-gray-400 hover:text-blue-600">编辑</button><button type="button" class="es text-gray-400 hover:text-red-600">删除</button>';
      row.children[0].onclick = function (e) { e.preventDefault(); e.stopPropagation(); editTaskUI(id); };
      row.children[1].onclick = function (e) { e.preventDefault(); e.stopPropagation(); delTaskUI(id); };
      art.appendChild(row);
    });
  }
  (function () {
    var mo = new MutationObserver(function () { ensureTaskOps(); });
    function reg() { var m = gid("mcols"); if (m) { mo.observe(m, { childList: true, subtree: true }); } ensureTaskOps(); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  })();

  /* ---------- 3) 计时器 ---------- */
  var tim = { on: false, t0: 0, pid: null, act: null, iv: null };
  function timerText() {
    var sec = Math.floor((Date.now() - tim.t0) / 1000);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + " 小时 " : "") + m + " 分 " + s + " 秒";
  }
  function paintTimer() {
    var barEl = gid("tmrBar"), btnEl = gid("tmrBtn");
    if (!barEl || !btnEl) return;
    if (!tim.on) {
      barEl.classList.add("hidden");
      btnEl.textContent = "开始计时";
      btnEl.className = "es w-full h-10 rounded-xl bg-blue-600 text-white text-sm mb-2";
      return;
    }
    barEl.classList.remove("hidden");
    var p = tim.pid ? proj.find(function (x) { return x.id === tim.pid; }) : null;
    var label = (tim.act && tim.act.trim()) || (p ? p.name : "");
    label = label || "活动";
    barEl.textContent = "正在记录「" + label + "」… " + timerText();
    btnEl.textContent = "停止并保存";
    btnEl.className = "es w-full h-10 rounded-xl bg-green-600 text-white text-sm mb-2";
  }
  function runTimerOn(pid, act) {
    tim.on = true; tim.t0 = Date.now(); tim.pid = pid; tim.act = act;
    if (tim.iv) clearInterval(tim.iv);
    tim.iv = setInterval(paintTimer, 1000);
    paintTimer();
  }
  function saveTimer() {
    if (!tim.on) return;
    var now = new Date(), start = new Date(tim.t0);
    var mins = Math.max(1, Math.round((now - tim.t0) / 60000));
    var pid = tim.pid || null;
    if (tim.iv) { clearInterval(tim.iv); tim.iv = null; }
    tim.on = false;
    var p = pid ? proj.find(function (x) { return x.id === pid; }) : null;
    var label = (tim.act && tim.act.trim()) || (p ? p.name : "");
    if (!label) label = "未命名活动";
    paintTimer();
    var rec = { user_id: user.id, date: fdate(now), project_id: pid, start_time: wall(start), end_time: wall(now), activity: label, duration_minutes: mins };
    sb.from("time_logs").insert(rec).then(function (r) {
      if (r.error) toast("保存计时失败：" + r.error.message);
      else { toast("已记录「" + label + "」" + mins + " 分钟"); loadDay(); }
    });
  }
  function askTimer() {
    var opts = proj.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + "</option>"; }).join("");
    var html =
      '<p class="text-xs text-gray-400">选对象/填说明后“开始”，页面实时走表；完成回到这里点一次“停止并保存”。</p>' +
      '<label class="block text-sm mt-3 mb-1">计时对象</label><select id="tkP" class="w-full h-10 rounded border border-slate-200 px-2 text-sm bg-white"><option value="">自定义（与项目无关）</option>' + opts + "</select>" +
      '<label class="block text-sm mt-3 mb-1">说明 / 活动名</label><input id="tkA" class="w-full h-10 rounded border border-slate-200 px-3 text-sm" placeholder="例如：深度工作 / 阅读 / 休息"/>';
    openM("开始计时", html, function () {
      var pid = gid("tkP").value || null;
      var a = (gid("tkA").value || "").trim();
      if (!a && !pid) { toast("自定义计时请填写说明"); return false; }
      runTimerOn(pid, a || null);
      return true;
    }, "开始");
  }
  function bindTimer() {
    var b = gid("tmrBtn");
    if (!b) return;
    b.onclick = function () {
      if (!user) { toast("尚未登录或会话失效，请先登录"); return; }
      if (tim.on) saveTimer(); else askTimer();
    };
    paintTimer();
  }

  /* ---------- 接管 + 添加时间块 ---------- */
  function bindAdd() {
    var b = gid("addTimeBtn");
    if (!b) return;
    b.onclick = function () {
      if (!user) { toast("尚未登录或会话失效，请先登录"); return; }
      createByForm();
    };
  }

  /* ---------- 兜底：编辑既有“空项目”时间块时走自定义版保留自定义 ---------- */
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest("[data-eid]") : null;
    if (!t) return;
    var id = t.getAttribute("data-eid");
    var l = (curLogs || []).find(function (x) { return String(x.id) === String(id); });
    if (!l || l.project_id) return; // 有项目走主脚本原生路径
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    editByForm(l);
  }, true);

  /* ---------- 初始化 ---------- */
  function init() { bindAdd(); bindTimer(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("resize", paintTimer);
})();
