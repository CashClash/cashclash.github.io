let financialData = null;
let currentYear = "2026"; // Встановлюємо актуальний рік
let currentTimeUnit = "sec";

async function init() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        setupEventListeners(); // Додаємо слухачів подій
        startTickers();
    } catch (e) {
        console.error("Помилка завантаження даних:", e);
    }
}

function setupEventListeners() {
    // Слухач для перемикання одиниць часу
    document.getElementById('timeTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeTabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeUnit = e.target.dataset.unit;
        }
    });

    // Слухач для перемикання років
    document.getElementById('yearSelector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#yearSelector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentYear = e.target.innerText; // Оновлюємо вибраний рік
        }
    });
}

function startTickers() {
    const update = () => {
        if (!financialData) return;

        const now = new Date();
        const isCurrentYear = now.getFullYear().toString() === currentYear;
        
        let secondsPassed;
        if (isCurrentYear) {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            secondsPassed = (now - startOfYear) / 1000;
        } else {
            // Якщо обрано минулий рік, показуємо фінальну суму (кількість секунд у році)
            secondsPassed = 365 * 24 * 60 * 60;
        }

        financialData.entities.forEach((entity, index) => {
            // Перевіряємо наявність даних для року, якщо немає — беремо 2025 або 0
            const yearData = entity.data[currentYear] || entity.data["2025"] || { income: 0, spending: 0 };
            
            const valuePerYear = (index === 0) ? yearData.spending : yearData.income;
            const perSec = valuePerYear / (365 * 24 * 60 * 60);
            
            const cumulative = secondsPassed * perSec;
            
            let displayRate = perSec;
            if (currentTimeUnit === "min") displayRate *= 60;
            if (currentTimeUnit === "hour") displayRate *= 3600;
            if (currentTimeUnit === "year") displayRate = valuePerYear;

            const prefix = index === 0 ? "left" : "right";
            
            // Оновлення тексту
            document.getElementById(`${prefix}Cumulative`).innerText = Math.floor(cumulative).toLocaleString('en-US');
            document.getElementById(`${prefix}Rate`).innerText = displayRate.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            // Оновлення бару (анімація висоти)
            const maxVisible = 10000; // Умовний масштаб для візуалізації
            const heightFactor = Math.min((perSec / maxVisible) * 100, 90);
            document.getElementById(`${prefix}Bar`).style.height = `${10 + heightFactor}%`;
        });

        requestAnimationFrame(update);
    };
    update();
}

init();
                
