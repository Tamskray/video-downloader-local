const $ = (id) => document.getElementById(id);
let dir = "";
const isCancelMsg = (t) => /скасовано|terminated|killed/i.test(t);
const msg = (t, err) => {
  $("msg").textContent = t;
  $("msg").className = err && !isCancelMsg(t) ? "err" : "muted";
};
const show = (id, on) => $(id).classList.toggle("hidden", !on);
const setDir = (d) => {
  dir = d;
  $("dirBtn").textContent = "📁 " + d;
};

(async () => {
  msg("Готую yt-dlp (перший запуск може тривати кілька секунд)…");
  try {
    const r = await api.init();
    setDir(r.dir);
    msg(r.ffmpeg ? "" : "ffmpeg не знайдено. Виконай npm install ще раз.", !r.ffmpeg);
  } catch (e) {
    msg("Не вдалося завантажити yt-dlp: " + e.message, true);
  }
})();

$("check").onclick = async () => {
  const url = $("url").value.trim();
  if (!url) return;
  msg("Шукаю…");
  show("info", false);
  show("opts", false);
  $("check").disabled = true;
  try {
    const i = await api.info(url);
    $("thumb").src = i.thumb || "";
    $("title").textContent = i.title;
    $("meta").textContent = [i.channel, i.duration].filter(Boolean).join(" · ");
    $("quality").innerHTML =
      '<option value="best">Максимальна</option>' +
      i.heights.map((h) => `<option value="${h}">${h}p</option>`).join("");
    show("info", true);
    show("opts", true);
    msg("");
  } catch (e) {
    msg(e.message, true);
  }
  $("check").disabled = false;
};

$("kind").onchange = () => {
  $("quality").disabled = $("kind").value === "audio";
};
$("dirBtn").onclick = async () => {
  const d = await api.pickDir();
  if (d) setDir(d);
};

api.onProgress((p) => {
  $("fill").style.width = p.pct + "%";
  $("ptext").textContent = p.status || `${p.pct.toFixed(1)}% · ${p.speed} · залишилось ${p.eta}`;
});

$("go").onclick = async () => {
  $("go").disabled = true;
  $("reset").disabled = true;
  show("stop", true);
  show("prog", true);
  msg("");
  $("fill").style.width = "0";
  try {
    await api.download({
      url: $("url").value.trim(),
      dir,
      height: $("quality").value,
      audioOnly: $("kind").value === "audio",
    });
    msg("Готово ✅");
  } catch (e) {
    msg(e.message, true);
  }
  $("go").disabled = false;
  $("reset").disabled = false;
  show("stop", false);
  show("prog", false);
};

$("stop").onclick = () => api.cancel();
$("open").onclick = () => dir && api.openDir(dir);
$("upd").onclick = async () => {
  msg("Оновлюю…");
  msg(await api.update());
};

$("reset").onclick = () => {
  $("url").value = "";
  show("info", false);
  show("opts", false);
  show("prog", false);
  $("msg").textContent = "";
  $("msg").className = "muted";
  $("fill").style.width = "0";
  $("url").focus();
};
