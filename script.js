let currentLang = 'ua';
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };
let financialData = { left: null, right: null };
let drift = { left: 1, right: 1 };

const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    currentLang = localStorage.getItem('lang') || 'ua';
    await loadLanguage(currentLang);
    setupEventListeners();
    setupLangSelector();
    startTickers();
}

async function loadLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    try {
        const [main, nasa, musk] = await Promise.all([
            fetch(`i18n/${lang}/main.json`).then(r => r.json()),
            fetch(`i18n/${lang}/data/nasa.json`).then(r => r.json()),
            fetch(`i18n/${lang}/data/elon-musk.json`).then(r => r.json())
        ]);
        financialData.left = nasa;
        financialData.right = musk;
        applyMainTexts(main);
        updateUI();
    } catch (e) { console.error("Data error", e); }
}

function applyMainTexts(main) {
    document.getElementById('mainTitle').innerText = main.ui.title;
    document.getElementById('donateTitle').innerText = main.donate.title;
    document.getElementById('donateDesc').innerText = main.donate.desc;
    document.getElementById('donateBtn').innerText = main.donate.btn_text;
    document.getElementById('leftCumLabel').innerText = main.ui.cumulative_label;
    document.getElementById('rightCumLabel').innerText = main.ui.cumulative_label;
}

function setupLangSelector() {
    const container = document.getElementById('langSelector');
    // Оскільки ти вилучив файли, я захардкодив UA, додай інші за аналогією
    const langs = [{code: 'ua', name: 'UA'}, {code: 'en', name: 'EN'}];
    container.innerHTML = langs.map(l => 
        `<img src="i18n/${l.code}/${l.code.toUpperCase()}.png" 
              class="lang-btn ${l.code === currentLang ? 'active' : ''}" 
              onclick="loadLanguage('${l.code}')" title="${l.name}">`
    ).join('');
}

function toggleMode(side, mode) {
    cardModes[side] = mode;
    document.querySelectorAll(`#${side}Card .mode-switcher button`).forEach(b => b.classList.remove('active'));
    document.getElementById(`${side}Btn${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
    
    // Зміна кольору картки залежно від режиму
    const card = document.getElementById(`${side}Card`);
    card.className = `card ${mode}`;
    updateUI();
}

function updateUI() {
    ["left", "right"].forEach(side => {
        const data = financialData[side];
        if (!data) return;
        const mode = cardModes[side];
        const container = document.getElementById(`${side}Details`);
        const breakdown = data.data[currentYear][mode].breakdown;
        
        container.innerHTML = Object.values(breakdown).map(item => 
            `<div class="detail-item"><span>${item.name}</span><b>${item.percent}%</b></div>`
        ).join('');
    });
}

function startTickers() {
    const update = () => {
        const now = new Date();
        const secondsPassed = (currentYear === "2026") ? (now - new Date(2026, 0, 1)) / 1000 : multipliers.year;

        ["left", "right"].forEach(side => {
            const data = financialData[side];
            if (!data) return;
            const mode = cardModes[side];
            const baseTotal = data.data[currentYear][mode].total;
            const basePerSec = baseTotal / multipliers.year;

            // Живе коливання (Drift)
            if (currentYear === "2026") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                drift[side] = Math.max(0.95, Math.min(drift[side], 1.05));
            } else {
                drift[side] = 1;
            }

            const currentRate = basePerSec * drift[side] * multipliers[currentTimeUnit];
            
            document.getElementById(`${side}Name`).innerText = data.name;
            document.getElementById(`${side}Rate`).innerText = (['sec', 'min'].includes(currentTimeUnit)) ? rateFormatter.format(currentRate) : wholeFormatter.format(currentRate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(secondsPassed * basePerSec);
            document.getElementById(`${side}Icon`).src = data.image;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            document.getElementById(`${side}Approx`).style.visibility = (currentYear === "2026") ? "visible" : "hidden";

            // Візуалізація стовпчика
            const scale = 10000; 
            const h = (basePerSec / scale) * 100;
            document.getElementById(`${side}Bar`).style.height = `${Math.min(Math.max(h, 10), 95)}%`;
        });
        requestAnimationFrame(update);
    };
    update();
}

function setupEventListeners() {
    document.getElementById('timeTabs').onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    };
    document.getElementById('yearSelector').onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText;
            updateUI();
        }
    };
}

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', next);
    document.getElementById('themeToggle').innerText = next === 'dark' ? '🌙' : '☀️';
}

init();
                                  
