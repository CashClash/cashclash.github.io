let financialData = null;
let currentYear = "2026";
let currentTimeUnit = "sec";
// Налаштування режимів для кожної картки
let cardModes = { left: "spending", right: "income" };

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners();
        startTickers();
    } catch (e) { console.error(e); }
}

function setupEventListeners() {
    // Часові одиниці
    document.getElementById('timeTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    });

    // Роки
    document.getElementById('yearSelector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText;
        }
    });

    // Перемикачі режимів Income/Spending всередині карток
    document.querySelectorAll('.mode-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const side = card.dataset.side;
            const mode = e.target.dataset.mode;
            
            cardModes[side] = mode;
            card.querySelectorAll('.mode-switch').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Змінюємо колір картки візуально
            card.className = `card ${mode}`;
        });
    });
}

function startTickers() {
    const update = () => {
        if (!financialData) return;
        const now = new Date();
        const isCurrentYear = now.getFullYear().toString() === currentYear;
        
        let secondsPassed = isCurrentYear ? 
            (now - new Date(now.getFullYear(), 0, 1)) / 1000 : 
            365 * 24 * 60 * 60;

        financialData.entities.forEach((entity, index) => {
            const side = index === 0 ? "left" : "right";
            const mode = cardModes[side];
            const yearData = entity.data[currentYear] || entity.data["2025"] || { income: 0, spending: 0 };
            
            let baseValuePerYear = yearData[mode];
            
            // 4. Логіка коливань для поточного року (+-15%)
            let volatility = 1;
            if (isCurrentYear && currentTimeUnit !== "year") {
                // Плавне коливання на основі синусоїди від часу
                volatility = 1 + (Math.sin(now.getTime() / 2000) * 0.15);
            }

            const perSec = (baseValuePerYear / (365 * 24 * 60 * 60)) * volatility;
            const cumulative = secondsPassed * (baseValuePerYear / (365 * 24 * 60 * 60)); // Кумулятив без коливань для точності

            // 2. Перерахунок одиниць часу
            let displayRate = perSec;
            const multipliers = { min: 60, hour: 3600, day: 86400, week: 604800, month: 2592000, year: baseValuePerYear };
            if (multipliers[currentTimeUnit]) displayRate = currentTimeUnit === "year" ? baseValuePerYear : perSec * multipliers[currentTimeUnit];

            // 3. Оновлення підпису одиниці виміру та знаку "≈"
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            document.getElementById(`${side}Approx`).style.display = (isCurrentYear && currentTimeUnit === "year") ? "inline" : "none";

            // Оновлення тексту
            document.getElementById(`${side}Cumulative`).innerText = Math.floor(cumulative).toLocaleString('en-US');
            document.getElementById(`${side}Rate`).innerText = displayRate.toLocaleString('en-US', {
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2
            });

            // Оновлення іконки (якщо є в JSON, інакше плейсхолдер)
            document.getElementById(`${side}Icon`).src = entity.image || `https://ui-avatars.com/api/?name=${entity.name}&background=random`;
            
            const maxVisible = 15000;
            const heightFactor = Math.min((perSec / maxVisible) * 100, 90);
            document.getElementById(`${side}Bar`).style.height = `${10 + heightFactor}%`;
        });

        requestAnimationFrame(update);
    };
    update();
}

init();
