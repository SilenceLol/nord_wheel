// auth-final.js - РАБОЧАЯ ВЕРСИЯ ДЛЯ ЛОКАЛЬНОГО ТЕСТИРОВАНИЯ

// ==================== КОНФИГУРАЦИЯ ====================
const API_CONFIG = {
    BASE_URL: 'https://pe.matrix-1c.ru/m-cargo/hs/root',
    TIMEOUT: 15000,
};

const STORAGE_KEYS = {
    ACCESS_CODE: 'nord_wheel_access_code',
    USER_DATA: 'nord_wheel_user_data',
    PHONE_NUMBER: 'nord_wheel_phone',
    LAST_LOGIN: 'nord_wheel_last_login'
};

// ==================== СОСТОЯНИЕ ====================
let appState = {
    phoneNumber: '',
    verificationCode: '',
    generatedAccessCode: '',
    verificationAttempts: 0,
    timerInterval: null,
    currentStep: 'cached_check'
};

// DOM элементы
let elements = {};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('NORD WHEEL - Авторизация запущена');
    initElements();
    
    // ПРИНУДИТЕЛЬНО ВКЛЮЧАЕМ ТЕСТОВЫЙ РЕЖИМ ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ
    window.LOCAL_TEST_MODE = true;
    console.log('🧪 ЛОКАЛЬНЫЙ ТЕСТОВЫЙ РЕЖИМ АКТИВЕН');
    
    await checkCachedAccessCode();
});

function initElements() {
    const ids = [
        'cachedCheckCard', 'phoneInputCard', 'cachedStatus', 
        'cachedActions', 'cachedUserName', 'phoneNumber',
        'verificationCode', 'codeTimer', 'timerSeconds',
        'backToPhoneBtn', 'phoneStep', 'codeStep',
        'successStep', 'deniedStep', 'generatedAccessCode',
        'deniedMessage', 'authStatus'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
    
    // Проверяем что все элементы найдены
    console.log('DOM элементы загружены:', elements.phoneNumber ? '✅' : '❌');
    
    // Обработчики
    if (elements.phoneNumber) {
        elements.phoneNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendVerificationCode();
        });
        setupPhoneInput();
    }
    
    if (elements.verificationCode) {
        elements.verificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyCode();
        });
        
        elements.verificationCode.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^\d]/g, '').substring(0, 4);
            if (this.value.length === 4) {
                setTimeout(() => verifyCode(), 300);
            }
        });
    }
    
    // Явно привязываем функцию к кнопке на всякий случай
    const sendCodeBtn = document.querySelector('.btn-auth[onclick="sendVerificationCode()"]');
    if (sendCodeBtn) {
        sendCodeBtn.onclick = function(e) {
            e.preventDefault();
            sendVerificationCode();
            return false;
        };
    }
}

// ==================== НАСТРОЙКА ПОЛЯ ТЕЛЕФОНА ====================
function setupPhoneInput() {
    const input = elements.phoneNumber;
    input.value = '+7';
    input.dataset.cleanNumber = '+7';
    
    setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
    }, 100);
    
    input.addEventListener('input', function(e) {
        let value = this.value;
        
        if (!value.startsWith('+7')) {
            this.value = '+7';
            this.dataset.cleanNumber = '+7';
            return;
        }
        
        let digits = value.replace(/[^\d]/g, '');
        
        if (digits.length > 1) {
            digits = digits.substring(1);
        } else {
            digits = '';
        }
        
        digits = digits.substring(0, 10);
        
        let formatted = '+7';
        if (digits.length > 0) {
            formatted += ' ' + digits.substring(0, 3);
        }
        if (digits.length > 3) {
            formatted += ' ' + digits.substring(3, 6);
        }
        if (digits.length > 6) {
            formatted += ' ' + digits.substring(6, 8);
        }
        if (digits.length > 8) {
            formatted += ' ' + digits.substring(8, 10);
        }
        
        this.value = formatted;
        this.dataset.cleanNumber = '+7' + digits;
    });
}

// ==================== ПРОВЕРКА КЭША ====================
async function checkCachedAccessCode() {
    try {
        const accessCode = localStorage.getItem(STORAGE_KEYS.ACCESS_CODE);
        const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        if (accessCode && userDataStr) {
            const userData = JSON.parse(userDataStr);
            showCachedUser(userData, accessCode);
            return;
        }
    } catch (error) {
        console.error('Ошибка при проверке кэша:', error);
    }
    
    showPhoneInput();
}

function showCachedUser(userData, accessCode) {
    if (elements.cachedUserName) elements.cachedUserName.textContent = userData.name || 'Пользователь';
    if (elements.cachedStatus) elements.cachedStatus.style.display = 'none';
    if (elements.cachedActions) elements.cachedActions.style.display = 'block';
    
    appState.generatedAccessCode = accessCode;
    appState.userData = userData;
}

// ==================== ПОКАЗАТЬ ВВОД ТЕЛЕФОНА ====================
function showPhoneInput() {
    if (elements.cachedCheckCard) elements.cachedCheckCard.style.display = 'none';
    if (elements.phoneInputCard) elements.phoneInputCard.style.display = 'block';
    resetToPhoneInput();
}

function resetToPhoneInput() {
    appState.currentStep = 'phone_input';
    
    if (elements.phoneStep) elements.phoneStep.style.display = 'block';
    if (elements.codeStep) elements.codeStep.style.display = 'none';
    if (elements.successStep) elements.successStep.style.display = 'none';
    if (elements.deniedStep) elements.deniedStep.style.display = 'none';
    if (elements.backToPhoneBtn) elements.backToPhoneBtn.style.display = 'none';
    
    if (elements.phoneNumber) {
        elements.phoneNumber.value = '+7';
        elements.phoneNumber.dataset.cleanNumber = '+7';
    }
    
    if (elements.verificationCode) elements.verificationCode.value = '';
    
    stopCodeTimer();
    showAuthStatus('Введите номер телефона', 'info');
}

// ==================== ОТПРАВКА КОДА ====================
function sendVerificationCode() {
    console.log('📱 sendVerificationCode вызвана');
    
    // Получаем номер телефона
    let phone = elements.phoneNumber.dataset.cleanNumber || elements.phoneNumber.value.trim();
    console.log('Номер телефона:', phone);
    
    if (!phone || phone === '+7') {
        showAuthStatus('Введите номер телефона', 'error');
        elements.phoneNumber.focus();
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    console.log('Очищенный номер:', cleanPhone);
    
    if (cleanPhone.length !== 10) {
        showAuthStatus('Введите 10 цифр номера', 'error');
        elements.phoneNumber.focus();
        return;
    }
    
    // ТЕСТОВЫЙ РЕЖИМ - ВСЕГДА РАБОТАЕТ ЛОКАЛЬНО
    console.log('🧪 Активация тестового режима');
    
    appState.phoneNumber = '+7' + cleanPhone;
    
    // Сохраняем тестовый код 1234
    if (!window.pendingVerifications) window.pendingVerifications = {};
    window.pendingVerifications[cleanPhone] = {
        code: '1234',
        timestamp: Date.now(),
        attempts: 0
    };
    
    // Переходим к вводу кода
    if (elements.phoneStep) elements.phoneStep.style.display = 'none';
    if (elements.codeStep) elements.codeStep.style.display = 'block';
    if (elements.backToPhoneBtn) elements.backToPhoneBtn.style.display = 'block';
    appState.currentStep = 'code_input';
    
    startCodeTimer();
    
    setTimeout(() => {
        if (elements.verificationCode) {
            elements.verificationCode.focus();
            elements.verificationCode.value = '';
        }
    }, 300);
    
    showAuthStatus('📱 Код отправлен. Тестовый код: 1234', 'success');
}

// ==================== ПРОВЕРКА КОДА ====================
function verifyCode() {
    console.log('🔑 verifyCode вызвана');
    
    const code = elements.verificationCode.value.trim();
    console.log('Введенный код:', code);
    
    if (!code || code.length !== 4 || !/^\d+$/.test(code)) {
        showAuthStatus('Введите 4-значный код', 'error');
        elements.verificationCode.focus();
        return;
    }
    
    appState.verificationAttempts++;
    
    if (appState.verificationAttempts > 5) {
        showAuthStatus('Слишком много попыток. Запросите новый код.', 'error');
        setTimeout(() => resetToPhoneInput(), 2000);
        return;
    }
    
    showAuthStatus('Проверка кода...', 'loading');
    
    const cleanPhone = appState.phoneNumber.replace(/\D/g, '').slice(-10);
    const pending = window.pendingVerifications?.[cleanPhone];
    
    // Принимаем код 1234
    if (code === '1234') {
        console.log('✅ Код верный!');
        showAuthStatus('Код подтвержден!', 'success');
        generateAccessCodeForUser(cleanPhone);
    } else {
        const attemptsLeft = 5 - appState.verificationAttempts;
        showAuthStatus(`❌ Неверный код. Осталось попыток: ${attemptsLeft}`, 'error');
        elements.verificationCode.focus();
        elements.verificationCode.select();
    }
}

// ==================== ГЕНЕРАЦИЯ КОДА ДОСТУПА ====================
function generateAccessCodeForUser(cleanPhone) {
    console.log('🎫 Генерация кода доступа');
    
    // Генерируем код доступа (8 символов)
    const accessCode = generateLocalAccessCode();
    const userData = {
        name: `Пользователь ${cleanPhone.slice(-4)}`,
        fullName: `Пользователь ${cleanPhone.slice(-4)}`,
        phone: '+7' + cleanPhone,
        position: 'Сотрудник'
    };
    
    console.log('Сгенерирован код:', accessCode);
    
    // Сохраняем в кэш
    localStorage.setItem(STORAGE_KEYS.ACCESS_CODE, accessCode);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, '+7' + cleanPhone);
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    
    // Для совместимости
    localStorage.setItem('employeeAuth', JSON.stringify({
        ...userData,
        accessCode: accessCode,
        loginTime: new Date().toISOString()
    }));
    
    appState.generatedAccessCode = accessCode;
    appState.userData = userData;
    
    // Показываем успех
    if (elements.codeStep) elements.codeStep.style.display = 'none';
    if (elements.successStep) elements.successStep.style.display = 'block';
    if (elements.backToPhoneBtn) elements.backToPhoneBtn.style.display = 'none';
    if (elements.generatedAccessCode) elements.generatedAccessCode.textContent = accessCode;
    
    stopCodeTimer();
    showAuthStatus('✅ Код доступа сохранен в браузере', 'success');
    
    // Удаляем временный код
    delete window.pendingVerifications?.[cleanPhone];
    
    // Автопереход через 3 секунды
    setTimeout(() => {
        completeLogin();
    }, 3000);
}

// ==================== ВХОД В СИСТЕМУ ====================
function completeLogin() {
    console.log('🚀 Перенаправление на cargo.html');
    if (appState.userData && appState.generatedAccessCode) {
        window.location.href = 'cargo.html';
    }
}

function continueWithCachedCode() {
    showAuthStatus('Вход в систему...', 'loading');
    if (appState.userData) {
        localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        window.location.href = 'cargo.html';
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function generateLocalAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function startCodeTimer() {
    let seconds = 60;
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    
    if (elements.codeTimer) elements.codeTimer.style.display = 'block';
    if (elements.timerSeconds) elements.timerSeconds.textContent = seconds;
    
    appState.timerInterval = setInterval(() => {
        seconds--;
        if (elements.timerSeconds) elements.timerSeconds.textContent = seconds;
        
        if (seconds <= 0) {
            stopCodeTimer();
            if (elements.codeTimer) {
                elements.codeTimer.innerHTML = '<span style="color: #27ae60; cursor: pointer; font-weight: bold;" onclick="resendVerificationCode()">Отправить код повторно</span>';
            }
        }
    }, 1000);
}

function stopCodeTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

function resendVerificationCode() {
    if (appState.phoneNumber) {
        sendVerificationCode();
    }
}

function showAuthStatus(message, type) {
    console.log(`[Auth] ${type}: ${message}`);
    if (elements.authStatus) {
        elements.authStatus.innerHTML = message;
        elements.authStatus.className = `auth-status ${type || ''}`;
    }
}

// ==================== ЭКСПОРТ ====================
window.continueWithCachedCode = continueWithCachedCode;
window.showPhoneInput = showPhoneInput;
window.sendVerificationCode = sendVerificationCode;
window.verifyCode = verifyCode;
window.resendVerificationCode = resendVerificationCode;
window.completeLogin = completeLogin;
window.resetToPhoneInput = resetToPhoneInput;

console.log('✅ auth-final.js загружен, функции экспортированы');
