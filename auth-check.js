const AUTH_CONFIG = {
    STORAGE_KEYS: {
        ACCESS_CODE: 'nord_wheel_access_code',
        USER_DATA: 'nord_wheel_user_data',
        PHONE_NUMBER: 'nord_wheel_phone',
        LAST_LOGIN: 'nord_wheel_last_login',
        LEGACY_AUTH: 'employeeAuth' 
    },
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, 
    REDIRECT_URL: 'index.html'
};

function checkAuth() {
    console.log('🔐 Проверка авторизации...');
    
    const accessCode = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_CODE);
    const userDataStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
    const lastLogin = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LAST_LOGIN);
    
    if (accessCode && userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            
            if (lastLogin) {
                const timeSinceLogin = Date.now() - new Date(lastLogin).getTime();
                if (timeSinceLogin < AUTH_CONFIG.SESSION_DURATION) {
                    console.log('✅ Авторизация действительна (новый формат):', userData.name);
                    

                    syncToLegacyFormat(userData, accessCode);
                    
                    return {
                        isAuthenticated: true,
                        userData: userData,
                        accessCode: accessCode
                    };
                }
            }
        } catch (e) {
            console.error('Ошибка парсинга userData:', e);
        }
    }
    
    const legacyAuth = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LEGACY_AUTH);
    if (legacyAuth) {
        try {
            const legacyData = JSON.parse(legacyAuth);
            console.log('✅ Найдена авторизация в старом формате');
            
            convertLegacyToNewFormat(legacyData);
            
            return checkAuth();
        } catch (e) {
            console.error('Ошибка парсинга legacyAuth:', e);
        }
    }
    
    console.log('❌ Авторизация не найдена');
    return {
        isAuthenticated: false,
        userData: null,
        accessCode: null
    };
}

function syncToLegacyFormat(userData, accessCode) {
    const legacyData = {
        ...userData,
        accessCode: accessCode,
        loginTime: localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LAST_LOGIN) || new Date().toISOString(),
        loginTimeDisplay: new Date().toLocaleString('ru-RU'),
        sessionId: 'SESS_' + Date.now()
    };
    
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LEGACY_AUTH, JSON.stringify(legacyData));
    console.log('🔄 Данные синхронизированы со старым форматом');
}

function convertLegacyToNewFormat(legacyData) {
    const accessCode = legacyData.accessCode || generateAccessCode();
    const userData = {
        name: legacyData.name || legacyData.fullName || 'Пользователь',
        fullName: legacyData.fullName || legacyData.name || 'Пользователь',
        phone: legacyData.phone || legacyData.phoneNumber || '',
        position: legacyData.position || 'Сотрудник'
    };
    
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_CODE, accessCode);
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.PHONE_NUMBER, userData.phone);
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    
    console.log('🔄 Данные конвертированы в новый формат');
}

function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function requireAuth() {
    const auth = checkAuth();
    
    if (!auth.isAuthenticated) {
        console.log('⛔ Нет авторизации, перенаправление на index.html');
        

        sessionStorage.setItem('redirect_after_login', window.location.href);
        
        window.location.href = AUTH_CONFIG.REDIRECT_URL;
        return false;
    }
    
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    
    syncToLegacyFormat(auth.userData, auth.accessCode);
    
    return auth;
}

function getCurrentUser() {
    const auth = checkAuth();
    return auth.isAuthenticated ? auth.userData : null;
}

function getAccessCode() {
    const auth = checkAuth();
    return auth.isAuthenticated ? auth.accessCode : null;
}

function logout() {
    console.log('🚪 Выход из системы');
    
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_CODE);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.PHONE_NUMBER);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LAST_LOGIN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LEGACY_AUTH);
    
    window.location.href = AUTH_CONFIG.REDIRECT_URL;
}

window.AuthCheck = {
    checkAuth,
    requireAuth,
    getCurrentUser,
    getAccessCode,
    logout,
    syncToLegacyFormat
};

document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('index.html') && 
        !window.location.pathname.endsWith('/')) {
        requireAuth();
    }
});

console.log('✅ auth-check.js загружен');