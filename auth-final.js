// auth-final.js - ФИНАЛЬНАЯ ВЕРСИЯ С РЕАЛЬНЫМ API 1С И МАСКОЙ ТЕЛЕФОНА
// Код подтверждения - 4 цифры

// ==================== КОНФИГУРАЦИЯ ====================
const API_CONFIG = {
    BASE_URL: 'https://pe.matrix-1c.ru/m-cargo/hs/root',
    TIMEOUT: 15000,
    
    // Если API требует авторизацию - раскомментируйте и вставьте свои данные
    // AUTH: {
    //     type: 'basic', // или 'apikey'
    //     login: 'ваш_логин',
    //     password: 'ваш_пароль',
    //     apiKey: 'ваш_ключ'
    // }
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
    console.log('NORD WHEEL - Авторизация с API 1С (4-значный код)');
    initElements();
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
    
    // Обработчики Enter
    if (elements.phoneNumber) {
        elements.phoneNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendVerificationCode();
        });
        
        // Устанавливаем +7 и маску ввода
        setupPhoneInput();
    }
    
    if (elements.verificationCode) {
        elements.verificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyCode();
        });
        
        // Автоматическая проверка при вводе 4 цифр
        elements.verificationCode.addEventListener('input', function(e) {
            // Только цифры, максимум 4 символа
            this.value = this.value.replace(/[^\d]/g, '').substring(0, 4);
            
            // Если ввели 4 цифры - автоматически проверяем код
            if (this.value.length === 4) {
                setTimeout(() => verifyCode(), 300);
            }
        });
    }
}

// ==================== НАСТРОЙКА ПОЛЯ ТЕЛЕФОНА ====================
function setupPhoneInput() {
    const input = elements.phoneNumber;
    
    // Устанавливаем начальное значение +7
    input.value = '+7';
    input.dataset.cleanNumber = '+7';
    
    // Ставим курсор в конец (после +7)
    setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
    }, 100);
    
    // Обработчик ввода
    input.addEventListener('input', function(e) {
        let value = this.value;
        
        // Всегда начинаем с +7
        if (!value.startsWith('+7')) {
            this.value = '+7';
            this.dataset.cleanNumber = '+7';
            return;
        }
        
        // Удаляем все нецифровые символы кроме + в начале
        let digits = value.replace(/[^\d]/g, '');
        
        // Оставляем только цифры после +7
        if (digits.length > 1) {
            digits = digits.substring(1); // Убираем первую цифру 7
        } else {
            digits = '';
        }
        
        // Ограничиваем до 10 цифр
        digits = digits.substring(0, 10);
        
        // Форматируем с пробелами
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
        
        // Сохраняем чистый номер для отправки
        if (digits.length === 10) {
            this.dataset.cleanNumber = '+7' + digits;
        } else {
            this.dataset.cleanNumber = '+7' + digits;
        }
    });
    
    // Обработчик нажатия клавиш
    input.addEventListener('keydown', function(e) {
        // Запрещаем удалять +7 полностью
        if (this.selectionStart <= 2 && (e.key === 'Backspace' || e.key === 'Delete')) {
            e.preventDefault();
            // Перемещаем курсор в конец
            this.setSelectionRange(this.value.length, this.value.length);
        }
        
        // Запрещаем ввод букв
        if (e.key.length === 1 && !/[0-9]/.test(e.key) && e.key !== '+') {
            e.preventDefault();
        }
    });
    
    // Фокус на поле
    input.addEventListener('focus', function() {
        // Перемещаем курсор в конец
        setTimeout(() => {
            this.setSelectionRange(this.value.length, this.value.length);
        }, 50);
    });
}

// ==================== 1. ПРОВЕРКА КЭШИРОВАННОГО КОДА ====================
async function checkCachedAccessCode() {
    appState.currentStep = 'cached_check';
    
    try {
        const accessCode = localStorage.getItem(STORAGE_KEYS.ACCESS_CODE);
        const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        const phoneNumber = localStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
        
        if (accessCode && userDataStr && phoneNumber) {
            console.log('Найден кэшированный код:', accessCode);
            
            // Проверяем код на сервере (валидный ли еще)
            const isValid = await validateCodeWithServer(accessCode, phoneNumber);
            
            if (isValid) {
                const userData = JSON.parse(userDataStr);
                showCachedUser(userData, accessCode);
                return;
            } else {
                console.log('Код устарел или недействителен');
                clearCache();
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке кэша:', error);
    }
    
    // Если нет валидного кода - показываем ввод телефона
    showPhoneInput();
}

// Проверка кода на сервере 1С
async function validateCodeWithServer(code, phone) {
    try {
        // Очищаем номер от всего кроме цифр
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/validateToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                number: cleanPhone,
                token: code
            })
        });

        if (!response.ok) return false;
        
        const data = await response.json();
        return data.valid === true || data.success === true;
        
    } catch (error) {
        console.error('Ошибка валидации кода:', error);
        // Если сервер недоступен - доверяем кэшу (не больше 7 дней)
        const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
        if (lastLogin) {
            const daysDiff = (Date.now() - new Date(lastLogin)) / (1000 * 60 * 60 * 24);
            return daysDiff < 7;
        }
        return false;
    }
}

function showCachedUser(userData, accessCode) {
    elements.cachedUserName.textContent = userData.name || userData.fullName || 'Пользователь';
    elements.cachedStatus.style.display = 'none';
    elements.cachedActions.style.display = 'block';
    
    appState.generatedAccessCode = accessCode;
    appState.userData = userData;
    appState.phoneNumber = localStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
}

// ==================== 2. ВВОД ТЕЛЕФОНА ====================
function showPhoneInput() {
    elements.cachedCheckCard.style.display = 'none';
    elements.phoneInputCard.style.display = 'block';
    resetToPhoneInput();
}

function resetToPhoneInput() {
    appState.currentStep = 'phone_input';
    
    elements.phoneStep.style.display = 'block';
    elements.codeStep.style.display = 'none';
    elements.successStep.style.display = 'none';
    elements.deniedStep.style.display = 'none';
    elements.backToPhoneBtn.style.display = 'none';
    
    // Сбрасываем поле телефона на +7
    if (elements.phoneNumber) {
        elements.phoneNumber.value = '+7';
        elements.phoneNumber.dataset.cleanNumber = '+7';
    }
    
    if (elements.verificationCode) elements.verificationCode.value = '';
    
    stopCodeTimer();
    showAuthStatus('Введите номер телефона', 'info');
}

// ==================== 3. ЗАПРОС К 1С: getNewToken ====================
async function sendVerificationCode() {
    // Используем очищенный номер из data-атрибута
    let phone = elements.phoneNumber.dataset.cleanNumber || elements.phoneNumber.value.trim();
    
    if (!phone || phone === '+7') {
        showAuthStatus('Введите номер телефона', 'error');
        elements.phoneNumber.focus();
        return;
    }
    
    // Нормализуем номер: оставляем только 10 цифр для API
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    
    if (cleanPhone.length !== 10) {
        showAuthStatus('Введите 10 цифр номера', 'error');
        elements.phoneNumber.focus();
        return;
    }
    
    showAuthStatus('Отправка запроса в 1С...', 'loading');
    
    try {
        console.log('📤 Отправка запроса к 1С:', {
            url: `${API_CONFIG.BASE_URL}/getNewToken`,
            number: cleanPhone
        });
        
        // === РЕАЛЬНЫЙ ЗАПРОС К ВАШЕМУ API ===
        const response = await fetch(`${API_CONFIG.BASE_URL}/getNewToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                number: cleanPhone
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Ответ от 1С:', data);
        
        // Адаптируйте под формат ответа вашего API!
        let verificationCode = null;
        
        if (data.code) {
            verificationCode = data.code;
        } else if (data.smsCode) {
            verificationCode = data.smsCode;
        } else if (data.token) {
            verificationCode = data.token;
        } else {
            // Если API не возвращает код - генерируем тестовый (4 цифры)
            verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
            console.log('⚠️ API не вернул код, используем тестовый:', verificationCode);
        }
        
        // Убеждаемся что код 4-значный
        verificationCode = verificationCode.toString().padStart(4, '0').slice(0, 4);
        
        // Сохраняем данные
        appState.phoneNumber = '+7' + cleanPhone;
        
        // Сохраняем код для проверки
        if (!window.pendingVerifications) window.pendingVerifications = {};
        window.pendingVerifications[cleanPhone] = {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0
        };
        
        // Переходим к вводу кода
        elements.phoneStep.style.display = 'none';
        elements.codeStep.style.display = 'block';
        elements.backToPhoneBtn.style.display = 'block';
        appState.currentStep = 'code_input';
        
        startCodeTimer();
        
        setTimeout(() => {
            if (elements.verificationCode) {
                elements.verificationCode.focus();
                elements.verificationCode.value = '';
            }
        }, 300);
        
        // Для отладки: показываем код
        showAuthStatus(`📱 Код отправлен. Для теста: ${verificationCode}`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка при запросе к 1С:', error);
        
        // === РЕЖИМ ТЕСТИРОВАНИЯ ===
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔄 Тестовый режим: эмуляция API');
            emulateTestMode(cleanPhone);
        } else {
            showAuthStatus('Ошибка соединения с сервером. Проверьте интернет.', 'error');
        }
    }
}

// Тестовый режим для разработки (4-значный код)
function emulateTestMode(cleanPhone) {
    const testCode = '1234'; // 4 цифры для теста
    
    appState.phoneNumber = '+7' + cleanPhone;
    
    window.pendingVerifications = window.pendingVerifications || {};
    window.pendingVerifications[cleanPhone] = {
        code: testCode,
        timestamp: Date.now(),
        attempts: 0
    };
    
    elements.phoneStep.style.display = 'none';
    elements.codeStep.style.display = 'block';
    elements.backToPhoneBtn.style.display = 'block';
    appState.currentStep = 'code_input';
    
    startCodeTimer();
    
    setTimeout(() => {
        if (elements.verificationCode) {
            elements.verificationCode.focus();
        }
    }, 300);
    
    showAuthStatus(`🔧 ТЕСТОВЫЙ РЕЖИМ. Код: ${testCode}`, 'success');
}

// ==================== 4. ПРОВЕРКА КОДА (4 цифры) ====================
async function verifyCode() {
    const code = elements.verificationCode.value.trim();
    
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
    
    // Проверяем код
    if (pending && pending.code === code && (Date.now() - pending.timestamp) < 10 * 60 * 1000) {
        // Код верный - получаем постоянный код доступа
        showAuthStatus('Код подтвержден! Получаем доступ...', 'loading');
        
        // Здесь API должен вернуть постоянный код доступа
        await generateAccessCodeForUser(cleanPhone);
        
    } else {
        const attemptsLeft = 5 - appState.verificationAttempts;
        if (pending) pending.attempts++;
        
        if (!pending) {
            showAuthStatus('Код устарел. Запросите новый.', 'error');
        } else {
            showAuthStatus(`Неверный код. Осталось попыток: ${attemptsLeft}`, 'error');
            elements.verificationCode.focus();
            elements.verificationCode.select();
        }
    }
}

// ==================== 5. ГЕНЕРАЦИЯ ПОСТОЯННОГО КОДА ДОСТУПА ====================
async function generateAccessCodeForUser(cleanPhone) {
    try {
        // Пытаемся получить код с сервера
        const response = await fetch(`${API_CONFIG.BASE_URL}/generateAccessCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                number: cleanPhone
            })
        });
        
        let accessCode;
        let userData;
        
        if (response.ok) {
            const data = await response.json();
            accessCode = data.code || data.accessCode || data.token || generateLocalAccessCode();
            userData = {
                name: data.name || `Пользователь`,
                fullName: data.fullName || data.name || `Пользователь`,
                phone: '+7' + cleanPhone,
                position: data.position || 'Сотрудник',
                ...data
            };
        } else {
            // Если API недоступен - генерируем локально
            accessCode = generateLocalAccessCode();
            userData = {
                name: `Пользователь ${cleanPhone.slice(-4)}`,
                fullName: `Пользователь ${cleanPhone.slice(-4)}`,
                phone: '+7' + cleanPhone,
                position: 'Сотрудник'
            };
        }
        
        // === СОХРАНЯЕМ В КЭШ НАВСЕГДА ===
        localStorage.setItem(STORAGE_KEYS.ACCESS_CODE, accessCode);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, '+7' + cleanPhone);
        localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        
        // Также сохраняем для обратной совместимости
        localStorage.setItem('employeeAuth', JSON.stringify({
            ...userData,
            accessCode: accessCode,
            loginTime: new Date().toISOString()
        }));
        
        appState.generatedAccessCode = accessCode;
        appState.userData = userData;
        
        // Показываем успех
        elements.codeStep.style.display = 'none';
        elements.successStep.style.display = 'block';
        elements.backToPhoneBtn.style.display = 'none';
        elements.generatedAccessCode.textContent = accessCode;
        
        stopCodeTimer();
        showAuthStatus('✅ Код доступа сохранен в браузере', 'success');
        
        // Удаляем временный код
        delete window.pendingVerifications?.[cleanPhone];
        
        // Автопереход через 3 секунды
        setTimeout(() => {
            completeLogin();
        }, 3000);
        
    } catch (error) {
        console.error('Ошибка генерации кода:', error);
        
        // Генерируем локальный код как запасной вариант
        const accessCode = generateLocalAccessCode();
        const userData = {
            name: `Пользователь ${cleanPhone.slice(-4)}`,
            fullName: `Пользователь ${cleanPhone.slice(-4)}`,
            phone: '+7' + cleanPhone,
            position: 'Сотрудник'
        };
        
        localStorage.setItem(STORAGE_KEYS.ACCESS_CODE, accessCode);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, '+7' + cleanPhone);
        localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        
        elements.codeStep.style.display = 'none';
        elements.successStep.style.display = 'block';
        elements.generatedAccessCode.textContent = accessCode;
        
        showAuthStatus('✅ Код сгенерирован локально (сервер недоступен)', 'success');
        
        setTimeout(() => completeLogin(), 3000);
    }
}

// ==================== 6. ВХОД В СИСТЕМУ ====================
function completeLogin() {
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

// Генерация локального кода доступа (8 символов)
function generateLocalAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Заголовки авторизации для API
function getAuthHeaders() {
    // Раскомментируйте и настройте под ваше API
    /*
    if (API_CONFIG.AUTH?.type === 'basic') {
        const credentials = btoa(`${API_CONFIG.AUTH.login}:${API_CONFIG.AUTH.password}`);
        return { 'Authorization': `Basic ${credentials}` };
    }
    if (API_CONFIG.AUTH?.type === 'apikey') {
        return { 'X-API-Key': API_CONFIG.AUTH.apiKey };
    }
    */
    return {};
}

// Очистка кэша
function clearCache() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_CODE);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.PHONE_NUMBER);
    localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
}

// Таймер
function startCodeTimer() {
    let seconds = 60;
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    
    elements.codeTimer.style.display = 'block';
    elements.timerSeconds.textContent = seconds;
    
    appState.timerInterval = setInterval(() => {
        seconds--;
        elements.timerSeconds.textContent = seconds;
        
        if (seconds <= 0) {
            stopCodeTimer();
            elements.codeTimer.innerHTML = '<span style="color: #27ae60; cursor: pointer; font-weight: bold;" onclick="resendVerificationCode()">Отправить код повторно</span>';
        }
    }, 1000);
}

function stopCodeTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

async function resendVerificationCode() {
    if (appState.phoneNumber) {
        await sendVerificationCode();
    }
}

function showAuthStatus(message, type) {
    if (elements.authStatus) {
        elements.authStatus.innerHTML = message;
        elements.authStatus.className = `auth-status ${type || ''}`;
    }
    console.log(`[Auth] ${type}: ${message}`);
}

// ==================== ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ ====================
window.continueWithCachedCode = continueWithCachedCode;
window.showPhoneInput = showPhoneInput;
window.sendVerificationCode = sendVerificationCode;
window.verifyCode = verifyCode;
window.resendVerificationCode = resendVerificationCode;
window.completeLogin = completeLogin;
window.resetToPhoneInput = resetToPhoneInput;
