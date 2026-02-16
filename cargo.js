// cargo.js - ФИНАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
// - Все кнопки работают
// - После сохранения параметры сбрасываются
// - Вес НЕ умножается на количество
// - Индикатор фото в окне статистики
// - ИСПРАВЛЕНО: мин. значение размеров = 0
// - ИСПРАВЛЕНО: общая масса в кг, а не в тоннах

let cargoList = [];
let currentCargoType = 'euro-pallet';
let currentPackagingType = 'none';
let currentPhotos = [];

// Начальные значения для параметров
let cargoParams = {
    quantity: 1,
    weight: 10,
    length: 120,
    width: 80,
    height: 30
};

// Группировка грузов
let groupedCargo = {};

// ========== СОХРАНЯЕМ ОРИГИНАЛЬНЫЕ ФУНКЦИИ ==========
const originalChangeParam = window.changeParam;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация cargo.js...');
    
    // Загружаем список грузов
    loadCargoList();
    
    // Устанавливаем начальные значения
    selectCargoType('euro-pallet');
    selectPackagingType('none');
    
    // Обновляем статистику
    updateCurrentStats();
    updateTotalStats();
    
    // Загружаем имя сотрудника
    loadEmployeeName();
    
    // Настраиваем фото
    setupPhotoHandler();
    
    console.log('✅ Инициализация завершена');
});

// ========== ФУНКЦИЯ ИЗМЕНЕНИЯ ПАРАМЕТРОВ ==========
window.changeParam = function(param, delta) {
    console.log('🔘 changeParam:', param, delta);
    
    // Вызываем оригинальную функцию если она существует
    if (typeof originalChangeParam === 'function') {
        originalChangeParam(param, delta);
    }
    
    // Наша логика
    if (cargoParams.hasOwnProperty(param)) {
        cargoParams[param] = cargoParams[param] + delta;
        
        // Ограничения
        if (param === 'quantity') {
            if (cargoParams[param] < 0) cargoParams[param] = 0;
            if (cargoParams[param] > 100) cargoParams[param] = 100;
        } else if (param === 'weight') {
            if (cargoParams[param] < 1) cargoParams[param] = 1;
            if (cargoParams[param] > 10000) cargoParams[param] = 10000;
        } else {
            // Для длины, ширины, высоты - минимальное значение 0
            if (cargoParams[param] < 0) cargoParams[param] = 0;
            if (cargoParams[param] > 1000) cargoParams[param] = 1000;
        }
        
        // Обновляем поле ввода
        const input = document.getElementById(param + 'Input');
        if (input) input.value = cargoParams[param];
        
        updateCurrentStats();
    }
};

// ========== ЗАГРУЗКА ИМЕНИ СОТРУДНИКА ==========
function loadEmployeeName() {
    const authData = localStorage.getItem('employeeAuth');
    const nameElement = document.getElementById('employeeName');
    
    if (nameElement) {
        if (authData) {
            try {
                const emp = JSON.parse(authData);
                nameElement.textContent = emp.fullName || emp.name || '';
            } catch {
                nameElement.textContent = '';
            }
        } else {
            nameElement.textContent = '';
        }
    }
}

window.selectCargoType = function(type) {
    console.log('📦 Выбор типа груза:', type);
    currentCargoType = type;
    
    document.querySelectorAll('.cargo-type-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selected = document.querySelector(`.cargo-type-item[data-type="${type}"]`);
    if (selected) selected.classList.add('selected');
    
    switch(type) {
        case 'euro-pallet':
            cargoParams.length = 120;
            cargoParams.width = 80;
            cargoParams.height = 30;
            cargoParams.weight = 10;
            break;
        case 'american-pallet':
            cargoParams.length = 120;
            cargoParams.width = 100;
            cargoParams.height = 30;
            cargoParams.weight = 15;
            break;
        case 'box':
            cargoParams.length = 60;
            cargoParams.width = 40;
            cargoParams.height = 40;
            cargoParams.weight = 5;
            break;
        case 'non-standard':
            cargoParams.length = 10;
            cargoParams.width = 10;
            cargoParams.height = 10;
            cargoParams.weight = 1;
            break;
    }
    
    updateAllInputs();
    updateCurrentStats();
};

window.selectPackagingType = function(type) {
    console.log('📦 Выбор упаковки:', type);
    currentPackagingType = type;
    
    document.querySelectorAll('.packaging-type-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selected = document.querySelector(`.packaging-type-item[data-packaging-type="${type}"]`);
    if (selected) selected.classList.add('selected');
    
    document.getElementById('currentPackagingType').textContent = getPackagingName(type);
};

function getPackagingName(type) {
    switch(type) {
        case 'none': return 'Нет';
        case 'obreshetka': return 'Обрешетка';
        case 'paletnyy-bort': return 'Паллетный борт';
        default: return 'Нет';
    }
}

function updateAllInputs() {
    const quantityInput = document.getElementById('quantityInput');
    const lengthInput = document.getElementById('lengthInput');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    
    if (quantityInput) quantityInput.value = cargoParams.quantity;
    if (lengthInput) lengthInput.value = cargoParams.length;
    if (widthInput) widthInput.value = cargoParams.width;
    if (heightInput) heightInput.value = cargoParams.height;
}

function updateCurrentStats() {
    const volume = (cargoParams.length * cargoParams.width * cargoParams.height) / 1000000;
    const totalVolume = volume * cargoParams.quantity;
    
    document.getElementById('currentQuantity').textContent = cargoParams.quantity + ' ' + getPlaceWord(cargoParams.quantity);
    document.getElementById('currentVolume').textContent = totalVolume.toFixed(3) + ' м³';
    document.getElementById('currentTotalWeight').textContent = cargoParams.weight + ' кг';
}

function getPlaceWord(count) {
    if (count === 0) return 'мест';
    if (count === 1) return 'место';
    if (count >= 2 && count <= 4) return 'места';
    return 'мест';
}

window.updateQuantityFromInput = function() {
    const input = document.getElementById('quantityInput');
    if (input) {
        let val = parseInt(input.value) || 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        cargoParams.quantity = val;
        input.value = val;
        updateCurrentStats();
    }
};

// ИСПРАВЛЕНО: минимальное значение 0 для размеров
window.updateDimensionFromInput = function(dim) {
    const input = document.getElementById(dim + 'Input');
    if (input) {
        let val = parseInt(input.value) || 0;
        if (val < 0) val = 0;
        if (val > 1000) val = 1000;
        cargoParams[dim] = val;
        input.value = val;
        updateCurrentStats();
    }
};

function setupPhotoHandler() {
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.setAttribute('multiple', 'multiple');
        photoInput.addEventListener('change', handlePhotos);
    }
}

function handlePhotos(e) {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        currentPhotos = [];
        
        const container = document.getElementById('photosContainer') || createPhotoContainer();
        const placeholder = document.getElementById('photoPlaceholder');
        
        if (placeholder) placeholder.style.display = 'none';
        container.innerHTML = '';
        
        files.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = function(ev) {
                currentPhotos.push(ev.target.result);
                addPhotoThumbnail(ev.target.result, i, container);
            };
            reader.readAsDataURL(file);
        });
        
        showMessage(`Загружено ${files.length} фото`);
    }
}

function createPhotoContainer() {
    const container = document.createElement('div');
    container.id = 'photosContainer';
    container.className = 'photos-container';
    document.querySelector('.photo-container-new').appendChild(container);
    return container;
}

function addPhotoThumbnail(src, index, container) {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumbnail';
    thumb.innerHTML = `
        <img src="${src}" alt="Фото">
        <button class="photo-delete-btn" onclick="removePhoto(${index})">×</button>
    `;
    container.appendChild(thumb);
}

window.removePhoto = function(index) {
    if (currentPhotos[index]) {
        currentPhotos.splice(index, 1);
        const container = document.getElementById('photosContainer');
        if (container) {
            container.innerHTML = '';
            currentPhotos.forEach((src, i) => addPhotoThumbnail(src, i, container));
        }
        if (currentPhotos.length === 0) {
            document.getElementById('photoPlaceholder').style.display = 'flex';
        }
    }
};

window.openCamera = function() {
    document.getElementById('photoInput').click();
};

window.editWeight = function() {
    const keyboard = document.getElementById('weightKeyboard');
    const input = document.getElementById('weightKeyboardInput');
    
    if (input) {
        input.value = cargoParams.weight;
        document.getElementById('weightKeyboardOverlay').style.display = 'block';
        setTimeout(() => {
            keyboard.classList.add('show');
        }, 10);
    }
};

window.closeWeightKeyboard = function() {
    document.getElementById('weightKeyboard').classList.remove('show');
    setTimeout(() => {
        document.getElementById('weightKeyboardOverlay').style.display = 'none';
    }, 300);
};

window.addWeightDigit = function(d) {
    const input = document.getElementById('weightKeyboardInput');
    let val = input.value;
    if (val === '0' || val === '') {
        input.value = d;
    } else {
        if ((val + d).length <= 5) {
            input.value = val + d;
        }
    }
};

window.removeWeightDigit = function() {
    const input = document.getElementById('weightKeyboardInput');
    let val = input.value;
    if (val.length > 1) {
        input.value = val.slice(0, -1);
    } else {
        input.value = '0';
    }
};

window.clearWeightInput = function() {
    document.getElementById('weightKeyboardInput').value = '0';
};

window.saveWeightFromKeyboard = function() {
    const val = parseInt(document.getElementById('weightKeyboardInput').value) || 1;
    cargoParams.weight = val;
    updateCurrentStats();
    closeWeightKeyboard();
    showMessage(`Вес установлен: ${val} кг`);
};

window.saveCargo = function() {
    console.log('💾 Сохранение груза...');
    
    if (cargoParams.quantity < 1) {
        showMessage('Укажите количество мест', 'error');
        return;
    }
    
    const volume = (cargoParams.length * cargoParams.width * cargoParams.height) / 1000000;
    const totalVolume = volume * cargoParams.quantity;
    
    const cargo = {
        id: Date.now(),
        type: currentCargoType,
        typeName: getCargoTypeName(currentCargoType),
        quantity: cargoParams.quantity,
        totalWeight: cargoParams.weight,
        length: cargoParams.length,
        width: cargoParams.width,
        height: cargoParams.height,
        volume: totalVolume,
        packagingType: currentPackagingType,
        packagingName: getPackagingName(currentPackagingType),
        photos: [...currentPhotos],
        hasPhotos: currentPhotos.length > 0,
        photosCount: currentPhotos.length,
        timestamp: new Date().toISOString()
    };
    
    cargoList.push(cargo);
    localStorage.setItem('cargoList', JSON.stringify(cargoList));
    
    updateGrouping();
    updateTotalStats();
    resetPhotos();
    
    resetParamsToDefault();
    
    showMessage(`✅ Груз сохранен: ${cargoParams.quantity} мест, вес ${cargoParams.weight} кг`);
};

// ========== СБРОС ПАРАМЕТРОВ К ЗНАЧЕНИЯМ ПО УМОЛЧАНИЮ ==========
function resetParamsToDefault() {
    console.log('🔄 Сброс параметров к значениям по умолчанию');
    
    // Сбрасываем параметры в зависимости от текущего типа груза
    switch(currentCargoType) {
        case 'euro-pallet':
            cargoParams.length = 120;
            cargoParams.width = 80;
            cargoParams.height = 30;
            cargoParams.weight = 10;
            break;
        case 'american-pallet':
            cargoParams.length = 120;
            cargoParams.width = 100;
            cargoParams.height = 30;
            cargoParams.weight = 15;
            break;
        case 'box':
            cargoParams.length = 60;
            cargoParams.width = 40;
            cargoParams.height = 40;
            cargoParams.weight = 5;
            break;
        case 'non-standard':
            cargoParams.length = 10;
            cargoParams.width = 10;
            cargoParams.height = 10;
            cargoParams.weight = 1;
            break;
    }
    
    cargoParams.quantity = 1;
    selectPackagingType('none');
    
    updateAllInputs();
    updateCurrentStats();
    
    console.log('✅ Параметры сброшены:', cargoParams);
}

function getCargoTypeName(type) {
    switch(type) {
        case 'euro-pallet': return 'Европаллет';
        case 'american-pallet': return 'Американский';
        case 'box': return 'Коробка';
        case 'non-standard': return 'Нестандарт';
        default: return type;
    }
}

function updateGrouping() {
    groupedCargo = {};
    cargoList.forEach(cargo => {
        const key = cargo.type + cargo.length + cargo.width + cargo.height + cargo.packagingType;
        if (!groupedCargo[key]) {
            groupedCargo[key] = {
                cargo: cargo,
                quantity: 0,
                totalWeight: 0,
                totalVolume: 0
            };
        }
        groupedCargo[key].quantity += cargo.quantity;
        groupedCargo[key].totalWeight += cargo.totalWeight;
        groupedCargo[key].totalVolume += cargo.volume;
    });
}

window.updateTotalStats = function() {
    let totalItems = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let packagingSet = new Set();
    
    cargoList.forEach(cargo => {
        totalItems += cargo.quantity;
        totalWeight += cargo.totalWeight;
        totalVolume += cargo.volume;
        if (cargo.packagingType !== 'none') {
            packagingSet.add(cargo.packagingName);
        }
    });
    
    document.getElementById('totalCargoCount').innerHTML = totalItems + ' мест <span class="total-info-arrow">›</span>';
    document.getElementById('totalCargoGroups').textContent = cargoList.length;
    document.getElementById('totalWeightValue').textContent = totalWeight.toFixed(1) + ' кг';
    document.getElementById('totalVolumeValue').textContent = totalVolume.toFixed(3) + ' м³';
    
    const packagingEl = document.getElementById('totalPackagingInfo');
    if (packagingSet.size === 0) {
        packagingEl.textContent = 'Нет';
    } else {
        packagingEl.textContent = Array.from(packagingSet).join(', ');
    }
};

window.updateTotalStatsFixed = window.updateTotalStats;

function loadCargoList() {
    const saved = localStorage.getItem('cargoList');
    if (saved) {
        try {
            cargoList = JSON.parse(saved);
            updateGrouping();
        } catch {
            cargoList = [];
        }
    }
}
function resetPhotos() {
    currentPhotos = [];
    const container = document.getElementById('photosContainer');
    if (container) container.innerHTML = '';
    
    const placeholder = document.getElementById('photoPlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    
    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.value = '';
}

window.showCargoStatsPopup = function() {
    updateGrouping();
    
    const itemsContainer = document.getElementById('cargoStatsItems');
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '';
    
    if (cargoList.length === 0) {
        itemsContainer.innerHTML = '<div class="cargo-stats-empty">Нет сохраненных грузов</div>';
        document.getElementById('cargoStatsPopup').style.display = 'block';
        document.getElementById('cargoStatsOverlay').style.display = 'block';
        return;
    }
    
    let totalPlaces = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    Object.keys(groupedCargo).forEach(key => {
        const group = groupedCargo[key];
        const cargo = group.cargo;
        
        totalPlaces += group.quantity;
        totalWeight += group.totalWeight;
        totalVolume += group.totalVolume;
        
        const photoHtml = cargo.hasPhotos 
            ? `<div class="cargo-stats-photo-badge"><span class="photo-icon">📸</span> ${cargo.photosCount} фото</div>`
            : `<div class="cargo-stats-photo-badge no-photo"><span class="photo-icon">📷</span> Нет фото</div>`;
        
        const packagingHtml = cargo.packagingType !== 'none'
            ? `<div class="cargo-stats-packaging"><span class="packaging-icon">📦</span> ${cargo.packagingName}</div>`
            : '';
        
        const div = document.createElement('div');
        div.className = 'cargo-stats-item';
        div.innerHTML = `
            <div class="cargo-stats-item-header">
                <div class="cargo-stats-item-title">
                    <span class="cargo-stats-item-icon">${getIcon(cargo.type)}</span>
                    ${cargo.typeName}
                </div>
                <div class="cargo-stats-item-count">${group.quantity} ${getPlaceWord(group.quantity)}</div>
            </div>
            <div class="cargo-stats-item-details">
                ${photoHtml}
                ${packagingHtml}
            </div>
            <div class="cargo-stats-item-total">
                <span class="total-label">Общий вес:</span>
                <span class="total-value weight">${group.totalWeight.toFixed(1)} кг</span>
            </div>
            <div class="cargo-stats-item-total">
                <span class="total-label">Общий объем:</span>
                <span class="total-value volume">${group.totalVolume.toFixed(3)} м³</span>
            </div>
            <button class="cargo-stats-item-remove" onclick="removeGroup('${key}')">🗑️ Удалить груз</button>
        `;
        itemsContainer.appendChild(div);
    });
    
    // ИСПРАВЛЕНО: общая масса в кг, а не в тоннах
    const totals = document.getElementById('cargoStatsTotals');
    if (totals) {
        totals.innerHTML = `
            <div class="cargo-stats-total-item">
                <span class="total-label">Всего мест:</span>
                <span class="total-value">${totalPlaces}</span>
            </div>
            <div class="cargo-stats-total-item">
                <span class="total-label">Общая масса:</span>
                <span class="total-value">${totalWeight.toFixed(1)} кг</span>
            </div>
            <div class="cargo-stats-total-item">
                <span class="total-label">Общий объем:</span>
                <span class="total-value">${totalVolume.toFixed(1)} м³</span>
            </div>
        `;
    }
    
    document.getElementById('cargoStatsPopup').style.display = 'block';
    document.getElementById('cargoStatsOverlay').style.display = 'block';
};

function getIcon(type) {
    switch(type) {
        case 'euro-pallet': return '🇪🇺';
        case 'american-pallet': return '🇺🇸';
        case 'box': return '📦';
        case 'non-standard': return '📏';
        default: return '📦';
    }
}

window.removeGroup = function(key) {
    if (confirm('Удалить эту группу грузов?')) {
        cargoList = cargoList.filter(c => (c.type + c.length + c.width + c.height + c.packagingType) !== key);
        localStorage.setItem('cargoList', JSON.stringify(cargoList));
        updateGrouping();
        updateTotalStats();
        showCargoStatsPopup();
        showMessage('Группа удалена');
    }
};

window.closeCargoStatsPopup = function() {
    document.getElementById('cargoStatsPopup').style.display = 'none';
    document.getElementById('cargoStatsOverlay').style.display = 'none';
};

window.clearAllCargo = function() {
    if (cargoList.length > 0 && confirm(`Удалить все ${cargoList.length} грузов?`)) {
        cargoList = [];
        groupedCargo = {};
        localStorage.removeItem('cargoList');
        updateTotalStats();
        closeCargoStatsPopup();
        showMessage('Все грузы удалены');
    }
};

window.sendToOperatorAndReset = function() {
    if (cargoList.length === 0) {
        showMessage('Нет грузов для отправки', 'warning');
        return;
    }
    
    const shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    shipments.push({
        timestamp: new Date().toISOString(),
        totalPlaces: cargoList.reduce((s, c) => s + c.quantity, 0),
        totalWeight: cargoList.reduce((s, c) => s + c.totalWeight, 0),
        totalVolume: cargoList.reduce((s, c) => s + c.volume, 0),
        cargos: cargoList
    });
    
    localStorage.setItem('shipments', JSON.stringify(shipments));
    
    const count = cargoList.length;
    cargoList = [];
    groupedCargo = {};
    localStorage.removeItem('cargoList');
    updateTotalStats();
    showMessage(`✅ Отправлено ${count} грузов оператору`);
};

function showMessage(text, type = 'success') {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        border-radius: 6px;
        z-index: 9999;
        animation: slideIn 0.3s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    msg.textContent = text;
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.animation = 'slideOut 0.3s';
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}

window.logout = function() {
    console.log('Функция выхода отключена');
};

console.log('✅ cargo.js загружен. Кнопки работают, параметры сбрасываются после сохранения!');
console.log('✅ ИСПРАВЛЕНО: мин. значение размеров = 0, общая масса в кг');