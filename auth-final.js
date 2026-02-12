
const API_CONFIG = {
    BASE_URL: 'https://pe.matrix-1c.ru/m-cargo/hs/root',
    TIMEOUT: 15000
};

const STORAGE_KEYS = {
    ACCESS_CODE: 'nord_wheel_access_code',
    USER_DATA: 'nord_wheel_user_data',
    PHONE_NUMBER: 'nord_wheel_phone',
    LAST_LOGIN: 'nord_wheel_last_login'
};


let appState = {
    phoneNumber: '',
    verificationCode: '',
    generatedAccessCode: '',
    verificationAttempts: 0,
    currentStep: 'cached_check',
    sessionId: null
};


let elements = {};


document.addEventListener('DOMContentLoaded', async function() {
    console.log('NORD WHEEL - Авторизация запущена');
    initElements();
    await checkCachedAccessCode();
});

function initElements() {
    const ids = [
        'cachedCheckCard', 'phoneInputCard', 'cachedStatus', 
        'cachedActions', 'cachedUserName', 'phoneNumber',
        'verificationCode', 'codeSection', 'nextBtn', 'loginBtn',
        'successStep', 'deniedStep', 'generatedAccessCode', 
        'deniedMessage'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
    
    // Настройка поля телефона
    if (elements.phoneNumber) {
        setupPhoneInput();
        elements.phoneNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendVerificationCode();
        });
    }
    
    // Настройка поля кода
    if (elements.verificationCode) {
        elements.verificationCode.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^\d]/g, '').substring(0, 4);
            
            if (elements.loginBtn) {
                if (this.value.length === 4) {
                    elements.loginBtn.disabled = false;
                    elements.loginBtn.style.background = 'linear-gradient(135deg, #27ae60, #219653)';
                    elements.loginBtn.style.cursor = 'pointer';
                    elements.loginBtn.style.opacity = '1';
                } else {
                    elements.loginBtn.disabled = true;
                    elements.loginBtn.style.background = '#95a5a6';
                    elements.loginBtn.style.cursor = 'not-allowed';
                    elements.loginBtn.style.opacity = '0.7';
                }
            }
        });
        
        elements.verificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && elements.verificationCode.value.length === 4 && !elements.loginBtn.disabled) {
                verifyCode();
            }
        });
    }
}


function setupPhoneInput() {
    const input = elements.phoneNumber;
    if (!input) return;
    
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
        if (digits.length > 1) digits = digits.substring(1);
        else digits = '';
        digits = digits.substring(0, 10);
        
        let formatted = '+7';
        if (digits.length > 0) formatted += ' ' + digits.substring(0, 3);
        if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
        if (digits.length > 6) formatted += ' ' + digits.substring(6, 8);
        if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);
        
        this.value = formatted;
        this.dataset.cleanNumber = '+7' + digits;
    });
}


async function checkCachedAccessCode() {
    try {
        const accessCode = localStorage.getItem(STORAGE_KEYS.ACCESS_CODE);
        const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
        
        if (accessCode && userDataStr && lastLogin) {
            const userData = JSON.parse(userDataStr);
            const timeSinceLogin = Date.now() - new Date(lastLogin).getTime();
            const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
            
            if (timeSinceLogin < SESSION_DURATION) {
                showCachedUser(userData, accessCode);
                return;
            }
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


function showPhoneInput() {
    if (elements.cachedCheckCard) elements.cachedCheckCard.style.display = 'none';
    if (elements.phoneInputCard) elements.phoneInputCard.style.display = 'block';
    resetToPhoneInput();
}

function resetToPhoneInput() {
    appState.currentStep = 'phone_input';
    appState.verificationAttempts = 0;
    appState.sessionId = null;
    
    if (elements.successStep) elements.successStep.style.display = 'none';
    if (elements.deniedStep) elements.deniedStep.style.display = 'none';
    if (elements.codeSection) elements.codeSection.style.display = 'none';
    
    if (elements.phoneNumber) {
        elements.phoneNumber.value = '+7';
        elements.phoneNumber.dataset.cleanNumber = '+7';
    }
    
    if (elements.nextBtn) {
        elements.nextBtn.style.display = 'block';
        elements.nextBtn.innerHTML = 'Далее';
        elements.nextBtn.disabled = false;
        elements.nextBtn.style.background = 'linear-gradient(135deg, #27ae60, #219653)';
    }
    
    if (elements.verificationCode) {
        elements.verificationCode.value = '';
    }
    
    if (elements.loginBtn) {
        elements.loginBtn.innerHTML = 'Войти';
        elements.loginBtn.disabled = true;
        elements.loginBtn.style.background = '#95a5a6';
        elements.loginBtn.style.cursor = 'not-allowed';
        elements.loginBtn.style.opacity = '0.7';
    }
}


async function sendVerificationCode() {
    console.log('📱 Отправка номера в 1С');
    
    let phone = elements.phoneNumber.dataset.cleanNumber || elements.phoneNumber.value.trim();
    
    if (!phone || phone === '+7') {
        showMessage('Введите номер телефона', 'error');
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    
    if (cleanPhone.length !== 10) {
        showMessage('Введите 10 цифр номера', 'error');
        return;
    }
    
    appState.phoneNumber = '+7' + cleanPhone;
    
   
    if (elements.nextBtn) {
        elements.nextBtn.innerHTML = '<span class="loading-spinner"></span> Отправка...';
        elements.nextBtn.disabled = true;
    }
    
    try {

        console.log('📤 POST /getNewToken', { number: cleanPhone });
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/getNewToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                number: cleanPhone 
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Ответ от 1С:', result);
        

        showMessage('✅ Код отправлен на ваш номер', 'success');
        
   
        if (elements.nextBtn) {
            elements.nextBtn.style.display = 'none';
        }
        
     
        if (elements.codeSection) {
            elements.codeSection.style.display = 'block';
            elements.verificationCode.value = '';
            elements.verificationCode.focus();
        }
        
       
        if (result.session_id) {
            appState.sessionId = result.session_id;
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки номера:', error);
        
       
        if (elements.nextBtn) {
            elements.nextBtn.innerHTML = 'Далее';
            elements.nextBtn.disabled = false;
        }
        
        showMessage('❌ Сервер недоступен. Попробуйте позже.', 'error');
    }
}


async function verifyCode() {
    console.log('🔑 Проверка кода в 1С');
    
    const code = elements.verificationCode.value.trim();
    
    if (!code || code.length !== 4) {
        return;
    }
    
    const cleanPhone = appState.phoneNumber.replace(/\D/g, '').slice(-10);
    
    // Показываем загрузку на кнопке
    if (elements.loginBtn) {
        elements.loginBtn.innerHTML = '<span class="loading-spinner"></span> Проверка...';
        elements.loginBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/verifyCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                number: cleanPhone,
                code: code,
                session_id: appState.sessionId
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Ответ от 1С:', result);
        

        if (result.success === true || result.access === true || result.status === 'ok') {
            console.log('✅ Код подтвержден');
            showMessage('✅ Код верный!', 'success');
            
            // Получаем данные пользователя из ответа
            const userData = {
                name: result.name || result.fullName || `Пользователь ${cleanPhone.slice(-4)}`,
                fullName: result.fullName || result.name || `Пользователь ${cleanPhone.slice(-4)}`,
                phone: '+7' + cleanPhone,
                position: result.position || 'Сотрудник'
            };
            
            // Генерируем код доступа
            generateAccessCodeForUser(cleanPhone, userData);
            
        } else {
            // Код неверный
            console.log('❌ Код неверный');
            handleWrongCode();
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки кода:', error);
        
        // Возвращаем кнопку в исходное состояние
        if (elements.loginBtn) {
            elements.loginBtn.innerHTML = 'Войти';
            elements.loginBtn.disabled = false;
        }
        
        showMessage('❌ Сервер недоступен. Попробуйте позже.', 'error');
    }
}

function handleWrongCode() {
    appState.verificationAttempts++;
    
    if (appState.verificationAttempts >= 5) {
        showMessage('❌ Слишком много попыток', 'error');
        setTimeout(() => resetToPhoneInput(), 2000);
    } else {
        showMessage(`❌ Неверный код. Осталось попыток: ${5 - appState.verificationAttempts}`, 'error');
    }
    
    elements.verificationCode.value = '';
    elements.verificationCode.focus();
    
    if (elements.loginBtn) {
        elements.loginBtn.innerHTML = 'Войти';
        elements.loginBtn.disabled = true;
        elements.loginBtn.style.background = '#95a5a6';
        elements.loginBtn.style.cursor = 'not-allowed';
        elements.loginBtn.style.opacity = '0.7';
    }
}


function generateAccessCodeForUser(cleanPhone, userData) {
    console.log('🎫 Генерация кода доступа');
    
    const accessCode = generateLocalAccessCode();
    
    const userInfo = userData || {
        name: `Пользователь ${cleanPhone.slice(-4)}`,
        fullName: `Пользователь ${cleanPhone.slice(-4)}`,
        phone: '+7' + cleanPhone,
        position: 'Сотрудник'
    };
    
    // Сохраняем в localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_CODE, accessCode);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userInfo));
    localStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, '+7' + cleanPhone);
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    
    // Для совместимости со старым кодом
    localStorage.setItem('employeeAuth', JSON.stringify({
        ...userInfo,
        accessCode: accessCode,
        loginTime: new Date().toISOString()
    }));
    
    appState.generatedAccessCode = accessCode;
    appState.userData = userInfo;
    
    // Показываем успех
    if (elements.codeSection) elements.codeSection.style.display = 'none';
    if (elements.successStep) {
        elements.successStep.style.display = 'block';
        if (elements.generatedAccessCode) {
            elements.generatedAccessCode.textContent = accessCode;
        }
    }
    
    // Автопереход через 3 секунды
    setTimeout(() => completeLogin(), 3000);
}

function completeLogin() {
    console.log('🚀 Переход на cargo.html');
    if (appState.userData && appState.generatedAccessCode) {
        window.location.href = 'cargo.html';
    }
}

function continueWithCachedCode() {
    if (appState.userData) {
        localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        window.location.href = 'cargo.html';
    }
}


function generateLocalAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}


function showMessage(text, type = 'info') {
    const oldMsg = document.querySelector('.temp-message');
    if (oldMsg) oldMsg.remove();
    
    let bgColor, textColor, borderColor;
    if (type === 'success') {
        bgColor = '#d4edda';
        textColor = '#155724';
        borderColor = '#c3e6cb';
    } else if (type === 'error') {
        bgColor = '#f8d7da';
        textColor = '#721c24';
        borderColor = '#f5c6cb';
    } else {
        bgColor = '#d1ecf1';
        textColor = '#0c5460';
        borderColor = '#bee5eb';
    }
    
    const msg = document.createElement('div');
    msg.className = 'temp-message';
    msg.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        border: 1px solid ${borderColor};
        padding: 12px;
        margin-top: 15px;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
    `;
    msg.textContent = text;
    
    const card = document.querySelector('.auth-card');
    if (card) {
        card.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }
}


window.continueWithCachedCode = continueWithCachedCode;
window.showPhoneInput = showPhoneInput;
window.sendVerificationCode = sendVerificationCode;
window.verifyCode = verifyCode;
window.completeLogin = completeLogin;
window.resetToPhoneInput = resetToPhoneInput;

console.log('✅ auth-final.js загружен (режим 1С)');