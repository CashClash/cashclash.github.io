let financialData = null;
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };

// Стан для плавного дрейфу чисел (+-15%)
let drift = { left: 1, right: 1 };

const multipliers = {
    sec: 1, min: 60, hour: 3600, day: 86400,
    week: 604800, month: 2592000, year: 31536000
};

// Створюємо форматери один раз для продуктивності
const rateFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
const wholeFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
});

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners();
        startTickers();
    } catch (e) { console.error("Data Load Error:", e); }
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
            const side = card.dataset.side;
            const mode = e.target.dataset.mode;
            cardModes[side] = mode;
            card.className = `card ${mode}`;
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
        
        // Логіка для "Total" (поки що беремо 2026 або сумуємо, тут спрощено до 2026)
        let effectiveYear = currentYear === "Total" ? "2026" : currentYear;
        const isCurrentYear = realYear === effectiveYear;
        
        let secondsPassed = isCurrentYear ? 
            (now - new Date(now.getFullYear(), 0, 1)) / 1000 : multipliers.year;

        financialData.entities.forEach((entity, index) => {
            const side = index === 0 ? "left" : "right";
            const mode = cardModes[side];
            
            // Отримуємо дані для обраного року
            const yearData = entity.data[effectiveYear] || entity.data["2025"] || { income: 0, spending: 0 };
            
            const baseValuePerYear = yearData[mode] || 0;
            const basePerSec = baseValuePerYear / multipliers.year;

            // --- НАТУРАЛЬНИЙ ДРЕЙФ ---
            // Дрейфує тільки якщо ми дивимось на поточний момент і НЕ річний масштаб
            if (isCurrentYear && currentTimeUnit !== "year") {
                drift[side] += (Math.random() - 0.5) * 0.002;
                if (drift[side] > 1.15) drift[side] -= 0.001;
                if (drift[side] < 0.85) drift[side] += 0.001;
            } else {
                drift[side] = 1;
            }

            const currentRatePerSec = basePerSec * drift[side];
            
            // Cumulative завжди стабільний
            const cumulative = secondsPassed * basePerSec;

            // Вибір формату
            let displayRate = (currentTimeUnit === 'year') ? 
                baseValuePerYear : currentRatePerSec * multipliers[currentTimeUnit];
            
            const activeFormatter = (currentTimeUnit === 'sec' || currentTimeUnit === 'min') ? 
                rateFormatter : wholeFormatter;

            // --- ОНОВЛЕННЯ DOM ---
            document.getElementById(`${side}Name`).innerText = entity.name;
            document.getElementById(`${side}Type`).innerText = entity.category;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            
            // Знак ≈ тільки для поточного року/Total
            document.getElementById(`${side}Approx`).style.display = isCurrentYear ? "inline" : "none";

            document.getElementById(`${side}Rate`).innerText = activeFormatter.format(displayRate);
            document.getElementById(`${side}Cumulative`).innerText = wholeFormatter.format(Math.floor(cumulative));
            
            const iconEl = document.getElementById(`${side}Icon`);
            iconEl.src = entity.image || `https://ui-avatars.com/api/?name=${entity.name}&background=333&color=fff`;

            // Масштаб бару (використовуємо basePerSec, щоб бар не трусився)
            const height = Math.min((basePerSec / 15000) * 100, 85);
            document.getElementById(`${side}Bar`).style.height = `${15 + height}%`;
        });

        requestAnimationFrame(update);
    };
    update();
}

init();
