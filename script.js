let currentLang = 'en';
let currentYear = "2026";
let currentTimeUnit = "sec";
let financialData = { left: null, right: null };
const multipliers = { sec: 1, min: 60, hour: 3600, day: 86400, year: 31536000 };

const rf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    currentLang = localStorage.getItem('lang') || 'en';
    await loadLanguage(currentLang);
    setupEventListeners();
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

        document.getElementById('mainTitle').innerText = main.ui.title;
        document.getElementById('donateTitle').innerText = main.donate.title;
        document.getElementById('donateDesc').innerText = main.donate.desc;
        document.getElementById('donateBtn').innerText = main.donate.btn_text;
        document.querySelectorAll('.subtext').forEach(el => el.innerText = main.ui.cumulative_label);
        
        updateDetails("left");
        updateDetails("right");
    } catch (e) { console.error("Data load error", e); }
}

function updateDetails(side) {
    const data = financialData[side];
    const container = document.getElementById(`${side}Details`);
    if (!data || !container) return;
    const mode = (side === 'left') ? 'spending' : 'income';
    const breakdown = data.data[currentYear][mode].breakdown;
    
    container.innerHTML = '';
    Object.values(breakdown).forEach(item => {
        container.innerHTML += `<div class="detail-item"><span>${item.name}</span><b>${item.percent}%</b></div>`;
    });
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
    document.getElementById('themeToggle').onclick = () => {
        const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
    };
}

function startTickers() {
    const tick = () => {
        const now = new Date();
        const secondsPassed = (currentYear === "2026") ? (now - new Date(2026, 0, 1)) / 1000 : multipliers.year;

        ["left", "right"].forEach(side => {
            const data = financialData[side];
            if (!data) return;
            const mode = (side === 'left') ? 'spending' : 'income';
            const total = data.data[currentYear][mode].total;
            const perSec = total / multipliers.year;
            
            const rate = perSec * multipliers[currentTimeUnit];
            
            document.getElementById(`${side}Name`).innerText = data.name;
            document.getElementById(`${side}Type`).innerText = data.category;
            document.getElementById(`${side}Rate`).innerText = (currentTimeUnit === 'sec') ? rf.format(rate) : wf.format(rate);
            document.getElementById(`${side}Cumulative`).innerText = wf.format(secondsPassed * perSec);
            document.getElementById(`${side}Icon`).src = data.image;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;

            // Стовпчики порівняння
            const maxVal = 5000; // Для візуального масштабу
            const h = (perSec / maxVal) * 100;
            document.getElementById(`${side}Bar`).style.height = `${Math.min(Math.max(h, 5), 100)}%`;
        });
        requestAnimationFrame(tick);
    };
    tick();
}
init();
