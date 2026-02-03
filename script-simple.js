// script-simple.js - Упрощенный файл для cargo.html

document.addEventListener('DOMContentLoaded', function() {
    console.log('Упрощенный script.js загружен');
    
    // Добавляем стили для уведомлений если их нет
    addNotificationStyles();
    
    // Оптимизация для мобильных устройств
    optimizeForMobile();
    
    console.log('Упрощенный script.js инициализирован');
});

function addNotificationStyles() {
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 250px;
                max-width: 350px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            }
            
            .notification-success { background: #27ae60; }
            .notification-error { background: #e74c3c; }
            .notification-warning { background: #f39c12; }
            .notification-info { background: #3498db; }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Оптимизация для мобильных устройств
function optimizeForMobile() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log('Мобильное устройство обнаружено, применяем оптимизацию...');
        
        // Добавляем класс для мобильных устройств
        document.body.classList.add('mobile-device');
        
        // Увеличиваем тач-таргеты
        const touchElements = document.querySelectorAll(
            '.param-btn, .cargo-type-item, .packaging-type-item, ' +
            '.btn-save-new, .btn-send-new, .photo-container-new, ' +
            '.total-info-value.clickable, .cargo-stats-item-remove, ' +
            '.clickable-weight'
        );
        
        touchElements.forEach(el => {
            el.style.minHeight = '44px';
            el.style.minWidth = '44px';
            el.style.cursor = 'pointer';
        });
        
        // Улучшаем поля ввода для мобильных
        const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
        inputs.forEach(input => {
            input.style.fontSize = '16px'; // Предотвращает зум в iOS
            input.style.minHeight = '44px';
            input.style.padding = '10px';
        });
    }
}

// Простая функция для logout если не определена в cargo.js
if (typeof window.logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('employeeAuth');
        localStorage.removeItem('cargoList');
        window.location.href = 'index.html';
    };
}