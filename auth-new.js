// auth-new.js - Новая система авторизации с регистрацией по телефону

// База данных для демонстрации (в реальности будет API к 1С)
const MOCK_DATABASE = {
    // Телефоны, которые есть в системе 1С
    'PHONES_IN_SYSTEM': {
        '+79680612062': {
            name: 'Леонтьев Дмитрий',
        },
    },
    
    // Сгенерированные коды доступа
    'ACCESS_CODES': {
        'K9CM4CRF': '+79680612062'
    },
    
    // Временные коды верификации
    'VERIFICATION_CODES': {},
    
    // Активные сессии
    'ACTIVE_SESSIONS': {}
};

// Текущее состояние
let currentState = {
    step: 'login', // login | phone_input | code_input | success
    phoneNumber: '',
    verificationCode: '',
    generatedAccessCode: '',
    verificationAttempts: 0,
    timerInterval: null
};

// DOM элементы
let loginCard, registerCard;
let authStatus;
let phoneStep, codeStep, successStep;
let phoneInput, codeInput, accessCodeInput;
let codeTimerElement, timerSecondsElement;

document.addEventListener('DOMContentLoaded', function() {
    console.log('NORD WHEEL - Новая система авторизации загружена');
    
    // Инициализация элементов
    initElements();
    
    // Проверка активной сессии
    checkExistingSession();
    
    // Автофокус на поле ввода кода
    if (accessCodeInput) {
        accessCodeInput.focus();
    }
});

function initElements() {
    loginCard = document.getElementById('loginCard');
    registerCard = document.getElementById('registerCard');
    authStatus = document.getElementById('authStatus');
    
    phoneStep = document.getElementById('phoneStep');
    codeStep = document.getElementById('codeStep');
    successStep = document.getElementById('successStep');
    
    phoneInput = document.getElementById('phoneNumber');
    codeInput = document.getElementById('verificationCode');
    accessCodeInput = document.getElementById('accessCode');
    
    codeTimerElement = document.getElementById('codeTimer');
    timerSecondsElement = document.getElementById('timerSeconds');
    
    // Обработчики Enter
    if (accessCodeInput) {
        accessCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginWithCode();
        });
        
        accessCodeInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
    
    if (phoneInput) {
        phoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendVerificationCode();
        });
    }
    
    if (codeInput) {
        codeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') verifyCode();
        });
    }
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// ПОКАЗАТЬ ФОРМУ РЕГИСТРАЦИИ
function showRegistration() {
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
    currentState.step = 'phone_input';
    
    // Активируем первый шаг
    phoneStep.classList.add('active');
    codeStep.classList.remove('active');
    successStep.classList.remove('active');
    
    // Фокус на поле телефона
    setTimeout(() => {
        if (phoneInput) {
            phoneInput.focus();
            phoneInput.value = '';
        }
    }, 300);
    
    showAuthStatus('Введите ваш номер телефона', 'info');
}

// ПОКАЗАТЬ ФОРМУ ЛОГИНА
function showLogin() {
    registerCard.style.display = 'none';
    loginCard.style.display = 'block';
    currentState.step = 'login';
    
    // Сброс состояния
    resetRegistrationState();
    
    // Фокус на поле кода
    setTimeout(() => {
        if (accessCodeInput) {
            accessCodeInput.focus();
            accessCodeInput.value = '';
        }
    }, 300);
    
    showAuthStatus('Введите ваш код доступа', 'info');
}

// ОТПРАВИТЬ КОД ПОДТВЕРЖДЕНИЯ
async function sendVerificationCode() {
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showAuthStatus('Введите номер телефона', 'error');
        phoneInput.focus();
        return;
    }
    
    // Нормализация номера телефона
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!isValidPhoneNumber(normalizedPhone)) {
        showAuthStatus('Неверный формат номера телефона', 'error');
        phoneInput.focus();
        return;
    }
    
    // Проверка наличия телефона в системе 1С
    showAuthStatus('Проверка номера...', 'loading');
    
    // Имитация запроса к API 1С
    setTimeout(async () => {
        const isPhoneInSystem = await checkPhoneIn1C(normalizedPhone);
        
        if (!isPhoneInSystem) {
            showAuthStatus('❌ Ваш номер не найден в системе. Обратитесь к администратору.', 'error');
            return;
        }
        
        // Генерация и отправка кода
        const verificationCode = generateVerificationCode();
        
        // Сохраняем код для проверки
        MOCK_DATABASE.VERIFICATION_CODES[normalizedPhone] = {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0
        };
        
        // Сохраняем номер телефона в состоянии
        currentState.phoneNumber = normalizedPhone;
        
        // Переход ко второму шагу
        phoneStep.classList.remove('active');
        codeStep.classList.add('active');
        currentState.step = 'code_input';
        
        // Фокус на поле кода
        setTimeout(() => {
            if (codeInput) {
                codeInput.focus();
                codeInput.value = '';
            }
        }, 300);
        
        // Запуск таймера
        startCodeTimer();
        
        // В реальном приложении здесь будет вызов API отправки SMS/Telegram
        console.log(`Код подтверждения для ${normalizedPhone}: ${verificationCode}`);
        
        // Для демо-режима показываем код
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showAuthStatus(`📱 Код отправлен. Демо-код: ${verificationCode}`, 'success');
        } else {
            showAuthStatus('📱 Код подтверждения отправлен на ваш номер', 'success');
        }
        
    }, 1500);
}

// ПОДТВЕРДИТЬ КОД
async function verifyCode() {
    const code = codeInput.value.trim();
    
    if (!code || code.length !== 6) {
        showAuthStatus('Введите 6-значный код', 'error');
        codeInput.focus();
        return;
    }
    
    showAuthStatus('Проверка кода...', 'loading');
    
    // Имитация проверки кода
    setTimeout(() => {
        const phoneData = MOCK_DATABASE.VERIFICATION_CODES[currentState.phoneNumber];
        
        if (!phoneData) {
            showAuthStatus('❌ Код устарел. Запросите новый.', 'error');
            return;
        }
        
        // Проверка количества попыток
        if (phoneData.attempts >= 3) {
            showAuthStatus('❌ Слишком много попыток. Запросите новый код.', 'error');
            return;
        }
        
        // Проверка времени жизни кода (10 минут)
        const codeAge = Date.now() - phoneData.timestamp;
        if (codeAge > 10 * 60 * 1000) {
            showAuthStatus('❌ Код устарел. Запросите новый.', 'error');
            delete MOCK_DATABASE.VERIFICATION_CODES[currentState.phoneNumber];
            return;
        }
        
        // Проверка кода
        if (phoneData.code !== code) {
            phoneData.attempts++;
            currentState.verificationAttempts++;
            
            const attemptsLeft = 3 - phoneData.attempts;
            showAuthStatus(`❌ Неверный код. Осталось попыток: ${attemptsLeft}`, 'error');
            
            if (attemptsLeft === 0) {
                delete MOCK_DATABASE.VERIFICATION_CODES[currentState.phoneNumber];
                showRegistration();
            }
            
            return;
        }
        
        // Код верный - генерируем уникальный код доступа
        const accessCode = generateAccessCode();
        
        // Сохраняем связь кода с телефоном
        MOCK_DATABASE.ACCESS_CODES[accessCode] = currentState.phoneNumber;
        
        // Удаляем временный код
        delete MOCK_DATABASE.VERIFICATION_CODES[currentState.phoneNumber];
        
        // Сохраняем сгенерированный код
        currentState.generatedAccessCode = accessCode;
        
        // Переход к шагу успеха
        codeStep.classList.remove('active');
        successStep.classList.add('active');
        currentState.step = 'success';
        
        // Показываем сгенерированный код
        const codeDisplay = document.getElementById('generatedAccessCode');
        if (codeDisplay) {
            codeDisplay.textContent = accessCode;
        }
        
        // Останавливаем таймер
        stopCodeTimer();
        
        // Отправляем код в Telegram (имитация)
        sendCodeToTelegram(currentState.phoneNumber, accessCode);
        
        showAuthStatus('✅ Код подтвержден. Сгенерирован ваш уникальный код доступа.', 'success');
        
    }, 1000);
}

// ЗАВЕРШИТЬ РЕГИСТРАЦИЮ
function completeRegistration() {
    // Авторизуем пользователя с новым кодом
    authenticateWithCode(currentState.generatedAccessCode);
}

// ВОЙТИ С КОДОМ ДОСТУПА
function loginWithCode() {
    const code = accessCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showAuthStatus('Введите код доступа', 'error');
        accessCodeInput.focus();
        return;
    }
    
    authenticateWithCode(code);
}

// АВТОРИЗОВАТЬ ПО КОДУ
function authenticateWithCode(code) {
    showAuthStatus('Проверка кода...', 'loading');
    
    setTimeout(() => {
        const phoneNumber = MOCK_DATABASE.ACCESS_CODES[code];
        
        if (!phoneNumber) {
            showAuthStatus('❌ Неверный код доступа', 'error');
            accessCodeInput.focus();
            accessCodeInput.select();
            return;
        }
        
        // Получаем данные пользователя из 1С
        const userData = MOCK_DATABASE.PHONES_IN_SYSTEM[phoneNumber];
        
        if (!userData) {
            showAuthStatus('❌ Данные пользователя не найдены', 'error');
            return;
        }
        
        // Создаем сессию
        const sessionData = {
            ...userData,
            phone: phoneNumber,
            accessCode: code,
            loginTime: new Date().toISOString(),
            loginTimeDisplay: new Date().toLocaleString('ru-RU'),
            sessionId: 'SESS_' + Date.now()
        };
        
        // Сохраняем сессию
        localStorage.setItem('employeeAuth', JSON.stringify(sessionData));
        
        showAuthStatus(`✅ Успешный вход! Добро пожаловать, ${userData.name}`, 'success');
        
        // Перенаправление через 1.5 секунды
        setTimeout(() => {
            window.location.href = 'cargo.html';
        }, 1500);
        
    }, 1000);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// ГЕНЕРАЦИЯ КОДА ПОДТВЕРЖДЕНИЯ
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ГЕНЕРАЦИЯ УНИКАЛЬНОГО КОДА ДОСТУПА
function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Генерация 8-символьного кода
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Проверка на уникальность
    if (MOCK_DATABASE.ACCESS_CODES[code]) {
        return generateAccessCode(); // Рекурсия если код уже существует
    }
    
    return code;
}

// ТАЙМЕР ПОВТОРНОЙ ОТПРАВКИ КОДА
function startCodeTimer() {
    let seconds = 60;
    
    if (currentState.timerInterval) {
        clearInterval(currentState.timerInterval);
    }
    
    codeTimerElement.style.display = 'block';
    codeTimerElement.style.opacity = '0.7';
    codeTimerElement.style.cursor = 'not-allowed';
    
    currentState.timerInterval = setInterval(() => {
        seconds--;
        timerSecondsElement.textContent = seconds;
        
        if (seconds <= 0) {
            stopCodeTimer();
            codeTimerElement.innerHTML = '<span style="color: #27ae60; cursor: pointer; font-weight: bold;" onclick="resendVerificationCode()">Отправить код повторно</span>';
            codeTimerElement.style.opacity = '1';
        }
    }, 1000);
}

function stopCodeTimer() {
    if (currentState.timerInterval) {
        clearInterval(currentState.timerInterval);
        currentState.timerInterval = null;
    }
}

// ПОВТОРНАЯ ОТПРАВКА КОДА
function resendVerificationCode() {
    // Генерация нового кода
    const verificationCode = generateVerificationCode();
    
    MOCK_DATABASE.VERIFICATION_CODES[currentState.phoneNumber] = {
        code: verificationCode,
        timestamp: Date.now(),
        attempts: 0
    };
    
    // Обновление UI
    codeInput.value = '';
    codeInput.focus();
    
    // Запуск таймера
    startCodeTimer();
    
    // В реальном приложении - вызов API отправки
    console.log(`Новый код подтверждения: ${verificationCode}`);
    
    // Для демо
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        showAuthStatus(`📱 Новый код отправлен. Демо-код: ${verificationCode}`, 'success');
    } else {
        showAuthStatus('📱 Новый код подтверждения отправлен', 'success');
    }
}

// ОТПРАВКА КОДА В TELEGRAM (имитация)
function sendCodeToTelegram(phone, code) {
    console.log(`[Telegram Bot] Код доступа для ${phone}: ${code}`);
    console.log(`[Telegram Bot] Сообщение: "Ваш код доступа NORD WHEEL: ${code}. Сохраните его для входа в систему."`);
    
    // В реальном приложении здесь будет вызов API Telegram Bot
}

// ПРОВЕРКА НОМЕРА В СИСТЕМЕ 1С (имитация API)
async function checkPhoneIn1C(phone) {
    // Имитация запроса к API 1С
    return new Promise((resolve) => {
        setTimeout(() => {
            // Проверяем в нашей демо-базе
            const exists = !!MOCK_DATABASE.PHONES_IN_SYSTEM[phone];
            
            // Для демо-целей добавляем логику:
            // Если номер начинается с +7916 или +7903, считаем что он есть в системе
            if (!exists && (phone.startsWith('+7916') || phone.startsWith('+7903'))) {
                MOCK_DATABASE.PHONES_IN_SYSTEM[phone] = {
                    name: `Пользователь ${phone.slice(-4)}`,
                    position: 'Сотрудник',
                    department: 'Логистика'
                };
                resolve(true);
            } else {
                resolve(exists);
            }
        }, 500);
    });
}

// ВАЛИДАЦИЯ НОМЕРА ТЕЛЕФОНА
function isValidPhoneNumber(phone) {
    // Простая валидация российских номеров
    const phoneRegex = /^\+7\d{10}$/;
    return phoneRegex.test(phone);
}

// НОРМАЛИЗАЦИЯ НОМЕРА ТЕЛЕФОНА
function normalizePhoneNumber(phone) {
    // Удаляем все нецифровые символы кроме плюса
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Если номер начинается с 8, заменяем на +7
    if (normalized.startsWith('8')) {
        normalized = '+7' + normalized.substring(1);
    }
    
    // Если номер начинается с 7 и нет плюса, добавляем +
    if (normalized.startsWith('7') && !normalized.startsWith('+7')) {
        normalized = '+' + normalized;
    }
    
    // Если номер начинается с 9 (без кода), добавляем +7
    if (normalized.match(/^9\d{9}$/)) {
        normalized = '+7' + normalized;
    }
    
    return normalized;
}

// СБРОС СОСТОЯНИЯ РЕГИСТРАЦИИ
function resetRegistrationState() {
    currentState = {
        step: 'login',
        phoneNumber: '',
        verificationCode: '',
        generatedAccessCode: '',
        verificationAttempts: 0,
        timerInterval: null
    };
    
    if (phoneInput) phoneInput.value = '';
    if (codeInput) codeInput.value = '';
    if (accessCodeInput) accessCodeInput.value = '';
    
    stopCodeTimer();
}

// ПОКАЗ СТАТУСА
function showAuthStatus(message, type) {
    if (!authStatus) return;
    
    authStatus.innerHTML = message;
    authStatus.className = `auth-status ${type || ''}`;
    
    console.log('Auth Status:', type, message);
}

// ПРОВЕРКА СУЩЕСТВУЮЩЕЙ СЕССИИ
function checkExistingSession() {
    const authData = localStorage.getItem('employeeAuth');
    if (!authData) return;
    
    try {
        const employee = JSON.parse(authData);
        const loginTime = new Date(employee.loginTime);
        const currentTime = new Date();
        const hoursDiff = (currentTime - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 8) {
            showAuthStatus(`Активна сессия: ${employee.name}`, 'loading');
            
            setTimeout(() => {
                const continueBtn = document.createElement('button');
                continueBtn.className = 'btn-auth';
                continueBtn.style.marginTop = '10px';
                continueBtn.style.width = '100%';
                continueBtn.textContent = 'Продолжить работу';
                continueBtn.onclick = function() {
                    window.location.href = 'cargo.html';
                };
                
                if (authStatus) {
                    authStatus.appendChild(document.createElement('br'));
                    authStatus.appendChild(continueBtn);
                }
            }, 500);
        } else {
            localStorage.removeItem('employeeAuth');
            showAuthStatus('Сессия истекла. Требуется повторная авторизация', 'loading');
        }
    } catch (e) {
        localStorage.removeItem('employeeAuth');
        console.error('Error parsing auth data:', e);
    }
}

// ЭКСПОРТ ФУНКЦИЙ
window.showRegistration = showRegistration;
window.showLogin = showLogin;
window.sendVerificationCode = sendVerificationCode;
window.verifyCode = verifyCode;
window.resendVerificationCode = resendVerificationCode;
window.completeRegistration = completeRegistration;
window.loginWithCode = loginWithCode;