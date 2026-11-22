const $ = (id) => document.getElementById(id);

const PRESET_HEIGHTS = [1080, 720, 480, 360, 240];

const populateQuality = (heights) => {
  const opts = ['<option value="best">Best</option>'];
  const list = heights && heights.length ? heights : PRESET_HEIGHTS;
  opts.push(...list.map((h) => `<option value="${h}">${h}p</option>`));
  $("quality").innerHTML = opts.join("");
};

// Pre-populate with static presets before any video is found
populateQuality(null);
let dir = "";
const isCancelMsg = (t) => /cancelled|canceled|terminated|killed/i.test(t);
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
  msg("Preparing yt-dlp (first run may take a few seconds)…");
  try {
    const r = await api.init();
    setDir(r.dir);
    msg(r.ffmpeg ? "" : "ffmpeg not found. Run npm install again.", !r.ffmpeg);
  } catch (e) {
    msg("Failed to download yt-dlp: " + e.message, true);
  }
})();

$("check").onclick = async () => {
  const url = $("url").value.trim();
  if (!url) return;
  msg("Searching…");
  show("info", false);
  show("opts", false);
  $("check").disabled = true;
  try {
    const i = await api.info(url);
    $("thumb").src = i.thumb || "";
    $("title").textContent = i.title;
    $("meta").textContent = [i.channel, i.duration].filter(Boolean).join(" · ");
    populateQuality(i.heights);
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
  if (d) { setDir(d); api.setDir(d); }
};

api.onProgress((p) => {
  $("fill").style.width = p.pct + "%";
  $("ptext").textContent = p.status || `${p.pct.toFixed(1)}% · ${p.speed} · ${p.eta} left`;
});

$("go").onclick = async () => {
  $("go").disabled = true;
  $("reset").disabled = true;
  show("stop", true);
  show("prog", true);
  show("openAfterDownload", false);
  msg("");
  $("fill").style.width = "0";
  try {
    await api.download({
      url: $("url").value.trim(),
      dir,
      height: $("quality").value,
      audioOnly: $("kind").value === "audio",
    });
    msg("Done ✅");
    show("openAfterDownload", true);
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
$("openAfterDownload").onclick = () => dir && api.openDir(dir);
$("upd").onclick = async () => {
  msg("Updating…");
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
  populateQuality(null);
  show("openAfterDownload", false);
  $("url").focus();
};
