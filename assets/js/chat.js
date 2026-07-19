(function () {
  var LS_KEY = "trip_gemini_api_key";
  var LS_MODEL = "trip_gemini_model";
  var DEFAULT_MODEL = "gemini-3.1-flash-lite";
  var CONTEXT_URL = "assets/data/trip-context.json";
  var AISTUDIO_URL = "https://aistudio.google.com/apikey";

  var tripContext = null;
  var history = []; // {role: "user"|"model", text: string}
  var els = {};

  function apiUrl(model, key) {
    return "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
  }

  function getKey() { return localStorage.getItem(LS_KEY) || ""; }
  function getModel() { return localStorage.getItem(LS_MODEL) || DEFAULT_MODEL; }

  function buildUI() {
    var fab = document.createElement("button");
    fab.className = "ai-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Ask about your trip");
    fab.innerHTML = "&#128172;";

    var panel = document.createElement("div");
    panel.className = "ai-panel";
    panel.innerHTML =
      '<div class="ai-panel-header">' +
      '  <span class="ai-panel-title">Ask about your trip</span>' +
      '  <div class="ai-panel-actions">' +
      '    <button type="button" class="ai-icon-btn ai-settings-btn" aria-label="Settings">&#9881;&#65039;</button>' +
      '    <button type="button" class="ai-icon-btn ai-close-btn" aria-label="Close">&#10005;</button>' +
      "  </div>" +
      "</div>" +
      '<div class="ai-settings">' +
      '  <p class="ai-settings-hint">Uses your own Gemini API key, stored only in this browser. Get one at ' +
      '<a href="' + AISTUDIO_URL + '" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</p>' +
      '  <label class="ai-field">API key' +
      '    <input type="password" class="ai-key-input" placeholder="Paste your Gemini API key" autocomplete="off">' +
      "  </label>" +
      '  <label class="ai-field">Model' +
      '    <input type="text" class="ai-model-input" value="' + DEFAULT_MODEL + '">' +
      "  </label>" +
      '  <button type="button" class="ai-save-btn">Save</button>' +
      "</div>" +
      '<div class="ai-thread"></div>' +
      '<form class="ai-input-row">' +
      '  <input type="text" class="ai-text-input" placeholder="Ask e.g. what time is the Gornergrat train?" disabled>' +
      '  <button type="submit" class="ai-send-btn" disabled>Send</button>' +
      "</form>";

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els.fab = fab;
    els.panel = panel;
    els.settings = panel.querySelector(".ai-settings");
    els.thread = panel.querySelector(".ai-thread");
    els.form = panel.querySelector(".ai-input-row");
    els.textInput = panel.querySelector(".ai-text-input");
    els.sendBtn = panel.querySelector(".ai-send-btn");
    els.keyInput = panel.querySelector(".ai-key-input");
    els.modelInput = panel.querySelector(".ai-model-input");
    els.saveBtn = panel.querySelector(".ai-save-btn");
    els.settingsBtn = panel.querySelector(".ai-settings-btn");
    els.closeBtn = panel.querySelector(".ai-close-btn");

    fab.addEventListener("click", function () {
      panel.classList.toggle("open");
      refreshState();
    });
    els.closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
    });
    els.settingsBtn.addEventListener("click", function () {
      els.settings.classList.toggle("open");
    });
    els.saveBtn.addEventListener("click", function () {
      var key = els.keyInput.value.trim();
      var model = els.modelInput.value.trim() || DEFAULT_MODEL;
      if (!key) return;
      localStorage.setItem(LS_KEY, key);
      localStorage.setItem(LS_MODEL, model);
      els.keyInput.value = "";
      els.settings.classList.remove("open");
      refreshState();
      addMessage("model", "API key saved (model: " + model + "). Ask me anything about the trip!");
    });
    els.form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      sendMessage();
    });
  }

  function refreshState() {
    var hasKey = !!getKey();
    els.textInput.disabled = !hasKey;
    els.sendBtn.disabled = !hasKey;
    els.modelInput.value = getModel();
    if (!hasKey && els.thread.children.length === 0) {
      els.settings.classList.add("open");
    }
  }

  function addMessage(role, text) {
    var bubble = document.createElement("div");
    bubble.className = "ai-msg ai-msg-" + role;
    bubble.textContent = text;
    els.thread.appendChild(bubble);
    els.thread.scrollTop = els.thread.scrollHeight;
  }

  function ensureContext() {
    if (tripContext !== null) return Promise.resolve(tripContext);
    return fetch(CONTEXT_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tripContext = data.context || "";
        return tripContext;
      })
      .catch(function () {
        tripContext = "";
        return tripContext;
      });
  }

  function sendMessage() {
    var text = els.textInput.value.trim();
    if (!text) return;
    var key = getKey();
    var model = getModel();
    if (!key) {
      els.settings.classList.add("open");
      return;
    }

    addMessage("user", text);
    history.push({ role: "user", text: text });
    els.textInput.value = "";
    els.sendBtn.disabled = true;

    var thinking = document.createElement("div");
    thinking.className = "ai-msg ai-msg-model ai-msg-pending";
    thinking.textContent = "Thinking...";
    els.thread.appendChild(thinking);
    els.thread.scrollTop = els.thread.scrollHeight;

    ensureContext().then(function (context) {
      var body = {
        system_instruction: {
          parts: [{
            text: "You are a helpful trip-planning assistant. Answer questions using the itinerary " +
              "context below. Keep answers concise. Reply in the same language the user writes in.\n\n" + context
          }]
        },
        contents: history.map(function (m) {
          return { role: m.role, parts: [{ text: m.text }] };
        })
      };

      return fetch(apiUrl(model, key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (result) {
        thinking.remove();
        if (!result.ok) {
          var msg = (result.data && result.data.error && result.data.error.message) ||
            ("Request failed (HTTP " + result.status + ")");
          addMessage("model", "Error: " + msg + " — check your API key and model name in settings.");
          return;
        }
        var candidates = result.data.candidates || [];
        var reply = candidates.length && candidates[0].content && candidates[0].content.parts
          ? candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("")
          : "(no response)";
        history.push({ role: "model", text: reply });
        addMessage("model", reply);
      })
      .catch(function (err) {
        thinking.remove();
        addMessage("model", "Error: " + (err && err.message ? err.message : "network error") +
          " — are you online?");
      })
      .finally(function () {
        els.sendBtn.disabled = false;
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildUI();
    refreshState();
  });
})();
