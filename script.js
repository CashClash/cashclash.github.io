let currentLang = 'en';
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };
let financialData = { left: null, right: null };
let drift = { left: 1, right: 1 };

const availableLangs = ['en', 'ua'];
const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    applyInitialTheme();
    const savedLang = localStorage.getItem('lang') || 'en';
    await loadLanguage(savedLang);
    setupEventListeners();
    setupLangSelector();
    startTickers();
}

async function loadLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    try {
        const mainRes = await fetch(`i18n/${lang}/main.json`);
        const mainTexts = await mainRes.json();
        applyInterfaceTexts(mainTexts);

        // ВАЖЛИВО: Назви файлів мають бути точно як у тебе в папці i18n/en/data/
        const leftRes = await fetch(`i18n/${lang}/data/nasa.json`);
        const rightRes = await fetch(`i18n/${lang}/data/elon-musk.json`);
        
        financialData.left = await leftRes.json();
        financialData.right = await rightRes.json();
        
        updateDetails("left");
        updateDetails("right");
    } catch (e) {
        console.error("Помилка завантаження JSON:", e);
    }
}

function applyInterfaceTexts(t) {
    if(!t.ui) return;
    document.getElementById('mainTitle').innerText = t.ui.title;
    document.getElementById('donateTitle').innerText = t.donate.title;
    document.getElementById('donateDesc').innerText = t.donate.desc;
    document.getElementById('donateBtn').innerText = t.donate.btn_text;
    document.getElementById('footerCreated').innerText = t.ui.created_by;
    document.getElementById('footerSlogan').innerText = t.ui.slogan;
    document.getElementById('seoContent').innerHTML = t.seo_text || "";
    document.querySelectorAll('.subtext').forEach(el => el.innerText = t.ui.cumulative_label);
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
            updateDetails("left"); updateDetails("right");
        }
    };

    document.getElementById('themeToggle').onclick = toggleTheme;
}

function setupLangSelector() {
    const container = document.getElementById('langSelector');
    container.innerHTML = '';
    availableLangs.forEach(lang => {
        const img = document.createElement('img');
        img.src = `i18n/${lang}/${lang.toUpperCase()}.png`;
        img.className = `lang-btn ${lang === currentLang ? 'active' : ''}`;
        img.onclick = () => loadLanguage(lang);
        container.appendChild(img);
    });
}

function updateDetails(side) {
    const data = financialData[side];
    if (!data || !data.data[currentYear]) return;
    const yearData = data.data[currentYear];
    const mode = cardModes[side];
    const container = document.getElementById(`${side}Details`);
    container.innerHTML = '';
    
    if (yearData[mode]?.breakdown) {
        Object.values(yearData[mode].breakdown).forEach(item => {
            const row = document.createElement('div');
            row.className = 'detail-item';
            row.innerHTML = `<span class="detail-name">${item.name}</span><span class="detail-value">${item.percent}%</span>`;
            container.appendChild(row);
        });
    }
}

function startTickers() {
    const update = () => {
        const isCurrentYear = currentYear === "2026";
        const now = new Date();
        const secondsPassed = isCurrentYear ? (now - new Date(2026, 0, 1)) / 1000 : multipliers.year;

        ["left", "right"].forEach(side => {
            const data = financialData[side];
            if (!data) return;
            const mode = cardModes[side];
            const yearData = data.data[currentYear];
            if (!yearData) return;

            const baseYearly = yearData[mode].total;
            const basePerSec = baseYearly / multipliers.year;

            if (isCurrentYear && currentTimeUnit !== "year") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                drift[side] = Math.max(0.9, Math.min(drift[side], 1.1));
            } else { drift[side] = 1; }

            const rate = (currentTimeUnit === 'year') ? baseYearly : (basePerSec * drift[side] * multipliers[currentTimeUnit]);
            
            document.getElementById(`${side}Name`).innerText = data.name;
            document.getElementById(`${side}Rate`).innerText = (['sec','min'].includes(currentTimeUnit)) ? rateFormatter.format(rate) : wholeFormatter.format(rate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(secondsPassed * basePerSec);
            document.getElementById(`${side}Icon`).src = data.image;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;

            // Стовпчик: ділимо на 10000$ як умовний макс. для візуалу
            const h = (basePerSec / 10000) * 100;
            document.getElementById(`${side}Bar`).style.height = `${Math.min(Math.max(h, 10), 100)}%`;
        });
        requestAnimationFrame(update);
    };
    update();
}

function applyInitialTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', t);
    document.getElementById('themeToggle').innerText = t === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('themeToggle').innerText = next === 'dark' ? '🌙' : '☀️';
}

init();
