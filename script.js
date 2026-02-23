let financialData = null;
let currentYear = "2026";
let currentTimeUnit = "sec";
let cardModes = { left: "spending", right: "income" };

// Стан для натурального дрейфу чисел (Random Walk)
let drift = { left: 1, right: 1 };

const multipliers = {
    sec: 1,
    min: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
    year: 31536000
};

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners();
        startTickers();
    } catch (e) { 
        console.error("Помилка завантаження даних:", e); 
    }
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

    // Перемикачі режимів Income/Spending
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
        const isCurrentYear = now.getFullYear().toString() === currentYear;
        
        // Розрахунок часу
        let secondsPassed;
        if (isCurrentYear) {
            secondsPassed = (now - new Date(now.getFullYear(), 0, 1)) / 1000;
        } else if (currentYear === "Total") {
            secondsPassed = 31536000 * 5; // Умовно 5 років для Total
        } else {
            secondsPassed = 31536000; // Повний минулий рік
        }

        financialData.entities.forEach((entity, index) => {
            const side = index === 0 ? "left" : "right";
            const mode = cardModes[side];
            
            // Отримуємо дані для року або fallback на 2025
            const yearData = entity.data[currentYear] || entity.data["2025"] || { income: 0, spending: 0 };
            const baseValuePerYear = yearData[mode] || 0;
            const basePerSec = baseValuePerYear / 31536000;

            // --- НАТУРАЛЬНА ВОЛАТИЛЬНІСТЬ (Random Walk) ---
            if (isCurrentYear && currentTimeUnit !== "year") {
                // Мікро-зміна кожного кадру
                const change = (Math.random() - 0.5) * 0.002; 
                drift[side] += change;

                // М'яко повертаємо до центру, якщо занесло далі ніж на 15%
                if (drift[side] > 1.15) drift[side] -= 0.002;
                if (drift[side] < 0.85) drift[side] += 0.002;
            } else {
                drift[side] = 1; // Без коливань для минулих років
            }

            const currentRatePerSec = basePerSec * drift[side];
            const cumulative = secondsPassed * basePerSec;

            // --- РОЗРАХУНОК ВІДОБРАЖЕННЯ ---
            let displayRate = (currentTimeUnit === 'year') ? baseValuePerYear : currentRatePerSec * multipliers[currentTimeUnit];

            // --- ОНОВЛЕННЯ DOM ---
            const nameEl = document.getElementById(`${side}Name`);
            nameEl.innerText = entity.name;
            
            // Динамічний шрифт для довгих назв
            if (entity.name.length > 12) {
                nameEl.style.fontSize = '14px';
            } else {
                nameEl.style.fontSize = '';
            }

            document.getElementById(`${side}Type`).innerText = entity.category;
            document.getElementById(`${side}Unit`).innerText = `/ ${currentTimeUnit}`;
            
            // Відображення знаку ≈ для поточного року
            document.getElementById(`${side}Approx`).style.display = isCurrentYear ? "inline" : "none";

            // Форматування чисел
            const rateFormatter = new Intl.NumberFormat('en-US', {
                maximumFractionDigits: (currentTimeUnit === 'sec' || currentTimeUnit === 'min') ? 2 : 0
            });

            document.getElementById(`${side}Rate`).innerText = rateFormatter.format(displayRate);
            document.getElementById(`${side}Cumulative`).innerText = Math.floor(cumulative).toLocaleString('en-US');

            // Оновлення іконок
            const iconEl = document.getElementById(`${side}Icon`);
            iconEl.src = entity.image || `https://ui-avatars.com/api/?name=${entity.name}&background=333&color=fff&size=64`;

            // Масштаб бару
            const height = Math.min((basePerSec / 15000) * 100, 85);
            document.getElementById(`${side}Bar`).style.height = `${15 + height}%`;
        });

        requestAnimationFrame(update);
    };
    update();
}

init();
                
