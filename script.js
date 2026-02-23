let financialData = null;
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };

let drift = { left: 1, right: 1 };

const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners();
        startTickers();
    } catch (e) { console.error("Error:", e); }
}

function setupEventListeners() {
    document.getElementById('timeTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    });

    document.getElementById('yearSelector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText;
        }
    });

    document.querySelectorAll('.mode-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            cardModes[card.dataset.side] = e.target.dataset.mode;
            card.className = `card ${e.target.dataset.mode}`;
            card.querySelectorAll('.mode-switch').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

function startTickers() {
    const update = () => {
        if (!financialData) return;
        const now = new Date();
        const realYear = now.getFullYear().toString();
        let effectiveYear = currentYear === "Total" ? "2026" : currentYear;
        const isCurrentYear = realYear === effectiveYear;
        
        let secondsPassed = isCurrentYear ? (now - new Date(now.getFullYear(), 0, 1)) / 1000 : multipliers.year;

        financialData.entities.forEach((entity, index) => {
            const side = index === 0 ? "left" : "right";
            const mode = cardModes[side];
            const yearData = entity.data[effectiveYear] || entity.data["2025"];
            const baseValuePerYear = yearData[mode] || 0;
            const basePerSec = baseValuePerYear / multipliers.year;

            if (isCurrentYear && currentTimeUnit !== "year") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                if (drift[side] > 1.15) drift[side] -= 0.001;
                if (drift[side] < 0.85) drift[side] += 0.001;
            } else { drift[side] = 1; }

            const currentRatePerSec = basePerSec * drift[side];
            const cumulative = secondsPassed * basePerSec;
            let displayRate = (currentTimeUnit === 'year') ? baseValuePerYear : currentRatePerSec * multipliers[currentTimeUnit];
            
            // Оновлення тексту
            document.getElementById(`${side}Name`).innerText = entity.name;
            document.getElementById(`${side}Type`).innerText = entity.category;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            document.getElementById(`${side}Approx`).style.display = isCurrentYear ? "inline" : "none";
            
            const activeFormatter = (currentTimeUnit === 'sec' || currentTimeUnit === 'min') ? rateFormatter : wholeFormatter;
            document.getElementById(`${side}Rate`).innerText = activeFormatter.format(displayRate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(Math.floor(cumulative));
            
            document.getElementById(`${side}Icon`).src = entity.image || `https://ui-avatars.com/api/?name=${entity.name}&background=333&color=fff`;

            // --- НОВИЙ РОЗРАХУНОК ВИСОТИ ---
            // Адаптуємо висоту під 220px. 8000 - це умовний "стеля" для візуальної краси
            let heightFactor = (basePerSec / 8000) * 100; 
            const finalHeight = Math.max(8, Math.min(heightFactor, 92));
            document.getElementById(`${side}Bar`).style.height = `${finalHeight}%`;
        });
        requestAnimationFrame(update);
    };
    update();
}
init();
